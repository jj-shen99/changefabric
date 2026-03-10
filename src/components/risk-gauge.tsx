"use client";

import { getRiskLabel } from "@/lib/utils";

interface RiskGaugeProps {
  score: number;
  label: string;
  size?: "sm" | "lg";
}

export function RiskGauge({ score, label, size = "sm" }: RiskGaugeProps) {
  const radius = size === "lg" ? 50 : 36;
  const stroke = size === "lg" ? 8 : 6;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const svgSize = (radius + stroke) * 2;

  const getColor = (s: number) => {
    if (s >= 80) return "#ef4444";
    if (s >= 60) return "#f97316";
    if (s >= 40) return "#eab308";
    return "#22c55e";
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: svgSize, height: svgSize }}>
        <svg width={svgSize} height={svgSize} className="-rotate-90">
          <circle
            cx={radius + stroke}
            cy={radius + stroke}
            r={radius}
            fill="none"
            stroke="currentColor"
            className="text-gray-200 dark:text-gray-700"
            strokeWidth={stroke}
          />
          <circle
            cx={radius + stroke}
            cy={radius + stroke}
            r={radius}
            fill="none"
            stroke={getColor(score)}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-bold ${size === "lg" ? "text-2xl" : "text-lg"}`} style={{ color: getColor(score) }}>
            {score}
          </span>
          {size === "lg" && (
            <span className="text-[10px] text-gray-500 dark:text-gray-400">{getRiskLabel(score)}</span>
          )}
        </div>
      </div>
      <span className={`text-center font-medium text-gray-600 dark:text-gray-400 ${size === "lg" ? "text-sm" : "text-xs"}`}>
        {label}
      </span>
    </div>
  );
}
