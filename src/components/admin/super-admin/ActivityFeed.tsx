import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface ActivityItem {
  id: string;
  type: 'user_signup' | 'payment_success' | 'team_created' | 'subscription_upgraded';
  user_name: string;
  user_avatar?: string;
  description: string;
  amount?: number;
  status: 'success' | 'warning' | 'error';
  created_at: string;
}

export const ActivityFeed: React.FC = () => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      // Fetch recent profiles for activity simulation
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (profilesError) throw profilesError;

      // Generate mock activities based on real data
      const mockActivities: ActivityItem[] = profiles?.map((profile, index) => {
        const activityTypes = ['user_signup', 'payment_success', 'team_created', 'subscription_upgraded'];
        const type = activityTypes[index % activityTypes.length] as ActivityItem['type'];
        
        const descriptions = {
          user_signup: `New user registered`,
          payment_success: `Payment completed`,
          team_created: `New team created`,
          subscription_upgraded: `Subscription upgraded to Premium`
        };

        const statuses = {
          user_signup: 'success' as const,
          payment_success: 'success' as const,
          team_created: 'success' as const,
          subscription_upgraded: 'warning' as const
        };

        return {
          id: profile.id,
          type,
          user_name: profile.full_name || profile.email.split('@')[0],
          user_avatar: profile.avatar_url,
          description: descriptions[type],
          amount: type === 'payment_success' ? Math.floor(Math.random() * 500) + 100 : undefined,
          status: statuses[type],
          created_at: profile.created_at
        };
      }) || [];

      setActivities(mockActivities);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'user_signup':
        return '👋';
      case 'payment_success':
        return '💳';
      case 'team_created':
        return '🏢';
      case 'subscription_upgraded':
        return '⬆️';
      default:
        return '📝';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center space-x-4 animate-pulse">
                <div className="w-10 h-10 bg-muted rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
                <div className="w-16 h-6 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
              <Avatar className="w-10 h-10">
                <AvatarImage src={activity.user_avatar} />
                <AvatarFallback>
                  {activity.user_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-sm">{getTypeIcon(activity.type)}</span>
                  <span className="font-medium text-sm">{activity.user_name}</span>
                  <span className="text-sm text-muted-foreground">{activity.description}</span>
                  {activity.amount && (
                    <span className="text-sm font-medium text-green-600">
                      ${activity.amount}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                </p>
              </div>
              
              <Badge className={getStatusColor(activity.status)} variant="secondary">
                {activity.status}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};