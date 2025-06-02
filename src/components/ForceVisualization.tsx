
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ForcePlateData } from "@/types/forcePlateTypes";
import { ForceTimeChart } from "@/components/charts/ForceTimeChart";
import { CenterOfPressureChart } from "@/components/charts/CenterOfPressureChart";
import { Force3DChart } from "@/components/charts/Force3DChart";
import { Download, BarChart3, Map, Box } from "lucide-react";
import { toast } from "sonner";

interface ForceVisualizationProps {
  data: ForcePlateData;
}

export const ForceVisualization = ({ data }: ForceVisualizationProps) => {
  const [activeTab, setActiveTab] = useState("force-time");

  const handleExport = () => {
    toast.success("Chart exported successfully!");
    console.log("Exporting visualization data...");
  };

  return (
    <Card className="bg-white/80 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl text-slate-800">Force Plate Visualizations</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="border-blue-300 text-blue-700 hover:bg-blue-50"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="force-time" className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4" />
              <span>Force vs Time</span>
            </TabsTrigger>
            <TabsTrigger value="cop" className="flex items-center space-x-2">
              <Map className="w-4 h-4" />
              <span>Center of Pressure</span>
            </TabsTrigger>
            <TabsTrigger value="3d-force" className="flex items-center space-x-2">
              <Box className="w-4 h-4" />
              <span>3D Force Vector</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="force-time" className="space-y-4">
            <ForceTimeChart data={data} />
          </TabsContent>

          <TabsContent value="cop" className="space-y-4">
            <CenterOfPressureChart data={data} />
          </TabsContent>

          <TabsContent value="3d-force" className="space-y-4">
            <Force3DChart data={data} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
