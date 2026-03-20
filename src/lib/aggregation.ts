import type { RawDigraph, MetricStats, DigraphAggregation } from './types';
import { std, filterOutliers } from './utils';

function normalizeKey(key: string): string {
  if (key === ' ') return '␣';
  if (key === 'Backspace') return '⌫';
  if (key === 'Enter') return '⏎';
  return key.toLowerCase();
}

export function normalizeDigraphKey(key1: string, key2: string): string {
  return `${normalizeKey(key1)} → ${normalizeKey(key2)}`;
}

export function computeMetricStats(values: number[]): MetricStats {
  if (values.length === 0) {
    return { mean: 0, std: 0, min: 0, max: 0, count: 0 };
  }
  const count = values.length;
  const mean = values.reduce((s, v) => s + v, 0) / count;
  return {
    mean: Math.round(mean * 10) / 10,
    std: Math.round(std(values) * 10) / 10,
    min: Math.round(Math.min(...values) * 10) / 10,
    max: Math.round(Math.max(...values) * 10) / 10,
    count,
  };
}

const EXCLUDED_KEYS = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Home',
  'End',
  'PageUp',
  'PageDown',
  'Insert',
  'Delete',
  'Escape',
  'Tab',
  'F1', 'F2', 'F3', 'F4', 'F5', 'F6',
  'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
]);

function shouldExclude(key: string): boolean {
  return EXCLUDED_KEYS.has(key);
}

export function aggregateDigraphs(digraphs: RawDigraph[]): DigraphAggregation[] {
  const groups = new Map<string, RawDigraph[]>();

  for (const d of digraphs) {
    if (shouldExclude(d.key1) || shouldExclude(d.key2)) continue;
    const nk = normalizeDigraphKey(d.key1, d.key2);
    const group = groups.get(nk);
    if (group) {
      group.push(d);
    } else {
      groups.set(nk, [d]);
    }
  }

  const aggregations: DigraphAggregation[] = [];

  for (const [normalizedKeys, group] of groups) {
    const agg: DigraphAggregation = {
      normalizedKeys,
      count: group.length,
      holdTime1: computeMetricStats(filterOutliers(group.map((d) => d.holdTime1))),
      holdTime2: computeMetricStats(filterOutliers(group.map((d) => d.holdTime2))),
      pressPress: computeMetricStats(filterOutliers(group.map((d) => d.pressPress))),
      releaseRelease: computeMetricStats(filterOutliers(group.map((d) => d.releaseRelease))),
      pressRelease: computeMetricStats(filterOutliers(group.map((d) => d.pressRelease))),
      releasePress: computeMetricStats(filterOutliers(group.map((d) => d.releasePress))),
    };
    aggregations.push(agg);
  }

  aggregations.sort((a, b) => b.count - a.count);
  return aggregations;
}
