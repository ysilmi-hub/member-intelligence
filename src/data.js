export const fmtUSD = (n) => {
  if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(n % 1e9 === 0 ? 0 : 1) + 'B'
  if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(n % 1e6 === 0 ? 0 : 1) + 'M'
  if (Math.abs(n) >= 1e3) return '$' + Math.round(n / 1e3) + 'K'
  return '$' + Math.round(n).toLocaleString()
}

export const fmtUSDfull = (n) => '$' + Math.round(n).toLocaleString()

export const FILTER_GROUPS = [
  { id: 'military', label: 'Military status', options: ['Active', 'Veteran', 'Civilian'] },
  { id: 'base',     label: 'On base',         options: ['On-base', 'Off-base'] },
  { id: 'age',      label: 'Age',             options: ['18–25', '25–45', '45–65', '65+'] },
  { id: 'gender',   label: 'Gender',          options: ['M', 'F', 'Other'] },
  { id: 'income',   label: 'Income',          options: ['<$50K', '$50–100K', '$100K+'] },
  { id: 'location', label: 'Location',        options: ['Urban', 'Rural', 'North', 'South', 'East', 'West'] },
  { id: 'family',   label: 'Family status',   options: ['No kids', '1–2 kids', '3+ kids'] },
  { id: 'products', label: 'Products',        options: ['Checking', 'Savings', 'Mortgage', 'Auto loan', 'CC'] },
]

export const DEFAULT_FILTERS = {
  military: ['Active'],
  base: [],
  age: ['25–45'],
  gender: [],
  income: ['$50–100K'],
  location: ['Urban'],
  family: [],
  products: ['Checking'],
}

export const PLANNER = {
  cohort: 10000,
  cost: 5_000_000,
}

export const SUGGESTED = [
  'Show me members at risk of churn',
  'Which members have the highest growth potential?',
  'Tell me about young military families',
  'Find members with low engagement but high CLV',
  'What intervention would increase checking adoption?',
  'Create a test plan for first-year members',
]

export const SCRIPTS = [
  {
    keys: ['churn', 'at risk', 'risk of'],
    build: () => ({
      action: {
        view: 'clv',
        filters: { military: ['Active'], age: ['25–45'], income: ['$50–100K'], location: ['Urban'], products: ['Checking'], base: [], gender: [], family: [] },
        highlightClass: 'Detractor',
        note: { tone: 'warn', text: '4,210 members flagged at elevated churn risk in this cohort' },
      },
      message: {
        lead: 'I scanned the cohort for early churn signals — declining login frequency, single-product relationships, and NPS slippage. **4,210 members (≈18%)** sit in the elevated-risk band, concentrated in the Detractor and Passive classes.',
        findings: [
          'Detractors hold an avg CLV of just **$1,200** — 40% below cohort average.',
          'Single-product (Checking-only) members churn at **2.6×** the rate of 3+ product members.',
          'Risk spikes in months 9–14 of tenure, before the first cross-sell typically lands.',
        ],
        recommendation: {
          title: 'Recommended next step',
          body: 'Target the single-product Detractor segment with a fee-waiver + savings auto-enroll offer. Model it in the Intervention Planner to size break-even.',
        },
        chips: ['Model a retention intervention', 'Find members with low engagement but high CLV'],
      },
    }),
  },
  {
    keys: ['growth potential', 'highest growth', 'upside'],
    build: () => ({
      action: {
        view: 'clv',
        filters: { military: ['Active'], age: ['25–45'], income: ['$50–100K'], location: ['Urban'], products: ['Checking'], base: ['On-base'], gender: [], family: ['1–2 kids'] },
        highlightClass: 'Promoter',
        note: { tone: 'good', text: 'Top growth segment: 2,640 Promoters with 2 products and rising income' },
      },
      message: {
        lead: 'Highest growth potential clusters in **Promoters who hold exactly 2 products** and show rising deposit balances. There are **2,640** such members — each within reach of a mortgage or auto-loan attach.',
        findings: [
          'These members average **$5,000 CLV** today with headroom to **$8,400** at 3+ products.',
          'Income trending up: **62%** moved into the $50–100K band in the last 18 months.',
          'They already refer at **1.7×** the cohort rate — strong advocacy to amplify.',
        ],
        recommendation: {
          title: 'Recommended next step',
          body: 'Launch a pre-approved mortgage / auto-loan nudge for this segment. Each +1.0 product holding is worth ~$900/member/yr.',
        },
        chips: ['What intervention would increase checking adoption?', 'Create a test plan for first-year members'],
      },
    }),
  },
  {
    keys: ['young military', 'military families', 'young families'],
    build: () => ({
      action: {
        view: 'clv',
        filters: { military: ['Active'], age: ['25–45'], base: ['On-base'], family: ['1–2 kids'], income: ['$50–100K'], location: [], gender: [], products: ['Savings'] },
        highlightClass: 'Promoter',
        note: { tone: 'info', text: 'Segment: Young military families — 3,180 members, avg tenure 4.2 yrs' },
      },
      message: {
        lead: 'Here is the **young military families** segment — active-duty members aged 25–45, on-base, with 1–2 kids. It is **3,180 members** strong and one of the most loyal, fastest-compounding groups in the book.',
        findings: [
          'Avg CLV **$3,400**, climbing as households add auto loans and first mortgages.',
          'NPS of **61** — well above the cohort\'s 50; high promoter density.',
          'Underpenetrated on **CC and mortgage** — only 1.2 of those products held on average.',
        ],
        recommendation: {
          title: 'Segment summary',
          body: 'Loyal, growing, advocacy-rich, but under-cross-sold. Best ROI lever is lifecycle product education tied to PCS moves and family milestones.',
        },
        chips: ['Which members have the highest growth potential?', 'Create a test plan for first-year members'],
      },
    }),
  },
  {
    keys: ['low engagement', 'high clv', 'low engagement but high'],
    build: () => ({
      action: {
        view: 'clv',
        filters: { military: ['Veteran'], age: ['45–65'], income: ['$100K+'], location: ['Urban'], products: ['Mortgage'], base: [], gender: [], family: [] },
        highlightClass: 'Super promoter',
        note: { tone: 'warn', text: '890 high-CLV members with low engagement — quiet attrition risk' },
      },
      message: {
        lead: 'The "quiet valuable" segment: **890 members** with top-quartile CLV but bottom-quartile engagement (few logins, no recent product changes). High value, but drifting.',
        findings: [
          'Avg CLV **$7,800** — these are Super promoters and Promoters by value.',
          'But **0 digital actions** in the last 60 days for 71% of them.',
          'Disproportionately Veterans, 45–65, holding mortgage + deposits.',
        ],
        recommendation: {
          title: 'Recommended next step',
          body: 'Re-engage with a high-touch relationship outreach (not mass email). Even a small NPS lift here protects outsized CLV — model it in the planner.',
        },
        chips: ['Model a retention intervention', 'Show me members at risk of churn'],
      },
    }),
  },
  {
    keys: ['checking adoption', 'increase checking', 'adoption of checking', 'checking account'],
    build: () => ({
      action: {
        view: 'intervention',
        filters: { military: ['Active'], age: ['25–45'], income: ['$50–100K'], location: ['Urban'], products: ['Savings'], base: [], gender: [], family: [] },
        planner: { nps: 4 },
        note: { tone: 'info', text: 'Modeling: checking auto-enroll for savings-only members' },
      },
      message: {
        lead: 'The strongest checking-adoption lever is **direct-deposit auto-enroll** for savings-only members, paired with a first-90-days fee waiver. I\'ve loaded it into the Intervention Planner as a +0.4 product-holdings uplift.',
        findings: [
          'Savings-only members who add checking lift CLV by **~$900/yr** on average.',
          'Direct-deposit attach is the single biggest predictor of multi-product retention.',
          'Cohort affected: **10,000 members/yr**; modeled cost $5M annual.',
        ],
        recommendation: {
          title: 'How to read the planner',
          body: 'Drag the Product holdings slider in Panel B. Anything right of "break even" means the adoption lift more than pays for the $5M program.',
        },
        chips: ['Create a test plan for first-year members', 'Which members have the highest growth potential?'],
      },
    }),
  },
  {
    keys: ['test plan', 'experiment', 'first-year', 'first year', 'create a test'],
    build: () => ({
      action: {
        view: 'intervention',
        filters: { military: ['Active'], age: ['25–45'], income: ['$50–100K'], location: [], base: [], gender: [], family: [], products: ['Checking'] },
        planner: { nps: 6 },
        note: { tone: 'good', text: 'Test plan loaded: first-year onboarding program (10,000/yr)' },
      },
      message: {
        lead: 'Here\'s a **first-year onboarding test plan**. I\'ve pre-loaded plausible uplift assumptions into both planner panels so you can pressure-test break-even.',
        findings: [
          '**Hypothesis:** a structured 12-month onboarding (milestone nudges + 1 proactive outreach) lifts retention and cross-sell.',
          '**Design:** 50/50 holdout, 10,000 first-year members/yr, 12-month read, $5M program cost.',
          '**Primary metric:** product holdings; **guardrails:** NPS, complaint rate.',
        ],
        recommendation: {
          title: 'Modeled uplift (editable)',
          body: '+6 NPS pts, +0.5 yr retention, +2 referrals/lifetime, +0.3 products. Adjust the sliders to see how much lift you actually need to clear break-even.',
        },
        chips: ['What intervention would increase checking adoption?', 'Show me members at risk of churn'],
      },
    }),
  },
]

export function matchScript(text) {
  const t = text.toLowerCase()
  for (const s of SCRIPTS) {
    if (s.keys.some((k) => t.includes(k))) return s
  }
  return null
}
