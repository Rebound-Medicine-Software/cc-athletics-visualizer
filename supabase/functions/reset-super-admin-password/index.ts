import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TARGET_EMAIL = "reflexsportstherapyy@gmail.com";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Generate a random secure temp password
    const tempPassword = "NexusHub!" + crypto.randomUUID().slice(0, 8) + "A1";

    // Find the user
    const { data: list, error: listErr } = await admin.auth.admin.listUsers();
    if (listErr) throw listErr;
    const user = list.users.find((u) => u.email?.toLowerCase() === TARGET_EMAIL.toLowerCase());
    if (!user) throw new Error(`User ${TARGET_EMAIL} not found`);

    const { error: updErr } = await admin.auth.admin.updateUserById(user.id, {
      password: tempPassword,
      email_confirm: true,
    });
    if (updErr) throw updErr;

    return new Response(
      JSON.stringify({ success: true, email: TARGET_EMAIL, tempPassword }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
