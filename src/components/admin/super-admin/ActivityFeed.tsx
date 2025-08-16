import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

interface ActivityItem {
  id: string;
  type: 'signup' | 'payment' | 'login' | 'upgrade';
  user_name: string;
  description: string;
  amount?: string;
  status: 'completed' | 'pending' | 'in-progress' | 'approved' | 'rejected';
  created_at: string;
  avatar_url?: string;
}

export const ActivityFeed = () => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      // Fetch recent user profiles to generate activity data
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, created_at, role')
        .order('created_at', { ascending: false })
        .limit(10);

      if (profiles) {
        // Sample data inspired by the SnowUI reference image
        const sampleActivities: ActivityItem[] = [
          {
            id: '1',
            type: 'payment',
            user_name: 'ByeWind',
            description: 'Payment processed',
            amount: '$942.00',
            status: 'in-progress',
            created_at: '2025-06-24T12:00:00Z',
            avatar_url: undefined,
          },
          {
            id: '2',
            type: 'payment',
            user_name: 'Natali Craig',
            description: 'Payment processed',
            amount: '$881.00',
            status: 'completed',
            created_at: '2025-03-10T12:00:00Z',
            avatar_url: undefined,
          },
          {
            id: '3',
            type: 'payment',
            user_name: 'Drew Cano',
            description: 'Payment processed',
            amount: '$409.00',
            status: 'pending',
            created_at: '2025-11-10T12:00:00Z',
            avatar_url: undefined,
          },
          {
            id: '4',
            type: 'payment',
            user_name: 'Orlando Diggs',
            description: 'Payment processed',
            amount: '$953.00',
            status: 'approved',
            created_at: '2025-12-20T12:00:00Z',
            avatar_url: undefined,
          },
          {
            id: '5',
            type: 'payment',
            user_name: 'Andi Lane',
            description: 'Payment processed',
            amount: '$907.00',
            status: 'rejected',
            created_at: '2025-07-25T12:00:00Z',
            avatar_url: undefined,
          },
        ];

        // Mix sample data with real data if available
        const mockActivities: ActivityItem[] = profiles.length > 0 
          ? profiles.slice(0, 5).map((profile, index) => ({
              ...sampleActivities[index],
              id: profile.id,
              user_name: profile.full_name || profile.email.split('@')[0],
              avatar_url: profile.avatar_url,
              created_at: profile.created_at,
            }))
          : sampleActivities;

        setActivities(mockActivities);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Projects</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4 animate-pulse">
                <div className="w-10 h-10 bg-muted rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
                <div className="h-6 bg-muted rounded w-20"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>Projects</CardTitle>
        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          <span>Manager</span>
          <span>Date</span>
          <span>Amount</span>
          <span>Status</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center space-x-3">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={activity.avatar_url} />
                  <AvatarFallback className="text-xs">
                    {activity.user_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-foreground">
                  {activity.user_name}
                </span>
              </div>
              
              <div className="flex items-center space-x-8 text-sm text-muted-foreground">
                <span className="w-20">
                  {new Date(activity.created_at).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}
                </span>
                
                {activity.amount && (
                  <span className="w-20 font-semibold text-foreground">
                    {activity.amount}
                  </span>
                )}
                
                <Badge className={`text-xs ${getStatusColor(activity.status)} w-20 justify-center`}>
                  {activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};