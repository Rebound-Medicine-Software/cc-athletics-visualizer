
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Eye, EyeOff, Shield, Mail, Lock, User, RefreshCw, CheckCircle, UserCheck, Heart, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const Auth = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [userRole, setUserRole] = useState<'clinician' | 'client' | null>(null);
  const [showForgotModal, setShowForgotModal] = useState<'password' | 'email' | 'both' | null>(null);
  const [resetEmail, setResetEmail] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  
  const [loginData, setLoginData] = useState({
    email: "",
    password: ""
  });
  
  const [signupData, setSignupData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: ""
  });

  // Safe password generation
  const generateSafePassword = () => {
    const adjectives = ["Swift", "Strong", "Bright", "Noble", "Quick", "Bold", "Smart", "Great"];
    const nouns = ["Tiger", "Eagle", "Lion", "Wolf", "Bear", "Hawk", "Fox", "Shark"];
    const numbers = Math.floor(Math.random() * 99) + 10;
    const symbols = ["!", "@", "#", "$", "%"];
    
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    
    return `${adjective}${noun}${numbers}${symbol}`;
  };

  const handleGeneratePassword = () => {
    const newPassword = generateSafePassword();
    setSignupData(prev => ({ ...prev, password: newPassword, confirmPassword: newPassword }));
    toast.success("Safe password generated! Consider saving this in your password manager.");
  };

  const validatePassword = (password: string) => {
    const minLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    return {
      minLength,
      hasUpper,
      hasLower,
      hasNumber,
      hasSpecial,
      isValid: minLength && hasUpper && hasLower && hasNumber && hasSpecial
    };
  };

  const sendWelcomeEmail = async (email: string, firstName: string, lastName: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('send-welcome-email', {
        body: { email, firstName, lastName }
      });
      
      if (error) {
        console.error('Error sending welcome email:', error);
        // Don't throw here as signup was successful
      } else {
        console.log('Welcome email sent successfully');
      }
    } catch (error) {
      console.error('Error sending welcome email:', error);
      // Don't throw here as signup was successful
    }
  };

  const handlePasswordReset = async () => {
    if (!resetEmail) {
      setError("Please enter your email address");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const { data, error } = await supabase.functions.invoke('send-password-reset', {
        body: { email: resetEmail }
      });

      if (error) {
        setError(error.message);
        return;
      }

      setResetMessage("Password reset email sent! Check your inbox.");
      setResetEmail("");
      setShowForgotModal(null);
      toast.success("Password reset email sent!");
    } catch (error) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailRecovery = async () => {
    if (!resetEmail) {
      setError("Please provide any alternate contact information you may have used");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const { data, error } = await supabase.functions.invoke('send-email-recovery', {
        body: { 
          contactInfo: resetEmail,
          userRole 
        }
      });

      if (error) {
        setError(error.message);
        return;
      }

      setResetMessage("Recovery request submitted! Our support team will contact you within 24 hours.");
      setResetEmail("");
      setShowForgotModal(null);
      toast.success("Recovery request sent!");
    } catch (error) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBothForgotten = async () => {
    setIsLoading(true);
    setError("");

    try {
      const { data, error } = await supabase.functions.invoke('send-account-recovery', {
        body: { 
          contactInfo: resetEmail,
          userRole,
          fullRecovery: true 
        }
      });

      if (error) {
        setError(error.message);
        return;
      }

      setResetMessage("Account recovery request submitted! Our support team will verify your identity and contact you within 48 hours.");
      setResetEmail("");
      setShowForgotModal(null);
      toast.success("Account recovery request sent!");
    } catch (error) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!loginData.email || !loginData.password) {
      setError("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      // Check if user's profile exists and organization hasn't been deleted
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        console.log('User ID:', user.id);
        
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*, created_by:created_by(*)')
          .eq('user_id', user.id)
          .single();

        console.log('Profile data:', profile);
        console.log('Profile error:', profileError);

        // If profile doesn't exist or organization was deleted
        if (!profile) {
          await supabase.auth.signOut();
          setError("Your account profile has been removed. Please contact your organization or sign up again.");
          return;
        }

        // Check if this is a clinician/client whose organization was deleted
        if (profile.role === 'practitioner' || profile.role === 'client') {
          if (!profile.created_by) {
            await supabase.auth.signOut();
            setError("Your Organization account has been removed. Please sign up again to continue.");
            return;
          }
        }

        // Validate that user's role matches selected portal
        const isClinicianPortal = userRole === 'clinician';
        const isPatientPortal = userRole === 'client';
        
        if (isClinicianPortal && !['organisation', 'practitioner', 'super_admin'].includes(profile.role)) {
          await supabase.auth.signOut();
          setError("Access denied. Your account role does not have access to the Clinician Portal.");
          return;
        }
        
        if (isPatientPortal && !['client', 'super_admin'].includes(profile.role)) {
          await supabase.auth.signOut();
          setError("Access denied. Your account role does not have access to the Athlete/Patient Portal.");
          return;
        }

        toast.success("Login successful!");
        
        console.log('Redirecting based on role:', profile.role, 'setup_completed:', profile.setup_completed);
        
        // Handle redirects based on user role and setup status
        if (profile.role === 'super_admin') {
          // Super admin can access both portals
          if (isClinicianPortal) {
            console.log('Super admin accessing Clinician Portal, redirecting to dashboard');
            navigate('/dashboard');
          } else {
            console.log('Super admin accessing Patient Portal, redirecting to dashboard');
            navigate('/dashboard');
          }
        } else if (profile.role === 'organisation') {
          // Organization role can access Clinician Portal
          // Check if organization has completed setup
          if (profile.setup_completed) {
            console.log('Organization setup completed, redirecting to dashboard');
            navigate('/dashboard');
          } else {
            console.log('Organization setup not completed, redirecting to setup');
            navigate('/setup');
          }
        } else if (profile.role === 'practitioner') {
          // Practitioner role can access Clinician Portal
          console.log('Practitioner, redirecting to dashboard');
          navigate('/dashboard');
        } else if (profile.role === 'client') {
          // Client role can access Athlete/Patient Portal
          console.log('Client, redirecting to client dashboard');
          navigate('/Dashboard(Client)');
        } else {
          // Other roles default to dashboard
          console.log('Other role, redirecting to dashboard');
          navigate('/dashboard');
        }
      }
    } catch (error) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!signupData.email || !signupData.password || !signupData.firstName || !signupData.lastName) {
      setError("Please fill in all fields");
      return;
    }

    if (signupData.password !== signupData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    const passwordValidation = validatePassword(signupData.password);
    if (!passwordValidation.isValid) {
      setError("Password does not meet security requirements");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // Determine role based on user type
      let role = 'client';
      if (userRole === 'clinician') {
        role = 'organisation'; // Clinician signup creates organisation account
      }
      
      // Check for super admin email
      if (signupData.email === 'reflexsportstherpayy@gmail.com') {
        role = 'super_admin';
      }

      if (role === 'organisation') {
        // Use custom edge function for organisation signup (bypasses Supabase email)
        const { data, error } = await supabase.functions.invoke('signup-organisation', {
          body: {
            email: signupData.email,
            password: signupData.password,
            firstName: signupData.firstName,
            lastName: signupData.lastName
          }
        });

        if (error) {
          setError(error.message || 'Failed to create organization account');
          return;
        }

        if (data?.error) {
          setError(data.error);
          return;
        }

        toast.success("Organisation account created! Please check your email for account verification instructions.");
        
        // Reset to login tab for clinician portal
        setTimeout(() => {
          const loginTab = document.querySelector('[value="login"]') as HTMLElement;
          if (loginTab) {
            loginTab.click();
          }
        }, 2000);
      } else {
        // For other roles, use standard Supabase signup
        const { error } = await supabase.auth.signUp({
          email: signupData.email,
          password: signupData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/setup`,
            data: {
              first_name: signupData.firstName,
              last_name: signupData.lastName,
              role: role
            }
          }
        });

        if (error) {
          setError(error.message);
          return;
        }

        // Send welcome email
        await sendWelcomeEmail(signupData.email, signupData.firstName, signupData.lastName);

        if (role === 'super_admin') {
          toast.success("Super Admin account created! Full platform access granted.");
        } else {
          toast.success("Account created! Please check your email for verification from reflexsportstherapyy@gmail.com");
        }
      }
    } catch (error) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const passwordValidation = validatePassword(signupData.password);

  // Role selection screen
  if (!userRole) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm shadow-xl">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <img 
                src="/lovable-uploads/2e29878b-d40d-47c5-a72c-da08ce28173d.png" 
                alt="Rebound Medicine and Performance Logo" 
                className="w-16 h-16 rounded-full shadow-lg"
              />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-800">
              Welcome to Rebound Medicine & Performance
            </CardTitle>
            <p className="text-sm text-gray-600">
              Please select your role to continue
            </p>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <Button
              onClick={() => setUserRole('clinician')}
              variant="outline"
              className="w-full h-16 flex items-center gap-4 text-left hover:bg-blue-50 hover:border-blue-300"
            >
              <UserCheck className="w-8 h-8 text-blue-600" />
              <div>
                <div className="font-semibold">Clinician</div>
                <div className="text-sm text-gray-500">Healthcare provider or coach</div>
              </div>
            </Button>
            
            <Button
              onClick={() => setUserRole('client')}
              variant="outline"
              className="w-full h-16 flex items-center gap-4 text-left hover:bg-orange-50 hover:border-orange-300"
            >
              <Heart className="w-8 h-8 text-orange-600" />
              <div>
                <div className="font-semibold">Athlete/Patient</div>
                <div className="text-sm text-gray-500">Receiving treatment or training</div>
              </div>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main auth screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <img 
              src="/lovable-uploads/2e29878b-d40d-47c5-a72c-da08ce28173d.png" 
              alt="Rebound Medicine and Performance Logo" 
              className="w-16 h-16 rounded-full shadow-lg"
            />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-800">
            {userRole === 'clinician' ? 'Clinician Portal' : 'Athlete/Patient Portal'}
          </CardTitle>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
            <Shield className="w-4 h-4" />
            <span>HIPAA-compliant security with Row Level Security (RLS)</span>
          </div>
          <Button
            onClick={() => setUserRole(null)}
            variant="ghost"
            size="sm"
            className="text-xs"
          >
            ← Change role
          </Button>
        </CardHeader>
        
        <CardContent>
          {userRole === 'clinician' ? (
            <Tabs defaultValue="login" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Create Account</TabsTrigger>
              </TabsList>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <TabsContent value="login" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email
                  </Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="Enter your email"
                    value={loginData.email}
                    onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="login-password" className="flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={loginData.password}
                      onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
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
                
                <Button
                  onClick={handleLogin}
                  disabled={isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>

                {resetMessage && (
                  <Alert>
                    <AlertDescription>{resetMessage}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600 text-center">Need help accessing your account?</p>
                  
                  <Dialog open={showForgotModal === 'password'} onOpenChange={(open) => !open && setShowForgotModal(null)}>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => setShowForgotModal('password')}
                      >
                        <HelpCircle className="w-4 h-4 mr-2" />
                        Forgotten Your Password?
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Reset Your Password</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <p className="text-sm text-gray-600">
                          Enter your email address and we'll send you a link to reset your password.
                        </p>
                        <Input
                          type="email"
                          placeholder="Enter your email address"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                        />
                        <Button 
                          onClick={handlePasswordReset}
                          disabled={isLoading}
                          className="w-full"
                        >
                          {isLoading ? "Sending..." : "Send Reset Link"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={showForgotModal === 'email'} onOpenChange={(open) => !open && setShowForgotModal(null)}>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => setShowForgotModal('email')}
                      >
                        <HelpCircle className="w-4 h-4 mr-2" />
                        Forgotten Your Email?
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Recover Your Email</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <p className="text-sm text-gray-600">
                          Provide any alternate contact information you may have used (phone number, alternate email, etc.) and our support team will help you recover your account.
                        </p>
                        <Input
                          placeholder="Phone number or alternate contact info"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                        />
                        <Button 
                          onClick={handleEmailRecovery}
                          disabled={isLoading}
                          className="w-full"
                        >
                          {isLoading ? "Submitting..." : "Submit Recovery Request"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={showForgotModal === 'both'} onOpenChange={(open) => !open && setShowForgotModal(null)}>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => setShowForgotModal('both')}
                      >
                        <HelpCircle className="w-4 h-4 mr-2" />
                        Forgotten Both Your Password and Email?
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Account Recovery</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <p className="text-sm text-gray-600">
                          For security reasons, we'll need to verify your identity. Please provide any contact information or details about your account that you remember.
                        </p>
                        <Input
                          placeholder="Any contact info or account details you remember"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                        />
                        <div className="text-xs text-gray-500 space-y-1">
                          <p>• Phone number associated with the account</p>
                          <p>• Approximate date you created the account</p>
                          <p>• Name of your clinic or organization</p>
                          <p>• Any other identifying information</p>
                        </div>
                        <Button 
                          onClick={handleBothForgotten}
                          disabled={isLoading}
                          className="w-full"
                        >
                          {isLoading ? "Submitting..." : "Submit Account Recovery"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </TabsContent>

              <TabsContent value="signup" className="space-y-4">
                <div className="text-center text-sm text-gray-600 mb-4">
                  Create Organisation Account (for first-time Clinician setup)
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first-name" className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      First Name
                    </Label>
                    <Input
                      id="first-name"
                      placeholder="First name"
                      value={signupData.firstName}
                      onChange={(e) => setSignupData(prev => ({ ...prev, firstName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2 flex flex-col items-center">
                    <Label htmlFor="last-name" className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Last Name
                    </Label>
                    <Input
                      id="last-name"
                      placeholder="Last name"
                      value={signupData.lastName}
                      onChange={(e) => setSignupData(prev => ({ ...prev, lastName: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email
                  </Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="Enter your email"
                    value={signupData.email}
                    onChange={(e) => setSignupData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="signup-password" className="flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      Password
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleGeneratePassword}
                      className="text-xs h-6"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Generate Safe Password
                    </Button>
                  </div>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a password"
                      value={signupData.password}
                      onChange={(e) => setSignupData(prev => ({ ...prev, password: e.target.value }))}
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
                  
                  {signupData.password && (
                    <div className="text-xs space-y-1">
                      <div className={`flex items-center gap-2 ${passwordValidation.minLength ? 'text-green-600' : 'text-red-600'}`}>
                        <CheckCircle className={`w-3 h-3 ${passwordValidation.minLength ? 'text-green-600' : 'text-red-600'}`} />
                        At least 8 characters
                      </div>
                      <div className={`flex items-center gap-2 ${passwordValidation.hasUpper ? 'text-green-600' : 'text-red-600'}`}>
                        <CheckCircle className={`w-3 h-3 ${passwordValidation.hasUpper ? 'text-green-600' : 'text-red-600'}`} />
                        One uppercase letter
                      </div>
                      <div className={`flex items-center gap-2 ${passwordValidation.hasLower ? 'text-green-600' : 'text-red-600'}`}>
                        <CheckCircle className={`w-3 h-3 ${passwordValidation.hasLower ? 'text-green-600' : 'text-red-600'}`} />
                        One lowercase letter
                      </div>
                      <div className={`flex items-center gap-2 ${passwordValidation.hasNumber ? 'text-green-600' : 'text-red-600'}`}>
                        <CheckCircle className={`w-3 h-3 ${passwordValidation.hasNumber ? 'text-green-600' : 'text-red-600'}`} />
                        One number
                      </div>
                      <div className={`flex items-center gap-2 ${passwordValidation.hasSpecial ? 'text-green-600' : 'text-red-600'}`}>
                        <CheckCircle className={`w-3 h-3 ${passwordValidation.hasSpecial ? 'text-green-600' : 'text-red-600'}`} />
                        One special character
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={signupData.confirmPassword}
                      onChange={(e) => setSignupData(prev => ({ ...prev, confirmPassword: e.target.value }))}
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
                
                <Button
                  onClick={handleSignup}
                  disabled={isLoading || !passwordValidation.isValid}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {isLoading ? "Creating Account..." : "Create Account"}
                </Button>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="client-login-email" className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email
                  </Label>
                  <Input
                    id="client-login-email"
                    type="email"
                    placeholder="Enter your email"
                    value={loginData.email}
                    onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="client-login-password" className="flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="client-login-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={loginData.password}
                      onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
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
                
                <Button
                  onClick={handleLogin}
                  disabled={isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>

                {resetMessage && (
                  <Alert>
                    <AlertDescription>{resetMessage}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600 text-center">Need help accessing your account?</p>
                  
                  <Dialog open={showForgotModal === 'password'} onOpenChange={(open) => !open && setShowForgotModal(null)}>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => setShowForgotModal('password')}
                      >
                        <HelpCircle className="w-4 h-4 mr-2" />
                        Forgotten Your Password?
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Reset Your Password</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <p className="text-sm text-gray-600">
                          Enter your email address and we'll send you a link to reset your password.
                        </p>
                        <Input
                          type="email"
                          placeholder="Enter your email address"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                        />
                        <Button 
                          onClick={handlePasswordReset}
                          disabled={isLoading}
                          className="w-full"
                        >
                          {isLoading ? "Sending..." : "Send Reset Link"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={showForgotModal === 'email'} onOpenChange={(open) => !open && setShowForgotModal(null)}>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => setShowForgotModal('email')}
                      >
                        <HelpCircle className="w-4 h-4 mr-2" />
                        Forgotten Your Email?
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Recover Your Email</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <p className="text-sm text-gray-600">
                          Provide any alternate contact information you may have used (phone number, alternate email, etc.) and our support team will help you recover your account.
                        </p>
                        <Input
                          placeholder="Phone number or alternate contact info"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                        />
                        <Button 
                          onClick={handleEmailRecovery}
                          disabled={isLoading}
                          className="w-full"
                        >
                          {isLoading ? "Submitting..." : "Submit Recovery Request"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={showForgotModal === 'both'} onOpenChange={(open) => !open && setShowForgotModal(null)}>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => setShowForgotModal('both')}
                      >
                        <HelpCircle className="w-4 h-4 mr-2" />
                        Forgotten Both Your Password and Email?
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Account Recovery</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <p className="text-sm text-gray-600">
                          For security reasons, we'll need to verify your identity. Please provide any contact information or details about your account that you remember.
                        </p>
                        <Input
                          placeholder="Any contact info or account details you remember"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                        />
                        <div className="text-xs text-gray-500 space-y-1">
                          <p>• Phone number associated with the account</p>
                          <p>• Approximate date you created the account</p>
                          <p>• Name of your clinic or organization</p>
                          <p>• Any other identifying information</p>
                        </div>
                        <Button 
                          onClick={handleBothForgotten}
                          disabled={isLoading}
                          className="w-full"
                        >
                          {isLoading ? "Submitting..." : "Submit Account Recovery"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
