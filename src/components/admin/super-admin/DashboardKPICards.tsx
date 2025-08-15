import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Users, Activity, UserPlus, CreditCard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface KPIData {
  totalViews: number;
  totalVisits: number;
  newUsers: number;
  activeUsers: number;
  viewsChange: number;
  visitsChange: number;
  newUsersChange: number;
  activeUsersChange: number;
}

interface DashboardKPICardsProps {
  onKPIClick?: (kpi: string) => void;
}

export const DashboardKPICards: React.FC<DashboardKPICardsProps> = ({ onKPIClick }) => {
  const [kpiData, setKpiData] = useState<KPIData>({
    totalViews: 0,
    totalVisits: 0,
    newUsers: 0,
    activeUsers: 0,
    viewsChange: 0,
    visitsChange: 0,
    newUsersChange: 0,
    activeUsersChange: 0
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchKPIData();
  }, []);

  const fetchKPIData = async () => {
    try {
      // Fetch total users
      const { data: totalUsers, error: totalUsersError } = await supabase
        .from('profiles')
        .select('*');

      if (totalUsersError) throw totalUsersError;

      // Fetch users from last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: newUsers, error: newUsersError } = await supabase
        .from('profiles')
        .select('*')
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (newUsersError) throw newUsersError;

      // Fetch active teams
      const { data: activeTeams, error: activeTeamsError } = await supabase
        .from('teams')
        .select('*');

      if (activeTeamsError) throw activeTeamsError;

      // Calculate mock data for views/visits (would come from analytics in real app)
      const mockViews = totalUsers?.length ? totalUsers.length * 45 : 7265;
      const mockVisits = totalUsers?.length ? totalUsers.length * 25 : 3671;

      setKpiData({
        totalViews: mockViews,
        totalVisits: mockVisits,
        newUsers: newUsers?.length || 0,
        activeUsers: totalUsers?.length || 0,
        viewsChange: 11.01,
        visitsChange: -0.03,
        newUsersChange: 15.03,
        activeUsersChange: 6.08
      });
    } catch (error) {
      console.error('Error fetching KPI data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  };

  const kpiCards = [
    {
      id: 'views',
      title: 'Views',
      value: kpiData.totalViews,
      change: kpiData.viewsChange,
      icon: Activity,
      gradient: 'from-blue-500 to-blue-600'
    },
    {
      id: 'visits',
      title: 'Visits',
      value: kpiData.totalVisits,
      change: kpiData.visitsChange,
      icon: Users,
      gradient: 'from-slate-700 to-slate-800'
    },
    {
      id: 'new-users',
      title: 'New Users',
      value: kpiData.newUsers,
      change: kpiData.newUsersChange,
      icon: UserPlus,
      gradient: 'from-blue-400 to-blue-500'
    },
    {
      id: 'active-users',
      title: 'Active Users',
      value: kpiData.activeUsers,
      change: kpiData.activeUsersChange,
      icon: CreditCard,
      gradient: 'from-slate-600 to-slate-700'
    }
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="relative overflow-hidden">
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-muted rounded w-1/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {kpiCards.map((card) => {
        const Icon = card.icon;
        const isPositive = card.change >= 0;
        const TrendIcon = isPositive ? TrendingUp : TrendingDown;

        return (
          <Card 
            key={card.id}
            className="relative overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
            onClick={() => onKPIClick?.(card.id)}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-90`} />
            <CardContent className="relative p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-white/90">{card.title}</h3>
                <Icon className="w-4 h-4 text-white/80" />
              </div>
              
              <div className="space-y-1">
                <p className="text-2xl font-bold text-white">
                  {formatNumber(card.value)}
                </p>
                
                <div className="flex items-center space-x-1">
                  <TrendIcon className={`w-3 h-3 ${isPositive ? 'text-green-200' : 'text-red-200'}`} />
                  <span className={`text-xs font-medium ${isPositive ? 'text-green-200' : 'text-red-200'}`}>
                    {isPositive ? '+' : ''}{card.change.toFixed(2)}%
                  </span>
                  <TrendingUp className="w-3 h-3 text-white/60 ml-auto" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};