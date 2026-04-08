import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type ConsentState = "loading" | "ready" | "submitted" | "already_confirmed" | "invalid" | "error";

const AthleteConsent = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [state, setState] = useState<ConsentState>("loading");
  const [athleteName, setAthleteName] = useState("");
  const [signedName, setSignedName] = useState("");
  const [consentChecked, setConsentChecked] = useState(false);
  const [publishChecked, setPublishChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [todayDate] = useState(new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }));

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      const { data, error } = await supabase
        .from("athletes")
        .select("name, consent_status")
        .eq("consent_token", token)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setState("invalid");
        return;
      }

      if (data.consent_status === "confirmed") {
        setState("already_confirmed");
        return;
      }

      setAthleteName(data.name);
      setState("ready");
    } catch (err) {
      console.error("Token validation error:", err);
      setState("error");
    }
  };

  const handleSubmit = async () => {
    if (!consentChecked || !publishChecked) return;
    if (!signedName.trim()) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("athletes")
        .update({
          consent_status: "confirmed",
          consent_signed_name: signedName.trim(),
          consent_signed_at: new Date().toISOString(),
        })
        .eq("consent_token", token)
        .eq("consent_status", "pending");

      if (error) throw error;
      setState("submitted");
    } catch (err) {
      console.error("Consent submission error:", err);
      setState("error");
    } finally {
      setSubmitting(false);
    }
  };

  if (state === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/10">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (state === "invalid") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-destructive/5 to-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
            <h2 className="text-xl font-semibold text-foreground">Invalid or Expired Link</h2>
            <p className="text-muted-foreground">This consent link is not valid. Please contact your practitioner for a new link.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === "already_confirmed") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" />
            <h2 className="text-xl font-semibold text-foreground">Already Confirmed</h2>
            <p className="text-muted-foreground">You have already provided your consent. You can now log into the system using the credentials sent to your email.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === "submitted") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" />
            <h2 className="text-xl font-semibold text-foreground">Consent Confirmed</h2>
            <p className="text-muted-foreground">
              Thank you, <strong>{signedName}</strong>. Your consent has been recorded. You can now log into the system using the credentials sent to your email.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-destructive/5 to-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
            <h2 className="text-xl font-semibold text-foreground">Something Went Wrong</h2>
            <p className="text-muted-foreground">An error occurred. Please try again or contact your practitioner.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Ready state — show the consent form
  const canSubmit = consentChecked && publishChecked && signedName.trim().length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10 p-4 flex items-center justify-center">
      <Card className="max-w-2xl w-full shadow-xl border-2 border-primary/20">
        <CardHeader className="text-center border-b bg-primary/5">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl text-foreground">Data Consent Form</CardTitle>
          <p className="text-muted-foreground mt-1">Athlete: <strong className="text-foreground">{athleteName}</strong></p>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Consent text */}
          <div className="prose prose-sm max-w-none space-y-4 text-foreground">
            <h3 className="text-lg font-semibold">Purpose</h3>
            <p className="text-muted-foreground leading-relaxed">
              As part of our performance analysis platform, your testing data (including but not limited to force plate metrics, 
              jump height, power output, and related biomechanical measurements) will be collected and stored securely.
            </p>

            <h3 className="text-lg font-semibold">Data Usage</h3>
            <p className="text-muted-foreground leading-relaxed">
              Your data may be used for the following purposes:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Individual performance tracking and reporting</li>
              <li>Comparison with other athletes within the system (anonymised or identifiable, as consented)</li>
              <li>Publication on live dashboards accessible to authorised practitioners and stakeholders</li>
              <li>Aggregated statistical analysis for research and benchmarking purposes</li>
            </ul>

            <h3 className="text-lg font-semibold">Your Rights</h3>
            <p className="text-muted-foreground leading-relaxed">
              You have the right to withdraw consent at any time by contacting your practitioner. Withdrawal will not affect 
              the lawfulness of processing based on consent before its withdrawal. Upon withdrawal, your data will be removed 
              from public-facing dashboards within a reasonable timeframe.
            </p>

            <h3 className="text-lg font-semibold">Data Protection</h3>
            <p className="text-muted-foreground leading-relaxed">
              Your data is stored securely and will only be accessible to authorised personnel. Your practitioner(s) will 
              always have access to your complete data for performance analysis and reporting purposes, regardless of this consent.
            </p>
          </div>

          {/* Consent checkboxes */}
          <div className="space-y-4 border-t pt-6">
            <div className="flex items-start gap-3">
              <Checkbox
                id="consent-data"
                checked={consentChecked}
                onCheckedChange={(checked) => setConsentChecked(checked === true)}
              />
              <Label htmlFor="consent-data" className="text-sm leading-relaxed cursor-pointer text-foreground">
                I consent to my performance data being collected, stored, and used for individual tracking, 
                comparison with other athletes, and aggregated analysis as described above.
              </Label>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="consent-publish"
                checked={publishChecked}
                onCheckedChange={(checked) => setPublishChecked(checked === true)}
              />
              <Label htmlFor="consent-publish" className="text-sm leading-relaxed cursor-pointer text-foreground">
                I consent to my results being published on live dashboards where they may be visible to 
                other athletes and authorised users of the platform.
              </Label>
            </div>
          </div>

          {/* Signature section */}
          <div className="space-y-4 border-t pt-6">
            <h3 className="text-lg font-semibold text-foreground">Digital Signature</h3>
            <p className="text-sm text-muted-foreground">Please type your full name below as your digital signature.</p>
            
            <div className="space-y-2">
              <Label htmlFor="signed-name" className="text-foreground">Full Name</Label>
              <Input
                id="signed-name"
                placeholder="Type your full name"
                value={signedName}
                onChange={(e) => setSignedName(e.target.value)}
                className="text-lg"
              />
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Date: <strong className="text-foreground">{todayDate}</strong></span>
            </div>
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="w-full h-12 text-base"
            size="lg"
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</>
            ) : (
              <><Shield className="w-4 h-4 mr-2" /> Confirm Consent</>
            )}
          </Button>

          {!canSubmit && (signedName.trim().length > 0 || consentChecked || publishChecked) && (
            <p className="text-xs text-center text-muted-foreground">
              Please check both consent boxes and type your full name to proceed.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AthleteConsent;
