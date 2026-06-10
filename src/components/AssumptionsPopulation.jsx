import { clvForClass, weightedAvgCLV, combinedAdjustment, applyAdjustment, adjustmentReasons, POP_LIST } from '../model.js'
import { fmtUSDfull, fmtUSD, FILTER_GROUPS } from '../data.js'

const HORIZONS = [1, 3, 5, 7, 10, 20]

export function HorizonControl({ years, setYears }) {
  return (
    <div className="horizon-inline">
      <span className="horizon-inline-label">NPV time horizon</span>
      <div className="hsel-wrap">
        <select className="hsel" value={years} onChange={(e) => setYears(parseInt(e.target.value, 10))}>
          {HORIZONS.map((y) => <option key={y} value={y}>{y} year{y > 1 ? 's' : ''}</option>)}
        </select>
        <span className="hsel-chev" aria-hidden="true">⌄</span>
      </div>
    </div>
  )
}

function AssumptionCell({ value, onChange, step, suffix, pct }) {
  const shown = pct ? Math.round(value * 100) : value
  return (
    <div className="acell">
      <input
        type="number" className="acell-input" value={shown} step={step}
        onChange={(e) => {
          const raw = parseFloat(e.target.value) || 0
          onChange(pct ? raw / 100 : raw)
        }}
      />
      {suffix && <span className="acell-suffix">{suffix}</span>}
    </div>
  )
}

export function BaseAssumptionsView({ classes, setClasses, years, setYears, dirty, resetAssumptions, econ, setEcon }) {
  const setField = (key, field, val) =>
    setClasses((prev) => prev.map((c) => (c.key === key ? { ...c, [field]: val } : c)))
  const setEconField = (field, val) => setEcon((prev) => ({ ...prev, [field]: val }))

  const clvs = classes.map((c) => clvForClass(c, years, econ))

  return (
    <div className="view">
      <div className="view-head view-head-row">
        <div>
          <h1 className="view-title">Base assumptions</h1>
          <p className="view-sub">Set the key drivers that power your member value model. Edit any cell to test sensitivity.</p>
        </div>
        <HorizonControl years={years} setYears={setYears} />
      </div>

      <div className="wallet-econ">
        <div className="wallet-econ-head">
          <span className="wallet-econ-title">Share-of-wallet economics</span>
          <span className="wallet-econ-note">A primary relationship (direct deposit, primary card) is worth more than a product held on the side.</span>
        </div>
        <div className="wallet-econ-controls">
          <label className="we-field">
            <span className="we-label">Primary product value</span>
            <span className="we-input">
              <span className="we-pre">$</span>
              <input type="number" className="acell-input" value={econ.revPerProduct} step={25}
                onChange={(e) => setEconField('revPerProduct', parseFloat(e.target.value) || 0)} />
              <span className="acell-suffix">/ yr</span>
            </span>
          </label>
          <label className="we-field">
            <span className="we-label">Non-primary worth</span>
            <span className="we-input">
              <input type="number" className="acell-input" value={Math.round(econ.nonPrimaryFactor * 100)} step={5}
                onChange={(e) => setEconField('nonPrimaryFactor', (parseFloat(e.target.value) || 0) / 100)} />
              <span className="acell-suffix">% of primary</span>
            </span>
          </label>
        </div>
      </div>

      <div className="atable-wrap">
        <table className="atable">
          <thead>
            <tr>
              <th className="atable-cat">Driver</th>
              {classes.map((c) => (
                <th key={c.key} className="atable-class">
                  {c.name}
                  <span className="atable-share">{Math.round(c.share * 100)}% of base</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="atable-cat"><strong>Churn rate</strong><span>Annual attrition</span></td>
              {classes.map((c) => (
                <td key={c.key}><AssumptionCell value={c.churn} step={0.5} suffix="%" onChange={(v) => setField(c.key, 'churn', v)} /></td>
              ))}
            </tr>
            <tr>
              <td className="atable-cat"><strong>Product holdings</strong><span>Avg products held</span></td>
              {classes.map((c) => (
                <td key={c.key}><AssumptionCell value={c.holdings} step={0.1} onChange={(v) => setField(c.key, 'holdings', v)} /></td>
              ))}
            </tr>
            <tr>
              <td className="atable-cat"><strong>Primary relationships</strong><span>% of holdings that are primary</span></td>
              {classes.map((c) => (
                <td key={c.key}><AssumptionCell value={c.primaryShare} step={5} pct={true} suffix="%" onChange={(v) => setField(c.key, 'primaryShare', v)} /></td>
              ))}
            </tr>
            <tr>
              <td className="atable-cat"><strong>Word of mouth</strong><span>Positive mentions / yr</span></td>
              {classes.map((c) => (
                <td key={c.key}><AssumptionCell value={c.womGood} step={1} suffix="good" onChange={(v) => setField(c.key, 'womGood', v)} /></td>
              ))}
            </tr>
            <tr>
              <td className="atable-cat atable-sub"><span>Negative mentions / yr</span></td>
              {classes.map((c) => (
                <td key={c.key}><AssumptionCell value={c.womBad} step={1} suffix="bad" onChange={(v) => setField(c.key, 'womBad', v)} /></td>
              ))}
            </tr>
            <tr>
              <td className="atable-cat"><strong>Servicing behavior</strong><span>Support calls / yr</span></td>
              {classes.map((c) => (
                <td key={c.key}><AssumptionCell value={c.calls} step={0.5} suffix="calls" onChange={(v) => setField(c.key, 'calls', v)} /></td>
              ))}
            </tr>
            <tr className="atable-result">
              <td className="atable-cat"><strong>Resulting CLV</strong><span>{years}-yr horizon</span></td>
              {clvs.map((v, i) => (
                <td key={i} className="atable-clv num">{fmtUSDfull(Math.round(v))}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <p className="atable-foot">
        These assumptions power the CLV math on every tab. Some may later be locked to true data;
        the rest stay editable so you can pressure-test sensitivity.
      </p>
    </div>
  )
}

export function PopulationView({ classes, years, onPickPopulation, econ }) {
  const baseAvg = weightedAvgCLV(classes, years, econ)

  const rows = POP_LIST.map((p) => {
    const { mult } = combinedAdjustment({ [p.group]: [p.value] }, FILTER_GROUPS)
    const adj = applyAdjustment(classes, mult)
    const avg = weightedAvgCLV(adj, years, econ)
    const delta = avg - baseAvg
    const reasons = adjustmentReasons(mult)
    return { ...p, avg, delta, pct: delta / baseAvg, reasons }
  }).sort((a, b) => b.delta - a.delta)

  return (
    <div className="view">
      <div className="view-head">
        <h1 className="view-title">Population adjustments</h1>
        <p className="view-sub">
          How each population differs from the base member — and <em>why</em>. Base population
          averages <strong className="num">{fmtUSDfull(Math.round(baseAvg))}</strong> CLV at a {years}-yr horizon.
        </p>
      </div>

      <div className="poptable-wrap">
        <table className="poptable">
          <thead>
            <tr>
              <th>Population</th>
              <th className="pt-num">Avg CLV</th>
              <th className="pt-num">vs base</th>
              <th>Why it differs</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const up = r.delta >= 0
              return (
                <tr key={r.group + r.value}>
                  <td className="pt-name">{r.label}</td>
                  <td className="pt-num num">{fmtUSDfull(Math.round(r.avg))}</td>
                  <td className={'pt-num num ' + (up ? 'pt-up' : 'pt-down')}>
                    {up ? '+' : '−'}{fmtUSD(Math.abs(r.delta))}
                    <span className="pt-pct">{up ? '+' : '−'}{Math.abs(Math.round(r.pct * 100))}%</span>
                  </td>
                  <td className="pt-why">
                    {r.reasons.slice(0, 2).map((rs, i) => (
                      <span key={i} className={'why-tag' + (rs.helps ? ' why-up' : ' why-down')}>{rs.text}</span>
                    ))}
                  </td>
                  <td className="pt-act">
                    <button className="pop-apply" onClick={() => onPickPopulation(r.group, r.value)}>
                      Explore →
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="atable-foot">
        Each population is modeled as a set of changes to the base assumptions. Click <strong>Explore</strong> to
        load that population on the Member value tab and see the driver-level breakdown.
      </p>
    </div>
  )
}
