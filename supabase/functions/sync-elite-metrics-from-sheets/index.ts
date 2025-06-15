
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
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials unavailable in environment.");
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const GOOGLE_CRED = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    if (!GOOGLE_CRED) {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON not set.");
    }

    let googleCred;
    try {
      googleCred = JSON.parse(GOOGLE_CRED);
    } catch (e) {
      try {
        googleCred = JSON.parse(new TextDecoder().decode(fromBase64(GOOGLE_CRED)));
      } catch {
        throw new Error("Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON secret. Is it valid JSON?");
      }
    }

    const SHEET_ID = "<PUT-YOUR-SHEET-ID-HERE>";
    const WORKSHEET_TITLE = "Comparison Table"; // Adjust as needed

    if (SHEET_ID === "<PUT-YOUR-SHEET-ID-HERE>") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "You must update the code for sync-elite-metrics-from-sheets with your actual Google Sheet ID.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const doc = new GoogleSpreadsheet(SHEET_ID);
    await doc.useServiceAccountAuth(googleCred);
    await doc.loadInfo();

    const sheet = Object.values(doc.sheetsByIndex).find(ws => ws.title === WORKSHEET_TITLE);
    if (!sheet) {
      throw new Error(`Worksheet/tab "${WORKSHEET_TITLE}" not found.`);
    }

    const rows = await sheet.getRows();
    if (!rows.length) {
      throw new Error("No data rows found in the Comparison Table worksheet.");
    }

    // HEADER MAPPING
    const getString = (row, key) => row[key]?.toString().trim() || null;
    const getNumber = (row, key) => {
      const val = row[key];
      if (typeof val === "number") return val;
      if (typeof val === "string") {
        const parsed = parseFloat(val.replace(/[^\d.-]/g, ''));
        return isNaN(parsed) ? null : parsed;
      }
      return null;
    };

    // Column names expected from user sample
    const metricsColumnMap = [
      // { column: [sheet-col-name], exercise, metric_type }
      { column: "CMJ Jump Height (cm)", exercise: "CMJ", metric_type: "Jump Height (cm)" },
      { column: "CMJ Peak Power (W)", exercise: "CMJ", metric_type: "Peak Power (W)" },
      { column: "CMJ Relative Peak Power (W/kg)", exercise: "CMJ", metric_type: "Relative Peak Power (W/kg)" },
      { column: "CMJ Reactive Strength Index", exercise: "CMJ", metric_type: "Reactive Strength Index" },
      { column: "IMTP Peak Force (N)", exercise: "IMTP", metric_type: "Peak Force (N)" },
      { column: "IMTP Relative Peak Force (N/kg)", exercise: "IMTP", metric_type: "Relative Peak Force (N/kg)" },
    ];

    const metricsToInsert = [];

    for (const row of rows) {
      const base = {
        team_name: getString(row, "Team Name") ?? getString(row, "Team") ?? "",
        athlete_name: getString(row, "Athlete Name") ?? getString(row, "Athlete") ?? "",
        sex: getString(row, "Sex"),
        sport: getString(row, "Sport"),
        age_group: getString(row, "Age Group"),
        weight_category_kg: getNumber(row, "Weight Category (kg)"),
        test_date: row["Test Date"] ? new Date(row["Test Date"]) : null,
      };

      // Required: team and athlete name
      if (!base.team_name || !base.athlete_name) continue;

      // For each metric, create a row if the value exists
      for (const m of metricsColumnMap) {
        const rawVal = row[m.column];
        const metric_value = getNumber(row, m.column);
        if (metric_value !== null && metric_value !== undefined && rawVal !== "" && rawVal !== null) {
          metricsToInsert.push({
            ...base,
            exercise: m.exercise,
            metric_type: m.metric_type,
            metric_value,
            // test_date is already handled in base
          });
        }
      }
    }

    // Insert rows in batches for efficiency
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
        rows_processed: rows.length,
        metrics_inserted: metricsToInsert.length,
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
