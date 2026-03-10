import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { RISK_THRESHOLDS, RISK_LABELS, RISK_COLORS } from "@/lib/constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getRiskColor(score: number): string {
  if (score >= RISK_THRESHOLDS.CRITICAL) return RISK_COLORS.CRITICAL.text;
  if (score >= RISK_THRESHOLDS.HIGH) return RISK_COLORS.HIGH.text;
  if (score >= RISK_THRESHOLDS.MEDIUM) return RISK_COLORS.MEDIUM.text;
  return RISK_COLORS.LOW.text;
}

export function getRiskBg(score: number): string {
  if (score >= RISK_THRESHOLDS.CRITICAL) return RISK_COLORS.CRITICAL.bg;
  if (score >= RISK_THRESHOLDS.HIGH) return RISK_COLORS.HIGH.bg;
  if (score >= RISK_THRESHOLDS.MEDIUM) return RISK_COLORS.MEDIUM.bg;
  return RISK_COLORS.LOW.bg;
}

export function getRiskLabel(score: number): string {
  if (score >= RISK_THRESHOLDS.CRITICAL) return RISK_LABELS.CRITICAL;
  if (score >= RISK_THRESHOLDS.HIGH) return RISK_LABELS.HIGH;
  if (score >= RISK_THRESHOLDS.MEDIUM) return RISK_LABELS.MEDIUM;
  return RISK_LABELS.LOW;
}

export function getRiskFill(score: number): string {
  if (score >= RISK_THRESHOLDS.CRITICAL) return RISK_COLORS.CRITICAL.fill;
  if (score >= RISK_THRESHOLDS.HIGH) return RISK_COLORS.HIGH.fill;
  if (score >= RISK_THRESHOLDS.MEDIUM) return RISK_COLORS.MEDIUM.fill;
  return RISK_COLORS.LOW.fill;
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-US").format(num);
}
