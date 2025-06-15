
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GoogleSpreadsheet } from "npm:google-spreadsheet";
import { fromBase64 } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Load environment variables from Supabase Secrets
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials unavailable in environment.");
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get Service Account JSON from Supabase secret
    const GOOGLE_CRED = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    if (!GOOGLE_CRED) {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON not set. Please add your Google Service Account JSON as a Supabase secret.");
    }

    // Parse Google credentials
    let googleCred;
    try {
      googleCred = JSON.parse(GOOGLE_CRED);
    } catch (e) {
      // Sometimes, secrets are base64-encoded by mistake - try to decode
      try {
        googleCred = JSON.parse(new TextDecoder().decode(fromBase64(GOOGLE_CRED)));
      } catch {
        throw new Error("Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON secret. Is it valid JSON?");
      }
    }

    // Get sheet ID and worksheet/tab
    // For now you should hardcode this (tell user how to change), or ask them in future!
    // You can get your Google Sheet ID from its URL: https://docs.google.com/spreadsheets/d/<SHEET_ID>/edit#gid=XXX
    const SHEET_ID = "<PUT-YOUR-SHEET-ID-HERE>";
    const WORKSHEET_TITLE = "Comparison Table"; // You can change as needed

    // If the user hasn't entered the sheet ID, return error
    if (SHEET_ID === "<PUT-YOUR-SHEET-ID-HERE>") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "You must update the code for sync-elite-metrics-from-sheets with your actual Google Sheet ID. Please provide your Sheet ID to your AI assistant so they can update it!",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Connect to Google Sheets
    const doc = new GoogleSpreadsheet(SHEET_ID);
    await doc.useServiceAccountAuth(googleCred);
    await doc.loadInfo();

    // Get the right worksheet/tab
    const sheet = Object.values(doc.sheetsByIndex).find(ws => ws.title === WORKSHEET_TITLE);
    if (!sheet) {
      throw new Error(`Worksheet/tab "${WORKSHEET_TITLE}" not found in your Google Sheet.`);
    }

    // Load all rows!
    const rows = await sheet.getRows();
    if (!rows.length) {
      throw new Error("No data rows found in the Comparison Table worksheet.");
    }

    // Build the elite_athlete_metrics row array from sheet data
    // You'll need to tailor this block if your comparison table uses different column names!
    const metricsToInsert = [];
    for (const row of rows) {
      // Try to handle common columns -- update as needed for your real columns!
      const team_name = row["Team"] ?? row["team_name"] ?? "";
      const athlete_name = row["Athlete"] ?? row["athlete_name"] ?? "";
      const sex = row["Sex"] ?? row["sex"] ?? null;
      const sport = row["Sport"] ?? row["sport"] ?? null;
      const age_group = row["Age Group"] ?? row["age_group"] ?? null;
      const weight_category_kg = row["Weight (kg)"] ?? row["weight_category_kg"] ?? null;
      const exercise = row["Exercise"] ?? row["exercise"] ?? "";
      // For metric_type/value, you might have many rows per athlete/metric type. For now, we expect one row = one metric.
      const metric_type = row["Metric Type"] ?? row["metric_type"] ?? "";
      const metric_value = row["Metric Value"] ?? row["metric_value"] ?? null;
      // Optionally, add test_date if available
      const test_date = row["Test Date"] ?? row["test_date"] ?? null;

      // Skip rows with missing required fields
      if (!team_name || !athlete_name || !exercise || !metric_type || metric_value === null || metric_value === "") {
        continue;
      }

      metricsToInsert.push({
        team_name,
        athlete_name,
        sex,
        sport,
        age_group,
        weight_category_kg: weight_category_kg ? Number(weight_category_kg) : null,
        exercise,
        metric_type,
        metric_value: Number(metric_value),
        test_date: test_date ? new Date(test_date) : null,
      });
    }

    // Insert into Supabase DB in batches if needed
    let insertCount = 0;
    const batchSize = 100;
    for (let i = 0; i < metricsToInsert.length; i += batchSize) {
      const batch = metricsToInsert.slice(i, i + batchSize);
      const { data, error } = await supabase.from("elite_athlete_metrics").upsert(batch, { onConflict: "team_name,athlete_name,exercise,metric_type,test_date" });
      if (error) {
        throw new Error("DB insert error: " + error.message);
      }
      insertCount += data ? data.length : 0;
    }

    return new Response(
      JSON.stringify({
        success: true,
        rows_processed: metricsToInsert.length,
        rows_inserted: insertCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err) {
    console.error("Elite metrics sheet sync failed:", err);
    return new Response(
      JSON.stringify({ success: false, error: err?.message ?? `${err}` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
