import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AccountRecoveryRequest {
  contactInfo: string;
  userRole: 'clinician' | 'athlete';
  fullRecovery: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    const { contactInfo, userRole, fullRecovery }: AccountRecoveryRequest = await req.json();

    console.log(`Processing full account recovery request for ${userRole}: ${contactInfo}`);

    // Send email to support team with high priority
    const { error: emailError } = await resend.emails.send({
      from: "Rebound Support <support@reboundmedicine.co>",
      to: ["support@reboundmedicine.co"], // Replace with actual support email
      subject: `🚨 URGENT: Full Account Recovery Request - ${userRole}`,
      html: `
        <h2 style="color: #dc2626;">🚨 URGENT: Full Account Recovery Request</h2>
        <p><strong>User Role:</strong> ${userRole}</p>
        <p><strong>Contact Information Provided:</strong> ${contactInfo}</p>
        <p><strong>Request Type:</strong> Full account recovery (email + password forgotten)</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        
        <div style="background-color: #fef2f2; border: 1px solid #fecaca; padding: 16px; margin: 16px 0; border-radius: 8px;">
          <h3 style="color: #dc2626; margin-top: 0;">⚠️ SECURITY ALERT</h3>
          <p style="margin-bottom: 0;"><strong>HIGH PRIORITY:</strong> This user claims to have forgotten both their email and password. Extra verification is required due to the sensitive nature of medical data on this HIPAA-compliant platform.</p>
        </div>
        
        <h3>Required Actions:</h3>
        <ol>
          <li><strong>Identity Verification:</strong> Contact the user using the provided information</li>
          <li><strong>Multi-factor Verification:</strong> Request additional identifying information</li>
          <li><strong>Medical Records Check:</strong> If applicable, verify against clinic records</li>
          <li><strong>Security Review:</strong> Ensure this is not a social engineering attempt</li>
          <li><strong>Documentation:</strong> Log all verification steps taken</li>
        </ol>
        
        <h3>Suggested Verification Steps:</h3>
        <ul>
          <li>Clinic/organization name and verification</li>
          <li>Approximate account creation date</li>
          <li>Names of colleagues or patients (if clinician)</li>
          <li>Recent activity or data entries</li>
          <li>Phone verification with clinic</li>
        </ul>
        
        <p><strong>SLA:</strong> Contact user within 24 hours, complete verification within 48 hours.</p>
        
        <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; padding: 16px; margin-top: 16px; border-radius: 8px;">
          <p style="margin: 0;"><strong>HIPAA Compliance Note:</strong> Ensure all recovery procedures comply with HIPAA requirements for patient data protection and access control.</p>
        </div>
      `,
    });

    if (emailError) {
      console.error("Error sending support email:", emailError);
      return new Response(
        JSON.stringify({ error: "Failed to submit recovery request" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Log the high-priority recovery request
    console.log("High-priority account recovery request logged successfully");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Account recovery request submitted successfully. Our security team will verify your identity and contact you within 48 hours."
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );

  } catch (error: any) {
    console.error("Error in send-account-recovery function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );
  }
};

serve(handler);