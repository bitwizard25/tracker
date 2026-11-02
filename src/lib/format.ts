import { utcFormat } from "d3-time-format";
import { parseIsoDate } from "@/lib/domain/dates";

export const formatKg = (kg: number): string => `${kg.toFixed(1)} kg`;

export const formatAxisKg = (kg: number): string => `${Number(kg.toFixed(1))} kg`;

function sign(value: number): string {
  if (value > 0) return "+";
  return value < 0 ? "−" : "";
}

export const formatSignedKg = (kg: number): string => `${sign(kg)}${Math.abs(kg).toFixed(1)} kg`;

export const formatSignedPct = (pct: number): string => `${sign(pct)}${Math.abs(pct).toFixed(1)}%`;

const longDate = utcFormat("%a, %b %-d, %Y");

export const formatLongDate = (isoDate: string): string => longDate(parseIsoDate(isoDate));
