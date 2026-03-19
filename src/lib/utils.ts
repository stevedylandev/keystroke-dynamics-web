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
