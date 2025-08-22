
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Upload, Building2, Users, Plus, X, Key, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
    practitionerCount: ""
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
    // Validate organization data
    if (!orgData.name || !orgData.practitionerCount) {
      toast.error("Please fill in all organization details");
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
            location: `${orgData.practitionerCount} practitioners`, // Store practitioner count in location for now
            // logo_url: logoDataUrl, // Can add logo upload later
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
          api_key: apiKey,
          practitioner_count: parseInt(orgData.practitionerCount),
          setup_data: {
            practitioners: validPractitioners.map(p => ({
              name: p.name,
              role: p.role,
              qualifications: p.qualifications,
              email: p.email
              // Note: File objects cannot be stored in JSONB, would need file upload handling
            })),
            logoUrl: null // Would need file upload to store logo
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

      // Mark setup as completed in the database
      const { error: setupError } = await supabase
        .from('profiles')
        .update({ setup_completed: true })
        .eq('user_id', session.user.id);
      
      if (setupError) throw setupError;
      
      toast.success("Setup completed successfully!");
      navigate('/dashboard');
    } catch (error) {
      console.error('Setup error:', error);
      toast.error("Failed to complete setup. Please try again.");
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
                Continue to Organization Setup
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card className="bg-white/95 backdrop-blur-sm shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-6 h-6" />
                Organization Setup
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="org-name">Organization Name</Label>
                  <Input
                    id="org-name"
                    placeholder="Enter your organization name"
                    value={orgData.name}
                    onChange={(e) => setOrgData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="org-logo">Organization Logo</Label>
                  <div className="flex items-center space-x-4">
                    <Input
                      id="org-logo"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setOrgData(prev => ({ ...prev, logo: e.target.files?.[0] || null }))}
                      className="flex-1"
                    />
                    <Upload className="w-5 h-5 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500 mt-1">This will be used to customize your dashboard theme</p>
                </div>
                
                <div>
                  <Label htmlFor="practitioner-count">Number of Practitioners</Label>
                  <Input
                    id="practitioner-count"
                    type="number"
                    placeholder="How many practitioners in your organization?"
                    value={orgData.practitionerCount}
                    onChange={(e) => setOrgData(prev => ({ ...prev, practitionerCount: e.target.value }))}
                  />
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
