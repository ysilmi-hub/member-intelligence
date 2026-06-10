// CLV math engine — primacy model, real Navy Federal member data

export const ECON = {
  revPerProduct: 455,
  nonPrimaryFactor: 0.45,
  costPerCall: 8,
  valueGood: 10,
  costBad: 6,
  discount: 0.12,
}

export const BASE_CLASSES = [
  { key: 'SP', name: 'Super promoter', share: 0.1365, churn: 0.36, holdings: 4.2,  primaryShare: 0.85, womGood: 14.02, womBad: 0.16, calls: 1.09 },
  { key: 'P',  name: 'Promoter',       share: 0.3721, churn: 0.87, holdings: 3.42, primaryShare: 0.65, womGood: 10.01, womBad: 1.0,  calls: 1.79 },
  { key: 'PA', name: 'Passive',        share: 0.3558, churn: 3.09, holdings: 2.15, primaryShare: 0.42, womGood: 5.06,  womBad: 3.01, calls: 3.23 },
  { key: 'DE', name: 'Detractor',      share: 0.1356, churn: 7.17, holdings: 1.38, primaryShare: 0.22, womGood: 1.05,  womBad: 5.06, calls: 5.81 },
]

export const DRIVER_GROUPS = [
  { id: 'churn',     label: 'Churn rate',          unit: '%',           field: 'churn',    hint: 'Annual attrition by class' },
  { id: 'holdings',  label: 'Product holdings',     unit: 'products',    field: 'holdings', hint: 'Avg products held per member' },
  { id: 'wom',       label: 'Word of mouth',        unit: 'mentions/yr', fields: ['womGood', 'womBad'], hint: 'Positive vs negative mentions per year' },
  { id: 'servicing', label: 'Servicing behavior',   unit: 'calls/yr',    field: 'calls',    hint: 'Support calls per member per year' },
]

export function annuity(churnPct, years, discount = ECON.discount) {
  const ret = 1 - churnPct / 100
  const r = ret / (1 + discount)
  if (Math.abs(r - 1) < 1e-9) return years
  return (1 - Math.pow(r, years)) / (1 - r)
}

export function primacyFactor(cls, econ = ECON) {
  const f = econ.nonPrimaryFactor
  return f + (cls.primaryShare != null ? cls.primaryShare : 1) * (1 - f)
}

export function effRevPerProduct(cls, econ = ECON) {
  return econ.revPerProduct * primacyFactor(cls, econ)
}

export function walletAnnual(cls, econ = ECON) {
  return cls.holdings * effRevPerProduct(cls, econ)
}

export function annualMargin(cls, econ = ECON) {
  return walletAnnual(cls, econ) - cls.calls * econ.costPerCall
}

export function annualWom(cls, econ = ECON) {
  return cls.womGood * econ.valueGood - cls.womBad * econ.costBad
}

export function clvForClass(cls, years, econ = ECON) {
  const m = annualMargin(cls, econ) + annualWom(cls, econ)
  return m * annuity(cls.churn, years, econ.discount)
}

export function weightedAvgCLV(classes, years, econ = ECON) {
  const tw = classes.reduce((s, c) => s + c.share, 0) || 1
  return classes.reduce((s, c) => s + clvForClass(c, years, econ) * c.share, 0) / tw
}

export function decompose(fromCls, toCls, years, econ = ECON) {
  const A_from = annuity(fromCls.churn, years, econ.discount)
  const A_to   = annuity(toCls.churn,   years, econ.discount)
  const A_avg  = (A_from + A_to) / 2

  const M_from = annualMargin(fromCls, econ) + annualWom(fromCls, econ)
  const M_to   = annualMargin(toCls,   econ) + annualWom(toCls,   econ)
  const M_avg  = (M_from + M_to) / 2

  const g_from = primacyFactor(fromCls, econ), g_to = primacyFactor(toCls, econ)
  const g_avg  = (g_from + g_to) / 2
  const h_avg  = (fromCls.holdings + toCls.holdings) / 2
  const walletHoldings = (toCls.holdings - fromCls.holdings) * g_avg * econ.revPerProduct * A_avg
  const walletPrimacy  = (g_to - g_from) * h_avg * econ.revPerProduct * A_avg
  const servicing      = -((toCls.calls - fromCls.calls) * econ.costPerCall) * A_avg
  const wom            = (annualWom(toCls, econ) - annualWom(fromCls, econ)) * A_avg
  const churn          = (A_to - A_from) * M_avg

  return {
    start: clvForClass(fromCls, years, econ),
    end:   clvForClass(toCls,   years, econ),
    total: clvForClass(toCls, years, econ) - clvForClass(fromCls, years, econ),
    slugs: [
      { id: 'wallet',   label: 'Wallet (holdings)',      value: walletHoldings },
      { id: 'primacy',  label: 'Primacy (primary mix)',  value: walletPrimacy },
      { id: 'churn',    label: 'Retention (lower churn)', value: churn },
      { id: 'wom',      label: 'Word of mouth',          value: wom },
      { id: 'servicing', label: 'Servicing cost',        value: servicing },
    ],
  }
}

export const POP_ADJ = {
  'age:18-34':            { churn: 1.660, holdings: 0.936, calls: 1.083, womGood: 0.907, womBad: 1.122 },
  'age:35-54':            { churn: 0.982, holdings: 1.000, calls: 1.026, womGood: 0.989, womBad: 1.033 },
  'age:55+':              { churn: 0.374, holdings: 1.063, calls: 0.880, womGood: 1.109, womBad: 0.831 },
  'income:<$50k':         { churn: 1.628, holdings: 0.949, calls: 1.073, womGood: 0.917, womBad: 1.121 },
  'income:$50k-$100k':    { churn: 0.932, holdings: 0.990, calls: 1.018, womGood: 0.988, womBad: 1.024 },
  'income:$100k+':        { churn: 0.412, holdings: 1.069, calls: 0.895, womGood: 1.108, womBad: 0.835 },
  'military:Civilian':         { churn: 1.154, holdings: 0.985, calls: 1.020, womGood: 0.979, womBad: 1.035 },
  'military:Military On-Base':  { churn: 0.262, holdings: 1.087, calls: 0.878, womGood: 1.128, womBad: 0.834 },
  'military:Military Off-Base': { churn: 1.164, holdings: 0.974, calls: 1.042, womGood: 0.955, womBad: 1.035 },
  'gender:Female':            { churn: 1.007, holdings: 1.005, calls: 0.986, womGood: 1.004, womBad: 0.996 },
  'gender:Male':              { churn: 0.997, holdings: 0.995, calls: 1.009, womGood: 0.994, womBad: 1.005 },
  'gender:Non-binary/Other':  { churn: 0.931, holdings: 1.018, calls: 1.052, womGood: 1.045, womBad: 0.976 },
  'family:Single':            { churn: 1.025, holdings: 1.011, calls: 0.994, womGood: 1.012, womBad: 0.988 },
  'family:Married No Kids':   { churn: 0.980, holdings: 0.982, calls: 1.006, womGood: 0.987, womBad: 1.010 },
  'family:Married With Kids': { churn: 0.993, holdings: 1.002, calls: 0.997, womGood: 0.996, womBad: 0.998 },
  'family:Single Parent':     { churn: 1.003, holdings: 1.005, calls: 1.011, womGood: 1.009, womBad: 1.016 },
  'location:Northeast':   { churn: 0.993, holdings: 0.999, calls: 1.030, womGood: 0.987, womBad: 1.006 },
  'location:Southeast':   { churn: 1.002, holdings: 1.006, calls: 1.010, womGood: 1.010, womBad: 1.013 },
  'location:Midwest':     { churn: 0.996, holdings: 0.996, calls: 0.981, womGood: 1.010, womBad: 0.983 },
  'location:Southwest':   { churn: 1.048, holdings: 0.984, calls: 1.001, womGood: 0.981, womBad: 1.009 },
  'location:West':        { churn: 0.981, holdings: 1.004, calls: 0.989, womGood: 0.994, womBad: 1.000 },
  'location:International':{ churn: 0.965, holdings: 1.027, calls: 0.967, womGood: 1.044, womBad: 0.964 },
  'products:Checking':     { churn: 0.732, holdings: 1.193, calls: 0.840, womGood: 1.165, womBad: 0.772 },
  'products:Savings':      { churn: 0.756, holdings: 1.194, calls: 0.844, womGood: 1.172, womBad: 0.778 },
  'products:Auto Loan':    { churn: 0.752, holdings: 1.193, calls: 0.852, womGood: 1.160, womBad: 0.777 },
  'products:Credit Card':  { churn: 0.732, holdings: 1.195, calls: 0.837, womGood: 1.160, womBad: 0.768 },
  'products:Mortgage':     { churn: 0.721, holdings: 1.202, calls: 0.833, womGood: 1.185, womBad: 0.766 },
  'products:Investment':   { churn: 0.721, holdings: 1.208, calls: 0.840, womGood: 1.177, womBad: 0.763 },
  'products:Personal Loan':{ churn: 0.713, holdings: 1.191, calls: 0.826, womGood: 1.185, womBad: 0.751 },
}

export const ADJ_FIELDS = ['churn', 'holdings', 'primaryShare', 'womGood', 'womBad', 'calls']

export const FIELD_LABEL = {
  churn: 'churn rate', holdings: 'product holdings', primaryShare: 'primary relationships',
  womGood: 'positive word of mouth', womBad: 'negative word of mouth', calls: 'servicing calls',
}

export function combinedAdjustment(filters, filterGroups) {
  const mult = {}
  ADJ_FIELDS.forEach((f) => (mult[f] = 1))
  let active = 0
  const optCount = {}
  ;(filterGroups || []).forEach((g) => { optCount[g.id] = g.options.length })
  Object.entries(filters || {}).forEach(([group, vals]) => {
    if (!vals || vals.length === 0) return
    if (optCount[group] && vals.length >= optCount[group]) return
    active += vals.length
    ADJ_FIELDS.forEach((f) => {
      let sum = 0
      vals.forEach((v) => {
        const adj = POP_ADJ[group + ':' + v] || {}
        sum += (adj[f] != null ? adj[f] : 1)
      })
      mult[f] *= sum / vals.length
    })
  })
  return { mult, active }
}

export function applyAdjustment(classes, mult) {
  return classes.map((c) => ({
    ...c,
    churn:        +(c.churn        * mult.churn).toFixed(2),
    holdings:     +(c.holdings     * mult.holdings).toFixed(2),
    primaryShare: Math.min(0.98, +((c.primaryShare != null ? c.primaryShare : 1) * (mult.primaryShare != null ? mult.primaryShare : 1)).toFixed(3)),
    womGood:      +(c.womGood      * mult.womGood).toFixed(2),
    womBad:       +(c.womBad       * mult.womBad).toFixed(2),
    calls:        +(c.calls        * mult.calls).toFixed(2),
  }))
}

export function adjustmentReasons(mult) {
  const out = []
  ADJ_FIELDS.forEach((f) => {
    const m = mult[f]
    if (Math.abs(m - 1) < 0.02) return
    const pct = Math.round((m - 1) * 100)
    const helps = (f === 'holdings' || f === 'womGood' || f === 'primaryShare') ? m > 1 : m < 1
    out.push({
      field: f, label: FIELD_LABEL[f], pct, helps,
      text: `${FIELD_LABEL[f]} ${pct > 0 ? 'up' : 'down'} ${Math.abs(pct)}%`,
    })
  })
  return out.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
}

export const POP_LIST = [
  { group: 'income',   value: '$100k+',            label: 'High income ($100k+)' },
  { group: 'age',      value: '55+',               label: 'Members 55+' },
  { group: 'military', value: 'Military On-Base',  label: 'Active military, on-base' },
  { group: 'products', value: 'Mortgage',          label: 'Mortgage holders' },
  { group: 'products', value: 'Investment',        label: 'Investment holders' },
  { group: 'family',   value: 'Married With Kids', label: 'Families with kids' },
  { group: 'military', value: 'Military Off-Base', label: 'Active military, off-base' },
  { group: 'age',      value: '18-34',             label: 'Young members (18–34)' },
  { group: 'income',   value: '<$50k',             label: 'Lower income (<$50k)' },
]

export const NPS_SENS = {
  churnPerPt:    0.10,
  womNetPerPt:   0.26,
  holdingsPerPt: 0.042,
}

export function cohortBaseline(classes) {
  const tw = classes.reduce((s, c) => s + c.share, 0) || 1
  const w = (sel) => classes.reduce((s, c) => s + sel(c) * c.share, 0) / tw
  return {
    churn:        w((c) => c.churn),
    holdings:     w((c) => c.holdings),
    primaryShare: w((c) => (c.primaryShare != null ? c.primaryShare : 1)),
    womNet:       w((c) => c.womGood - c.womBad),
  }
}

export function driversFromNps(baseline, npsPts) {
  return {
    churn:    Math.max(0, baseline.churn - npsPts * NPS_SENS.churnPerPt),
    womNet:   baseline.womNet + npsPts * NPS_SENS.womNetPerPt,
    holdings: baseline.holdings + npsPts * NPS_SENS.holdingsPerPt,
  }
}

export function clvFromDrivers(d, years, econ = ECON) {
  const g = econ.nonPrimaryFactor + (d.primaryShare != null ? d.primaryShare : 1) * (1 - econ.nonPrimaryFactor)
  const m = d.holdings * econ.revPerProduct * g + d.womNet * econ.valueGood
  return m * annuity(d.churn, years, econ.discount)
}
