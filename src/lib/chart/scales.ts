import { bisector, extent } from "d3-array";
import { scaleLinear, scaleUtc } from "d3-scale";

export type ChartPoint = { x: Date; y: number };

const PAD_RATIO = 0.08;
const FALLBACK_Y: [number, number] = [0, 100];
const DAY_MS = 86_400_000;

/** Min/max of the values, padded so lines never touch the plot edges. */
export function paddedExtent(values: number[]): [number, number] {
  const [min, max] = extent(values);
  if (min === undefined || max === undefined) return FALLBACK_Y;
  const span = max - min;
  const pad = span === 0 ? Math.max(Math.abs(min) * 0.02, 1) : span * PAD_RATIO;
  return [min - pad, max + pad];
}

/** UTC time x scale and inverted linear y scale for the given plot size. */
export function buildScales(
  series: { points: ChartPoint[] }[],
  width: number,
  height: number,
  extraY: number[] = [],
) {
  const xs = series.flatMap((s) => s.points.map((p) => p.x));
  const ys = [...series.flatMap((s) => s.points.map((p) => p.y)), ...extraY];
  const [minX, maxX] = extent(xs);
  let domain: [Date, Date] = [minX ?? new Date(0), maxX ?? new Date(DAY_MS)];
  if (domain[0].getTime() === domain[1].getTime()) {
    domain = [new Date(domain[0].getTime() - 3 * DAY_MS), new Date(domain[1].getTime() + 3 * DAY_MS)];
  }
  const x = scaleUtc().domain(domain).range([0, width]);
  const y = scaleLinear().domain(paddedExtent(ys)).range([height, 0]).nice(4);
  return { x, y };
}

const byX = bisector<ChartPoint, Date>((p) => p.x);

/** Index of the point closest to `target` on the x axis, or -1 when empty. */
export function nearestIndex(points: ChartPoint[], target: Date): number {
  if (points.length === 0) return -1;
  return byX.center(points, target);
}
