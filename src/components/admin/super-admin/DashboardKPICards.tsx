import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Building, DollarSign, MessageSquare, TrendingUp, TrendingDown } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  change: number;
  icon: React.ComponentType<any>;
  gradient: string;
  onClick?: () => void;
}

const KPICard: React.FC<KPICardProps> = ({ title, value, change, icon: Icon, gradient, onClick }) => {
  const isPositive = change >= 0;
  
  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-all duration-200 overflow-hidden"
      onClick={onClick}
    >
      <div className={`h-1 ${gradient}`} />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        <div className="flex items-center space-x-1 text-xs">
          {isPositive ? (
            <TrendingUp className="h-3 w-3 text-success" />
          ) : (
            <TrendingDown className="h-3 w-3 text-error" />
          )}
          <span className={isPositive ? 'text-success' : 'text-error'}>
            {isPositive ? '+' : ''}{change}%
          </span>
          <span className="text-muted-foreground">from last month</span>
        </div>
      </CardContent>
    </Card>
  );
};

interface DashboardKPICardsProps {
  onKPIClick: (section: string) => void;
}

export const DashboardKPICards: React.FC<DashboardKPICardsProps> = ({ onKPIClick }) => {
  const kpiData = [
    {
      title: 'Total Therapists',
      value: '47',
      change: 12,
      icon: Users,
      gradient: 'bg-gradient-to-r from-primary to-primary-glow',
      section: 'therapists'
    },
    {
      title: 'Active Clients',
      value: '1,234',
      change: 8,
      icon: Users,
      gradient: 'bg-gradient-to-r from-success to-green-400',
      section: 'clients'
    },
    {
      title: 'Teams/Clinics',
      value: '28',
      change: 15,
      icon: Building,
      gradient: 'bg-gradient-to-r from-warning to-yellow-400',
      section: 'teams'
    },
    {
      title: 'Monthly Revenue',
      value: '$12,450',
      change: -3,
      icon: DollarSign,
      gradient: 'bg-gradient-to-r from-accent to-orange-400',
      section: 'payments'
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {kpiData.map((kpi) => (
        <KPICard
          key={kpi.section}
          title={kpi.title}
          value={kpi.value}
          change={kpi.change}
          icon={kpi.icon}
          gradient={kpi.gradient}
          onClick={() => onKPIClick(kpi.section)}
        />
      ))}
    </div>
  );
};