/* global React, window */
// ---------------------------------------------------------------------------
// Right panel — interactive dashboard (filter rail + two views)
// ---------------------------------------------------------------------------
const { useState: useStateD } = React;

// ---- Filter rail -----------------------------------------------------------
function FilterRail({ filters, setFilters, view }) {
  const toggle = (group, opt) => {
    setFilters((prev) => {
      const cur = prev[group] || [];
      // single-select per group: clicking the active pill clears it, otherwise replace
      const next = cur.includes(opt) ? [] : [opt];
      return { ...prev, [group]: next };
    });
  };
  return (
    <div className="rail">
      <div className="rail-head">{view === 'intervention' ? 'Cohort baseline' : 'Filters'}</div>
      {window.FILTER_GROUPS.map((g) => (
        <div className="rail-group" key={g.id}>
          <div className="rail-label">{g.label}</div>
          <div className="rail-pills">
            {g.options.map((opt) => {
              const on = (filters[g.id] || []).includes(opt);
              return (
                <button
                  key={opt}
                  className={'pill' + (on ? ' pill-on' : '')}
                  onClick={() => toggle(g.id, opt)}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---- CLV / value view ------------------------------------------------------
function Kpi({ k }) {
  return (
    <div className="kpi">
      <div className="kpi-label">{k.label}</div>
      <div className="kpi-value num">{k.value}</div>
      <div className={'kpi-delta' + (k.up ? ' up' : '')}>{k.delta}</div>
    </div>
  );
}

function ClvView({ highlightClass, chartStyle }) {
  const D = window.CLV_VIEW;
  const max = Math.max(...D.classes.map((c) => c.value));
  return (
    <div className="view">
      <div className="view-head">
        <h1 className="view-title">{D.title}</h1>
        <p className="view-sub">{D.subtitle}</p>
      </div>

      <div className="kpi-row">
        {D.kpis.map((k) => <Kpi key={k.id} k={k} />)}
      </div>

      <div className="clv-stack">
        <section className="card">
          <h2 className="card-title">CLV by member class</h2>
          <div className="bars">
            {D.classes.map((c) => {
              const hot = c.name === highlightClass;
              return (
                <div className={'bar-row' + (hot ? ' bar-hot' : '')} key={c.name}>
                  <div className="bar-name">{c.name}{hot && <span className="bar-tag">focus</span>}</div>
                  <div className="bar-track">
                    {chartStyle === 'dots' ? (
                      <div className="dots">
                        {Array.from({ length: 10 }).map((_, i) => (
                          <span key={i} className={'dot' + (i < Math.round((c.value / max) * 10) ? ' dot-on' : '')}></span>
                        ))}
                      </div>
                    ) : (
                      <div className="bar-fill" style={{ width: (c.value / max) * 100 + '%' }}></div>
                    )}
                  </div>
                  <div className="bar-val num">{window.fmtUSDfull(c.value)}</div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="card">
          <h2 className="card-title">Additional metrics</h2>
          <div className="addl">
            {D.additional.map((a) => (
              <div className={'addl-tile' + (a.wide ? ' addl-wide' : '')} key={a.label}>
                <div className="addl-label">{a.label}</div>
                <div className="addl-value num">{a.value}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

// ---- Intervention / Test Planner view -------------------------------------
function BreakEven({ net }) {
  // map net value to -1..1 position; cost magnitude as scale reference
  const scale = window.PLANNER.cost * 2;
  const pos = Math.max(-1, Math.min(1, net / scale));
  const left = 50 + pos * 48;
  const positive = net > 0;
  const zero = Math.abs(net) < 1;
  return (
    <div className="be">
      <div className="be-track">
        <div className="be-mid"></div>
        <div
          className={'be-marker' + (zero ? '' : positive ? ' be-pos' : ' be-neg')}
          style={{ left: left + '%' }}
        ></div>
      </div>
      <div className="be-legend">
        <span>–</span><span className="be-center">break even</span><span>+</span>
      </div>
    </div>
  );
}

function Slider({ label, value, min, max, step, display, onChange, loLabel, hiLabel }) {
  return (
    <div className="sld">
      <div className="sld-top">
        <span className="sld-label">{label}</span>
        <span className="sld-val num">{display}</span>
      </div>
      <input
        type="range" className="range"
        min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
      <div className="sld-ends"><span>{loLabel}</span><span>{hiLabel}</span></div>
    </div>
  );
}

function ValueReadout({ value, net, hint }) {
  if (value == null) {
    return (
      <div className="readout">
        <div className="readout-label">Estimated annual value</div>
        <div className="readout-dash">—</div>
        <div className="readout-hint">{hint}</div>
      </div>
    );
  }
  const positive = net >= 0;
  return (
    <div className={'readout' + (positive ? ' readout-pos' : ' readout-neg')}>
      <div className="readout-label">Estimated annual value</div>
      <div className="readout-value num">{window.fmtUSD(value)}</div>
      <div className="readout-net">
        {positive ? 'Net ' : 'Short '}<strong>{window.fmtUSD(Math.abs(net))}</strong>
        {positive ? ' above the $5M cost' : ' below break-even'}
      </div>
    </div>
  );
}

function InterventionView({ planner, setPlanner }) {
  const P = window.PLANNER;
  const npsValue = planner.nps * P.nps.valuePerPoint * P.cohort;
  const npsNet = npsValue - P.cost;

  const directValue =
    (planner.tenure * P.tenure.valuePerYear +
      planner.referral * P.referral.valuePerReferral +
      planner.holdings * P.holdings.valuePerProduct) * P.cohort;
  const directNet = directValue - P.cost;

  const npsTouched = planner.nps > 0;
  const directTouched = planner.tenure > 0 || planner.referral > 0 || planner.holdings > 0;

  return (
    <div className="view">
      <div className="view-head">
        <h1 className="view-title">Intervention planner</h1>
        <p className="view-sub">Calculate whether a policy, product, or program change is worth the cost</p>
      </div>

      <div className="kpi-row kpi-row-2">
        <div className="kpi">
          <div className="kpi-label">Cohort affected</div>
          <div className="kpi-value num">{P.cohort.toLocaleString()}</div>
          <div className="kpi-delta">members / year</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Direct cost of intervention</div>
          <div className="kpi-value num">{window.fmtUSD(P.cost)}</div>
          <div className="kpi-delta">annual</div>
        </div>
      </div>

      <div className="card-row">
        <section className="card">
          <h2 className="card-title">NPS sensitivity</h2>
          <p className="card-sub">How much does NPS need to move?</p>
          <Slider
            label="NPS uplift (points)" value={planner.nps}
            min={P.nps.min} max={P.nps.max} step={P.nps.step}
            display={'+' + planner.nps + ' pt'} loLabel="no change" hiLabel="+20 pts"
            onChange={(v) => setPlanner({ ...planner, nps: v })}
          />
          <BreakEven net={npsTouched ? npsNet : 0} />
          <ValueReadout
            value={npsTouched ? npsValue : null} net={npsNet}
            hint="Move the slider to see the break-even"
          />
        </section>

        <section className="card">
          <h2 className="card-title">Direct metric uplift</h2>
          <p className="card-sub">Adjust the three core metrics</p>
          <Slider
            label="Retention / tenure uplift" value={planner.tenure}
            min={P.tenure.min} max={P.tenure.max} step={P.tenure.step}
            display={'+' + planner.tenure.toFixed(1) + ' yrs'} loLabel="no change" hiLabel="+4 yrs"
            onChange={(v) => setPlanner({ ...planner, tenure: v })}
          />
          <Slider
            label="Referral rate uplift" value={planner.referral}
            min={P.referral.min} max={P.referral.max} step={P.referral.step}
            display={'+' + planner.referral + ' people'} loLabel="no change" hiLabel="+10 / lifetime"
            onChange={(v) => setPlanner({ ...planner, referral: v })}
          />
          <Slider
            label="Product holdings uplift" value={planner.holdings}
            min={P.holdings.min} max={P.holdings.max} step={P.holdings.step}
            display={'+' + planner.holdings.toFixed(1)} loLabel="no change" hiLabel="+1.0 products"
            onChange={(v) => setPlanner({ ...planner, holdings: v })}
          />
          <BreakEven net={directTouched ? directNet : 0} />
          <ValueReadout
            value={directTouched ? directValue : null} net={directNet}
            hint="Move the sliders to see the break-even"
          />
        </section>
      </div>
    </div>
  );
}

// ---- Dashboard shell -------------------------------------------------------
function Dashboard({ view, setView, filters, setFilters, planner, setPlanner, highlightClass, note, chartStyle }) {
  return (
    <main className="dash">
      <div className="dash-topbar">
        <div className="tabs">
          <button className={'tab' + (view === 'clv' ? ' tab-on' : '')} onClick={() => setView('clv')}>
            Member value
          </button>
          <button className={'tab' + (view === 'intervention' ? ' tab-on' : '')} onClick={() => setView('intervention')}>
            Intervention planner
          </button>
        </div>
        <div className="topbar-right">
          <span className="cohort-chip" title="Active cohort">
            {Object.values(filters).flat().slice(0, 3).join(' · ') || 'All members'}
            {Object.values(filters).flat().length > 3 ? ' +' + (Object.values(filters).flat().length - 3) : ''}
          </span>
        </div>
      </div>

      {note && (
        <div className={'note note-' + note.tone}>
          <span className="note-dot"></span>{note.text}
        </div>
      )}

      <div className="dash-body">
        <FilterRail filters={filters} setFilters={setFilters} view={view} />
        <div className="dash-content">
          {view === 'clv'
            ? <ClvView highlightClass={highlightClass} chartStyle={chartStyle} />
            : <InterventionView planner={planner} setPlanner={setPlanner} />}
        </div>
      </div>
    </main>
  );
}

window.Dashboard = Dashboard;
