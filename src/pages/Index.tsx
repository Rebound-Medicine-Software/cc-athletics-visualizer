
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, BarChart3, Users, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center gap-3">
            <Activity className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-800">
              Evolve Physiotherapy Advanced Testing Platform
            </h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-4xl font-bold text-gray-800">
              Professional Athlete Performance Analysis
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Advanced force plate testing and analysis platform for sports performance optimization
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-12">
            <Card className="bg-white/90 backdrop-blur-sm shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <BarChart3 className="w-10 h-10 text-blue-600 mx-auto" />
                <CardTitle className="text-center">Advanced Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-center">
                  Comprehensive force plate data analysis with detailed metrics and visualizations
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/90 backdrop-blur-sm shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <Users className="w-10 h-10 text-green-600 mx-auto" />
                <CardTitle className="text-center">Team Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-center">
                  Track multiple athletes and teams with comprehensive performance comparisons
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/90 backdrop-blur-sm shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <TrendingUp className="w-10 h-10 text-purple-600 mx-auto" />
                <CardTitle className="text-center">Progress Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-center">
                  Monitor athlete progress over time with detailed trend analysis
                </p>
              </CardContent>
            </Card>
          </div>

          {/* CTA */}
          <div className="space-y-6">
            <Button
              onClick={() => navigate('/login')}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg"
            >
              Access Reporting Dashboard
            </Button>
            <p className="text-sm text-gray-500">
              Enter your CC Athletics API key to access the dashboard
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
