export interface RawDigraph {
  id: number;
  keys: string;
  key1: string;
  key2: string;
  holdTime1: number;
  holdTime2: number;
  pressPress: number;
  releaseRelease: number;
  pressRelease: number;
  releasePress: number;
}

export interface MetricStats {
  mean: number;
  std: number;
  min: number;
  max: number;
  count: number;
}

export interface DigraphAggregation {
  normalizedKeys: string;
  count: number;
  holdTime1: MetricStats;
  holdTime2: MetricStats;
  pressPress: MetricStats;
  releaseRelease: MetricStats;
  pressRelease: MetricStats;
  releasePress: MetricStats;
}

export interface SessionMetadata {
  totalKeystrokes: number;
  backspaceCount: number;
  pauseCount: number;
  avgTypingSpeed: number;
  sessionDurationMs: number;
  pasteCount: number;
  pastedCharCount: number;
}

export interface Profile {
  id: string;
  name: string;
  createdAt: string;
  digraphCount: number;
  aggregations: DigraphAggregation[];
  metadata: SessionMetadata;
}

export interface ComparisonResult {
  overallDistance: number;
  similarityPercent: number;
  confidence: 'high' | 'medium' | 'low' | 'insufficient';
  sharedCount: number;
  perDigraph: PerDigraphComparison[];
}

export interface PerDigraphComparison {
  normalizedKeys: string;
  distance: number;
  matchPercent: number;
}

export interface HumannessResult {
  score: number;
  verdict: 'likely human' | 'uncertain' | 'likely bot';
  subScores: {
    timingVariance: number;
    correctionRate: number;
    pauseDistribution: number;
    distributionShape: number;
    flightTimeNegativity: number;
    burstPatterns: number;
  };
}

export type TabId = 'capture' | 'profile' | 'compare' | 'humanness';
