
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Activity, TrendingUp, Zap, RefreshCw } from "lucide-react";
import { DataUpload } from "@/components/DataUpload";
import { ApiKeyInput } from "@/components/ApiKeyInput";
import { ForceVisualization } from "@/components/ForceVisualization";
import { MetricsPanel } from "@/components/MetricsPanel";
import { ForcePlateData, TestData } from "@/types/forcePlateTypes";
import { useCCAthletics } from "@/hooks/useCCAthletics";
import { generateSampleData } from "@/utils/dataGenerator";
import { toast } from "sonner";

const Index = () => {
  const [selectedData, setSelectedData] = useState<ForcePlateData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [viewMode, setViewMode] = useState<'upload' | 'live'>('live');
  
  const { data: liveData, isLoading, error, refetch, setApiKey, apiKey } = useCCAthletics();

  const handleDataUpload = (uploadedData: ForcePlateData) => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setSelectedData(uploadedData);
      setIsAnalyzing(false);
      toast.success("Force plate data processed successfully!");
    }, 1500);
  };

  const handleApiKeySubmit = (newApiKey: string) => {
    setApiKey(newApiKey);
    toast.info("Connecting to CC Athletics API...");
  };

  const handleTestSelection = (testData: TestData) => {
    // Convert TestData to ForcePlateData for visualization
    // This is a simplified conversion - you may want to enhance this
    const forcePlateData: ForcePlateData = generateSampleData();
    forcePlateData.metadata = {
      athlete: testData.athlete_name,
      exercise: testData.test_name,
      notes: `Team: ${testData.team_name}, Rep: ${testData.repetition_number}`,
    };
    setSelectedData(forcePlateData);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-orange-50">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-orange-100 sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-600 to-red-600 rounded-full flex items-center justify-center shadow-lg">
                <img 
                  src="/lovable-uploads/d42a4294-b163-4e70-8cdb-4bacd9e33a98.png" 
                  alt="Rebound Medicine Logo" 
                  className="w-10 h-10 rounded-full object-cover"
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Rebound Medicine</h1>
                <p className="text-sm text-orange-600 font-medium">Force Plate Analysis Platform</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {liveData && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                  disabled={isLoading}
                  className="border-orange-300 text-orange-700 hover:bg-orange-50"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh Data
                </Button>
              )}
              <div className="text-right">
                <p className="text-sm text-gray-600 font-medium">Performance Analytics</p>
                <p className="text-xs text-orange-500">Live Data Connection</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {!selectedData ? (
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

            {/* Mode Selection */}
            <div className="flex justify-center mb-8">
              <div className="bg-white/80 backdrop-blur-sm rounded-lg p-1 shadow-md">
                <Button
                  variant={viewMode === 'live' ? 'default' : 'ghost'}
                  onClick={() => setViewMode('live')}
                  className={viewMode === 'live' ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'text-gray-600 hover:text-orange-600'}
                >
                  Live Data Connection
                </Button>
                <Button
                  variant={viewMode === 'upload' ? 'default' : 'ghost'}
                  onClick={() => setViewMode('upload')}
                  className={viewMode === 'upload' ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'text-gray-600 hover:text-orange-600'}
                >
                  File Upload
                </Button>
              </div>
            </div>

            {/* Feature Cards */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <Card className="border-orange-200 hover:border-orange-400 transition-all hover:shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader className="text-center">
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <TrendingUp className="w-8 h-8 text-orange-600" />
                  </div>
                  <CardTitle className="text-lg text-gray-800">Real-time Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-center">
                    Instant processing with advanced biomechanical algorithms
                  </p>
                </CardContent>
              </Card>

              <Card className="border-orange-200 hover:border-orange-400 transition-all hover:shadow-lg bg-white/80 backdrop-blur-sm">
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

              <Card className="border-orange-200 hover:border-orange-400 transition-all hover:shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Upload className="w-8 h-8 text-blue-600" />
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

            {/* Content based on mode */}
            {viewMode === 'live' ? (
              <div className="space-y-6">
                {!apiKey ? (
                  <ApiKeyInput 
                    onApiKeySubmit={handleApiKeySubmit}
                    isLoading={isLoading}
                    currentApiKey={apiKey}
                  />
                ) : (
                  <div className="space-y-4">
                    <ApiKeyInput 
                      onApiKeySubmit={handleApiKeySubmit}
                      isLoading={isLoading}
                      currentApiKey={apiKey}
                    />
                    
                    {error && (
                      <Card className="border-red-200 bg-red-50">
                        <CardContent className="pt-6">
                          <p className="text-red-700">Error: {error}</p>
                        </CardContent>
                      </Card>
                    )}

                    {liveData && liveData.length > 0 && (
                      <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
                        <CardHeader>
                          <CardTitle className="text-xl text-gray-800">
                            Live CC Athletics Data ({liveData.length} tests)
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid gap-2 max-h-96 overflow-y-auto">
                            {liveData.slice(0, 50).map((test, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-orange-50 cursor-pointer transition-colors"
                                onClick={() => handleTestSelection(test)}
                              >
                                <div>
                                  <p className="font-medium text-gray-800">{test.athlete_name}</p>
                                  <p className="text-sm text-gray-600">
                                    {test.test_name} - {test.team_name}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm text-gray-500">{test.test_date}</p>
                                  <p className="text-xs text-gray-400">Rep #{test.repetition_number}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                          {liveData.length > 50 && (
                            <p className="text-center text-gray-500 mt-4">
                              Showing first 50 of {liveData.length} tests
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <DataUpload onDataUpload={handleDataUpload} isAnalyzing={isAnalyzing} />
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Action Bar */}
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">Biomechanical Analysis Results</h2>
              <Button
                variant="outline"
                onClick={() => setSelectedData(null)}
                className="border-orange-400 text-orange-700 hover:bg-orange-50"
              >
                Back to Data Selection
              </Button>
            </div>

            {/* Metrics Panel */}
            <MetricsPanel data={selectedData} />

            {/* Visualizations */}
            <ForceVisualization data={selectedData} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
