import { cn } from "@/lib/utils";
import { getRiskBg, getRiskLabel } from "@/lib/utils";

interface RiskBadgeProps {
  score: number;
  showScore?: boolean;
  size?: "sm" | "md" | "lg";
}

export function RiskBadge({ score, showScore = true, size = "md" }: RiskBadgeProps) {
  const sizeClasses = {
    sm: "px-1.5 py-0.5 text-[10px]",
    md: "px-2 py-1 text-xs",
    lg: "px-3 py-1.5 text-sm",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-semibold",
        getRiskBg(score),
        sizeClasses[size]
      )}
    >
      {getRiskLabel(score)}
      {showScore && <span className="opacity-75">({score})</span>}
    </span>
  );
}
