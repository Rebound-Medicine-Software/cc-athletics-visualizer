import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Search, Filter, MoreHorizontal, CheckCircle, XCircle, Mail } from 'lucide-react';

const mockTherapists = [
  {
    id: '1',
    name: 'Dr. Sarah Johnson',
    email: 'sarah.johnson@clinic.com',
    team: 'Elite Sports Medicine',
    status: 'active',
    joinDate: '2024-01-15',
    clients: 23,
    lastLogin: '2 hours ago'
  },
  {
    id: '2', 
    name: 'Mike Chen, PT',
    email: 'mike.chen@therapy.com',
    team: 'Recovery Plus',
    status: 'pending',
    joinDate: '2024-01-10',
    clients: 0,
    lastLogin: 'Never'
  },
  {
    id: '3',
    name: 'Dr. Amanda Wells',
    email: 'amanda@wellness.com', 
    team: 'Phoenix Sports Medicine',
    status: 'suspended',
    joinDate: '2023-12-20',
    clients: 15,
    lastLogin: '1 week ago'
  }
];

export const TherapistAccountsSection: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredTherapists = mockTherapists.filter(therapist => {
    const matchesSearch = therapist.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         therapist.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || therapist.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success text-success-foreground';
      case 'pending': return 'bg-warning text-warning-foreground'; 
      case 'suspended': return 'bg-error text-error-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Therapist Accounts
        </h1>
        <p className="text-muted-foreground">
          Manage practitioner accounts and access permissions.
        </p>
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
                placeholder="Search therapists..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full md:w-auto">
                  <Filter className="h-4 w-4 mr-2" />
                  Status: {statusFilter === 'all' ? 'All' : statusFilter}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setStatusFilter('all')}>
                  All Statuses
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('active')}>
                  Active
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('pending')}>
                  Pending
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('suspended')}>
                  Suspended
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Therapists Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Therapist Directory</CardTitle>
            <Badge variant="outline">
              {filteredTherapists.length} therapists
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Therapist</TableHead>
                <TableHead>Team/Clinic</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Clients</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTherapists.map((therapist) => (
                <TableRow key={therapist.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {therapist.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{therapist.name}</div>
                        <div className="text-sm text-muted-foreground">{therapist.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{therapist.team}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(therapist.status)}>
                      {therapist.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{therapist.clients}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {therapist.lastLogin}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {therapist.status === 'pending' && (
                          <DropdownMenuItem className="text-success">
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve Account
                          </DropdownMenuItem>
                        )}
                        {therapist.status === 'active' && (
                          <DropdownMenuItem className="text-warning">
                            <XCircle className="h-4 w-4 mr-2" />
                            Suspend Account
                          </DropdownMenuItem>
                        )}
                        {therapist.status === 'suspended' && (
                          <DropdownMenuItem className="text-success">
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Reactivate Account
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem>
                          <Mail className="h-4 w-4 mr-2" />
                          Send Message
                        </DropdownMenuItem>
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