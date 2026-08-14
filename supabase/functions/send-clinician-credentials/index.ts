import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ClinicianCredentials {
      email: string;
      full_name: string;
      role_title?: string;
      qualifications?: string;
      password: string;
      team_name: string;
      team_id?: string;
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

        const {
                  email,
                  full_name,
                  role_title,
                  qualifications,
                  password,
                  team_name,
                  team_id
        }: ClinicianCredentials = await req.json();

        console.log(`Creating clinician account for: ${email}`);

        // Create the user account
        const { data: userData, error: userError } = await supabase.auth.admin.createUser({
                  email,
                  password,
                  email_confirm: true,
                  user_metadata: {
                              full_name: full_name,
                              role: 'practitioner', // Use consistent role naming
                              role_title: role_title,
                              qualifications: qualifications
                  }
        });

        if (userError) {
                  console.error("Error creating user:", userError);
                  return new Response(
                              JSON.stringify({ error: userError.message }),
                      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
                            );
        }

        // After user is created, we need to update the profile with team_id and organization relationship
        // The profile trigger will create the basic profile, but we need to set team_id and created_by
        if (userData.user) {
                  // Get the organization profile that's creating this clinician
                const authHeader = req.headers.get('authorization');
                  if (authHeader && team_id) {
                              const token = authHeader.replace('Bearer ', '');
                              const { data: { user: requestingUser } } = await supabase.auth.getUser(token);

                    if (requestingUser) {
                                  const { data: orgProfile } = await supabase
                                    .from('profiles')
                                    .select('id')
                                    .eq('user_id', requestingUser.id)
                                    .eq('role', 'organisation')
                                    .single();

                                if (orgProfile) {
                                                // Update the newly created profile with the organization relationship and team_id
                                    const { error: updateError } = await supabase
                                                  .from('profiles')
                                                  .update({
                                                                      created_by: orgProfile.id,
                                                                      team_id: team_id
                                                  })
                                                  .eq('user_id', userData.user.id);

                                    if (updateError) {
                                                      console.error('Error updating practitioner profile:', updateError);
                                    } else {
                                                      console.log(`Assigned practitioner to team: ${team_id}`);
                                    }
                                }
                    }
                  }
        }

        // This function only creates the Supabase Auth account. Credential
        // delivery email goes through send-practitioner-invite (NotificationAPI /
        // Pingram) instead. SendPulse was removed 5 August 2026 per Josh -
        // no longer in use, Pingram is the only email provider now. Callers
        // (Setup.tsx, StaffCredentialsTab.tsx) call send-practitioner-invite
        // themselves right after this function succeeds.
        console.log(`Clinician account created successfully for: ${email}`);

        return new Response(
                  JSON.stringify({
                              success: true,
                              message: "Clinician account created",
                              user: userData.user
                  }),
            {
                        status: 200,
                        headers: { "Content-Type": "application/json", ...corsHeaders }
            }
                );

      } catch (error: any) {
              console.error("Error in send-clinician-credentials function:", error);
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
