
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ReportFilters } from "@/components/dashboard/ReportFilters";
import { MetricCards } from "@/components/dashboard/MetricCards";
import { ComparisonChart } from "@/components/dashboard/ComparisonChart";
import { RegionComparison } from "@/components/dashboard/RegionComparison";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { Activity, LogOut, AlertCircle, CheckCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const Dashboard = () => {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useSupabaseData();
  const [selectedTest, setSelectedTest] = useState<string>("");

  useEffect(() => {
    // Check if user has API key (is "logged in")
    const apiKey = localStorage.getItem('cc-athletics-api-key');
    if (!apiKey) {
      navigate('/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('cc-athletics-api-key');
    toast.success("Logged out successfully");
    navigate('/login');
  };

  const handleRefresh = () => {
    refetch();
    toast.info("Refreshing data...");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  Evolve Physiotherapy Advanced Testing Report
                </h1>
                <p className="text-sm text-gray-600">Professional athlete performance analysis</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={handleRefresh}
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Data
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/')}
                className="text-gray-600"
              >
                ← Home
              </Button>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Data Status */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Error loading data: {error}
              <Button variant="outline" size="sm" onClick={handleRefresh} className="ml-2">
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {data && data.length > 0 && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Dashboard loaded successfully with {data.length} test records from CC Athletics API
              <Badge className="ml-2 bg-green-100 text-green-800">Live Data</Badge>
            </AlertDescription>
          </Alert>
        )}

        {data && data.length === 0 && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              No test data found. Please ensure data has been synchronized from CC Athletics API.
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar */}
          <div className="col-span-3">
            <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Navigation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="ghost" className="w-full justify-start text-gray-600">
                  📋 Introduction
                </Button>
                <Button variant="default" className="w-full justify-start bg-gray-800 text-white">
                  📊 Report
                </Button>
                <Button variant="ghost" className="w-full justify-start text-gray-600">
                  🔬 Recommendations
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Main Dashboard */}
          <div className="col-span-9 space-y-6">
            {/* Test Selection Notice */}
            <Card className="bg-gray-100 border-gray-300">
              <CardContent className="p-6 text-center">
                <h2 className="text-xl font-semibold text-gray-700 mb-2">
                  {selectedTest ? `Analyzing: ${selectedTest}` : "Please Select A 'Test Name'"}
                </h2>
                <p className="text-gray-600">
                  {selectedTest 
                    ? `Viewing detailed analysis for ${selectedTest} across all athletes`
                    : "Choose a test from the filters below to view detailed analysis"
                  }
                </p>
              </CardContent>
            </Card>

            {/* Filters */}
            <ReportFilters data={data || []} onTestSelect={setSelectedTest} />

            {/* Metric Cards */}
            <MetricCards selectedTest={selectedTest} data={data || []} />

            {/* Comparison Charts */}
            <ComparisonChart data={data || []} />

            {/* Region Comparisons */}
            <RegionComparison data={data || []} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
