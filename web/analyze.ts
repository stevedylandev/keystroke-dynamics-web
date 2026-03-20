import type { Profile, DigraphAggregation, MetricStats } from './src/lib/types';

const METRIC_KEYS = [
  'holdTime1',
  'holdTime2',
  'pressPress',
  'releaseRelease',
  'pressRelease',
  'releasePress',
] as const;

const MAX_METRIC_DISTANCE = 3.0;
const MIN_STD_FALLBACK = 15.0;

function filterOutliers(values: number[], k = 1.5): number[] {
  if (values.length < 4) return values;
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const lower = q1 - k * iqr;
  const upper = q3 + k * iqr;
  return values.filter((v) => v >= lower && v <= upper);
}

function computeMetricStats(values: number[]): MetricStats {
  if (values.length === 0) return { mean: 0, std: 0, min: 0, max: 0, count: 0 };
  const count = values.length;
  const mean = values.reduce((s, v) => s + v, 0) / count;
  const variance = count < 2 ? 0 : values.reduce((s, v) => s + (v - mean) ** 2, 0) / (count - 1);
  return {
    mean: Math.round(mean * 10) / 10,
    std: Math.round(Math.sqrt(variance) * 10) / 10,
    min: Math.round(Math.min(...values) * 10) / 10,
    max: Math.round(Math.max(...values) * 10) / 10,
    count,
  };
}

// Re-aggregate a profile's raw aggregations with outlier filtering
// Since we only have pre-aggregated data (no raw samples), we'll just use them as-is
// But demonstrate what the new comparison logic does

const profile1: Profile = await Bun.file('1.json').json();
const profile2: Profile = await Bun.file('2.json').json();

console.log('=== PROFILE OVERVIEW ===');
console.log(`Profile 1: "${profile1.name}" — ${profile1.aggregations.length} digraph types`);
console.log(`Profile 2: "${profile2.name}" — ${profile2.aggregations.length} digraph types`);

const map1 = new Map<string, DigraphAggregation>();
for (const a of profile1.aggregations) map1.set(a.normalizedKeys, a);
const map2 = new Map<string, DigraphAggregation>();
for (const a of profile2.aggregations) map2.set(a.normalizedKeys, a);

const sharedKeys = [...map1.keys()].filter(k => map2.has(k));
console.log(`Shared digraph types: ${sharedKeys.length}\n`);

// OLD algorithm
let oldTotal = 0, oldMetrics = 0;
for (const key of sharedKeys) {
  const a1 = map1.get(key)!, a2 = map2.get(key)!;
  for (const metric of METRIC_KEYS) {
    const s = a1[metric] as MetricStats, p = a2[metric] as MetricStats;
    let dist: number;
    if (p.std < 0.001) {
      dist = Math.abs(s.mean - p.mean) / Math.max(Math.abs(p.mean) * 0.1, 1.0);
    } else {
      dist = Math.abs(s.mean - p.mean) / p.std;
    }
    oldTotal += dist; oldMetrics++;
  }
}
const oldOverall = oldMetrics > 0 ? oldTotal / oldMetrics : 0;
const oldSim = Math.max(0, Math.round(100 * (1 - oldOverall / 3.0)));

// NEW algorithm (capped distance, better fallback)
let newTotal = 0, newMetrics = 0;
const perDigraph: { keys: string; avgDist: number; details: string[] }[] = [];

for (const key of sharedKeys) {
  const a1 = map1.get(key)!, a2 = map2.get(key)!;
  let digDist = 0, digMetrics = 0;
  const details: string[] = [];
  for (const metric of METRIC_KEYS) {
    const s = a1[metric] as MetricStats, p = a2[metric] as MetricStats;
    const divisor = Math.max(p.std, MIN_STD_FALLBACK);
    const dist = Math.min(Math.abs(s.mean - p.mean) / divisor, MAX_METRIC_DISTANCE);
    details.push(`  ${metric.padEnd(16)} s=${String(s.mean).padStart(8)} p=${String(p.mean).padStart(8)} div=${divisor.toFixed(1).padStart(6)} → ${dist.toFixed(2)}${dist >= MAX_METRIC_DISTANCE ? ' (capped)' : ''}`);
    digDist += dist; digMetrics++;
  }
  const avg = digMetrics > 0 ? digDist / digMetrics : 0;
  newTotal += digDist; newMetrics++;
  perDigraph.push({ keys: key, avgDist: avg, details });
}

const newOverall = newMetrics > 0 ? newTotal / (newMetrics * METRIC_KEYS.length) : 0;
const newSim = Math.max(0, Math.round(100 * (1 - newOverall / 3.0)));

console.log('=== COMPARISON ===');
console.log(`OLD: distance=${oldOverall.toFixed(2)}, similarity=${oldSim}%`);
console.log(`NEW: distance=${newOverall.toFixed(2)}, similarity=${newSim}%`);

perDigraph.sort((a, b) => b.avgDist - a.avgDist);

console.log('\nTop 10 worst (new algorithm):');
for (const d of perDigraph.slice(0, 10)) {
  const pct = Math.max(0, Math.round(100 * (1 - d.avgDist / 3.0)));
  console.log(`\n${d.keys}  — dist: ${d.avgDist.toFixed(2)}, match: ${pct}%`);
  for (const line of d.details) console.log(line);
}

console.log('\n\nTop 5 best (new algorithm):');
for (const d of perDigraph.slice(-5).reverse()) {
  const pct = Math.max(0, Math.round(100 * (1 - d.avgDist / 3.0)));
  console.log(`${d.keys}  — dist: ${d.avgDist.toFixed(2)}, match: ${pct}%`);
}
