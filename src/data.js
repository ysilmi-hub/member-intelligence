export const fmtUSD = (n) => {
  if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(n % 1e9 === 0 ? 0 : 1) + 'B'
  if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(n % 1e6 === 0 ? 0 : 1) + 'M'
  if (Math.abs(n) >= 1e3) return '$' + Math.round(n / 1e3) + 'K'
  return '$' + Math.round(n).toLocaleString()
}

export const fmtUSDfull = (n) => '$' + Math.round(n).toLocaleString()

export const FILTER_GROUPS = [
  { id: 'age',      label: 'Age',             options: ['18-34', '35-54', '55+'] },
  { id: 'income',   label: 'Income',          options: ['<$50k', '$50k-$100k', '$100k+'] },
  { id: 'military', label: 'Military status', options: ['Civilian', 'Military On-Base', 'Military Off-Base'] },
  { id: 'gender',   label: 'Gender',          options: ['Female', 'Male', 'Non-binary/Other'] },
  { id: 'family',   label: 'Family status',   options: ['Single', 'Married No Kids', 'Married With Kids', 'Single Parent'] },
  { id: 'location', label: 'Location',        options: ['Northeast', 'Southeast', 'Midwest', 'Southwest', 'West', 'International'] },
  { id: 'products', label: 'Products held',   options: ['Checking', 'Savings', 'Auto Loan', 'Credit Card', 'Mortgage', 'Investment', 'Personal Loan'] },
]

export const DEFAULT_FILTERS = {
  age: [], income: [], military: [], gender: [], family: [], location: [], products: [],
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
        filters: { income: ['<$50k'], age: ['18-34'], products: ['Checking'] },
        highlightClass: 'Detractor',
        note: { tone: 'warn', text: '1,356 Detractors flag the highest churn risk in the book' },
      },
      message: {
        lead: 'I scanned the book for early churn signals — high attrition probability, single-product relationships, and low NPS. The **1,356 Detractors (14% of members)** carry **3× the base churn rate**, and the risk concentrates in younger, lower-income, single-product members.',
        findings: [
          'Detractors average just **$1,177 CLV** — about **70% below** the $3,891 book average.',
          'Detractor churn runs **7.2%/yr vs 2.4%** for the base — and they hold only **1.4 products**.',
          'Under-35, sub-$50k members churn at **1.6–1.7×** the base rate.',
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
        filters: { income: ['$50k-$100k'], age: ['35-54'], products: ['Auto Loan'] },
        highlightClass: 'Promoter',
        note: { tone: 'good', text: 'Top growth segment: 3,721 Promoters one tier below Super promoter' },
      },
      message: {
        lead: 'The biggest growth pool is the **3,721 Promoters** — already loyal (0.9% churn) and holding **3.4 products**, but one tier below Super promoters. Moving them up is worth the most CLV in aggregate.',
        findings: [
          'Promoters average **$4,907 CLV** today, with headroom to **$7,391** at Super-promoter behavior.',
          'They already generate **10 positive word-of-mouth mentions/yr** — strong advocacy to amplify.',
          'Mortgage and Investment holders index highest on CLV (**1.17×** base) — prime cross-sell targets.',
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
        filters: { military: ['Military On-Base'], age: ['18-34'], family: ['Married With Kids'] },
        highlightClass: 'Promoter',
        note: { tone: 'info', text: 'Segment: young on-base military families — high NPS, high loyalty' },
      },
      message: {
        lead: 'Here is the **young military families** segment — on-base active-duty members under 35 with kids. On-base members are the strongest population in the book: **NPS effects far above average and the lowest churn**.',
        findings: [
          'On-base members run churn at just **0.26×** the base rate — exceptionally loyal.',
          'They index **+13% on positive word of mouth** and **+9% on product holdings**.',
          'Still room to deepen — Investment and Mortgage attach lifts CLV most for this group.',
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
        filters: { income: ['$100k+'], age: ['55+'], products: ['Mortgage'] },
        highlightClass: 'Super promoter',
        note: { tone: 'warn', text: 'High-value 55+ / $100k+ members — protect against quiet attrition' },
      },
      message: {
        lead: 'The "quiet valuable" segment: **high-income members 55+**. They carry the highest CLV in the book but the lowest engagement signals — high value, easy to take for granted.',
        findings: [
          'High-income members index **1.68×** on CLV; 55+ members **1.41×** — both well above base.',
          'Super promoters average **$7,391 CLV** — **6×** a Detractor.',
          'These groups show the **lowest churn (0.4× base)** — but outsized value means even small slippage is costly.',
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
        filters: { products: ['Savings'] },
        planner: { nps: 4 },
        note: { tone: 'info', text: 'Modeling: checking + direct-deposit attach for savings-only members' },
      },
      message: {
        lead: 'The strongest checking-adoption lever is **direct-deposit auto-enroll** paired with a first-90-days fee waiver. Members who hold Checking index **+19% on product holdings** and **−27% on churn** — it\'s a primacy anchor.',
        findings: [
          'Checking holders carry **1.15×** the base CLV — adding it lifts value and retention together.',
          'Direct-deposit attach is the single biggest predictor of a primary relationship.',
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
        filters: { age: ['18-34'], products: ['Checking'] },
        planner: { nps: 6 },
        note: { tone: 'good', text: 'Test plan loaded: first-year onboarding program (10,000/yr)' },
      },
      message: {
        lead: 'Here\'s a **first-year onboarding test plan**, focused on younger members where churn risk is highest. I\'ve pre-loaded a +6 NPS assumption so you can pressure-test break-even.',
        findings: [
          '**Hypothesis:** a structured 12-month onboarding (milestone nudges + 1 proactive outreach) lifts retention and cross-sell.',
          '**Design:** 50/50 holdout, 10,000 first-year members/yr, 12-month read, $5M program cost.',
          '**Primary metric:** product holdings; **guardrails:** NPS, churn rate.',
        ],
        recommendation: {
          title: 'Modeled uplift (editable)',
          body: 'A +6 NPS lift flows through to lower churn, more word of mouth, and higher holdings. Drag any driver to see how much lift you actually need to clear break-even.',
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
