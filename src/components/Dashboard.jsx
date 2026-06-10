import { useState, useEffect } from 'react'
import { FILTER_GROUPS, PLANNER, fmtUSD, fmtUSDfull } from '../data.js'
import {
  combinedAdjustment, applyAdjustment, weightedAvgCLV, clvForClass,
  decompose, adjustmentReasons, cohortBaseline, driversFromNps, clvFromDrivers,
} from '../model.js'
import { BaseAssumptionsView, PopulationView, HorizonControl } from './AssumptionsPopulation.jsx'

// ---- Filter rail -----------------------------------------------------------
function FilterRail({ filters, setFilters, view }) {
  const toggle = (group, opt) => {
    setFilters((prev) => {
      const cur = prev[group] || []
      const next = cur.includes(opt) ? cur.filter((o) => o !== opt) : [...cur, opt]
      return { ...prev, [group]: next }
    })
  }
  const allLit = FILTER_GROUPS.every((g) => (filters[g.id] || []).length === g.options.length)
  const lightAll = () => {
    const next = {}
    FILTER_GROUPS.forEach((g) => { next[g.id] = allLit ? [] : [...g.options] })
    setFilters(next)
  }
  const heading = view === 'intervention' ? 'Cohort baseline' : 'Population filters'
  return (
    <div className="rail">
      <div className="rail-head-row">
        <div className="rail-head">{heading}</div>
        <button className={'rail-all' + (allLit ? ' rail-all-on' : '')} onClick={lightAll}>
          {allLit ? '✓ Base population' : 'Select all'}
        </button>
      </div>
      <p className="rail-hint">Select any number of bubbles to build a population. Select all for the base population.</p>
      {FILTER_GROUPS.map((g) => (
        <div className="rail-group" key={g.id}>
          <div className="rail-label">{g.label}</div>
          <div className="rail-pills">
            {g.options.map((opt) => {
              const on = (filters[g.id] || []).includes(opt)
              return (
                <button key={opt} className={'pill' + (on ? ' pill-on' : '')} onClick={() => toggle(g.id, opt)}>
                  {opt}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ---- Driver waterfall ------------------------------------------------------
function Waterfall({ from, to, years, econ }) {
  const d = decompose(from, to, years, econ)
  const steps = [{ label: from.name, type: 'anchor', value: d.start }]
  let run = d.start
  d.slugs.forEach((s) => {
    steps.push({ label: s.label, type: 'delta', value: s.value, from: run, to: run + s.value })
    run += s.value
  })
  steps.push({ label: to.name, type: 'anchor', value: d.end })

  const top = Math.max(d.start, d.end, ...steps.map((s) => s.type === 'delta' ? Math.max(s.from, s.to) : s.value))
  const plotH = 220
  const y = (v) => plotH - (v / top) * plotH

  return (
    <div className="wf">
      <div className="wf-plot" style={{ height: plotH + 'px' }}>
        {steps.map((s, i) => {
          let barTop, barH, cls
          if (s.type === 'anchor') {
            barTop = y(s.value); barH = plotH - barTop; cls = 'wf-anchor'
          } else {
            const hi = Math.max(s.from, s.to), lo = Math.min(s.from, s.to)
            barTop = y(hi); barH = y(lo) - y(hi); cls = s.value >= 0 ? 'wf-pos' : 'wf-neg'
          }
          return (
            <div className="wf-col" key={i}>
              <div className="wf-cap num">
                {s.type === 'delta' ? (s.value >= 0 ? '+' : '−') : ''}{fmtUSD(Math.abs(s.value))}
              </div>
              <div className={'wf-bar ' + cls} style={{ top: barTop + 'px', height: Math.max(2, barH) + 'px' }}></div>
              <div className="wf-axis">{s.label}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---- Member value view -----------------------------------------------------
function Kpi({ k }) {
  return (
    <div className="kpi">
      <div className="kpi-label">{k.label}</div>
      <div className="kpi-value num">{k.value}</div>
      <div className={'kpi-delta' + (k.up ? ' up' : '')}>{k.delta}</div>
    </div>
  )
}

function ClvView({ classes, years, filters, chartStyle, highlightClass, econ }) {
  const { mult, active } = combinedAdjustment(filters, FILTER_GROUPS)
  const display = active > 0 ? applyAdjustment(classes, mult) : classes
  const baseAvg = weightedAvgCLV(classes, years, econ)
  const popAvg = weightedAvgCLV(display, years, econ)
  const reasons = active > 0 ? adjustmentReasons(mult) : []

  const clvFor = (c) => clvForClass(c, years, econ)
  const values = display.map(clvFor)
  const max = Math.max(...values)
  const minV = Math.min(0, ...values)
  const range = (max - minV) || 1
  const zeroPct = (0 - minV) / range * 100

  const byKey = Object.fromEntries(display.map((c) => [c.key, c]))
  const initialTo = highlightClass && display.find((c) => c.name === highlightClass)
    ? display.find((c) => c.name === highlightClass).key : 'SP'
  const [toKey, setToKey] = useState(initialTo)

  useEffect(() => {
    if (highlightClass) {
      const found = display.find((c) => c.name === highlightClass)
      if (found) setToKey(found.key)
    }
  }, [highlightClass]) // eslint-disable-line react-hooks/exhaustive-deps

  const toCls = byKey[toKey] || byKey.SP
  const fromCls = toKey === 'PA' ? byKey.DE : byKey.PA

  const kpis = [
    {
      id: 'clv', label: active > 0 ? 'Population avg CLV' : 'Avg member CLV',
      value: fmtUSDfull(Math.round(popAvg)),
      delta: active > 0 ? (popAvg >= baseAvg ? '↑ ' : '↓ ') + fmtUSD(Math.abs(popAvg - baseAvg)) + ' vs base' : 'at ' + years + '-yr horizon',
      up: popAvg >= baseAvg,
    },
    { id: 'horizon', label: 'NPV horizon', value: years + ' yrs', delta: 'set on Base assumptions', up: false },
    { id: 'nps', label: 'Avg NPS score', value: '66', delta: 'Super promoter 93 · Detractor 25', up: true },
    {
      id: 'spread', label: 'Super promoter vs Detractor',
      value: fmtUSD(Math.max(...values) - Math.min(...values)),
      delta: 'value gap, top to bottom', up: false,
    },
  ]

  return (
    <div className="view">
      <div className="view-head">
        <h1 className="view-title">Member value</h1>
        <p className="view-sub">CLV / NPV of each member class — {active > 0 ? 'for the selected population' : 'across the base population'}, at a {years}-yr horizon.</p>
      </div>

      {active > 0 && (
        <div className="vsbase">
          <div className="vsbase-main">
            <span className="vsbase-label">This population vs base</span>
            <span className={'vsbase-val num ' + (popAvg >= baseAvg ? 'up' : 'down')}>
              {popAvg >= baseAvg ? '+' : '−'}{fmtUSD(Math.abs(popAvg - baseAvg))}
              <span className="vsbase-pct">({popAvg >= baseAvg ? '+' : '−'}{Math.abs(Math.round((popAvg - baseAvg) / baseAvg * 100))}%)</span>
            </span>
          </div>
          <div className="vsbase-why">
            <span className="vsbase-why-label">Why:</span>
            {reasons.slice(0, 3).map((r, i) => (
              <span key={i} className={'why-tag' + (r.helps ? ' why-up' : ' why-down')}>{r.text}</span>
            ))}
          </div>
        </div>
      )}

      <div className="kpi-row">{kpis.map((k) => <Kpi key={k.id} k={k} />)}</div>

      <div className="clv-stack">
        <section className="card">
          <div className="card-head-row">
            <h2 className="card-title">CLV by member class</h2>
            <span className="card-hint">Click a class to decompose why →</span>
          </div>
          <div className="bars">
            {display.map((c, idx) => {
              const v = values[idx]
              const sel = c.key === toKey
              return (
                <div className={'bar-row bar-click' + (sel ? ' bar-hot' : '')} key={c.key} onClick={() => setToKey(c.key)}>
                  <div className="bar-name">{c.name}</div>
                  <div className="bar-track">
                    {chartStyle === 'dots' ? (
                      <div className="dots">
                        {Array.from({ length: 10 }).map((_, i) => (
                          <span key={i} className={'dot' + (v > 0 && i < Math.round(v / max * 10) ? ' dot-on' : '')}></span>
                        ))}
                      </div>
                    ) : (
                      <>
                        <div className="bar-zero" style={{ left: zeroPct + '%' }}></div>
                        <div className={'bar-fill' + (v < 0 ? ' bar-neg' : '')}
                          style={v >= 0
                            ? { left: zeroPct + '%', width: Math.max(0.5, v / range * 100) + '%' }
                            : { left: (zeroPct - (-v / range * 100)) + '%', width: Math.max(0.5, -v / range * 100) + '%' }}
                        ></div>
                      </>
                    )}
                  </div>
                  <div className={'bar-val num' + (v < 0 ? ' bar-val-neg' : '')}>{(v < 0 ? '−' : '') + fmtUSDfull(Math.abs(Math.round(v)))}</div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="card">
          <h2 className="card-title">
            Why {toCls.name.toLowerCase()}s are worth {clvFor(toCls) >= clvFor(fromCls) ? 'more' : 'less'} than {fromCls.name.toLowerCase()}s
          </h2>
          <p className="card-sub">Decomposing the {fmtUSD(Math.abs(clvFor(toCls) - clvFor(fromCls)))} gap into the value drivers</p>
          <Waterfall from={fromCls} to={toCls} years={years} econ={econ} />
        </section>
      </div>
    </div>
  )
}

// ---- Intervention planner --------------------------------------------------
function BreakEven({ net, cost }) {
  const scale = cost * 3
  const pos = Math.max(-1, Math.min(1, net / scale))
  const left = 50 + pos * 48
  const positive = net > 0
  const zero = Math.abs(net) < 1
  return (
    <div className="be">
      <div className="be-track">
        <div className="be-mid"></div>
        <div className={'be-marker' + (zero ? '' : positive ? ' be-pos' : ' be-neg')} style={{ left: left + '%' }}></div>
      </div>
      <div className="be-legend"><span>–</span><span className="be-center">break even</span><span>+</span></div>
    </div>
  )
}

function DriverSlider({ label, value, base, min, max, step, display, tweaked, onChange, onReset, loLabel, hiLabel }) {
  const pct = (v) => (v - min) / (max - min) * 100
  return (
    <div className={'sld' + (tweaked ? ' sld-tweaked' : '')}>
      <div className="sld-top">
        <span className="sld-label">
          {label}
          {tweaked && <span className="sld-badge">tweaked</span>}
        </span>
        <span className="sld-actions">
          <span className="sld-val num">{display}</span>
          {tweaked && <button className="sld-reset" onClick={onReset} title="Return to model base">↺ base</button>}
        </span>
      </div>
      <div className="sld-track-wrap">
        <input
          type="range" className="range"
          min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
        />
        <div className="sld-basemark" style={{ left: pct(base) + '%' }} title={'Model base: ' + display}></div>
      </div>
      <div className="sld-ends"><span>{loLabel}</span><span>{hiLabel}</span></div>
    </div>
  )
}

function InterventionView({ planner, setPlanner, years, setYears, classes, econ }) {
  const cohort = PLANNER.cohort, cost = PLANNER.cost
  const baseline = cohortBaseline(classes)
  const model = driversFromNps(baseline, planner.nps)

  const eff = {
    churn:        planner.tweaked.churn    ? planner.drivers.churn    : model.churn,
    womNet:       planner.tweaked.womNet   ? planner.drivers.womNet   : model.womNet,
    holdings:     planner.tweaked.holdings ? planner.drivers.holdings : model.holdings,
    primaryShare: baseline.primaryShare,
  }

  const value = (clvFromDrivers(eff, years, econ) - clvFromDrivers(baseline, years, econ)) * cohort
  const net = value - cost
  const touched = planner.nps > 0 || planner.tweaked.churn || planner.tweaked.womNet || planner.tweaked.holdings

  const setDriver = (key, v) =>
    setPlanner({ ...planner, drivers: { ...planner.drivers, [key]: v }, tweaked: { ...planner.tweaked, [key]: true } })
  const resetDriver = (key) =>
    setPlanner({ ...planner, tweaked: { ...planner.tweaked, [key]: false } })
  const anyTweak = planner.tweaked.churn || planner.tweaked.womNet || planner.tweaked.holdings

  return (
    <div className="view">
      <div className="view-head view-head-row">
        <div>
          <h1 className="view-title">Intervention planner</h1>
          <p className="view-sub">Move NPS and the model flows it through to the drivers — or tweak any driver directly to find the break-even.</p>
        </div>
        <div className="head-controls">
          {anyTweak && (
            <button className="reset-btn" onClick={() => setPlanner({ ...planner, tweaked: { churn: false, womNet: false, holdings: false } })}>
              ↺ Return all to base
            </button>
          )}
          <HorizonControl years={years} setYears={setYears} />
        </div>
      </div>

      <div className="kpi-row kpi-row-2">
        <div className="kpi">
          <div className="kpi-label">Cohort affected</div>
          <div className="kpi-value num">{cohort.toLocaleString()}</div>
          <div className="kpi-delta">members / year</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Direct cost of intervention</div>
          <div className="kpi-value num">{fmtUSD(cost)}</div>
          <div className="kpi-delta">annual</div>
        </div>
      </div>

      <div className="card-row">
        <section className="card">
          <h2 className="card-title">NPS sensitivity</h2>
          <p className="card-sub">The primary lever — flows through to the drivers on the right</p>
          <DriverSlider
            label="NPS uplift" value={planner.nps} base={0}
            min={0} max={20} step={1} display={'+' + planner.nps + ' pts'}
            tweaked={false} onChange={(v) => setPlanner({ ...planner, nps: v })}
            loLabel="no change" hiLabel="+20 pts"
          />
          <div className="flowbox">
            <div className="flowbox-label">Modeled flow-through</div>
            <div className="flowrow"><span>Churn rate</span><span className="num">{baseline.churn.toFixed(1)}% → {model.churn.toFixed(1)}%</span></div>
            <div className="flowrow"><span>Word of mouth</span><span className="num">{baseline.womNet.toFixed(1)} → {model.womNet.toFixed(1)}/yr</span></div>
            <div className="flowrow"><span>Holdings</span><span className="num">{baseline.holdings.toFixed(2)} → {model.holdings.toFixed(2)}</span></div>
          </div>
        </section>

        <section className="card">
          <h2 className="card-title">Drivers</h2>
          <p className="card-sub">Set by NPS — or drag to tweak off base. The tick marks the model value.</p>
          <DriverSlider
            label="Churn rate" value={eff.churn} base={model.churn}
            min={0} max={20} step={0.1} display={eff.churn.toFixed(1) + '%'}
            tweaked={planner.tweaked.churn} onChange={(v) => setDriver('churn', v)} onReset={() => resetDriver('churn')}
            loLabel="0%" hiLabel="20%"
          />
          <DriverSlider
            label="Word of mouth" value={eff.womNet} base={model.womNet}
            min={-2} max={12} step={0.1} display={eff.womNet.toFixed(1) + '/yr'}
            tweaked={planner.tweaked.womNet} onChange={(v) => setDriver('womNet', v)} onReset={() => resetDriver('womNet')}
            loLabel="−2" hiLabel="+12"
          />
          <DriverSlider
            label="Product holdings" value={eff.holdings} base={model.holdings}
            min={1} max={5} step={0.05} display={eff.holdings.toFixed(2)}
            tweaked={planner.tweaked.holdings} onChange={(v) => setDriver('holdings', v)} onReset={() => resetDriver('holdings')}
            loLabel="1.0" hiLabel="5.0"
          />
        </section>
      </div>

      <section className="card card-result">
        <div className="result-grid">
          <div className="result-block">
            <div className="readout-label">Estimated annual value created</div>
            <div className={'readout-value num ' + (net >= 0 ? 'pos' : 'neg')}>{touched ? fmtUSD(value) : '—'}</div>
            {touched && (
              <div className={'readout-net ' + (net >= 0 ? 'pos' : 'neg')}>
                {net >= 0 ? 'Net ' : 'Short '}<strong>{fmtUSD(Math.abs(net))}</strong>
                {net >= 0 ? ' above the ' + fmtUSD(cost) + ' cost' : ' below break-even'}
              </div>
            )}
            {!touched && <div className="readout-hint">Move NPS, or tweak a driver, to model the value.</div>}
          </div>
          <div className="result-block">
            <div className="readout-label">Break-even</div>
            <BreakEven net={touched ? net : 0} cost={cost} />
          </div>
        </div>
      </section>
    </div>
  )
}

// ---- Dashboard shell -------------------------------------------------------
const STEP1_TABS = [
  { id: 'assumptions', label: 'Base assumptions' },
  { id: 'population',  label: 'Population adjustments' },
]
const STEP2_TABS = [
  { id: 'clv',          label: 'Member value' },
  { id: 'intervention', label: 'Intervention planner' },
]

export default function Dashboard(props) {
  const {
    view, setView, filters, setFilters, planner, setPlanner,
    highlightClass, note, chartStyle, classes, setClasses, years, setYears,
    dirty, resetAssumptions, onPickPopulation,
    statusLabel, lastSaved, onSaveContinue, onModelSummary,
    econ, setEcon,
  } = props

  const step = (view === 'assumptions' || view === 'population') ? 1 : 2
  const tabs = step === 1 ? STEP1_TABS : STEP2_TABS
  const showRail = view === 'clv' || view === 'intervention'

  return (
    <main className="dash">
      <div className="stepbar">
        <div className="steps">
          <button className={'step' + (step === 1 ? ' step-on' : ' step-done')} onClick={() => setView('assumptions')}>
            <span className="step-num">{step > 1 ? '✓' : '1'}</span>
            <span className="step-text"><b>Configure model</b><small>Set your assumptions</small></span>
          </button>
          <span className={'step-div' + (step === 2 ? ' step-div-done' : '')}></span>
          <button className={'step' + (step === 2 ? ' step-on' : '')} onClick={() => setView('clv')}>
            <span className="step-num">2</span>
            <span className="step-text"><b>Analyze results</b><small>Explore impact &amp; opportunities</small></span>
          </button>
        </div>
        <div className="stepbar-right">
          <span className="status-pill">
            <span className={'status-dot' + (statusLabel === 'Saved' ? ' status-saved' : '')}></span>
            Model status <b>{statusLabel}</b>
          </span>
          <button className="summary-btn" onClick={onModelSummary}>⚖ Model summary</button>
        </div>
      </div>

      <div className="subtabs">
        <div className="subtabs-seg">
          {tabs.map((tb) => (
            <button key={tb.id} className={'subtab' + (view === tb.id ? ' subtab-on' : '')} onClick={() => setView(tb.id)}>
              {tb.label}
            </button>
          ))}
        </div>
      </div>

      {note && (
        <div className={'note note-' + note.tone}><span className="note-dot"></span>{note.text}</div>
      )}

      <div className="dash-body">
        {showRail && <FilterRail filters={filters} setFilters={setFilters} view={view} />}
        <div className="dash-content">
          {view === 'assumptions' && (
            <BaseAssumptionsView
              classes={classes} setClasses={setClasses}
              years={years} setYears={setYears}
              dirty={dirty} resetAssumptions={resetAssumptions}
              econ={econ} setEcon={setEcon}
            />
          )}
          {view === 'population' && (
            <PopulationView classes={classes} years={years} onPickPopulation={onPickPopulation} econ={econ} />
          )}
          {view === 'clv' && (
            <ClvView classes={classes} years={years} filters={filters} chartStyle={chartStyle} highlightClass={highlightClass} econ={econ} />
          )}
          {view === 'intervention' && (
            <InterventionView planner={planner} setPlanner={setPlanner} years={years} setYears={setYears} classes={classes} econ={econ} />
          )}
        </div>
      </div>

      <div className="actionbar">
        <div className="actionbar-left">
          <span className="saved-clock" aria-hidden="true">↻</span>
          <span className="saved-text">Last saved: {lastSaved}</span>
        </div>
        <div className="actionbar-right">
          {step === 1 ? (
            <>
              <button className="btn-ghost" onClick={resetAssumptions}>Reset to defaults</button>
              <button className="btn-primary" onClick={onSaveContinue}>Save &amp; continue to results <span aria-hidden="true">→</span></button>
            </>
          ) : (
            <button className="btn-ghost" onClick={() => setView('assumptions')}><span aria-hidden="true">←</span> Back to configure model</button>
          )}
        </div>
      </div>
    </main>
  )
}
