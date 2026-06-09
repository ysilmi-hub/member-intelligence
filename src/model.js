// CLV math engine

export const ECON = {
  revPerProduct: 300,
  costPerCall: 30,
  valueGood: 75,
  costBad: 60,
  discount: 0.08,
}

export const BASE_CLASSES = [
  { key: 'SP', name: 'Super promoter', share: 0.16, churn: 1.5,  holdings: 4.2, womGood: 10, womBad: 1, calls: 1.5 },
  { key: 'P',  name: 'Promoter',       share: 0.34, churn: 4.0,  holdings: 3.1, womGood: 7,  womBad: 2, calls: 2.5 },
  { key: 'PA', name: 'Passive',        share: 0.32, churn: 9.0,  holdings: 2.3, womGood: 5,  womBad: 3, calls: 3.5 },
  { key: 'DE', name: 'Detractor',      share: 0.18, churn: 16.0, holdings: 1.5, womGood: 1,  womBad: 5, calls: 5.5 },
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

export function annualMargin(cls, econ = ECON) {
  return cls.holdings * econ.revPerProduct - cls.calls * econ.costPerCall
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

  const wallet    = (toCls.holdings - fromCls.holdings) * econ.revPerProduct * A_avg
  const servicing = -((toCls.calls - fromCls.calls) * econ.costPerCall) * A_avg
  const wom       = (annualWom(toCls, econ) - annualWom(fromCls, econ)) * A_avg
  const churn     = (A_to - A_from) * M_avg

  return {
    start: clvForClass(fromCls, years, econ),
    end:   clvForClass(toCls,   years, econ),
    total: clvForClass(toCls, years, econ) - clvForClass(fromCls, years, econ),
    slugs: [
      { id: 'wallet',    label: 'Wallet (product holdings)',  value: wallet },
      { id: 'churn',     label: 'Retention (lower churn)',    value: churn },
      { id: 'wom',       label: 'Word of mouth',              value: wom },
      { id: 'servicing', label: 'Servicing cost',             value: servicing },
    ],
  }
}

export const POP_ADJ = {
  'age:18–25':          { churn: 1.5,  holdings: 0.75, womGood: 1.25, womBad: 1.1, calls: 1.15 },
  'age:25–45':          { churn: 1.05, holdings: 0.95, womGood: 1.05 },
  'age:45–65':          { churn: 0.8,  holdings: 1.15, calls: 0.95 },
  'age:65+':            { churn: 0.6,  holdings: 1.05, womGood: 0.9, calls: 1.1 },
  'income:<$50K':       { churn: 1.2,  holdings: 0.8 },
  'income:$50–100K':    {},
  'income:$100K+':      { churn: 0.85, holdings: 1.25, calls: 0.9 },
  'military:Active':    { churn: 0.85, womGood: 1.15 },
  'military:Veteran':   { churn: 0.8,  holdings: 1.1 },
  'military:Civilian':  { churn: 1.1,  womGood: 0.95 },
  'base:On-base':       { churn: 0.9,  womGood: 1.2 },
  'base:Off-base':      { churn: 1.05 },
  'family:No kids':     { holdings: 0.9 },
  'family:1–2 kids':    { holdings: 1.1, calls: 1.05 },
  'family:3+ kids':     { holdings: 1.2, calls: 1.15, churn: 0.95 },
  'products:Mortgage':  { churn: 0.7,  holdings: 1.3 },
  'products:Auto loan': { churn: 0.85, holdings: 1.2 },
  'products:CC':        { holdings: 1.15 },
  'products:Checking':  {},
  'products:Savings':   { holdings: 1.05 },
}

export const ADJ_FIELDS = ['churn', 'holdings', 'womGood', 'womBad', 'calls']

export const FIELD_LABEL = {
  churn: 'churn rate', holdings: 'product holdings',
  womGood: 'positive word of mouth', womBad: 'negative word of mouth', calls: 'servicing calls',
}

export function combinedAdjustment(filters) {
  const mult = {}
  ADJ_FIELDS.forEach((f) => (mult[f] = 1))
  let active = 0
  Object.entries(filters || {}).forEach(([group, vals]) => {
    ;(vals || []).forEach((v) => {
      const adj = POP_ADJ[group + ':' + v]
      if (adj) {
        active++
        ADJ_FIELDS.forEach((f) => { if (adj[f] != null) mult[f] *= adj[f] })
      }
    })
  })
  return { mult, active }
}

export function applyAdjustment(classes, mult) {
  return classes.map((c) => ({
    ...c,
    churn:    +(c.churn    * mult.churn).toFixed(2),
    holdings: +(c.holdings * mult.holdings).toFixed(2),
    womGood:  +(c.womGood  * mult.womGood).toFixed(2),
    womBad:   +(c.womBad   * mult.womBad).toFixed(2),
    calls:    +(c.calls    * mult.calls).toFixed(2),
  }))
}

export function adjustmentReasons(mult) {
  const out = []
  ADJ_FIELDS.forEach((f) => {
    const m = mult[f]
    if (Math.abs(m - 1) < 0.02) return
    const pct = Math.round((m - 1) * 100)
    const helps = (f === 'holdings' || f === 'womGood') ? m > 1 : m < 1
    out.push({
      field: f, label: FIELD_LABEL[f], pct, helps,
      text: `${FIELD_LABEL[f]} ${pct > 0 ? 'up' : 'down'} ${Math.abs(pct)}%`,
    })
  })
  return out.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
}

export const POP_LIST = [
  { group: 'age',      value: '18–25',   label: 'Young members (18–25)' },
  { group: 'age',      value: '45–65',   label: 'Established members (45–65)' },
  { group: 'age',      value: '65+',     label: 'Senior members (65+)' },
  { group: 'income',   value: '<$50K',   label: 'Lower income (<$50K)' },
  { group: 'income',   value: '$100K+',  label: 'High income ($100K+)' },
  { group: 'military', value: 'Active',  label: 'Active-duty military' },
  { group: 'military', value: 'Veteran', label: 'Veterans' },
  { group: 'products', value: 'Mortgage', label: 'Mortgage holders' },
  { group: 'family',   value: '3+ kids', label: 'Large families (3+ kids)' },
]

export const NPS_SENS = {
  churnPerPt:    0.35,
  womNetPerPt:   0.45,
  holdingsPerPt: 0.045,
}

export function cohortBaseline(classes) {
  const tw = classes.reduce((s, c) => s + c.share, 0) || 1
  const w = (sel) => classes.reduce((s, c) => s + sel(c) * c.share, 0) / tw
  return {
    churn:    w((c) => c.churn),
    holdings: w((c) => c.holdings),
    womNet:   w((c) => c.womGood - c.womBad),
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
  const m = d.holdings * econ.revPerProduct + d.womNet * econ.valueGood
  return m * annuity(d.churn, years, econ.discount)
}
