
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
}: MetricCardProps) => (
  <Card className="bg-white shadow-md">
    <CardContent className="p-4 text-center flex flex-col items-center">
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-xs text-gray-600 mb-2 h-8 flex items-center justify-center">
        {title}
      </div>
      <div className="flex flex-col items-center gap-1 w-full">
        <div className="text-[12px] font-bold text-gray-500 uppercase tracking-wide mb-0">
          RECENT
        </div>
        <div className="text-2xl font-bold text-gray-800 mb-1">
          {formattedRecent}
        </div>
        <div className={`text-sm font-medium flex items-center gap-1 mt-1 ${color}`}>
          {arrow && <span>{arrow}</span>}
          {percent !== null && percent !== undefined && !Number.isNaN(percent) && (
            <span>{Math.abs(percent).toFixed(1)}%</span>
          )}
        </div>
        <div className="text-[12px] font-bold text-gray-500 uppercase tracking-wide mb-0 mt-1">
          ALL TIME BEST
        </div>
        <div className="text-lg font-semibold text-green-700 mt-0">
          {formattedBest}
        </div>
      </div>
    </CardContent>
  </Card>
);
