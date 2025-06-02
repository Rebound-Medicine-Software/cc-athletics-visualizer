
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-blue-100 sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center shadow-lg">
                <img 
                  src="/lovable-uploads/d42a4294-b163-4e70-8cdb-4bacd9e33a98.png" 
                  alt="Rebound Medicine Logo" 
                  className="w-10 h-10 rounded-full object-cover"
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Rebound Medicine</h1>
                <p className="text-sm text-blue-600 font-medium">Force Plate Analysis Platform</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 font-medium">Performance Analytics</p>
              <p className="text-xs text-blue-500">Denmark</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {!data ? (
          <div className="max-w-4xl mx-auto">
            {/* Welcome Section */}
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold text-gray-800 mb-4">
                Advanced Biomechanical Analysis
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Professional force plate data analysis for elite athletic performance
              </p>
            </div>

            {/* Feature Cards */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <Card className="border-blue-200 hover:border-blue-400 transition-all hover:shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <TrendingUp className="w-8 h-8 text-blue-600" />
                  </div>
                  <CardTitle className="text-lg text-gray-800">Real-time Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-center">
                    Instant processing with advanced biomechanical algorithms
                  </p>
                </CardContent>
              </Card>

              <Card className="border-blue-200 hover:border-blue-400 transition-all hover:shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader className="text-center">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Zap className="w-8 h-8 text-red-500" />
                  </div>
                  <CardTitle className="text-lg text-gray-800">Comprehensive Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-center">
                    Jump, isometric, and pogo analysis with detailed insights
                  </p>
                </CardContent>
              </Card>

              <Card className="border-blue-200 hover:border-blue-400 transition-all hover:shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Upload className="w-8 h-8 text-green-600" />
                  </div>
                  <CardTitle className="text-lg text-gray-800">Multi-format Support</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-center">
                    Compatible with CC Athletics API and multiple data formats
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
              <h2 className="text-2xl font-bold text-gray-800">Biomechanical Analysis Results</h2>
              <Button
                variant="outline"
                onClick={() => setData(null)}
                className="border-blue-400 text-blue-700 hover:bg-blue-50"
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
