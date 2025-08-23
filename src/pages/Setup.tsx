
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Upload, Building2, Users, Plus, X, Key, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BrandingForm } from "@/components/shared/BrandingForm";

const Setup = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedSoftware, setSelectedSoftware] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiKeyValidated, setApiKeyValidated] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [orgData, setOrgData] = useState({
    name: "",
    logo: null as File | null,
    logo_url: "",
    practitionerCount: "",
    primaryColor: '#3B82F6',
    secondaryColor: '#1E40AF',
    accentColor: '#F59E0B',
    fontFamily: 'Inter'
  });
  const [practitioners, setPractitioners] = useState([
    { name: "", role: "", qualifications: "", email: "", image: null as File | null }
  ]);

  useEffect(() => {
    // Check if user is authenticated and setup completion status
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }
      
      // Check if setup has already been completed from database
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

    setIsValidating(true);

    try {
      console.log('Validating API key...');
      
      const { data, error } = await supabase.functions.invoke('validate-api-key', {
        body: { apiKey }
      });

      if (error) {
        console.error('Edge function error:', error);
        toast.error("Failed to validate API key. Please try again.");
        setIsValidating(false);
        return;
      }

      console.log('API validation response:', data);

      if (data.valid) {
        setApiKeyValidated(true);
        toast.success(`API key validated successfully! Found ${data.teamsCount} teams.`);
      } else {
        toast.error(data.error || "Invalid API key. Please check your credentials.");
      }
    } catch (error) {
      console.error('API validation error:', error);
      toast.error("Network error. Unable to validate API key.");
    } finally {
      setIsValidating(false);
    }
  };

  const proceedToOrgSetup = () => {
    if (!apiKeyValidated) {
      toast.error("Please validate your API key first");
      return;
    }
    setStep(3);
  };

  const addPractitioner = () => {
    setPractitioners([...practitioners, { name: "", role: "", qualifications: "", email: "", image: null }]);
  };

  const removePractitioner = (index: number) => {
    setPractitioners(practitioners.filter((_, i) => i !== index));
  };

  const updatePractitioner = (index: number, field: string, value: string | File | null) => {
    const updated = [...practitioners];
    updated[index] = { ...updated[index], [field]: value };
    setPractitioners(updated);
  };

  const handleComplete = async () => {
    // Validate organisation data
    if (!orgData.name || !orgData.practitionerCount) {
      toast.error("Please fill in all organisation details");
      return;
    }

    // Validate practitioners
    const validPractitioners = practitioners.filter(p => p.name && p.role && p.email);
    if (validPractitioners.length === 0) {
      toast.error("Please add at least one practitioner");
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("You must be logged in to complete setup");
        navigate('/auth');
        return;
      }

      let teamId;

      // Upload logo if provided
      let logoUrl = null;
      if (orgData.logo) {
        // For now, convert to base64 for simple storage
        // In production, you'd want to use proper file storage
        logoUrl = await fileToBase64(orgData.logo);
      }

      // Check if team already exists for this user
      const { data: existingTeam } = await supabase
        .from('teams')
        .select('*')
        .eq('admin_id', session.user.id)
        .single();

      if (existingTeam) {
        console.log('Team already exists, updating:', existingTeam);
        const { error: updateError } = await supabase
          .from('teams')
          .update({
            name: orgData.name,
            location: `${orgData.practitionerCount} practitioners`,
            logo_url: logoUrl,
            primary_color: orgData.primaryColor,
            secondary_color: orgData.secondaryColor,
            accent_color: orgData.accentColor,
            font_family: orgData.fontFamily,
            practitioner_count: parseInt(orgData.practitionerCount),
          })
          .eq('id', existingTeam.id);

        if (updateError) throw updateError;
        
        teamId = existingTeam.id;
      } else {
        // Create new team
        const { data: newTeam, error: createError } = await supabase
          .from('teams')
          .insert({
            name: orgData.name,
            admin_id: session.user.id,
            location: `${orgData.practitionerCount} practitioners`,
            cc_team_id: 'temp-' + Date.now(), // Temporary ID until CC Athletics sync
            logo_url: logoUrl,
            primary_color: orgData.primaryColor,
            secondary_color: orgData.secondaryColor,
            accent_color: orgData.accentColor,
            font_family: orgData.fontFamily,
            practitioner_count: parseInt(orgData.practitionerCount),
          })
          .select()
          .single();

        if (createError) throw createError;
        teamId = newTeam.id;
      }

      // Save API key and organization data to database
      const { error: teamUpdateError } = await supabase
        .from('teams')
        .update({
          name: orgData.name,
          api_key: apiKey,
          practitioner_count: parseInt(orgData.practitionerCount),
          logo_url: logoUrl,
          primary_color: orgData.primaryColor,
          secondary_color: orgData.secondaryColor,
          accent_color: orgData.accentColor,
          font_family: orgData.fontFamily,
          setup_data: {
            practitioners: validPractitioners.map(p => ({
              name: p.name,
              role: p.role,
              qualifications: p.qualifications,
              email: p.email
            }))
          }
        })
        .eq('id', teamId);

      if (teamUpdateError) throw teamUpdateError;

      // Also save API key to profile for easy access
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({ api_key: apiKey })
        .eq('user_id', session.user.id);
      
      if (profileUpdateError) throw profileUpdateError;

      // Create practitioner profiles and send credentials
      const practitionerCredentials = [];
      for (const practitioner of validPractitioners) {
        // Generate a strong password
        const password = generateStrongPassword();
        
        try {
          const { data, error } = await supabase.functions.invoke('send-clinician-credentials', {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: {
              email: practitioner.email,
              full_name: practitioner.name,
              role_title: practitioner.role,
              qualifications: practitioner.qualifications,
              password: password,
              team_name: orgData.name,
              team_id: teamId
            }
          });

          if (!error) {
            practitionerCredentials.push({
              email: practitioner.email,
              name: practitioner.name,
              role: practitioner.role,
              password: password
            });
          }
        } catch (error) {
          console.error('Failed to create practitioner account:', error);
        }
      }

      // Mark setup as completed and assign team_id to the organization profile
      const { error: setupError } = await supabase
        .from('profiles')
        .update({ 
          setup_completed: true,
          team_id: teamId
        })
        .eq('user_id', session.user.id);
      
      if (setupError) throw setupError;
      
      // Show success message with credentials
      if (practitionerCredentials.length > 0) {
        toast.success(`Setup completed! ${practitionerCredentials.length} practitioner accounts created and credentials sent via email.`);
      } else {
        toast.success("Setup completed successfully!");
      }
      
      navigate('/dashboard');
    } catch (error) {
      console.error('Setup error:', error);
      toast.error("Failed to complete setup. Please try again.");
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const generateStrongPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const updatePractitionerCount = (count: string) => {
    setOrgData(prev => ({ ...prev, practitionerCount: count }));
    
    // Auto-populate practitioner cards based on count
    const targetCount = parseInt(count) || 1;
    const currentCount = practitioners.length;
    
    if (targetCount > currentCount) {
      // Add more practitioners
      const newPractitioners = [...practitioners];
      for (let i = currentCount; i < targetCount; i++) {
        newPractitioners.push({ name: "", role: "", qualifications: "", email: "", image: null });
      }
      setPractitioners(newPractitioners);
    } else if (targetCount < currentCount) {
      // Remove excess practitioners
      setPractitioners(practitioners.slice(0, targetCount));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <img 
            src="/lovable-uploads/2e29878b-d40d-47c5-a72c-da08ce28173d.png" 
            alt="Rebound Medicine and Performance Logo" 
            className="w-16 h-16 rounded-full shadow-lg mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-gray-800">Setup Your Account</h1>
          <p className="text-gray-600 mt-2">Let's get you started with Rebound Medicine & Performance</p>
        </div>

        {step === 1 && (
          <Card className="bg-white/95 backdrop-blur-sm shadow-xl">
            <CardHeader>
              <CardTitle className="text-center">Which force plate software are you using?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-center">
                <Button
                  variant={selectedSoftware === "cc-athletics" ? "default" : "outline"}
                  size="lg"
                  onClick={() => setSelectedSoftware("cc-athletics")}
                  className="w-80 h-40 flex flex-col items-center justify-center space-y-4"
                >
                  <img 
                    src="/lovable-uploads/8fca559f-901e-4e29-9b01-018c2c7634ba.png" 
                    alt="CC Athletics Logo" 
                    className="w-16 h-16"
                  />
                  <div className="text-lg font-semibold">CC Athletics</div>
                  <div className="text-sm text-gray-600">Force plate data integration</div>
                </Button>
              </div>
              
              <div className="text-center text-sm text-gray-500">
                More integrations coming soon...
              </div>
              
              <div className="flex justify-center">
                <Button onClick={handleSoftwareSelection} className="bg-blue-600 hover:bg-blue-700">
                  Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card className="bg-white/95 backdrop-blur-sm shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-6 h-6" />
                CC Athletics API Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center mb-6">
                <img 
                  src="/lovable-uploads/8fca559f-901e-4e29-9b01-018c2c7634ba.png" 
                  alt="CC Athletics Logo" 
                  className="w-20 h-20 mx-auto mb-4"
                />
                <h3 className="text-lg font-semibold">Connect your CC Athletics account</h3>
                <p className="text-gray-600">Enter your API key to sync your force plate data</p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="api-key">CC Athletics API Key</Label>
                  <div className="flex gap-2">
                    <Input
                      id="api-key"
                      type="password"
                      placeholder="Enter your CC Athletics API key"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      onClick={validateApiKey}
                      disabled={!apiKey || apiKeyValidated || isValidating}
                      variant="outline"
                    >
                      {isValidating ? (
                        "Validating..."
                      ) : apiKeyValidated ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        "Validate"
                      )}
                    </Button>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    You can find your API key in your CC Athletics dashboard under Settings → API Access
                  </p>
                </div>

                {apiKeyValidated && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-green-800">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">API Key Validated Successfully!</span>
                    </div>
                    <p className="text-sm text-green-700 mt-1">
                      Your CC Athletics account is now connected and ready to sync data.
                    </p>
                  </div>
                )}
              </div>
              
              <Button 
                onClick={proceedToOrgSetup} 
                disabled={!apiKeyValidated}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Continue to Organisation Setup
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card className="bg-white/95 backdrop-blur-sm shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-6 h-6" />
                Organisation Setup
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="org-name">Organisation Name</Label>
                  <Input
                    id="org-name"
                    placeholder="Enter your organisation name"
                    value={orgData.name}
                    onChange={(e) => setOrgData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                
                {/* Branding Options */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Organisation Branding</h3>
                  <BrandingForm
                    brandingForm={{
                      name: orgData.name,
                      logo_url: orgData.logo_url || '',
                      primaryColor: orgData.primaryColor,
                      secondaryColor: orgData.secondaryColor,
                      accentColor: orgData.accentColor,
                      fontFamily: orgData.fontFamily
                    }}
                    setBrandingForm={(data) => {
                      if (typeof data === 'function') {
                        setOrgData(prev => {
                          const newData = data({
                            name: prev.name,
                            logo_url: prev.logo_url || '',
                            primaryColor: prev.primaryColor,
                            secondaryColor: prev.secondaryColor,
                            accentColor: prev.accentColor,
                            fontFamily: prev.fontFamily
                          });
                          return {
                            ...prev,
                            name: newData.name,
                            logo_url: newData.logo_url,
                            primaryColor: newData.primaryColor,
                            secondaryColor: newData.secondaryColor,
                            accentColor: newData.accentColor,
                            fontFamily: newData.fontFamily
                          };
                        });
                      } else {
                        setOrgData(prev => ({
                          ...prev,
                          name: data.name,
                          logo_url: data.logo_url,
                          primaryColor: data.primaryColor,
                          secondaryColor: data.secondaryColor,
                          accentColor: data.accentColor,
                          fontFamily: data.fontFamily
                        }));
                      }
                    }}
                    onLogoUpload={(file) => setOrgData(prev => ({ ...prev, logo: file }))}
                  />
                  
                  <div className="mt-4">
                    <Label htmlFor="practitioner-count">Number of Practitioners</Label>
                    <Input
                      id="practitioner-count"
                      type="number"
                      placeholder="How many practitioners in your organisation?"
                      value={orgData.practitionerCount}
                      onChange={(e) => updatePractitionerCount(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              
              <Button onClick={() => setStep(4)} className="w-full bg-blue-600 hover:bg-blue-700">
                Continue to Practitioner Setup
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 4 && (
          <Card className="bg-white/95 backdrop-blur-sm shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-6 h-6" />
                Add Practitioner Profiles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {practitioners.map((practitioner, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold">Practitioner {index + 1}</h3>
                    {practitioners.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removePractitioner(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Name</Label>
                      <Input
                        placeholder="Full name"
                        value={practitioner.name}
                        onChange={(e) => updatePractitioner(index, "name", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Role</Label>
                      <Input
                        placeholder="e.g., Sports Scientist, Physiotherapist"
                        value={practitioner.role}
                        onChange={(e) => updatePractitioner(index, "role", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input
                        type="email"
                        placeholder="email@example.com"
                        value={practitioner.email}
                        onChange={(e) => updatePractitioner(index, "email", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Qualifications</Label>
                      <Input
                        placeholder="Degrees, certifications"
                        value={practitioner.qualifications}
                        onChange={(e) => updatePractitioner(index, "qualifications", e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label>Profile Image</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => updatePractitioner(index, "image", e.target.files?.[0] || null)}
                    />
                  </div>
                </div>
              ))}
              
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => setStep(3)}
                  className="flex items-center gap-2"
                >
                  Previous
                </Button>
                
                <Button
                  variant="outline"
                  onClick={addPractitioner}
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Another Practitioner
                </Button>
                
                <Button onClick={handleComplete} className="bg-blue-600 hover:bg-blue-700 flex-1">
                  Complete Setup
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Setup;
