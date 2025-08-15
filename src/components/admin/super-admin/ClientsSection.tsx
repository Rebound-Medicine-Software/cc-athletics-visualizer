import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Search, Filter, MoreHorizontal, CreditCard, User } from 'lucide-react';

const mockClients = [
  {
    id: '1',
    name: 'John Smith',
    email: 'john.smith@email.com',
    therapist: 'Dr. Sarah Johnson',
    tier: 'Premium',
    paymentStatus: 'active',
    lastSession: '2024-01-18',
    totalSessions: 15
  },
  {
    id: '2',
    name: 'Emily Davis',
    email: 'emily.davis@email.com', 
    therapist: 'Mike Chen, PT',
    tier: 'Basic',
    paymentStatus: 'overdue',
    lastSession: '2024-01-10',
    totalSessions: 8
  },
  {
    id: '3',
    name: 'Robert Wilson',
    email: 'robert.wilson@email.com',
    therapist: 'Dr. Amanda Wells',
    tier: 'Elite',
    paymentStatus: 'active',
    lastSession: '2024-01-19',
    totalSessions: 32
  }
];

export const ClientsSection: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all');

  const filteredClients = mockClients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPayment = paymentFilter === 'all' || client.paymentStatus === paymentFilter;
    return matchesSearch && matchesPayment;
  });

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success text-success-foreground';
      case 'overdue': return 'bg-error text-error-foreground';
      case 'cancelled': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Basic': return 'bg-secondary text-secondary-foreground';
      case 'Premium': return 'bg-primary text-primary-foreground';
      case 'Elite': return 'bg-accent text-accent-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Client Management
        </h1>
        <p className="text-muted-foreground">
          Overview of all client accounts, subscriptions, and activity.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">1,234</div>
            <p className="text-sm text-muted-foreground">Total Clients</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-success">1,156</div>
            <p className="text-sm text-muted-foreground">Active Subscriptions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-error">78</div>
            <p className="text-sm text-muted-foreground">Overdue Payments</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-warning">542</div>
            <p className="text-sm text-muted-foreground">Sessions This Month</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters & Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full md:w-auto">
                  <Filter className="h-4 w-4 mr-2" />
                  Payment: {paymentFilter === 'all' ? 'All' : paymentFilter}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setPaymentFilter('all')}>
                  All Statuses
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPaymentFilter('active')}>
                  Active
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPaymentFilter('overdue')}>
                  Overdue
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPaymentFilter('cancelled')}>
                  Cancelled
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Clients Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Client Directory</CardTitle>
            <Badge variant="outline">
              {filteredClients.length} clients
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Assigned Therapist</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Payment Status</TableHead>
                <TableHead>Sessions</TableHead>
                <TableHead>Last Session</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {client.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{client.name}</div>
                        <div className="text-sm text-muted-foreground">{client.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{client.therapist}</TableCell>
                  <TableCell>
                    <Badge className={getTierColor(client.tier)}>
                      {client.tier}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getPaymentStatusColor(client.paymentStatus)}>
                      {client.paymentStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>{client.totalSessions}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {client.lastSession}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <User className="h-4 w-4 mr-2" />
                          View Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <CreditCard className="h-4 w-4 mr-2" />
                          Payment History
                        </DropdownMenuItem>
                        {client.paymentStatus === 'overdue' && (
                          <DropdownMenuItem className="text-warning">
                            Send Payment Reminder
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};