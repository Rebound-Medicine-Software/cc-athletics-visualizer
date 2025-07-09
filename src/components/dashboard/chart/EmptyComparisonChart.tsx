
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const EmptyComparisonChart = () => (
  <Card className="bg-teal-50/80 border-teal-200 h-[480px] flex flex-col">
    <CardHeader className="shrink-0">
      <CardTitle className="text-center text-lg text-gray-800">
        Comparisons Amongst Peers
      </CardTitle>
    </CardHeader>
    <CardContent className="flex-1 flex items-center justify-center">
      <div className="w-full flex items-center justify-center">
        <p className="text-gray-600">No data available for comparison</p>
      </div>
    </CardContent>
  </Card>
);
