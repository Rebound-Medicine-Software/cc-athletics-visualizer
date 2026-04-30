import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Building2,
  Users,
  Plus,
  X,
  Key,
  CheckCircle,
  Palette,
  UserPlus,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  SkipForward,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BrandingForm } from "@/components/shared/BrandingForm";
import { WizardStepper, type WizardStep } from "@/components/setup/WizardStepper";

/* ─────────────────────────── Wizard configuration ─────────────────────────── */
const STEPS: WizardStep[] = [
  { id: "profile", label: "Organisation profile" },
  { id: "branding", label: "Branding", optional: true },
  { id: "integration", label: "Connect data source", optional: true },
  { id: "practitioners", label: "Invite practitioners", optional: true },
  { id: "athletes", label: "Add athletes", optional: true },
  { id: "review", label: "Review & launch" },
];

type PractitionerDraft = {
  name: string;
  role: string;
  qualifications: string;
  email: string;
  image: File | null;
};

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
  });

const generateStrongPassword = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < 12; i++) password += chars.charAt(Math.floor(Math.random() * chars.length));
  return password;
};

const Setup = () => {
  const navigate = useNavigate();

  /* ─── Wizard state ──────────────────────────────────────────────────── */
  const [stepIndex, setStepIndex] = useState(0);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  /* ─── Form state (same shape as previous flow) ──────────────────────── */
  const [orgData, setOrgData] = useState({
    name: "",
    logo: null as File | null,
    logo_url: "",
    practitionerCount: "",
    primaryColor: "#3B82F6",
    secondaryColor: "#1E40AF",
    accentColor: "#F59E0B",
    fontFamily: "Inter",
  });

  const [apiKey, setApiKey] = useState("");
  const [apiKeyValidated, setApiKeyValidated] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  const [practitioners, setPractitioners] = useState<PractitionerDraft[]>([
    { name: "", role: "", qualifications: "", email: "", image: null },
  ]);

  const [athletePlan, setAthletePlan] = useState<"import" | "manual" | "skip" | null>(null);

  /* ─── Skip if already set up ────────────────────────────────────────── */
  useEffect(() => {
    const checkSetupStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("setup_completed")
        .eq("user_id", session.user.id)
        .single();
      if (profile?.setup_completed) navigate("/dashboard");
    };
    checkSetupStatus();
  }, [navigate]);

  /* ─── Step nav helpers ──────────────────────────────────────────────── */
  const currentStep = STEPS[stepIndex];

  const markComplete = (id: string) =>
    setCompleted((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

  const goNext = () => {
    markComplete(currentStep.id);
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  };

  const goBack = () => setStepIndex((i) => Math.max(i - 1, 0));

  const goToStep = (i: number) => setStepIndex(i);

  /* ─── Step 1: Organisation profile ──────────────────────────────────── */
  const canSubmitProfile = orgData.name.trim().length > 0 && parseInt(orgData.practitionerCount) > 0;

  const submitProfile = () => {
    if (!canSubmitProfile) {
      toast.error("Please enter your organisation name and number of practitioners.");
      return;
    }
    // Auto-grow the practitioner list to match the count.
    const target = parseInt(orgData.practitionerCount) || 1;
    if (practitioners.length < target) {
      const next = [...practitioners];
      for (let i = practitioners.length; i < target; i++) {
        next.push({ name: "", role: "", qualifications: "", email: "", image: null });
      }
      setPractitioners(next);
    } else if (practitioners.length > target) {
      setPractitioners(practitioners.slice(0, target));
    }
    goNext();
  };

  /* ─── Step 3: Validate API key ──────────────────────────────────────── */
  const validateApiKey = async () => {
    if (!apiKey) {
      toast.error("Please enter your CC Athletics API key");
      return;
    }
    setIsValidating(true);
    try {
      const { data, error } = await supabase.functions.invoke("validate-api-key", {
        body: { apiKey },
      });
      if (error) {
        toast.error("Failed to validate API key. Please try again.");
        return;
      }
      if (data?.valid) {
        setApiKeyValidated(true);
        toast.success(`API key validated! Found ${data.teamsCount ?? 0} teams.`);
      } else {
        toast.error(data?.error || "Invalid API key. Please check your credentials.");
      }
    } catch {
      toast.error("Network error. Unable to validate API key.");
    } finally {
      setIsValidating(false);
    }
  };

  /* ─── Step 4: Practitioner editing ─────────────────────────────────── */
  const addPractitioner = () =>
    setPractitioners([...practitioners, { name: "", role: "", qualifications: "", email: "", image: null }]);

  const removePractitioner = (index: number) =>
    setPractitioners(practitioners.filter((_, i) => i !== index));

  const updatePractitioner = (index: number, field: keyof PractitionerDraft, value: string | File | null) => {
    const updated = [...practitioners];
    updated[index] = { ...updated[index], [field]: value as never };
    setPractitioners(updated);
  };

  const validPractitioners = practitioners.filter((p) => p.name && p.role && p.email);

  /* ─── Final submit (preserves prior write logic) ────────────────────── */
  const handleComplete = async () => {
    if (!canSubmitProfile) {
      toast.error("Organisation profile is incomplete.");
      setStepIndex(0);
      return;
    }
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("You must be logged in to complete setup");
        navigate("/auth");
        return;
      }

      // Logo → base64 (existing behaviour preserved).
      let logoUrl: string | null = orgData.logo_url || null;
      if (orgData.logo) logoUrl = await fileToBase64(orgData.logo);

      // Find or create the team row.
      const { data: existingTeam } = await supabase
        .from("teams")
        .select("*")
        .eq("admin_id", session.user.id)
        .single();

      let teamId: string;
      if (existingTeam) {
        const { error: updateError } = await supabase
          .from("teams")
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
          .eq("id", existingTeam.id);
        if (updateError) throw updateError;
        teamId = existingTeam.id;
      } else {
        const { data: newTeam, error: createError } = await supabase
          .from("teams")
          .insert({
            name: orgData.name,
            admin_id: session.user.id,
            location: `${orgData.practitionerCount} practitioners`,
            cc_team_id: "temp-" + Date.now(),
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

      // Persist API key + setup_data (only set api_key if validated).
      const teamUpdate: Record<string, unknown> = {
        name: orgData.name,
        practitioner_count: parseInt(orgData.practitionerCount),
        logo_url: logoUrl,
        primary_color: orgData.primaryColor,
        secondary_color: orgData.secondaryColor,
        accent_color: orgData.accentColor,
        font_family: orgData.fontFamily,
        setup_data: {
          practitioners: validPractitioners.map((p) => ({
            name: p.name,
            role: p.role,
            qualifications: p.qualifications,
            email: p.email,
          })),
          athlete_plan: athletePlan ?? "skip",
          integration_connected: apiKeyValidated,
        },
      };
      if (apiKeyValidated && apiKey) teamUpdate.api_key = apiKey;

      const { error: teamUpdateError } = await supabase
        .from("teams")
        .update(teamUpdate)
        .eq("id", teamId);
      if (teamUpdateError) throw teamUpdateError;

      // Mirror api_key to profile if present.
      if (apiKeyValidated && apiKey) {
        await supabase.from("profiles").update({ api_key: apiKey }).eq("user_id", session.user.id);
      }

      // Send credentials only for fully-filled practitioners.
      let credentialsSent = 0;
      for (const practitioner of validPractitioners) {
        const password = generateStrongPassword();
        try {
          const { error } = await supabase.functions.invoke("send-clinician-credentials", {
            headers: { Authorization: `Bearer ${session.access_token}` },
            body: {
              email: practitioner.email,
              full_name: practitioner.name,
              role_title: practitioner.role,
              qualifications: practitioner.qualifications,
              password,
              team_name: orgData.name,
              team_id: teamId,
            },
          });
          if (!error) credentialsSent += 1;
        } catch (err) {
          console.error("Failed to create practitioner account:", err);
        }
      }

      // Mark profile complete.
      const { error: setupError } = await supabase
        .from("profiles")
        .update({ setup_completed: true, team_id: teamId })
        .eq("user_id", session.user.id);
      if (setupError) throw setupError;

      toast.success(
        credentialsSent > 0
          ? `Setup complete — ${credentialsSent} practitioner credential${credentialsSent === 1 ? "" : "s"} sent.`
          : "Setup complete — welcome to NEXUSHUB!"
      );
      navigate("/dashboard");
    } catch (error) {
      console.error("Setup error:", error);
      toast.error("Failed to complete setup. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ─── Step renderers ────────────────────────────────────────────────── */
  const renderStep = () => {
    switch (currentStep.id) {
      case "profile":
        return (
          <Card className="bg-white/95 backdrop-blur-sm shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Tell us about your organisation
              </CardTitle>
              <p className="text-sm text-gray-500">
                Required — used across dashboards, reports, and athlete-facing pages.
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <Label htmlFor="org-name">Organisation name *</Label>
                <Input
                  id="org-name"
                  placeholder="e.g. Apex Performance Clinic"
                  value={orgData.name}
                  onChange={(e) => setOrgData((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="practitioner-count">How many practitioners on your team? *</Label>
                <Input
                  id="practitioner-count"
                  type="number"
                  min={1}
                  placeholder="e.g. 4"
                  value={orgData.practitionerCount}
                  onChange={(e) => setOrgData((p) => ({ ...p, practitionerCount: e.target.value }))}
                />
                <p className="text-xs text-gray-500 mt-1">
                  We'll pre-populate this many invitation slots in step 4.
                </p>
              </div>
            </CardContent>
          </Card>
        );

      case "branding":
        return (
          <Card className="bg-white/95 backdrop-blur-sm shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Add your brand
              </CardTitle>
              <p className="text-sm text-gray-500">
                Optional — flows through dashboards and PDF reports. You can change this any time in settings.
              </p>
            </CardHeader>
            <CardContent>
              <BrandingForm
                brandingForm={{
                  name: orgData.name,
                  logo_url: orgData.logo_url || "",
                  primaryColor: orgData.primaryColor,
                  secondaryColor: orgData.secondaryColor,
                  accentColor: orgData.accentColor,
                  fontFamily: orgData.fontFamily,
                }}
                setBrandingForm={(data) => {
                  if (typeof data === "function") {
                    setOrgData((prev) => {
                      const next = data({
                        name: prev.name,
                        logo_url: prev.logo_url || "",
                        primaryColor: prev.primaryColor,
                        secondaryColor: prev.secondaryColor,
                        accentColor: prev.accentColor,
                        fontFamily: prev.fontFamily,
                      });
                      return { ...prev, ...next };
                    });
                  } else {
                    setOrgData((prev) => ({ ...prev, ...data }));
                  }
                }}
                onLogoUpload={(file) => setOrgData((p) => ({ ...p, logo: file }))}
              />
            </CardContent>
          </Card>
        );

      case "integration":
        return (
          <Card className="bg-white/95 backdrop-blur-sm shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                Connect your force-plate data
              </CardTitle>
              <p className="text-sm text-gray-500">
                Optional — required to import athletes and stream live test data. You can connect later from settings.
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <Label htmlFor="api-key">CC Athletics API key</Label>
                <div className="flex gap-2">
                  <Input
                    id="api-key"
                    type="password"
                    placeholder="Paste your CC Athletics API key"
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      if (apiKeyValidated) setApiKeyValidated(false);
                    }}
                    className="flex-1"
                  />
                  <Button
                    onClick={validateApiKey}
                    disabled={!apiKey || apiKeyValidated || isValidating}
                    variant="outline"
                  >
                    {isValidating ? "Validating…" : apiKeyValidated ? <CheckCircle className="w-4 h-4 text-green-600" /> : "Validate"}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Find it in your CC Athletics dashboard under Settings → API Access.
                </p>
              </div>
              {apiKeyValidated && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-700 mt-0.5" />
                  <div className="text-sm text-green-800">
                    Connected. You'll be able to import athletes in the next step.
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );

      case "practitioners":
        return (
          <Card className="bg-white/95 backdrop-blur-sm shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Invite your practitioners
              </CardTitle>
              <p className="text-sm text-gray-500">
                Optional — leave blank to invite later. Anyone you fill in here will receive a credentials email when you finish setup.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {practitioners.map((practitioner, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-sm">Practitioner {index + 1}</h3>
                    {practitioners.length > 1 && (
                      <Button variant="ghost" size="sm" onClick={() => removePractitioner(index)}>
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        placeholder="e.g. Sports Scientist"
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
                </div>
              ))}
              <Button variant="outline" onClick={addPractitioner} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add another practitioner
              </Button>
              {validPractitioners.length === 0 && (
                <p className="text-xs text-gray-500 text-center">
                  No complete entries yet — that's fine, you can skip and invite later from settings.
                </p>
              )}
            </CardContent>
          </Card>
        );

      case "athletes":
        return (
          <Card className="bg-white/95 backdrop-blur-sm shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Bring in your athletes
              </CardTitle>
              <p className="text-sm text-gray-500">
                Optional — pick how you want to populate your roster. You can always add more later.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {(["import", "manual", "skip"] as const).map((opt) => {
                const meta = {
                  import: {
                    title: "Import from CC Athletics",
                    desc: apiKeyValidated
                      ? "Sync athletes directly from your connected force-plate account in the dashboard after setup."
                      : "Connect your data source in step 3 to enable this.",
                    disabled: !apiKeyValidated,
                  },
                  manual: {
                    title: "Add manually",
                    desc: "I'll add athletes one by one from the dashboard after setup.",
                    disabled: false,
                  },
                  skip: {
                    title: "Skip for now",
                    desc: "Just take me to the dashboard — I'll set athletes up later.",
                    disabled: false,
                  },
                }[opt];
                const selected = athletePlan === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    disabled={meta.disabled}
                    onClick={() => setAthletePlan(opt)}
                    className={`w-full text-left rounded-lg border p-4 transition-colors ${
                      selected
                        ? "border-blue-600 bg-blue-50"
                        : meta.disabled
                        ? "border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed"
                        : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/40"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`w-4 h-4 rounded-full border-2 mt-1 shrink-0 ${
                          selected ? "border-blue-600 bg-blue-600" : "border-gray-300"
                        }`}
                      />
                      <div>
                        <div className="font-semibold text-sm">{meta.title}</div>
                        <div className="text-xs text-gray-600 mt-0.5">{meta.desc}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        );

      case "review":
        return (
          <Card className="bg-white/95 backdrop-blur-sm shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Review &amp; launch
              </CardTitle>
              <p className="text-sm text-gray-500">
                Confirm your setup. You can change anything later from settings.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <ReviewRow label="Organisation" value={orgData.name || "—"} onEdit={() => goToStep(0)} />
              <ReviewRow
                label="Practitioner seats"
                value={orgData.practitionerCount || "—"}
                onEdit={() => goToStep(0)}
              />
              <ReviewRow
                label="Branding"
                value={orgData.logo || orgData.logo_url ? "Logo + colours set" : "Default colours"}
                onEdit={() => goToStep(1)}
              />
              <ReviewRow
                label="Data source"
                value={apiKeyValidated ? "CC Athletics connected" : "Not connected"}
                onEdit={() => goToStep(2)}
              />
              <ReviewRow
                label="Practitioners to invite"
                value={
                  validPractitioners.length > 0
                    ? `${validPractitioners.length} will receive credentials`
                    : "None yet"
                }
                onEdit={() => goToStep(3)}
              />
              <ReviewRow
                label="Athlete plan"
                value={
                  athletePlan === "import"
                    ? "Import after setup"
                    : athletePlan === "manual"
                    ? "Add manually"
                    : "Skip for now"
                }
                onEdit={() => goToStep(4)}
              />
            </CardContent>
          </Card>
        );
    }
  };

  /* ─── Footer nav ────────────────────────────────────────────────────── */
  const renderFooter = () => {
    const isFirst = stepIndex === 0;
    const isLast = stepIndex === STEPS.length - 1;
    const isOptional = !!currentStep.optional;

    const onPrimary = () => {
      if (isLast) return handleComplete();
      if (currentStep.id === "profile") return submitProfile();
      goNext();
    };

    const primaryDisabled =
      submitting ||
      (currentStep.id === "profile" && !canSubmitProfile);

    return (
      <div className="flex items-center justify-between gap-3 mt-6">
        <Button
          variant="ghost"
          onClick={goBack}
          disabled={isFirst || submitting}
          className="text-gray-600"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        <div className="flex items-center gap-2">
          {isOptional && !isLast && (
            <Button
              variant="outline"
              onClick={() => {
                // Skip: don't mark this step complete; advance.
                setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
              }}
              disabled={submitting}
            >
              <SkipForward className="w-4 h-4 mr-1" />
              Skip
            </Button>
          )}
          <Button
            onClick={onPrimary}
            disabled={primaryDisabled}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLast ? (
              submitting ? "Launching…" : "Launch dashboard"
            ) : (
              <>
                Continue
                <ChevronRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </div>
    );
  };

  /* ─── Layout ────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Welcome to NEXUSHUB</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Six quick steps to get your organisation up and running.
          </p>
        </div>

        <div className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl p-4 sm:p-5 mb-5 shadow-sm">
          <WizardStepper
            steps={STEPS}
            current={stepIndex}
            completed={completed}
            onStepClick={(i) => goToStep(i)}
          />
        </div>

        {renderStep()}
        {renderFooter()}
      </div>
    </div>
  );
};

/* ─── Small review row helper ─────────────────────────────────────────── */
const ReviewRow = ({
  label,
  value,
  onEdit,
}: {
  label: string;
  value: string;
  onEdit: () => void;
}) => (
  <div className="flex items-center justify-between border-b last:border-b-0 pb-3 last:pb-0">
    <div className="min-w-0">
      <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold">{label}</div>
      <div className="text-sm text-gray-800 truncate">{value}</div>
    </div>
    <Button variant="ghost" size="sm" onClick={onEdit} className="text-blue-600 hover:text-blue-700">
      Edit
    </Button>
  </div>
);

export default Setup;
