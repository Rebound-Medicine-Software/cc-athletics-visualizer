import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import notificationapi from "npm:notificationapi-node-server-sdk@1.1.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ClientCredentials {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  organisationName: string;
  athleteType?: string;
  // Optional but strongly recommended: lets us deterministically link
  // the auth user to the correct athlete row + team.
  athleteId?: string;
  teamId?: string;
  // When true, skip the NotificationAPI email send.
  suppressEmail?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Function started, parsing request body...');
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const requestBody = await req.json();
    console.log('Request body received:', requestBody);

    const {
      email,
      firstName,
      lastName,
      password,
      organisationName,
      athleteType,
      athleteId,
      teamId,
      suppressEmail,
    }: ClientCredentials = requestBody;

    console.log(`Creating client account for: ${email}`);

    // Check if user already exists
    console.log('Checking for existing users...');
    const { data: existingUsers, error: checkError } = await supabase.auth.admin.listUsers();

    if (checkError) {
      console.error("Error checking existing users:", checkError);
      return new Response(
        JSON.stringify({ error: "Failed to check existing users: " + checkError.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const existingUser = existingUsers.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    console.log('Existing user found:', !!existingUser);

    let userResult: any = null;

    if (existingUser) {
      const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
        existingUser.id,
        { password, email_confirm: true }
      );

      if (updateError) {
        console.error("Error updating user password:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to update user password: " + updateError.message }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      console.log(`Password updated for existing user: ${email}`);
      userResult = updateData?.user ?? existingUser;
    } else {
      const { data: userData, error: userError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          role: 'client',
          athlete_type: athleteType,
        },
      });

      if (userError) {
        console.error("Error creating user:", userError);
        return new Response(
          JSON.stringify({ error: "Failed to create user: " + userError.message }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      console.log('New user created successfully');
      userResult = userData?.user;
    }

    const clientUserId: string | undefined = userResult?.id;

    // Resolve calling org's profile (for created_by + team fallback).
    let orgProfileId: string | null = null;
    let orgTeamId: string | null = null;
    const authHeader = req.headers.get('authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user: requestingUser } } = await supabase.auth.getUser(token);
      if (requestingUser) {
        const { data: orgProfile } = await supabase
          .from('profiles')
          .select('id, team_id, role')
          .eq('user_id', requestingUser.id)
          .maybeSingle();
        if (orgProfile) {
          orgProfileId = orgProfile.id;
          orgTeamId = orgProfile.team_id ?? null;
        }
      }
    }

    // Resolve the athlete row + team_id we should link.
    let resolvedTeamId = teamId ?? null;
    let resolvedAthleteId = athleteId ?? null;

    if (!resolvedAthleteId && clientUserId) {
      // Try to find a unique athlete row by email; prefer org's team scope.
      let q = supabase.from('athletes').select('id, team_id').ilike('email', email);
      const { data: athleteCandidates } = await q;
      const candidates = athleteCandidates ?? [];
      const inOrg = orgTeamId ? candidates.filter((a) => a.team_id === orgTeamId) : [];
      const pick = inOrg.length === 1 ? inOrg[0] : (candidates.length === 1 ? candidates[0] : null);
      if (pick) {
        resolvedAthleteId = pick.id;
        resolvedTeamId = resolvedTeamId ?? pick.team_id ?? null;
      }
    } else if (resolvedAthleteId && !resolvedTeamId) {
      const { data: a } = await supabase
        .from('athletes').select('team_id').eq('id', resolvedAthleteId).maybeSingle();
      resolvedTeamId = a?.team_id ?? null;
    }

    // Final team fallback: org's own team (covers single-team orgs).
    if (!resolvedTeamId) resolvedTeamId = orgTeamId;

    // Apply linking via SECURITY DEFINER RPC (service-role authorised).
    if (clientUserId && resolvedAthleteId && resolvedTeamId) {
      const { error: linkErr } = await supabase.rpc('link_client_to_athlete', {
        p_user_id: clientUserId,
        p_athlete_id: resolvedAthleteId,
        p_team_id: resolvedTeamId,
        p_created_by: orgProfileId,
      });
      if (linkErr) {
        console.warn('link_client_to_athlete RPC failed:', linkErr);
      }
    } else {
      console.warn('Skipping athlete link — missing pieces', {
        hasUser: !!clientUserId,
        hasAthlete: !!resolvedAthleteId,
        hasTeam: !!resolvedTeamId,
      });
      // Still ensure profile is at least promoted to client + carries team.
      if (clientUserId) {
        await supabase
          .from('profiles')
          .update({
            role: 'client',
            ...(resolvedTeamId ? { team_id: resolvedTeamId } : {}),
            ...(orgProfileId ? { created_by: orgProfileId } : {}),
          })
          .eq('user_id', clientUserId);
      }
    }

    // Activity log
    try {
      await supabase.from('platform_activity_logs').insert({
        event_type: existingUser ? 'client_credentials_updated' : 'client_credentials_created',
        event_source: 'send-client-credentials',
        team_id: resolvedTeamId,
        athlete_id: resolvedAthleteId,
        user_id: clientUserId,
        organisation_name: organisationName,
        metadata: { suppressEmail: !!suppressEmail },
        severity: 'info',
      });
    } catch (logErr) {
      console.warn('Activity log insert failed:', logErr);
    }

    // Initialize and send email via NotificationAPI (skipped when suppressed)
    if (suppressEmail) {
      console.log('suppressEmail=true — skipping NotificationAPI send');
    } else {
      console.log('Initializing NotificationAPI...');
    try {
      notificationapi.init(
        'n3g0q177rbzrr6riq8re90n1yc',
        'imcbx9veiw5sc3cx48du58gnlyopxbu88p46legnkfik7ksoigxz70i1sa',
        {
          baseURL: 'https://api.eu.notificationapi.com'
        }
      );

      console.log('Sending email via NotificationAPI...');
      console.log('Email parameters:', {
        type: 'sign_up_email_sent_to_client',
        to: { id: email, email: email },
        parameters: {
          "Athlete": `${firstName} ${lastName}`,
          "Organisation": organisationName,
          "Email": email,
          "Password": password
        }
      });

      const notificationResponse = await notificationapi.send({
        type: 'sign_up_email_sent_to_client',
        to: {
          id: email,
          email: email
        },
        parameters: {
          "Athlete": `${firstName} ${lastName}`,
          "Organisation": organisationName,
          "Email": email,
          "Password": password
        }
      });

      console.log('NotificationAPI response:', JSON.stringify(notificationResponse, null, 2));
      
      if (notificationResponse && notificationResponse.data) {
        console.log('Email sent successfully via NotificationAPI');
      } else {
        console.warn('NotificationAPI response was empty or undefined');
      }
    } catch (emailError: any) {
      console.error('NotificationAPI error:', emailError);
      console.error('NotificationAPI error details:', emailError.message);
      if (emailError.stack) {
        console.error('NotificationAPI error stack:', emailError.stack);
      }
      // Don't fail the entire request if email fails - just log and continue
    }

    console.log('Function completed successfully');
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: existingUser ? "Client account updated and credentials sent" : "Client account created and credentials sent",
        user: userResult
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );

  } catch (error: any) {
    console.error("Unexpected error in send-client-credentials function:", error);
    console.error("Error stack:", error.stack);
    return new Response(
      JSON.stringify({ error: "Unexpected error: " + error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );
  }
};

serve(handler);