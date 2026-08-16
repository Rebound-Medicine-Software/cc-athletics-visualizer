
import { Card, CardContent } from "@/components/ui/card";

interface MetricCardProps {
  icon: string;
  title: string;
  formattedRecent: string;
  formattedBest: string;
  arrow?: string;
  color?: string;
  percent?: number | null;
}

export const MetricCard = ({
  icon,
  title,
  formattedRecent,
  formattedBest,
  arrow,
  color = "",
  percent,
}: MetricCardProps) => {
  const hasTrend =
    percent !== null && percent !== undefined && !Number.isNaN(percent);
  const trendClass = !hasTrend
    ? "pr-trend-flat"
    : arrow === "↑"
    ? "pr-trend-up"
    : arrow === "↓"
    ? "pr-trend-down"
    : "pr-trend-flat";

  return (
    <Card className="pr-panel">
      <CardContent className="p-4 flex flex-col">
        <div className="flex items-start justify-between mb-3">
          <span className="pr-icon-badge text-base">{icon}</span>
          {hasTrend && (
            <span className={`pr-trend ${trendClass} ${color}`}>
              {arrow && <span>{arrow}</span>}
              {Math.abs(percent!).toFixed(1)}%
            </span>
          )}
        </div>
        <div className="pr-kpi-label">{title}</div>
        <div className="pr-kpi-value mt-1">{formattedRecent}</div>
        <div className="mt-3 flex items-center justify-between">
          <span className="pr-kpi-label">All time best</span>
          <span className="pr-pill pr-pill-positive">{formattedBest}</span>
        </div>
      </CardContent>
    </Card>
  );
};
