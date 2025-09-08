import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import notificationapi from "https://esm.sh/notificationapi-node-server-sdk@latest";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PractitionerInviteRequest {
  email: string;
  full_name: string;
  password: string;
  role_title?: string;
  team_name: string;
  login_url?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Practitioner invite function started...');
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const requestBody = await req.json();
    console.log('Request body received:', requestBody);

    const { 
      email, 
      full_name, 
      password, 
      role_title, 
      team_name,
      login_url = "https://your-app.com/auth"
    }: PractitionerInviteRequest = requestBody;

    console.log(`Creating practitioner account for: ${email}`);

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

    console.log('Found existing users:', existingUsers.users.length);
    const existingUser = existingUsers.users.find(user => user.email === email);
    console.log('Existing user found:', !!existingUser);
    
    let userResult = null;
    
    if (existingUser) {
      console.log(`User already exists with email: ${email}`);
      
      // Update password for existing user
      const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
        existingUser.id,
        { password }
      );

      if (updateError) {
        console.error("Error updating user password:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to update user password: " + updateError.message }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      console.log(`Password updated for existing user: ${email}`);
      userResult = existingUser;
    } else {
      console.log('Creating new user account...');
      // Create the user account
      const { data: userData, error: userError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: full_name,
          role: 'practitioner',
          role_title: role_title
        }
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

    // Update profile relationship for existing or new user
    console.log('Updating profile relationships...');
    const authHeader = req.headers.get('authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user: requestingUser } } = await supabase.auth.getUser(token);
      
      if (requestingUser) {
        const { data: orgProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', requestingUser.id)
          .eq('role', 'organisation')
          .single();
          
        if (orgProfile && existingUser) {
          // Update the existing profile with the organization relationship
          await supabase
            .from('profiles')
            .update({ created_by: orgProfile.id })
            .eq('user_id', existingUser.id);
        } else if (orgProfile && !existingUser) {
          // For new users, the profile is created by the trigger
          // We need to get the new user and update their profile
          const { data: newUsers } = await supabase.auth.admin.listUsers();
          const newUser = newUsers.users.find(user => user.email === email);
          if (newUser) {
            await supabase
              .from('profiles')
              .update({ created_by: orgProfile.id })
              .eq('user_id', newUser.id);
          }
        }
      }
    }

    // Initialize and send email via NotificationAPI
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
        type: 'send_email_to_practitioners',
        to: { id: email, email: email },
        parameters: {
          "Practitioner": full_name,
          "Organisation": team_name,
          "Email": email,
          "Password": password,
          "Role": role_title || "Practitioner",
          "LoginURL": login_url
        }
      });

      const notificationResponse = await notificationapi.send({
        type: 'send_email_to_practitioners',
        to: {
          id: email,
          email: email
        },
        parameters: {
          "Practitioner": full_name,
          "Organisation": team_name,
          "Email": email,
          "Password": password,
          "Role": role_title || "Practitioner",
          "LoginURL": login_url
        }
      });

      console.log('NotificationAPI response:', JSON.stringify(notificationResponse, null, 2));
      
      if (notificationResponse && notificationResponse.data) {
        console.log('Practitioner invite sent successfully via NotificationAPI');
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

    console.log('Practitioner invite function completed successfully');
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: existingUser ? "Practitioner account updated and credentials sent" : "Practitioner account created and credentials sent",
        user: userResult
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );

  } catch (error: any) {
    console.error("Unexpected error in send-practitioner-invite function:", error);
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