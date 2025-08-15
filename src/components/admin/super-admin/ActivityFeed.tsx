import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

interface ActivityItem {
  id: string;
  type: 'signup' | 'payment' | 'support' | 'team_join';
  user: {
    name: string;
    email: string;
    avatar?: string;
  };
  description: string;
  timestamp: Date;
  metadata?: {
    amount?: string;
    team?: string;
    status?: 'success' | 'warning' | 'error';
  };
}

const mockActivities: ActivityItem[] = [
  {
    id: '1',
    type: 'signup',
    user: { name: 'Sarah Johnson', email: 'sarah@clinic.com' },
    description: 'New therapist account created',
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
    metadata: { status: 'success' }
  },
  {
    id: '2',
    type: 'payment',
    user: { name: 'Elite Sports Clinic', email: 'admin@elite.com' },
    description: 'Monthly subscription payment received',
    timestamp: new Date(Date.now() - 1000 * 60 * 45),
    metadata: { amount: '$99.99', status: 'success' }
  },
  {
    id: '3',
    type: 'support',
    user: { name: 'Mike Chen', email: 'mike@therapy.com' },
    description: 'Support ticket: API integration help',
    timestamp: new Date(Date.now() - 1000 * 60 * 120),
    metadata: { status: 'warning' }
  },
  {
    id: '4',
    type: 'team_join',
    user: { name: 'Dr. Amanda Wells', email: 'amanda@wellness.com' },
    description: 'Joined Phoenix Sports Medicine team',
    timestamp: new Date(Date.now() - 1000 * 60 * 180),
    metadata: { team: 'Phoenix Sports Medicine', status: 'success' }
  },
  {
    id: '5',
    type: 'payment',
    user: { name: 'Recovery Plus', email: 'billing@recovery.com' },
    description: 'Payment failed - card expired',
    timestamp: new Date(Date.now() - 1000 * 60 * 240),
    metadata: { amount: '$59.99', status: 'error' }
  }
];

const getActivityIcon = (type: string) => {
  const icons = {
    signup: '👋',
    payment: '💳',
    support: '🆘',
    team_join: '🏥'
  };
  return icons[type as keyof typeof icons] || '📝';
};

const getStatusColor = (status?: string) => {
  switch (status) {
    case 'success': return 'bg-success';
    case 'warning': return 'bg-warning';
    case 'error': return 'bg-error';
    default: return 'bg-muted';
  }
};

export const ActivityFeed: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {mockActivities.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
              <Avatar className="h-8 w-8">
                <AvatarImage src={activity.user.avatar} />
                <AvatarFallback className="text-xs">
                  {activity.user.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {activity.user.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activity.description}
                    </p>
                    
                    {activity.metadata && (
                      <div className="flex items-center space-x-2 mt-1">
                        {activity.metadata.amount && (
                          <Badge variant="outline" className="text-xs">
                            {activity.metadata.amount}
                          </Badge>
                        )}
                        {activity.metadata.team && (
                          <Badge variant="outline" className="text-xs">
                            {activity.metadata.team}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-2">
                    <span className="text-lg">
                      {getActivityIcon(activity.type)}
                    </span>
                    {activity.metadata?.status && (
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(activity.metadata.status)}`} />
                    )}
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};