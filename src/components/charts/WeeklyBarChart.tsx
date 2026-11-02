"use client";

import { useMemo, type KeyboardEvent } from "react";
import { scaleBand, scaleLinear } from "d3-scale";
import { utcFormat } from "d3-time-format";
import { useChartDimensions } from "@/components/charts/useChartDimensions";
import { weekDomain } from "@/lib/chart/weekly";
import { parseIsoDate } from "@/lib/domain/dates";
import { formatKg } from "@/lib/format";
import type { WeekDay } from "@/lib/domain/weeks";

type WeeklyBarChartProps = {
  days: WeekDay[];
  today: string;
  goalWeightKg?: number | null;
  /** Date of the day currently being edited (highlighted). */
  editingDate?: string | null;
  /** Date that holds the roving tab stop. */
  tabStopDate: string;
  onSelect: (day: WeekDay) => void;
  onFocusDate: (date: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  label: string;
  height?: number;
};

const MARGIN = { top: 26, right: 6, bottom: 48, left: 38 };
const MAX_BAR = 44;
const dayShort = utcFormat("%a");
const dayNum = utcFormat("%-d");
const dayLong = utcFormat("%A %b %-d");

export function dayLabel(date: string): string {
  return dayLong(parseIsoDate(date));
}

export function WeeklyBarChart({
  days,
  today,
  goalWeightKg,
  editingDate,
  tabStopDate,
  onSelect,
  onFocusDate,
  onKeyDown,
  label,
  height = 260,
}: WeeklyBarChartProps) {
  const { ref, width } = useChartDimensions<HTMLDivElement>();
  const plotWidth = Math.max(width - MARGIN.left - MARGIN.right, 0);
  const plotHeight = height - MARGIN.top - MARGIN.bottom;
  const values = days.flatMap((d) => (d.entry ? [d.entry.weightKg] : []));
  const domain = weekDomain(values);
  const domainLo = domain?.[0] ?? 0;
  const domainHi = domain?.[1] ?? 1;

  const x = useMemo(
    () =>
      scaleBand<string>()
        .domain(days.map((d) => d.date))
        .range([0, plotWidth])
        .paddingInner(0.14)
        .paddingOuter(0.07),
    [days, plotWidth],
  );
  const y = useMemo(
    () =>
      scaleLinear()
        .domain([domainLo, domainHi])
        .range([plotHeight, 0])
        .nice(4),
    [domainLo, domainHi, plotHeight],
  );
  const ticks = domain ? y.ticks(4) : [];
  const [d0, d1] = y.domain();
  const showGoal = domain !== null && goalWeightKg != null && goalWeightKg >= d0 && goalWeightKg <= d1;
  const step = x.step();
  const barWidth = Math.min(x.bandwidth(), MAX_BAR);

  return (
    <div
      ref={ref}
      role="group"
      aria-label={label}
      className="relative w-full select-none"
      style={{ height }}
      onKeyDown={onKeyDown}
    >
      {width > 0 && (
        <>
          <svg width={width} height={height} aria-hidden="true" className="overflow-visible">
            <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
              {domain && (
                <text x={-MARGIN.left + 2} y={-12} className="fill-muted text-[11px]">
                  kg
                </text>
              )}
              {ticks.map((tick) => (
                <g key={tick} transform={`translate(0,${y(tick)})`}>
                  <line x2={plotWidth} stroke="var(--line)" strokeDasharray="2 4" />
                  <text x={-8} dy="0.32em" textAnchor="end" className="fill-muted text-[11px]">
                    {Number(tick.toFixed(1))}
                  </text>
                </g>
              ))}
              <line y1={plotHeight} y2={plotHeight} x2={plotWidth} stroke="var(--line)" />

              {days.map((day) => {
                const cx = (x(day.date) ?? 0) + x.bandwidth() / 2;
                const isToday = day.date === today;
                const parsed = parseIsoDate(day.date);
                const editing = editingDate === day.date;
                return (
                  <g key={day.date} opacity={day.isFuture ? 0.45 : 1}>
                    {isToday && (
                      <rect
                        x={cx - step / 2}
                        y={-6}
                        width={step}
                        height={plotHeight + MARGIN.bottom - 2}
                        rx={10}
                        fill="var(--brand-soft)"
                      />
                    )}
                    {day.entry ? (
                      <>
                        <rect
                          x={cx - barWidth / 2}
                          y={y(day.entry.weightKg)}
                          width={barWidth}
                          height={Math.max(plotHeight - y(day.entry.weightKg), 0)}
                          rx={5}
                          fill={isToday ? "var(--brand-strong)" : "var(--brand)"}
                          stroke={editing ? "var(--foreground)" : "none"}
                          strokeWidth={2}
                          className="motion-safe:transition-all motion-safe:duration-300"
                        />
                        <text
                          x={cx}
                          y={y(day.entry.weightKg) - 6}
                          textAnchor="middle"
                          className="fill-foreground text-[11px] font-semibold tabular-nums"
                        >
                          {day.entry.weightKg.toFixed(1)}
                        </text>
                      </>
                    ) : day.isFuture ? (
                      <line
                        x1={cx - barWidth / 2}
                        x2={cx + barWidth / 2}
                        y1={plotHeight - 1}
                        y2={plotHeight - 1}
                        stroke="var(--muted)"
                        strokeWidth={2}
                      />
                    ) : (
                      <g>
                        <rect
                          x={cx - barWidth / 2}
                          y={plotHeight - 56}
                          width={barWidth}
                          height={56}
                          rx={5}
                          fill={editing ? "var(--brand-soft)" : "none"}
                          stroke={editing ? "var(--foreground)" : "var(--muted)"}
                          strokeWidth={editing ? 2 : 1.5}
                          strokeDasharray="4 3"
                        />
                        <text
                          x={cx}
                          y={plotHeight - 24}
                          textAnchor="middle"
                          className="fill-muted text-lg font-semibold"
                        >
                          +
                        </text>
                      </g>
                    )}
                    <text
                      x={cx}
                      y={plotHeight + 17}
                      textAnchor="middle"
                      className={`text-[11px] ${isToday ? "fill-foreground font-bold" : "fill-muted"}`}
                    >
                      {dayShort(parsed)}
                    </text>
                    <text
                      x={cx}
                      y={plotHeight + 34}
                      textAnchor="middle"
                      className={`text-xs tabular-nums ${isToday ? "fill-brand-strong font-bold" : "fill-muted"}`}
                    >
                      {dayNum(parsed)}
                    </text>
                    {isToday && (
                      <rect
                        x={cx - 9}
                        y={plotHeight + 38}
                        width={18}
                        height={3}
                        rx={1.5}
                        fill="var(--brand-strong)"
                      />
                    )}
                  </g>
                );
              })}

              {showGoal && goalWeightKg != null && (
                <g pointerEvents="none">
                  <line
                    x2={plotWidth}
                    y1={y(goalWeightKg)}
                    y2={y(goalWeightKg)}
                    stroke="var(--muted)"
                    strokeWidth={2}
                    strokeDasharray="6 5"
                  />
                  <text
                    x={plotWidth}
                    y={y(goalWeightKg) - 5}
                    textAnchor="end"
                    className="fill-muted text-[11px] font-medium"
                    stroke="var(--surface)"
                    strokeWidth={3}
                    paintOrder="stroke"
                  >
                    Goal {Number(goalWeightKg.toFixed(1))}
                  </text>
                </g>
              )}
            </g>
          </svg>

          {days.map((day) => {
            if (day.isFuture) return null;
            const left = MARGIN.left + (x(day.date) ?? 0) - (step - x.bandwidth()) / 2;
            const isToday = day.date === today;
            const name = `${dayLabel(day.date)}${isToday ? ", today" : ""}`;
            const text = day.entry
              ? `${name}, ${formatKg(day.entry.weightKg)}, edit`
              : `${name}, no entry, add weight`;
            return (
              <button
                key={day.date}
                type="button"
                data-day={day.date}
                aria-label={text}
                aria-haspopup="dialog"
                tabIndex={day.date === tabStopDate ? 0 : -1}
                onFocus={() => onFocusDate(day.date)}
                onClick={() => onSelect(day)}
                className="absolute top-0 rounded-xl hover:bg-brand-soft/60 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand"
                style={{ left, width: step, height }}
              />
            );
          })}
        </>
      )}

      <table className="sr-only">
        <caption>{label}</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Weight</th>
          </tr>
        </thead>
        <tbody>
          {days.map((day) => (
            <tr key={day.date}>
              <th scope="row">{dayLabel(day.date)}</th>
              <td>
                {day.entry ? formatKg(day.entry.weightKg) : day.isFuture ? "Not yet" : "Not logged"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
