import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Key, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const Setup = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedSoftware, setSelectedSoftware] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isApiKeyValid, setIsApiKeyValid] = useState(false);
  const [organizationData, setOrganizationData] = useState({
    name: '',
    location: '',
    country: 'UK',
    region: '',
    city: '',
    latitude: null as number | null,
    longitude: null as number | null,
  });
  const [brandingData, setBrandingData] = useState({
    logo_url: '',
    primary_color: '#3B82F6',
    secondary_color: '#1E40AF', 
    accent_color: '#F59E0B',
    font_family: 'Inter'
  });
  const [practitionerCount, setPractitionerCount] = useState(1);
  const [practitioners, setPractitioners] = useState([
    { 
      id: 1, 
      full_name: '', 
      role: 'Physiotherapist', 
      email: '', 
      qualifications: '',
      avatar_url: ''
    }
  ]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('setup_completed')
        .eq('user_id', session.user.id)
        .single();
      
      if (profile?.setup_completed) {
        navigate('/dashboard');
      }
    };
    checkAuth();
  }, [navigate]);

  const handleSoftwareSelection = () => {
    if (!selectedSoftware) {
      toast.error("Please select a software platform");
      return;
    }
    setStep(2);
  };

  const validateApiKey = async () => {
    if (!apiKey) {
      toast.error("Please enter your CC Athletics API key");
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('validate-api-key', {
        body: { apiKey }
      });

      if (error) {
        toast.error("Failed to validate API key. Please try again.");
        return;
      }

      if (data.valid) {
        setIsApiKeyValid(true);
        toast.success(`API key validated successfully! Found ${data.teamsCount} teams.`);
      } else {
        toast.error(data.error || "Invalid API key. Please check your credentials.");
      }
    } catch (error) {
      toast.error("Network error. Unable to validate API key.");
    }
  };

  const proceedToOrgSetup = () => {
    setStep(3);
  };

  const proceedToBranding = () => {
    setStep(4);
  };

  const proceedToPractitioners = () => {
    const newPractitioners = Array.from({ length: practitionerCount }, (_, index) => ({
      id: index + 1,
      full_name: '',
      role: 'Physiotherapist',
      email: '',
      qualifications: '',
      avatar_url: ''
    }));
    setPractitioners(newPractitioners);
    setStep(5);
  };

  const addPractitioner = () => {
    const newId = practitioners.length + 1;
    setPractitioners([...practitioners, { 
      id: newId, 
      full_name: '', 
      role: 'Physiotherapist', 
      email: '', 
      qualifications: '',
      avatar_url: ''
    }]);
  };

  const removePractitioner = (id: number) => {
    setPractitioners(practitioners.filter(p => p.id !== id));
  };

  const updatePractitioner = (id: number, field: string, value: string) => {
    setPractitioners(practitioners.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  const handleComplete = async () => {
    try {
      if (!organizationData.name || !organizationData.location) {
        throw new Error('Organization name and location are required');
      }

      if (practitioners.some(p => !p.full_name || !p.email)) {
        throw new Error('All practitioners must have a name and email');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Create the team/organization entry with branding
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .insert({
          name: organizationData.name,
          cc_team_id: organizationData.name.toLowerCase().replace(/\s+/g, '_'),
          location: organizationData.location,
          country: organizationData.country,
          region: organizationData.region,
          city: organizationData.city,
          latitude: organizationData.latitude,
          longitude: organizationData.longitude,
          admin_id: user.id,
          api_key: apiKey,
          logo_url: brandingData.logo_url,
          primary_color: brandingData.primary_color,
          secondary_color: brandingData.secondary_color,
          accent_color: brandingData.accent_color,
          font_family: brandingData.font_family
        })
        .select()
        .single();

      if (teamError) {
        throw new Error(`Failed to create team: ${teamError.message}`);
      }

      // Update profile with team information
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .update({ 
          team_id: teamData.id,
          setup_completed: true,
          role: 'organisation'
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (profileError) {
        throw new Error(`Failed to update profile: ${profileError.message}`);
      }

      // Create practitioner profiles via edge function
      for (const practitioner of practitioners) {
        try {
          const { error: practitionerError } = await supabase.functions.invoke('send-clinician-credentials', {
            body: {
              email: practitioner.email,
              full_name: practitioner.full_name,
              role: practitioner.role,
              qualifications: practitioner.qualifications,
              team_id: teamData.id,
              created_by: profileData.id
            }
          });

          if (practitionerError) {
            console.error('Error creating practitioner:', practitionerError);
          }
        } catch (error) {
          console.error('Error invoking send-clinician-credentials:', error);
        }
      }

      toast.success("Setup completed successfully! Practitioners will receive login credentials via email.");
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Setup error:', error);
      toast.error(error.message || "Failed to complete setup. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Setup Your Organization</h1>
          <p className="text-gray-600 mt-2">Let's configure your platform and team</p>
        </div>

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Software Integration</CardTitle>
              <CardDescription>Select your force plate software</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                variant={selectedSoftware === "cc-athletics" ? "default" : "outline"}
                size="lg"
                onClick={() => setSelectedSoftware("cc-athletics")}
                className="w-full h-20 flex items-center justify-center space-x-4"
              >
                <div className="text-lg font-semibold">CC Athletics</div>
              </Button>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSoftwareSelection} className="w-full">
                Continue
              </Button>
            </CardFooter>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-6 h-6" />
                API Configuration
              </CardTitle>
              <CardDescription>Enter your CC Athletics API key</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="api-key">CC Athletics API Key</Label>
                <div className="flex gap-2">
                  <Input
                    id="api-key"
                    type="password"
                    placeholder="Enter your API key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    onClick={validateApiKey}
                    disabled={!apiKey || isApiKeyValid}
                    variant="outline"
                  >
                    {isApiKeyValid ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      "Validate"
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={proceedToOrgSetup} 
                disabled={!isApiKeyValid}
                className="w-full"
              >
                Continue to Organization Setup
              </Button>
            </CardFooter>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Organization Setup</CardTitle>
              <CardDescription>
                Tell us about your organization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="org-name">Organization Name *</Label>
                  <Input
                    id="org-name"
                    value={organizationData.name}
                    onChange={(e) => setOrganizationData({...organizationData, name: e.target.value})}
                    placeholder="Enter your organization name"
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location *</Label>
                  <Input
                    id="location"
                    value={organizationData.location}
                    onChange={(e) => setOrganizationData({...organizationData, location: e.target.value})}
                    placeholder="Enter your location"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={organizationData.country}
                    onChange={(e) => setOrganizationData({...organizationData, country: e.target.value})}
                    placeholder="UK"
                  />
                </div>
                <div>
                  <Label htmlFor="region">Region</Label>
                  <Input
                    id="region"
                    value={organizationData.region}
                    onChange={(e) => setOrganizationData({...organizationData, region: e.target.value})}
                    placeholder="Enter region"
                  />
                </div>
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={organizationData.city}
                    onChange={(e) => setOrganizationData({...organizationData, city: e.target.value})}
                    placeholder="Enter city"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={proceedToBranding} 
                className="w-full"
                disabled={!organizationData.name || !organizationData.location}
              >
                Continue to Branding Setup
              </Button>
            </CardFooter>
          </Card>
        )}

        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>Branding Setup</CardTitle>
              <CardDescription>
                Customize the look and feel of your platform
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="logo-url">Organization Logo URL</Label>
                <Input
                  id="logo-url"
                  value={brandingData.logo_url}
                  onChange={(e) => setBrandingData({...brandingData, logo_url: e.target.value})}
                  placeholder="https://example.com/logo.png"
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="primary-color">Primary Color</Label>
                  <Input
                    id="primary-color"
                    type="color"
                    value={brandingData.primary_color}
                    onChange={(e) => setBrandingData({...brandingData, primary_color: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="secondary-color">Secondary Color</Label>
                  <Input
                    id="secondary-color"
                    type="color"
                    value={brandingData.secondary_color}
                    onChange={(e) => setBrandingData({...brandingData, secondary_color: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="accent-color">Accent Color</Label>
                  <Input
                    id="accent-color"
                    type="color"
                    value={brandingData.accent_color}
                    onChange={(e) => setBrandingData({...brandingData, accent_color: e.target.value})}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="font-family">Font Family</Label>
                <select
                  id="font-family"
                  value={brandingData.font_family}
                  onChange={(e) => setBrandingData({...brandingData, font_family: e.target.value})}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="Inter">Inter</option>
                  <option value="Roboto">Roboto</option>
                  <option value="Open Sans">Open Sans</option>
                  <option value="Lato">Lato</option>
                  <option value="Montserrat">Montserrat</option>
                </select>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={proceedToPractitioners} 
                className="w-full"
              >
                Continue to Practitioner Setup
              </Button>
            </CardFooter>
          </Card>
        )}

        {step === 5 && (
          <Card>
            <CardHeader>
              <CardTitle>Practitioner Allocation</CardTitle>
              <CardDescription>
                How many practitioners will be using this platform?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="practitioner-count">Number of Practitioners</Label>
                <Input
                  id="practitioner-count"
                  type="number"
                  min="1"
                  max="50"
                  value={practitionerCount}
                  onChange={(e) => setPractitionerCount(parseInt(e.target.value) || 1)}
                  placeholder="Enter number of practitioners"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={() => setStep(6)} 
                className="w-full"
              >
                Configure Practitioners
              </Button>
            </CardFooter>
          </Card>
        )}

        {step === 6 && (
          <Card>
            <CardHeader>
              <CardTitle>Practitioner Setup</CardTitle>
              <CardDescription>
                Add your team members who will use the platform
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {practitioners.map((practitioner) => (
                <div key={practitioner.id} className="border p-4 rounded-lg space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Practitioner {practitioner.id}</h4>
                    {practitioners.length > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removePractitioner(practitioner.id)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor={`name-${practitioner.id}`}>Full Name *</Label>
                      <Input
                        id={`name-${practitioner.id}`}
                        value={practitioner.full_name}
                        onChange={(e) => updatePractitioner(practitioner.id, 'full_name', e.target.value)}
                        placeholder="Enter full name"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`role-${practitioner.id}`}>Role *</Label>
                      <select
                        id={`role-${practitioner.id}`}
                        value={practitioner.role}
                        onChange={(e) => updatePractitioner(practitioner.id, 'role', e.target.value)}
                        className="w-full p-2 border rounded-md"
                      >
                        <option value="Physiotherapist">Physiotherapist</option>
                        <option value="Sports Therapist">Sports Therapist</option>
                        <option value="S&C Coach">S&C Coach</option>
                        <option value="Massage Therapist">Massage Therapist</option>
                        <option value="Exercise Physiologist">Exercise Physiologist</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor={`email-${practitioner.id}`}>Email *</Label>
                      <Input
                        id={`email-${practitioner.id}`}
                        type="email"
                        value={practitioner.email}
                        onChange={(e) => updatePractitioner(practitioner.id, 'email', e.target.value)}
                        placeholder="Enter email address"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`qualifications-${practitioner.id}`}>Qualifications</Label>
                      <Input
                        id={`qualifications-${practitioner.id}`}
                        value={practitioner.qualifications}
                        onChange={(e) => updatePractitioner(practitioner.id, 'qualifications', e.target.value)}
                        placeholder="e.g., MSc Sports Therapy, MCSP"
                      />
                    </div>
                  </div>
                </div>
              ))}
              
              <Button
                variant="outline"
                onClick={addPractitioner}
                className="w-full"
              >
                + Add Another Practitioner
              </Button>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleComplete} 
                className="w-full"
                disabled={practitioners.some(p => !p.full_name || !p.email)}
              >
                Complete Setup
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Setup;