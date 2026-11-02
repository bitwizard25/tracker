"use client";

import { useMemo, useState, type KeyboardEvent, type PointerEvent } from "react";
import { line, curveMonotoneX } from "d3-shape";
import { utcFormat } from "d3-time-format";
import { buildScales, nearestIndex, type ChartPoint } from "@/lib/chart/scales";
import { useChartDimensions } from "@/components/charts/useChartDimensions";

export type LineSeries = {
  id: string;
  label: string;
  color: string;
  points: ChartPoint[];
  emphasized?: boolean;
  /** Draws a dashed line without markers (used for reference lines such as a goal). */
  dashed?: boolean;
};

type LineChartProps = {
  series: LineSeries[];
  yLabel: string;
  formatY: (value: number) => string;
  height?: number;
};

const MARGIN = { top: 14, right: 16, bottom: 30, left: 52 };
const MAX_MARKERS = 45;
const formatTick = utcFormat("%b %-d");
const formatFull = utcFormat("%a, %b %-d, %Y");

export function LineChart({ series, yLabel, formatY, height = 280 }: LineChartProps) {
  const { ref, width } = useChartDimensions<HTMLDivElement>();
  const [activeTime, setActiveTime] = useState<number | null>(null);

  const plotWidth = Math.max(width - MARGIN.left - MARGIN.right, 0);
  const plotHeight = height - MARGIN.top - MARGIN.bottom;
  const hasData = series.some((s) => s.points.length > 0);
  const hasEmphasis = series.some((s) => s.emphasized);

  const scales = useMemo(
    () => buildScales(series, plotWidth, plotHeight),
    [series, plotWidth, plotHeight],
  );
  const times = useMemo(
    () =>
      [
        ...new Set(
          series.filter((s) => !s.dashed).flatMap((s) => s.points.map((p) => p.x.getTime())),
        ),
      ].sort((a, b) => a - b),
    [series],
  );
  const timePoints = useMemo(() => times.map((t) => ({ x: new Date(t), y: 0 })), [times]);
  const path = useMemo(
    () =>
      line<ChartPoint>()
        .x((p) => scales.x(p.x))
        .y((p) => scales.y(p.y))
        .curve(curveMonotoneX),
    [scales],
  );

  function moveToPointer(event: PointerEvent<SVGRectElement>) {
    if (times.length === 0) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const target = scales.x.invert(event.clientX - bounds.left);
    setActiveTime(times[nearestIndex(timePoints, target)]);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (times.length === 0) return;
    const current = activeTime === null ? -1 : times.indexOf(activeTime);
    if (event.key === "Escape") {
      setActiveTime(null);
      return;
    }
    let next: number;
    if (event.key === "ArrowRight") next = Math.min(current + 1, times.length - 1);
    else if (event.key === "ArrowLeft") next = current <= 0 ? times.length - 1 : current - 1;
    else return;
    event.preventDefault();
    setActiveTime(times[next]);
  }

  const summary = describe(series, yLabel, formatY);
  const yTicks = scales.y.ticks(4);
  const xTicks = scales.x.ticks(plotWidth < 360 ? 3 : plotWidth < 600 ? 5 : 7);
  const activeX = activeTime === null ? null : scales.x(new Date(activeTime));
  const readings =
    activeTime === null
      ? []
      : series.flatMap((s) => {
          const point = s.points[nearestIndex(s.points, new Date(activeTime))];
          return point ? [{ series: s, point }] : [];
        });

  return (
    <div
      ref={ref}
      className="relative w-full select-none rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      style={{ height }}
      role="group"
      tabIndex={hasData ? 0 : undefined}
      aria-label={hasData ? `${yLabel} chart. Use left and right arrow keys to inspect values.` : undefined}
      onKeyDown={onKeyDown}
      onBlur={() => setActiveTime(null)}
    >
      {width > 0 && (
        <svg
          role="img"
          aria-label={summary}
          width={width}
          height={height}
          className="touch-pan-y overflow-visible"
        >
          <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
            {yTicks.map((tick) => (
              <g key={tick} transform={`translate(0,${scales.y(tick)})`}>
                <line
                  x2={plotWidth}
                  stroke="var(--line)"
                  strokeDasharray={tick === yTicks[0] ? undefined : "2 4"}
                />
                <text x={-10} dy="0.32em" textAnchor="end" className="fill-muted text-[11px]">
                  {formatY(tick)}
                </text>
              </g>
            ))}
            {hasData &&
              xTicks.map((tick) => (
                <text
                  key={tick.getTime()}
                  x={scales.x(tick)}
                  y={plotHeight + 20}
                  textAnchor="middle"
                  className="fill-muted text-[11px]"
                >
                  {formatTick(tick)}
                </text>
              ))}

            {!hasData && (
              <text
                x={plotWidth / 2}
                y={plotHeight / 2}
                textAnchor="middle"
                className="fill-muted text-sm"
              >
                No data to show yet
              </text>
            )}

            {series.map((s) => {
              const d = path(s.points);
              const showMarkers = !s.dashed && s.points.length <= MAX_MARKERS;
              return (
                <g key={s.id} opacity={hasEmphasis && !s.emphasized ? 0.6 : 1}>
                  {s.points.length > 1 && d && (
                    <path
                      d={d}
                      fill="none"
                      stroke={s.color}
                      strokeWidth={s.emphasized ? 3 : 2}
                      strokeDasharray={s.dashed ? "6 5" : undefined}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                  {showMarkers &&
                    s.points.map((p) => (
                      <circle
                        key={p.x.getTime()}
                        cx={scales.x(p.x)}
                        cy={scales.y(p.y)}
                        r={s.points.length === 1 ? 5 : 3}
                        fill={s.color}
                      />
                    ))}
                </g>
              );
            })}

            {activeX !== null && (
              <g pointerEvents="none">
                <line
                  x1={activeX}
                  x2={activeX}
                  y1={0}
                  y2={plotHeight}
                  stroke="var(--muted)"
                  strokeDasharray="3 3"
                />
                {readings.map(({ series: s, point }) => (
                  <circle
                    key={s.id}
                    cx={scales.x(point.x)}
                    cy={scales.y(point.y)}
                    r={5}
                    fill="var(--surface)"
                    stroke={s.color}
                    strokeWidth={2.5}
                  />
                ))}
              </g>
            )}

            {hasData && (
              <rect
                width={plotWidth}
                height={plotHeight}
                fill="transparent"
                onPointerMove={moveToPointer}
                onPointerDown={moveToPointer}
                onPointerLeave={() => setActiveTime(null)}
              />
            )}
          </g>
        </svg>
      )}

      {activeX !== null && activeTime !== null && readings.length > 0 && (
        <Tooltip
          left={MARGIN.left + activeX}
          containerWidth={width}
          title={formatFull(new Date(activeTime))}
          rows={readings.map(({ series: s, point }) => ({
            id: s.id,
            label: s.label,
            color: s.color,
            value: formatY(point.y),
          }))}
        />
      )}

      <table className="sr-only">
        <caption>{summary}</caption>
        <thead>
          <tr>
            <th scope="col">Series</th>
            <th scope="col">Date</th>
            <th scope="col">{yLabel}</th>
          </tr>
        </thead>
        <tbody>
          {series.flatMap((s) =>
            s.points.map((p) => (
              <tr key={`${s.id}-${p.x.getTime()}`}>
                <th scope="row">{s.label}</th>
                <td>{formatFull(p.x)}</td>
                <td>{formatY(p.y)}</td>
              </tr>
            )),
          )}
        </tbody>
      </table>
    </div>
  );
}

type TooltipProps = {
  left: number;
  containerWidth: number;
  title: string;
  rows: { id: string; label: string; color: string; value: string }[];
};

function Tooltip({ left, containerWidth, title, rows }: TooltipProps) {
  const flip = left > containerWidth / 2;
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute top-2 z-10 min-w-36 rounded-xl border border-line bg-surface px-3 py-2 text-sm shadow-md"
      style={flip ? { right: containerWidth - left + 12 } : { left: left + 12 }}
    >
      <p className="text-xs text-muted">{title}</p>
      <ul className="mt-1 space-y-0.5">
        {rows.map((row) => (
          <li key={row.id} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="size-2 rounded-full"
                style={{ background: row.color }}
              />
              {row.label}
            </span>
            <span className="font-semibold tabular-nums">{row.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function describe(
  series: LineSeries[],
  yLabel: string,
  formatY: (value: number) => string,
): string {
  const parts = series
    .filter((s) => s.points.length > 0)
    .map((s) => {
      const first = s.points[0];
      const last = s.points[s.points.length - 1];
      const count = `${s.points.length} point${s.points.length === 1 ? "" : "s"}`;
      return `${s.label}: ${count}, from ${formatY(first.y)} on ${formatFull(first.x)} to ${formatY(last.y)} on ${formatFull(last.x)}`;
    });
  return parts.length === 0
    ? `${yLabel} line chart with no data`
    : `${yLabel} line chart. ${parts.join(". ")}.`;
}
