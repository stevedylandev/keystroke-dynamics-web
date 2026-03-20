import type { RawDigraph, SessionMetadata, HumannessResult } from './types';
import { aggregateDigraphs } from './aggregation';

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Timing Variance (weight 0.20)
 * Measures coefficient of variation (std/mean) of pressPress per digraph.
 * Humans typically have CV > 0.15, bots < 0.05.
 */
function scoreTimingVariance(digraphs: RawDigraph[]): number {
  const aggs = aggregateDigraphs(digraphs);
  if (aggs.length === 0) return 0;

  const cvs: number[] = [];
  for (const agg of aggs) {
    if (agg.pressPress.mean > 0 && agg.count >= 2) {
      cvs.push(agg.pressPress.std / agg.pressPress.mean);
    }
  }

  if (cvs.length === 0) return 0;

  const avgCv = cvs.reduce((s, v) => s + v, 0) / cvs.length;

  // CV < 0.03 → 0, CV >= 0.20 → 100
  if (avgCv >= 0.20) return 100;
  if (avgCv <= 0.03) return 0;
  return clamp(Math.round((avgCv - 0.03) / (0.20 - 0.03) * 100));
}

/**
 * Correction Rate (weight 0.15)
 * Ratio of backspaces to total keystrokes.
 * Humans typically 5-15%, zero is suspicious.
 */
function scoreCorrectionRate(metadata: SessionMetadata): number {
  if (metadata.totalKeystrokes === 0) return 0;

  const rate = metadata.backspaceCount / metadata.totalKeystrokes;

  // 0% → suspicious (score 10), 5-15% → ideal (100), >25% → decreasing
  if (rate === 0) return 10;
  if (rate < 0.02) return clamp(Math.round(10 + (rate / 0.02) * 40));
  if (rate <= 0.15) return 100;
  if (rate <= 0.30) return clamp(Math.round(100 - ((rate - 0.15) / 0.15) * 50));
  return 50;
}

/**
 * Pause Distribution (weight 0.20)
 * Presence and frequency of natural thinking pauses (> 500ms gaps).
 * Humans have pauses for thinking; bots type continuously.
 */
function scorePauseDistribution(metadata: SessionMetadata, digraphs: RawDigraph[]): number {
  if (digraphs.length === 0) return 0;

  const pauseRate = metadata.pauseCount / digraphs.length;

  // Collect pressPress values to check variance of pause-length gaps
  const longGaps = digraphs
    .map((d) => d.pressPress)
    .filter((pp) => pp > 500);

  const hasVariedPauses = longGaps.length >= 2
    ? computeStd(longGaps) / (longGaps.reduce((s, v) => s + v, 0) / longGaps.length) > 0.2
    : false;

  // No pauses at all → suspicious
  if (metadata.pauseCount === 0) return 5;

  let score = 0;

  // Pause rate: ideal is 0.03-0.15 pauses per digraph
  if (pauseRate >= 0.03 && pauseRate <= 0.15) {
    score = 80;
  } else if (pauseRate < 0.03) {
    score = clamp(Math.round(20 + (pauseRate / 0.03) * 60));
  } else {
    score = clamp(Math.round(80 - ((pauseRate - 0.15) / 0.30) * 30));
  }

  // Bonus for varied pause lengths (natural thinking)
  if (hasVariedPauses) score = clamp(score + 20);

  return score;
}

/**
 * Distribution Shape (weight 0.15)
 * Measures skewness of timing arrays.
 * Human typing is right-skewed (log-normal distribution).
 */
function scoreDistributionShape(digraphs: RawDigraph[]): number {
  const ppValues = digraphs.map((d) => d.pressPress);
  if (ppValues.length < 10) return 50; // not enough data

  const mean = ppValues.reduce((s, v) => s + v, 0) / ppValues.length;
  const std = computeStd(ppValues);
  if (std === 0) return 0;

  // Compute skewness: E[(X - mean)^3] / std^3
  const n = ppValues.length;
  const skewness =
    (n / ((n - 1) * (n - 2))) *
    ppValues.reduce((s, v) => s + Math.pow((v - mean) / std, 3), 0);

  // Human typing is right-skewed (positive skewness, typically 0.5-3.0)
  // Bot typing tends toward 0 skewness (symmetric) or negative
  if (skewness <= 0) return clamp(Math.round(20 + skewness * 10));
  if (skewness >= 0.5 && skewness <= 3.0) return 100;
  if (skewness < 0.5) return clamp(Math.round(20 + (skewness / 0.5) * 80));
  // Very high skewness (> 3.0) still human-like but slightly less certain
  return clamp(Math.round(100 - ((skewness - 3.0) / 5.0) * 20));
}

/**
 * Flight Time Negativity (weight 0.15)
 * Percentage of digraphs with releasePress < 0 (key overlap).
 * Humans overlap keys while typing; bots release before pressing next.
 */
function scoreFlightTimeNegativity(digraphs: RawDigraph[]): number {
  if (digraphs.length === 0) return 0;

  const negativeCount = digraphs.filter((d) => d.releasePress < 0).length;
  const negativeRate = negativeCount / digraphs.length;

  // Humans typically have 10-40% negative flight times
  // 0% → very suspicious, 10-40% → ideal
  if (negativeRate === 0) return 5;
  if (negativeRate < 0.05) return clamp(Math.round(5 + (negativeRate / 0.05) * 40));
  if (negativeRate >= 0.10 && negativeRate <= 0.50) return 100;
  if (negativeRate < 0.10) return clamp(Math.round(45 + ((negativeRate - 0.05) / 0.05) * 55));
  // Very high overlap might just be fast typing
  return clamp(Math.round(100 - ((negativeRate - 0.50) / 0.30) * 30));
}

/**
 * Burst Patterns (weight 0.15)
 * Variance of "burst" lengths (consecutive digraphs with < 300ms gap).
 * Humans type in bursts of 3-15 keys with pauses between.
 */
function scoreBurstPatterns(digraphs: RawDigraph[]): number {
  if (digraphs.length < 5) return 50;

  // Digraphs are stored newest-first, reverse for chronological order
  const chronological = [...digraphs].reverse();

  const bursts: number[] = [];
  let currentBurst = 1;

  for (let i = 1; i < chronological.length; i++) {
    if (chronological[i].pressPress < 300) {
      currentBurst++;
    } else {
      bursts.push(currentBurst);
      currentBurst = 1;
    }
  }
  bursts.push(currentBurst);

  if (bursts.length < 2) return 50;

  const avgBurst = bursts.reduce((s, v) => s + v, 0) / bursts.length;
  const burstStd = computeStd(bursts);
  const burstCv = avgBurst > 0 ? burstStd / avgBurst : 0;

  let score = 0;

  // Humans have varied burst lengths (CV > 0.3) and average burst 3-15
  if (avgBurst >= 3 && avgBurst <= 15) {
    score += 50;
  } else if (avgBurst < 3) {
    score += Math.round((avgBurst / 3) * 50);
  } else {
    score += Math.round(Math.max(20, 50 - ((avgBurst - 15) / 10) * 30));
  }

  // Variance in burst lengths
  if (burstCv > 0.5) {
    score += 50;
  } else if (burstCv > 0.1) {
    score += Math.round(((burstCv - 0.1) / 0.4) * 50);
  } else {
    score += 5; // nearly uniform bursts → suspicious
  }

  return clamp(score);
}

function computeStd(values: number[]): number {
  if (values.length < 2) return 0;
  const m = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

const WEIGHTS = {
  timingVariance: 0.20,
  correctionRate: 0.15,
  pauseDistribution: 0.20,
  distributionShape: 0.15,
  flightTimeNegativity: 0.15,
  burstPatterns: 0.15,
} as const;

export function analyzeHumanness(
  digraphs: RawDigraph[],
  metadata: SessionMetadata,
): HumannessResult | null {
  if (digraphs.length < 20) return null;

  const subScores = {
    timingVariance: scoreTimingVariance(digraphs),
    correctionRate: scoreCorrectionRate(metadata),
    pauseDistribution: scorePauseDistribution(metadata, digraphs),
    distributionShape: scoreDistributionShape(digraphs),
    flightTimeNegativity: scoreFlightTimeNegativity(digraphs),
    burstPatterns: scoreBurstPatterns(digraphs),
  };

  const score = Math.round(
    subScores.timingVariance * WEIGHTS.timingVariance +
    subScores.correctionRate * WEIGHTS.correctionRate +
    subScores.pauseDistribution * WEIGHTS.pauseDistribution +
    subScores.distributionShape * WEIGHTS.distributionShape +
    subScores.flightTimeNegativity * WEIGHTS.flightTimeNegativity +
    subScores.burstPatterns * WEIGHTS.burstPatterns,
  );

  let verdict: HumannessResult['verdict'];
  if (score >= 60) verdict = 'likely human';
  else if (score >= 40) verdict = 'uncertain';
  else verdict = 'likely bot';

  // Factor in paste ratio as a penalty
  const pasteRatio = metadata.totalKeystrokes > 0
    ? metadata.pastedCharCount / metadata.totalKeystrokes
    : 0;

  let adjustedScore = score;
  if (pasteRatio > 0.5) {
    adjustedScore = Math.round(score * (1 - (pasteRatio - 0.5) * 0.4));
  }

  if (adjustedScore !== score) {
    if (adjustedScore >= 60) verdict = 'likely human';
    else if (adjustedScore >= 40) verdict = 'uncertain';
    else verdict = 'likely bot';
  }

  return {
    score: clamp(adjustedScore),
    verdict,
    subScores,
  };
}
