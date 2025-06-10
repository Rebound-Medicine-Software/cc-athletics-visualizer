
import { useState } from "react";
import { DataUpload } from "@/components/DataUpload";
import { ForceVisualization } from "@/components/ForceVisualization";
import { MetricsPanel } from "@/components/MetricsPanel";
import { ApiKeyInput } from "@/components/ApiKeyInput";
import { DataSyncPanel } from "@/components/DataSyncPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ForcePlateData, TestData } from "@/types/forcePlateTypes";
import { generateSampleData } from "@/utils/dataGenerator";
import { useCCAthletics } from "@/hooks/useCCAthletics";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { Activity, Users, BarChart3, Calendar } from "lucide-react";

const Index = () => {
  const [selectedData, setSelectedData] = useState<ForcePlateData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [dataSource, setDataSource] = useState<'upload' | 'api' | 'database'>('database');

  // CC Athletics API hook
  const { 
    data: apiData, 
    isLoading: apiLoading, 
    setApiKey,
    apiKey 
  } = useCCAthletics();

  // Supabase data hook
  const { 
    data: dbData, 
    isLoading: dbLoading 
  } = useSupabaseData();

  const handleDataUpload = (data: ForcePlateData) => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setSelectedData(data);
      setIsAnalyzing(false);
    }, 1500);
  };

  const handleApiKeySubmit = (key: string) => {
    setApiKey(key);
    setDataSource('api');
  };

  const getCurrentData = (): TestData[] => {
    if (dataSource === 'api' && apiData) return apiData;
    if (dataSource === 'database' && dbData) return dbData;
    return [];
  };

  const handleTestSelect = (test: TestData) => {
    const sampleData = generateSampleData();
    sampleData.metadata = {
      athlete: test.athlete_name,
      exercise: test.test_name,
      notes: `Team: ${test.team_name} | Date: ${test.test_date} | Rep: ${test.repetition_number}`,
    };
    setSelectedData(sampleData);
  };

  const currentData = getCurrentData();
  const isLoading = dataSource === 'api' ? apiLoading : dbLoading;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-3 flex items-center justify-center gap-3">
            <Activity className="w-10 h-10 text-blue-600" />
            CC Athletics Force Plate Hub
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-4">
            Advanced biomechanical analysis platform for sports performance optimization
          </p>
          <div className="flex gap-4 justify-center">
            <Button 
              onClick={() => window.location.href = '/login'}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Access Reporting Dashboard
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Data Source Selection */}
          <div className="space-y-4">
            <div className="flex gap-2 mb-4">
              <Button 
                variant={dataSource === 'database' ? 'default' : 'outline'}
                onClick={() => setDataSource('database')}
                size="sm"
              >
                Database
              </Button>
              <Button 
                variant={dataSource === 'api' ? 'default' : 'outline'}
                onClick={() => setDataSource('api')}
                size="sm"
              >
                Live API
              </Button>
              <Button 
                variant={dataSource === 'upload' ? 'default' : 'outline'}
                onClick={() => setDataSource('upload')}
                size="sm"
              >
                Upload
              </Button>
            </div>

            {dataSource === 'database' && <DataSyncPanel />}
            {dataSource === 'api' && (
              <ApiKeyInput
                onApiKeySubmit={handleApiKeySubmit}
                isLoading={isLoading}
                currentApiKey={apiKey}
              />
            )}
            {dataSource === 'upload' && (
              <DataUpload
                onDataUpload={handleDataUpload}
                isAnalyzing={isAnalyzing}
              />
            )}
          </div>

          {/* Test Data List */}
          <div className="lg:col-span-2">
            {(dataSource === 'api' || dataSource === 'database') && (
              <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-gray-200">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg text-gray-800 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-blue-600" />
                      Available Tests
                      {dataSource === 'database' && <Badge variant="outline" className="bg-green-50 text-green-700">Database</Badge>}
                      {dataSource === 'api' && <Badge variant="outline" className="bg-orange-50 text-orange-700">Live API</Badge>}
                    </CardTitle>
                    {currentData.length > 0 && (
                      <Badge className="bg-blue-100 text-blue-800">
                        {currentData.length} tests
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading test data...</p>
                      </div>
                    </div>
                  ) : currentData.length > 0 ? (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {currentData.map((test, index) => (
                        <Card
                          key={`${test.athlete_id}-${test.test_date}-${test.repetition_number}-${index}`}
                          className="p-3 cursor-pointer hover:bg-blue-50 transition-colors border border-gray-200 hover:border-blue-300"
                          onClick={() => handleTestSelect(test)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Users className="w-4 h-4 text-gray-500" />
                                <span className="font-medium text-gray-800">{test.athlete_name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {test.team_name}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <span>{test.test_name}</span>
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {test.test_date}
                                </div>
                                <span>Rep {test.repetition_number}</span>
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <BarChart3 className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-600 mb-2">No test data available</p>
                      <p className="text-sm text-gray-500">
                        {dataSource === 'api' ? 'Enter your API key to load data' : 'Sync data to get started'}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Analysis Results */}
        {selectedData && (
          <div className="space-y-6">
            <MetricsPanel data={selectedData} />
            <ForceVisualization data={selectedData} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
