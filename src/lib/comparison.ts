import type { DigraphAggregation, ComparisonResult, PerDigraphComparison } from './types';

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

export function compareSession(
  sessionAggs: DigraphAggregation[],
  profileAggs: DigraphAggregation[],
): ComparisonResult {
  const profileMap = new Map<string, DigraphAggregation>();
  for (const a of profileAggs) {
    profileMap.set(a.normalizedKeys, a);
  }

  const perDigraph: PerDigraphComparison[] = [];
  let totalDistance = 0;
  let metricCount = 0;

  for (const sessionAgg of sessionAggs) {
    const profileAgg = profileMap.get(sessionAgg.normalizedKeys);
    if (!profileAgg) continue;

    let digraphDistance = 0;
    let digraphMetrics = 0;

    for (const key of METRIC_KEYS) {
      const sessionMean = sessionAgg[key].mean;
      const profileMean = profileAgg[key].mean;
      const profileStd = profileAgg[key].std;

      const divisor = Math.max(profileStd, MIN_STD_FALLBACK);
      const distance = Math.min(
        Math.abs(sessionMean - profileMean) / divisor,
        MAX_METRIC_DISTANCE,
      );

      digraphDistance += distance;
      digraphMetrics++;
    }

    const avgDistance = digraphMetrics > 0 ? digraphDistance / digraphMetrics : 0;
    const matchPercent = Math.max(0, Math.round(100 * (1 - avgDistance / 3.0)));

    perDigraph.push({
      normalizedKeys: sessionAgg.normalizedKeys,
      distance: Math.round(avgDistance * 100) / 100,
      matchPercent,
    });

    totalDistance += digraphDistance;
    metricCount += digraphMetrics;
  }

  const sharedCount = perDigraph.length;
  const overallDistance = metricCount > 0
    ? Math.round((totalDistance / metricCount) * 100) / 100
    : 0;
  const similarityPercent = Math.max(0, Math.round(100 * (1 - overallDistance / 3.0)));

  let confidence: ComparisonResult['confidence'];
  if (sharedCount >= 15) confidence = 'high';
  else if (sharedCount >= 10) confidence = 'medium';
  else if (sharedCount >= 5) confidence = 'low';
  else confidence = 'insufficient';

  // Sort by distance descending (worst matches first)
  perDigraph.sort((a, b) => b.distance - a.distance);

  return {
    overallDistance,
    similarityPercent,
    confidence,
    sharedCount,
    perDigraph,
  };
}
