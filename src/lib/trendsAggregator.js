// Aggregates transaction and employment data into time-series trend points

const CRIMINAL_TYPES = ['heist_payout', 'crew_payment'];
const WEALTH_TYPES = ['enterprise_revenue', 'territory_income', 'sale'];

function dayKey(dateStr) {
  const d = new Date(dateStr);
  return d.toISOString().slice(0, 10);
}

function formatDay(key) {
  const d = new Date(key);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function aggregatePayoutTrends(transactions) {
  const buckets = {};
  transactions.forEach((tx) => {
    if (!tx.created_date) return;
    const key = dayKey(tx.created_date);
    if (!buckets[key]) buckets[key] = { date: key, criminal: 0, wealth: 0 };
    const amount = tx.amount || 0;
    if (CRIMINAL_TYPES.includes(tx.transaction_type)) {
      buckets[key].criminal += amount;
    } else if (WEALTH_TYPES.includes(tx.transaction_type)) {
      buckets[key].wealth += amount;
    }
  });
  return Object.values(buckets)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((b) => ({ ...b, date: formatDay(b.date) }));
}

export function aggregateCareerSalaries(employments) {
  const byPath = {};
  employments.forEach((emp) => {
    if (emp.employment_status === 'unemployed' || emp.employment_status === 'seeking') return;
    const path = emp.career_path || 'corporate';
    if (!byPath[path]) byPath[path] = { path, totalSalary: 0, count: 0 };
    byPath[path].totalSalary += emp.salary || 0;
    byPath[path].count += 1;
  });
  return Object.values(byPath).map((p) => ({
    path: p.path,
    avgSalary: p.count ? Math.round(p.totalSalary / p.count) : 0,
    count: p.count,
  }));
}