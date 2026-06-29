// Career path definitions — the living labor market tracks.
// Each path has named levels with rising base salaries and unlocked responsibilities.

export const CAREER_PATHS = [
  {
    key: 'corporate',
    name: 'Corporate',
    icon: '🏢',
    color: 'text-blue-400',
    accent: 'border-blue-500/40 bg-blue-900/20',
    description: 'Climb the corporate ladder from intern to chief executive.',
    levels: [
      { level: 1, title: 'Intern', salary: 1500, responsibility: 'Basic support tasks' },
      { level: 2, title: 'Trainee', salary: 2500, responsibility: 'Shadowing & learning' },
      { level: 3, title: 'Associate', salary: 4000, responsibility: 'Own small deliverables' },
      { level: 4, title: 'Specialist', salary: 6000, responsibility: 'Domain expertise' },
      { level: 5, title: 'Supervisor', salary: 9000, responsibility: 'Lead a small team' },
      { level: 6, title: 'Manager', salary: 13000, responsibility: 'Department oversight' },
      { level: 7, title: 'Director', salary: 20000, responsibility: 'Strategic planning' },
      { level: 8, title: 'Executive', salary: 32000, responsibility: 'Cross-org leadership' },
      { level: 9, title: 'CEO', salary: 50000, responsibility: 'Full organization control' },
    ],
  },
  {
    key: 'logistics',
    name: 'Logistics',
    icon: '🚚',
    color: 'text-amber-400',
    accent: 'border-amber-500/40 bg-amber-900/20',
    description: 'Move the goods that keep the empire running.',
    levels: [
      { level: 1, title: 'Driver', salary: 1800, responsibility: 'Local deliveries' },
      { level: 2, title: 'Dispatcher', salary: 3000, responsibility: 'Route coordination' },
      { level: 3, title: 'Fleet Coordinator', salary: 5000, responsibility: 'Vehicle scheduling' },
      { level: 4, title: 'Operations Manager', salary: 8000, responsibility: 'Warehouse ops' },
      { level: 5, title: 'Regional Director', salary: 14000, responsibility: 'Multi-region logistics' },
    ],
  },
  {
    key: 'security',
    name: 'Security',
    icon: '🛡️',
    color: 'text-red-400',
    accent: 'border-red-500/40 bg-red-900/20',
    description: 'Protect assets and run enforcement operations.',
    levels: [
      { level: 1, title: 'Guard', salary: 2000, responsibility: 'Asset patrol' },
      { level: 2, title: 'Team Lead', salary: 3500, responsibility: 'Squad command' },
      { level: 3, title: 'Operations Supervisor', salary: 6000, responsibility: 'Site security' },
      { level: 4, title: 'Security Director', salary: 11000, responsibility: 'Org-wide protection' },
    ],
  },
  {
    key: 'government',
    name: 'Government',
    icon: '🏛️',
    color: 'text-emerald-400',
    accent: 'border-emerald-500/40 bg-emerald-900/20',
    description: 'Public-sector roles that shape regional development.',
    levels: [
      { level: 1, title: 'Clerk', salary: 1700, responsibility: 'Administrative duties' },
      { level: 2, title: 'City Planner', salary: 4000, responsibility: 'Zoning & infrastructure' },
      { level: 3, title: 'Tax Inspector', salary: 6500, responsibility: 'Revenue enforcement' },
      { level: 4, title: 'Infrastructure Director', salary: 10000, responsibility: 'Public works' },
      { level: 5, title: 'Public Health Administrator', salary: 13000, responsibility: 'Health policy' },
      { level: 6, title: 'Economic Analyst', salary: 16000, responsibility: 'Regional forecasting' },
    ],
  },
  {
    key: 'entrepreneurship',
    name: 'Entrepreneurship',
    icon: '🚀',
    color: 'text-purple-400',
    accent: 'border-purple-500/40 bg-purple-900/20',
    description: 'Found your own organization and hire other players.',
    levels: [
      { level: 1, title: 'Founder', salary: 0, responsibility: 'Build from zero' },
      { level: 2, title: 'Owner-Operator', salary: 8000, responsibility: 'Run the business' },
      { level: 3, title: 'Magnate', salary: 25000, responsibility: 'Industry dominance' },
    ],
  },
];

export const getCareerPath = (key) => CAREER_PATHS.find((p) => p.key === key) || CAREER_PATHS[0];

export const getLevel = (pathKey, level) => {
  const path = getCareerPath(pathKey);
  return path.levels.find((l) => l.level === level) || path.levels[0];
};

export const getNextLevel = (pathKey, level) => {
  const path = getCareerPath(pathKey);
  return path.levels.find((l) => l.level === level + 1) || null;
};

// XP required to be eligible for promotion to the next level.
export const xpToPromote = (currentLevel) => 500 + currentLevel * 250;

// Government / NPC organizations that post jobs in the internal market.
export const EMPLOYERS = [
  { name: 'Meridian Holdings', type: 'organization', path: 'corporate' },
  { name: 'Apex Logistics Group', type: 'organization', path: 'logistics' },
  { name: 'Ironline Security', type: 'organization', path: 'security' },
  { name: 'City Hall — Public Works', type: 'government', path: 'government' },
  { name: 'Regional Revenue Authority', type: 'government', path: 'government' },
  { name: 'Harborfront Trading Co.', type: 'organization', path: 'logistics' },
  { name: 'Vanguard Capital', type: 'organization', path: 'corporate' },
];