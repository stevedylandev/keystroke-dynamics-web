export function round(v: number): number {
  return Math.round(v * 10) / 10;
}

export function avg(arr: any[], fn: (d: any) => number): string {
  if (arr.length === 0) return '\u2014';
  return (arr.reduce((s, d) => s + fn(d), 0) / arr.length).toFixed(1);
}

export function std(values: number[]): number {
  if (values.length < 2) return 0;
  const m = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

/** Remove outliers using the IQR method, returns filtered array */
export function filterOutliers(values: number[], k = 1.5): number[] {
  if (values.length < 4) return values;
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const lower = q1 - k * iqr;
  const upper = q3 + k * iqr;
  return values.filter((v) => v >= lower && v <= upper);
}
