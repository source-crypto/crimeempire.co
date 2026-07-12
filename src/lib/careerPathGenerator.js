// Career Path Generator — generates unique lawful & criminal career paths with
// skill requirements, entry-level descriptions, and payout structures.
// Lawful paths pay into buy_power (clean); criminal paths pay into crypto (dirty).

const TRACKS = [
  {
    id: 'corporate_finance', name: 'Corporate Finance Analyst', track: 'lawful', icon: '📊',
    color: 'text-blue-400', accent: 'border-blue-500/40 bg-blue-900/20',
    description: 'Climb the legitimate financial sector — manage portfolios and execute trades.',
    skillRequirements: [{ skill: 'Finance', level: 3 }, { skill: 'Negotiation', level: 2 }],
    entryDescription: 'Review quarterly portfolios and execute low-risk trades under a senior analyst at a downtown investment firm.',
    payout: { currency: 'buy_power', baseSalary: 4200, payType: 'fixed', bonus: 800, note: 'Quarterly performance bonus + 5% pension' },
    progression: ['Junior Analyst', 'Analyst', 'Senior Analyst', 'Portfolio Manager', 'VP of Finance', 'CFO'],
    employer: 'Vanguard Capital', careerPath: 'corporate',
  },
  {
    id: 'gov_tax', name: 'Government Tax Inspector', track: 'lawful', icon: '🏛️',
    color: 'text-emerald-400', accent: 'border-emerald-500/40 bg-emerald-900/20',
    description: 'Public-sector revenue enforcement — audit filings and flag discrepancies.',
    skillRequirements: [{ skill: 'Finance', level: 2 }, { skill: 'Intimidation', level: 1 }],
    entryDescription: 'Audit regional tax filings, verify deductions, and flag suspicious discrepancies for the review board.',
    payout: { currency: 'buy_power', baseSalary: 3600, payType: 'fixed', bonus: 0, note: 'Pension accrual + job security' },
    progression: ['Clerk', 'Tax Inspector', 'Senior Inspector', 'Audit Lead', 'Regional Director'],
    employer: 'Regional Revenue Authority', careerPath: 'government',
  },
  {
    id: 'corporate_cyber', name: 'Corporate Cybersecurity Engineer', track: 'lawful', icon: '🛡️',
    color: 'text-cyan-400', accent: 'border-cyan-500/40 bg-cyan-900/20',
    description: 'Defend corporate networks — patch vulnerabilities and monitor intrusions.',
    skillRequirements: [{ skill: 'Hacking', level: 3 }, { skill: 'Engineering', level: 2 }],
    entryDescription: 'Monitor corporate networks on the day shift, patch vulnerabilities, and respond to intrusion alerts.',
    payout: { currency: 'buy_power', baseSalary: 5200, payType: 'fixed', bonus: 1200, note: 'On-call bonus + certification pay' },
    progression: ['Junior Engineer', 'Security Engineer', 'Senior Engineer', 'SecOps Lead', 'CISO'],
    employer: 'Meridian Holdings', careerPath: 'corporate',
  },
  {
    id: 'legit_logistics', name: 'Logistics Coordinator', track: 'lawful', icon: '📦',
    color: 'text-indigo-400', accent: 'border-indigo-500/40 bg-indigo-900/20',
    description: 'Run legitimate freight scheduling and vendor contracts.',
    skillRequirements: [{ skill: 'Logistics', level: 3 }, { skill: 'Leadership', level: 1 }],
    entryDescription: 'Schedule legitimate freight routes, manage vendor contracts, and resolve delivery exceptions.',
    payout: { currency: 'buy_power', baseSalary: 3400, payType: 'fixed', bonus: 500, note: 'Route efficiency bonus' },
    progression: ['Coordinator', 'Senior Coordinator', 'Ops Supervisor', 'Regional Manager'],
    employer: 'Harborfront Trading Co.', careerPath: 'logistics',
  },
  {
    id: 'smuggler', name: 'Contraband Smuggler', track: 'criminal', icon: '🚚',
    color: 'text-amber-400', accent: 'border-amber-500/40 bg-amber-900/20',
    description: 'Move sealed cargo across district lines under cover of darkness.',
    skillRequirements: [{ skill: 'Logistics', level: 3 }, { skill: 'Stealth', level: 2 }],
    entryDescription: 'Move sealed cargo across district lines under cover of night; get it to the drop before patrols sweep.',
    payout: { currency: 'crypto', baseSalary: 6000, payType: 'fixed', bonus: 1500, note: 'Per-run bonus + heat risk' },
    progression: ['Courier', 'Smuggler', 'Route Boss', 'Distribution Network Lead'],
    employer: 'Apex Logistics Group', careerPath: 'logistics',
    repGate: { field: 'underworld_respect', min: 10 },
  },
  {
    id: 'enforcer', name: 'Crew Enforcer', track: 'criminal', icon: '👊',
    color: 'text-red-400', accent: 'border-red-500/40 bg-red-900/20',
    description: 'Collect debts and discourage rival encroachment on crew turf.',
    skillRequirements: [{ skill: 'Combat', level: 3 }, { skill: 'Intimidation', level: 2 }],
    entryDescription: 'Collect outstanding debts, discourage rival encroachment, and enforce crew policy on the block.',
    payout: { currency: 'crypto', baseSalary: 4500, payType: 'fixed', bonus: 1000, note: 'Collection commission 10%' },
    progression: ['Muscle', 'Enforcer', 'Lieutenant', 'Crew Captain'],
    employer: 'Ironline Security', careerPath: 'security',
    repGate: { field: 'street_credibility', min: 10 },
  },
  {
    id: 'broker', name: 'Black Market Broker', track: 'criminal', icon: '💊',
    color: 'text-purple-400', accent: 'border-purple-500/40 bg-purple-900/20',
    description: 'Move high-value product through the exchange and launder proceeds.',
    skillRequirements: [{ skill: 'Negotiation', level: 3 }, { skill: 'Finance', level: 2 }],
    entryDescription: 'Move high-value product through the black market exchange, negotiate bulk deals, and launder the proceeds.',
    payout: { currency: 'crypto', baseSalary: 7000, payType: 'fixed', bonus: 3000, note: '10% commission on moved volume' },
    progression: ['Peddler', 'Broker', 'Senior Broker', 'Distribution Kingpin'],
    employer: 'Independent', careerPath: 'entrepreneurship',
    repGate: { field: 'underworld_respect', min: 20 },
  },
  {
    id: 'hacker_for_hire', name: 'Hacker For Hire', track: 'criminal', icon: '💻',
    color: 'text-green-400', accent: 'border-green-500/40 bg-green-900/20',
    description: 'Breach rival systems and exfiltrate intelligence for paying clients.',
    skillRequirements: [{ skill: 'Hacking', level: 4 }, { skill: 'Stealth', level: 1 }],
    entryDescription: 'Breach rival systems, exfiltrate intelligence, and cover your tracks for paying clients on the dark web.',
    payout: { currency: 'crypto', baseSalary: 5500, payType: 'fixed', bonus: 2000, note: 'Per-contract bounty' },
    progression: ['Script Kiddie', 'Hacker', 'Black Hat', 'Cyber Syndicate Lead'],
    employer: 'Independent', careerPath: 'entrepreneurship',
    repGate: { field: 'hacker_network_status', min: 10 },
  },
  {
    id: 'wheelman', name: 'Crew Wheelman', track: 'criminal', icon: '🏎️',
    color: 'text-orange-400', accent: 'border-orange-500/40 bg-orange-900/20',
    description: 'Get crews in and out of hot zones without a plate read.',
    skillRequirements: [{ skill: 'Logistics', level: 2 }, { skill: 'Stealth', level: 2 }, { skill: 'Combat', level: 1 }],
    entryDescription: 'Get crews in and out of hot zones fast — no plate reads, no chases, no witnesses.',
    payout: { currency: 'crypto', baseSalary: 4000, payType: 'fixed', bonus: 1200, note: 'Per-job hazard pay' },
    progression: ['Driver', 'Wheelman', 'Getaway Specialist', 'Fleet Boss'],
    employer: 'Independent', careerPath: 'logistics',
    repGate: { field: 'street_credibility', min: 5 },
  },
  {
    id: 'corrupt_official', name: 'Corrupt Official', track: 'criminal', icon: '🤝',
    color: 'text-rose-400', accent: 'border-rose-500/40 bg-rose-900/20',
    description: 'Sell zoning approvals and look the other way for a cut.',
    skillRequirements: [{ skill: 'Negotiation', level: 3 }, { skill: 'Finance', level: 2 }],
    entryDescription: 'Sell zoning approvals, expedite permits, and look the other way — for a generous cut of the proceeds.',
    payout: { currency: 'crypto', baseSalary: 8000, payType: 'fixed', bonus: 4000, note: 'Bribes + kickbacks' },
    progression: ['Clerk (on the take)', 'Inspector (compromised)', 'Director (bought)', 'Political Fixer'],
    employer: 'City Hall', careerPath: 'government',
    repGate: { field: 'government_infiltration', min: 15 },
  },
];

export function generateCareerPaths(playerSkills = [], reputation = {}) {
  const skillMap = {};
  playerSkills.forEach(s => {
    if (s.skill_name) skillMap[s.skill_name] = s.level || (s.proficiency ? Math.ceil(s.proficiency / 10) : 1);
  });
  return TRACKS.map(t => {
    const skillRequirements = t.skillRequirements.map(r => ({
      skill: r.skill, level: r.level, current: skillMap[r.skill] || 0, met: (skillMap[r.skill] || 0) >= r.level,
    }));
    const skillsMet = skillRequirements.every(r => r.met);
    let repMet = true, repValue = 0;
    if (t.repGate) {
      repValue = reputation[t.repGate.field] ?? 0;
      repMet = repValue >= t.repGate.min;
    }
    const eligible = skillsMet && repMet;
    const blockReason = !skillsMet ? 'Skill requirements not met' : !repMet ? `Needs ${t.repGate.field.replace(/_/g, ' ')} ≥ ${t.repGate.min}` : null;
    return { ...t, skillRequirements, eligible, blockReason, repValue };
  });
}