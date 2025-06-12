
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, BarChart3, Users, TrendingUp } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const [animationStage, setAnimationStage] = useState(0);

  useEffect(() => {
    const timer1 = setTimeout(() => setAnimationStage(1), 500);
    const timer2 = setTimeout(() => setAnimationStage(2), 2000);
    const timer3 = setTimeout(() => setAnimationStage(3), 3500);
    const timer4 = setTimeout(() => setAnimationStage(4), 5000);
    const timer5 = setTimeout(() => navigate('/auth'), 7000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      clearTimeout(timer5);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 overflow-hidden">
      {/* Animated Header */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center gap-6">
            {/* Logo with water drop animation */}
            <div className={`transition-all duration-1000 ${animationStage >= 1 ? 'opacity-100 scale-100 animate-bounce' : 'opacity-0 scale-0'}`}>
              <img 
                src="/lovable-uploads/2e29878b-d40d-47c5-a72c-da08ce28173d.png" 
                alt="Rebound Medicine and Performance Logo" 
                className="w-16 h-16 rounded-full shadow-lg"
              />
            </div>
            
            {/* Main Title with slide animation */}
            <div className="text-center">
              <h1 className={`text-3xl font-bold text-gray-800 transition-all duration-1000 delay-300 ${animationStage >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                Evolve Physiotherapy Advanced Testing Platform
              </h1>
              
              {/* Welcome message */}
              <h2 className={`text-2xl font-semibold text-blue-600 mt-4 transition-all duration-1000 delay-700 ${animationStage >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                Welcome to Rebound Medicine and Performance Advanced Testing Platform
              </h2>
              
              {/* Catchphrase */}
              <p className={`text-lg text-gray-600 mt-2 transition-all duration-1000 delay-1000 ${animationStage >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                Elite performance database software, designed for force plate integration
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content with staggered animations */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Feature Cards with water drop effect */}
          <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 my-12 transition-all duration-1000 delay-1500 ${animationStage >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'}`}>
            <Card className="bg-white/90 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-500 transform hover:scale-105 animate-fade-in">
              <CardHeader>
                <div className="animate-pulse">
                  <BarChart3 className="w-10 h-10 text-blue-600 mx-auto animate-bounce" />
                </div>
                <CardTitle className="text-center">Advanced Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-center">
                  Comprehensive force plate data analysis with detailed metrics and visualizations
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/90 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-500 transform hover:scale-105 animate-fade-in delay-200">
              <CardHeader>
                <div className="animate-pulse">
                  <Users className="w-10 h-10 text-green-600 mx-auto animate-bounce delay-100" />
                </div>
                <CardTitle className="text-center">Team Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-center">
                  Track multiple athletes and teams with comprehensive performance comparisons
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/90 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-500 transform hover:scale-105 animate-fade-in delay-400">
              <CardHeader>
                <div className="animate-pulse">
                  <TrendingUp className="w-10 h-10 text-purple-600 mx-auto animate-bounce delay-200" />
                </div>
                <CardTitle className="text-center">Progress Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-center">
                  Monitor athlete progress over time with detailed trend analysis
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Loading indicator */}
          <div className={`mt-8 transition-all duration-500 ${animationStage >= 4 ? 'opacity-100' : 'opacity-0'}`}>
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-gray-600">Launching platform...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
