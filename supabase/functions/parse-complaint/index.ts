// ==============================================================================
// SUPABASE EDGE FUNCTION: parse-complaint
// Multi-Model Gemini Vision Structured Intake Parser for Kopargaon Municipal Council
// Supported Models: gemini-2.5-flash, gemini-2.5-flash-lite, gemini-1.5-flash, gemini-3.1-flash-lite
// (Optimized for High Requests-Per-Day RPD Quotas)
// ==============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 3-4 Selected High-Value Models (Excluding Antigravity, prioritizing Vision & high RPD)
const CANDIDATE_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-1.5-flash",
  "gemini-3.1-flash-lite",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { title, rawText, imageBase64, hasPhotos, hasPreciseLocation } = await req.json();

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY secret is not set in Supabase" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const promptText = `You are the AI Municipal Vision & Intake Specialist for Kopargaon Municipal Council (District Ahilyanagar).
Analyze this civic grievance complaint and the attached image (if provided).
Complaint Title: "${title || "Visual Civic Issue"}"
Description: "${rawText || "See attached photo"}"
Has Attached Image: ${Boolean(imageBase64 || hasPhotos)}

Available Kopargaon Municipal Categories & IDs:
1. 'c0000000-0000-0000-0000-000000000001' -> Drinking Water Contamination (Dept: WSS, Base Severity: 95, Machine: jetting_machine, Crew: 4)
2. 'c0000000-0000-0000-0000-000000000002' -> Major Underground Sewer Overflow (Dept: WSS, Base Severity: 88, Machine: jetting_machine, Crew: 3)
3. 'c0000000-0000-0000-0000-000000000003' -> Road Cave-in / Critical Pothole (Dept: PWD, Base Severity: 85, Machine: road_roller, Crew: 5)
4. 'c0000000-0000-0000-0000-000000000004' -> Exposed High-Voltage Live Wire (Dept: ELEC, Base Severity: 98, Machine: hydraulic_bucket_truck, Crew: 3)
5. 'c0000000-0000-0000-0000-000000000005' -> Open Garbage / Biomedical Dump (Dept: SWM, Base Severity: 72, Machine: tipper_truck, Crew: 4)
6. 'c0000000-0000-0000-0000-000000000006' -> Streetlight Cluster Outage (Dept: ELEC, Base Severity: 45, Machine: hydraulic_bucket_truck, Crew: 2)
7. 'c0000000-0000-0000-0000-000000000007' -> Stagnant Water / Dengue Mosquito Risk (Dept: PHD, Base Severity: 68, Machine: fogging_machine, Crew: 2)

Return ONLY valid JSON matching this schema:
{
  "categoryIdSuggested": "c0000000-0000-0000-0000-000000000001" | "c0000000-0000-0000-0000-000000000002" | "c0000000-0000-0000-0000-000000000003" | "c0000000-0000-0000-0000-000000000004" | "c0000000-0000-0000-0000-000000000005" | "c0000000-0000-0000-0000-000000000006" | "c0000000-0000-0000-0000-000000000007",
  "departmentCodeSuggested": "WSS" | "PWD" | "SWM" | "ELEC" | "PHD",
  "suggestedUrgency": "critical" | "high" | "medium" | "low",
  "healthHazardRisk": "extreme" | "high" | "moderate" | "low",
  "requiredEquipment": "jetting_machine" | "road_roller" | "hydraulic_bucket_truck" | "tipper_truck" | "fogging_machine",
  "requiredStaffCount": number,
  "estimatedCost": number (INR),
  "estimatedHours": number,
  "affectedPopulationEstimate": number,
  "confidenceScore": number (0.5 to 1.0),
  "visualFindings": "1-2 sentences summarizing visual evidence and damage detected",
  "rationale": "one sentence explaining departmental assignment"
}`;

    // Build payload with image if available
    const contentsParts: any[] = [{ text: promptText }];

    if (imageBase64) {
      const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");
      contentsParts.unshift({
        inlineData: {
          mimeType: "image/jpeg",
          data: cleanBase64,
        },
      });
    }

    // Try candidate models in order of capability & RPD quota
    let lastError: any = null;

    for (const modelName of CANDIDATE_MODELS) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

        const res = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: contentsParts }],
            generationConfig: {
              response_mime_type: "application/json",
              temperature: 0.1,
            },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const parsedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (parsedText) {
            const parsedJSON = JSON.parse(parsedText);
            parsedJSON.modelUsed = modelName;
            return new Response(
              JSON.stringify(parsedJSON),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } else {
          lastError = await res.text();
          console.warn(`Model ${modelName} returned status ${res.status}:`, lastError);
        }
      } catch (err) {
        lastError = err;
        console.warn(`Model ${modelName} fetch failed:`, err);
      }
    }

    return new Response(
      JSON.stringify({ error: `All candidate models failed: ${lastError}` }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
