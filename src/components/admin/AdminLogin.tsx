import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface AdminLoginProps {
  onLoginSuccess: () => void;
}

const AdminLogin = ({ onLoginSuccess }: AdminLoginProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      toast.success('Login successful!');
      
      // Check if user is super admin and redirect accordingly
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, email')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();
      
      if (profile?.role === 'super_admin' && profile?.email === 'reflexsportstherapyy@gmail.com') {
        window.location.href = '/admin-dashboard';
      } else {
        onLoginSuccess();
      }
    } catch (error) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      setError('Please enter your email address first');
      return;
    }

    setIsResetting(true);
    setError('');

    try {
      const { data, error } = await supabase.functions.invoke('send-password-reset', {
        body: { email }
      });

      if (error) {
        setError(error.message);
        return;
      }

      toast.success('Password reset email sent! Check your inbox.');
    } catch (error) {
      setError('Failed to send password reset email');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center text-sm text-muted-foreground mb-4">
        Already have an admin account? Sign in below
      </div>
      
      <Separator />
      
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="admin-email" className="flex items-center gap-2">
          <Mail className="w-4 h-4" />
          Email
        </Label>
        <Input
          id="admin-email"
          type="email"
          placeholder="Enter your admin email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="admin-password" className="flex items-center gap-2">
          <Lock className="w-4 h-4" />
          Password
        </Label>
        <div className="relative">
          <Input
            id="admin-password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
        </div>
      </div>
      
      <div className="space-y-2">
        <Button
          onClick={handleLogin}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? "Signing in..." : "Sign In"}
        </Button>
        
        <Button
          variant="outline"
          onClick={handlePasswordReset}
          disabled={isResetting || !email}
          className="w-full"
        >
          {isResetting ? "Sending..." : "Send Password Reset"}
        </Button>
      </div>
    </div>
  );
};

export default AdminLogin;