
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  ChevronLeft, 
  ChevronRight, 
  BarChart3, 
  LogOut, 
  Activity,
  TrendingUp,
  Users,
  Building2
} from "lucide-react";
import { MetricCards } from "@/components/dashboard/MetricCards";
import { HighlightsSection } from "@/components/dashboard/HighlightsSection";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { TestData } from "@/types/forcePlateTypes";
import { formatDate } from "@/utils/dateUtils";

const Dashboard = () => {
  const navigate = useNavigate();
  const [selectedTest, setSelectedTest] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedAthlete, setSelectedAthlete] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const { data, isLoading, error } = useSupabaseData();

  useEffect(() => {
    const apiKey = localStorage.getItem('cc-athletics-api-key');
    if (!apiKey) {
      navigate('/auth');
    }
  }, [navigate]);

  const handleSignOut = () => {
    localStorage.removeItem('cc-athletics-api-key');
    navigate('/auth');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Alert className="max-w-md">
          <AlertDescription>
            Error loading data: {error}. Please check your API key and try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Use data array directly
  const allData: TestData[] = data ? data : [];

  const uniqueTests = [...new Set(allData.map(d => d.test_name))];
  const uniqueTeams = [...new Set(allData.map(d => d.team_name))];
  const uniqueAthletes = [...new Set(allData.map(d => d.athlete_name))];

  // Filter data based on selections
  const filteredData = allData.filter(test => {
    const testMatch = !selectedTest || test.test_name === selectedTest;
    const teamMatch = !selectedTeam || test.team_name === selectedTeam;
    const athleteMatch = !selectedAthlete || test.athlete_name === selectedAthlete;
    return testMatch && teamMatch && athleteMatch;
  });

  // Calculate highlights based on filtered data
  const getHighlights = () => {
    if (filteredData.length === 0) {
      return {
        totalTests: 0,
        teamName: "N/A",
        athleteName: "N/A"
      };
    }

    const totalTests = filteredData.length;
    
    // Get primary team name
    const teamCounts = filteredData.reduce((acc, test) => {
      acc[test.team_name] = (acc[test.team_name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const teamName = Object.entries(teamCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || "N/A";

    // Get top performing athlete
    const athletePerformances = filteredData.reduce((acc, test) => {
      const metrics = test.metrics as any;
      const peakForce = metrics?.peak_force || metrics?.force_peak || 0;
      
      if (peakForce && typeof peakForce === 'number' && !isNaN(peakForce) && peakForce > 0) {
        if (!acc[test.athlete_name] || acc[test.athlete_name] < peakForce) {
          acc[test.athlete_name] = peakForce;
        }
      }
      return acc;
    }, {} as Record<string, number>);

    const athleteName = Object.entries(athletePerformances)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || "N/A";

    return { totalTests, teamName, athleteName };
  };

  const highlights = getHighlights();

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Collapsible Sidebar */}
      <div className={`${isCollapsed ? 'w-16' : 'w-64'} transition-all duration-300 bg-white border-r border-gray-200 flex flex-col`}>
        {/* Header with Logo */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {!isCollapsed && (
              <div className="flex items-center space-x-3">
                <img 
                  src="/lovable-uploads/2e29878b-d40d-47c5-a72c-da08ce28173d.png" 
                  alt="Rebound Medicine Logo" 
                  className="w-8 h-8 rounded-full"
                />
                <div>
                  <h1 className="text-sm font-semibold text-gray-800">Rebound Medicine</h1>
                  <p className="text-xs text-gray-500">& Performance</p>
                </div>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-2"
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              {!isCollapsed && <span className="text-sm font-medium text-blue-700">Analytics</span>}
            </div>
          </div>
        </nav>

        {/* Footer with Sign Out */}
        <div className="p-4 border-t border-gray-200">
          <Button
            variant="ghost"
            onClick={handleSignOut}
            className={`w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 ${isCollapsed ? 'px-2' : ''}`}
          >
            <LogOut className="w-4 h-4" />
            {!isCollapsed && <span className="ml-2">Sign Out</span>}
          </Button>
          {!isCollapsed && (
            <p className="text-xs text-gray-400 mt-2 text-center">
              © 2024 Rebound Medicine & Performance
            </p>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6 space-y-6">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p className="text-gray-600 mt-1">Comprehensive force plate performance analysis</p>
            </div>
            <div className="text-sm text-gray-500">
              Last updated: {formatDate(new Date())}
            </div>
          </div>

          {/* Individual Filters */}
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader className="bg-gray-50 border-b">
              <CardTitle className="text-lg font-semibold text-gray-800">Individual Filters</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Test Type</label>
                  <Select value={selectedTest} onValueChange={setSelectedTest}>
                    <SelectTrigger className="bg-white border-gray-300 focus:border-blue-500">
                      <SelectValue placeholder="Select Test Type" />
                    </SelectTrigger>
                    <SelectContent className="bg-white z-50">
                      {uniqueTests.map(test => (
                        <SelectItem key={test} value={test}>
                          {test}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Team Name</label>
                  <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                    <SelectTrigger className="bg-white border-gray-300 focus:border-blue-500">
                      <SelectValue placeholder="Select Team" />
                    </SelectTrigger>
                    <SelectContent className="bg-white z-50">
                      {uniqueTeams.map(team => (
                        <SelectItem key={team} value={team}>
                          {team}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Athlete Name</label>
                  <Select value={selectedAthlete} onValueChange={setSelectedAthlete}>
                    <SelectTrigger className="bg-white border-gray-300 focus:border-blue-500">
                      <SelectValue placeholder="Select Athlete" />
                    </SelectTrigger>
                    <SelectContent className="bg-white z-50">
                      {uniqueAthletes.map(athlete => (
                        <SelectItem key={athlete} value={athlete}>
                          {athlete}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Highlights */}
          <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardHeader>
              <CardTitle className="text-center text-lg text-gray-800">Performance Highlights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-white rounded-lg shadow-sm border border-gray-200">
                  <Building2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <div className="text-xl font-bold text-gray-800 truncate">{highlights.teamName}</div>
                  <div className="text-sm text-gray-600">Team Name</div>
                </div>
                <div className="text-center p-4 bg-white rounded-lg shadow-sm border border-gray-200">
                  <Users className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                  <div className="text-xl font-bold text-gray-800 truncate">{highlights.athleteName}</div>
                  <div className="text-sm text-gray-600">Athlete Name</div>
                </div>
                <div className="text-center p-4 bg-white rounded-lg shadow-sm border border-gray-200">
                  <BarChart3 className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-800">{highlights.totalTests}</div>
                  <div className="text-sm text-gray-600">Total Tests</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Metric Cards */}
          <MetricCards selectedTest={selectedTest} data={filteredData} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
