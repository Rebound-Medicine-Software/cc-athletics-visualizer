
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Activity, TrendingUp, Zap } from "lucide-react";
import { DataUpload } from "@/components/DataUpload";
import { ForceVisualization } from "@/components/ForceVisualization";
import { MetricsPanel } from "@/components/MetricsPanel";
import { ForcePlateData } from "@/types/forcePlateTypes";
import { toast } from "sonner";

const Index = () => {
  const [data, setData] = useState<ForcePlateData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleDataUpload = (uploadedData: ForcePlateData) => {
    setIsAnalyzing(true);
    // Simulate processing time
    setTimeout(() => {
      setData(uploadedData);
      setIsAnalyzing(false);
      toast.success("Force plate data processed successfully!");
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-blue-100 sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">CC Athletics</h1>
                <p className="text-sm text-slate-600">Force Plate Analysis Platform</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-600">Professional Sports Science</p>
              <p className="text-xs text-slate-500">Denmark</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {!data ? (
          <div className="max-w-4xl mx-auto">
            {/* Welcome Section */}
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold text-slate-800 mb-4">
                Advanced Force Plate Analytics
              </h2>
              <p className="text-lg text-slate-600 mb-8">
                Upload your force plate data to generate comprehensive biomechanical insights
              </p>
            </div>

            {/* Feature Cards */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <Card className="border-blue-200 hover:border-blue-300 transition-colors">
                <CardHeader className="text-center">
                  <TrendingUp className="w-12 h-12 text-blue-600 mx-auto mb-2" />
                  <CardTitle className="text-lg">Real-time Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 text-center">
                    Instant processing of force plate data with advanced algorithms
                  </p>
                </CardContent>
              </Card>

              <Card className="border-blue-200 hover:border-blue-300 transition-colors">
                <CardHeader className="text-center">
                  <Zap className="w-12 h-12 text-blue-600 mx-auto mb-2" />
                  <CardTitle className="text-lg">Key Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 text-center">
                    Peak force, RFD, impulse, and center of pressure analysis
                  </p>
                </CardContent>
              </Card>

              <Card className="border-blue-200 hover:border-blue-300 transition-colors">
                <CardHeader className="text-center">
                  <Upload className="w-12 h-12 text-blue-600 mx-auto mb-2" />
                  <CardTitle className="text-lg">Easy Import</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 text-center">
                    Support for multiple force plate data formats
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Data Upload Component */}
            <DataUpload onDataUpload={handleDataUpload} isAnalyzing={isAnalyzing} />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Action Bar */}
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-800">Force Plate Analysis Results</h2>
              <Button
                variant="outline"
                onClick={() => setData(null)}
                className="border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                Upload New Data
              </Button>
            </div>

            {/* Metrics Panel */}
            <MetricsPanel data={data} />

            {/* Visualizations */}
            <ForceVisualization data={data} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
