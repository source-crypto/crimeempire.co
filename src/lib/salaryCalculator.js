// Automated salary calculator — computes employee payouts from performance ratings.
// Lawful (corporate/government) roles pay into buy_power with tax + pension.
// Criminal (logistics/security/entrepreneurship) roles pay into crypto with
// launderer cuts and heat-risk multipliers.
import { LAWFUL_PATHS } from '@/components/employment/careerPaths';

export function calculateEmployeeSalary(employment, metric) {
  const perf = metric?.overall_score ?? employment.performance_rating ?? 70;
  const lawful = LAWFUL_PATHS.has(employment.career_path);
  const base = employment.salary ?? 0;
  const perfMult = 0.7 + (perf / 100) * 0.6; // 0.7 at 0 .. 1.3 at 100
  const level = employment.career_level ?? 1;
  const levelBonus = 1 + (level - 1) * 0.08;
  const gross = Math.round(base * perfMult * levelBonus);

  if (lawful) {
    const tax = Math.round(gross * 0.18);
    const pension = Math.round(gross * 0.05);
    const bonus = perf > 85 ? Math.round(gross * 0.1) : 0;
    const net = gross - tax;
    return {
      lawful: true, career_path: employment.career_path, performance: perf,
      gross, tax, pension, bonus, net, currency: 'buy_power',
      breakdown: { base, perfMult: +perfMult.toFixed(2), levelBonus: +levelBonus.toFixed(2) },
    };
  }
  const heatRisk = employment.career_path === 'security' ? 1.15
    : employment.career_path === 'logistics' ? 1.10 : 1.0;
  const cryptoGross = Math.round(gross * heatRisk);
  const laundererCut = Math.round(cryptoGross * 0.12);
  const bonus = perf > 85 ? Math.round(cryptoGross * 0.15) : 0;
  const net = cryptoGross - laundererCut;
  return {
    lawful: false, career_path: employment.career_path, performance: perf,
    gross: cryptoGross, laundererCut, bonus, net, currency: 'crypto', heatRisk: +heatRisk.toFixed(2),
    breakdown: { base, perfMult: +perfMult.toFixed(2), levelBonus: +levelBonus.toFixed(2) },
  };
}

export function summarizePayroll(records) {
  const lawfulPayout = records.filter(r => r.calc.lawful).reduce((s, r) => s + r.calc.net + r.calc.bonus, 0);
  const criminalPayout = records.filter(r => !r.calc.lawful).reduce((s, r) => s + r.calc.net + r.calc.bonus, 0);
  const totalTax = records.filter(r => r.calc.lawful).reduce((s, r) => s + r.calc.tax, 0);
  const totalPension = records.filter(r => r.calc.lawful).reduce((s, r) => s + r.calc.pension, 0);
  const totalLaundering = records.filter(r => !r.calc.lawful).reduce((s, r) => s + r.calc.laundererCut, 0);
  return { lawfulPayout, criminalPayout, totalTax, totalPension, totalLaundering, count: records.length };
}