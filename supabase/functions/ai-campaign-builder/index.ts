import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const AI_API_URL = Deno.env.get("AI_API_URL") || "https://ai.gateway.lovable.dev/v1/chat/completions";
    const AI_API_KEY = Deno.env.get("AI_API_KEY") || Deno.env.get("LOVABLE_API_KEY");
    const AI_MODEL = Deno.env.get("AI_MODEL") || "google/gemini-3-flash-preview";

    if (!AI_API_KEY) throw new Error("AI_API_KEY or LOVABLE_API_KEY is not configured");

    const { campaign_type, target_audience, context_data, custom_instructions } = await req.json();

    const systemPrompt = `You are a marketing SMS campaign specialist for Kechita Capital, a microfinance institution in Kenya.
You generate professional, culturally appropriate SMS templates for different campaign types.

Guidelines:
- SMS must be under 160 characters when possible (max 320 for multi-part)
- Use warm, professional Kenyan English (optionally mix Swahili greetings like "Habari" or "Asante")
- Include {client_name} placeholder for personalization
- Include {amount}, {due_date}, {branch_name}, {loan_officer} placeholders where relevant
- For recovery messages, be firm but respectful — never threatening
- Always include "Kechita Capital" branding
- Generate 3 template variations: formal, friendly, and urgent

Return a JSON object with this structure:
{
  "templates": [
    { "style": "formal", "message": "...", "char_count": 150 },
    { "style": "friendly", "message": "...", "char_count": 140 },
    { "style": "urgent", "message": "...", "char_count": 145 }
  ],
  "recommended_send_time": "e.g. 9:00 AM EAT",
  "recommended_frequency": "e.g. weekly",
  "tips": ["tip1", "tip2"]
}`;

    const userPrompt = `Generate SMS templates for:
- Campaign type: ${campaign_type || "marketing"}
- Target audience: ${target_audience || "all clients"}
- Context: ${JSON.stringify(context_data || {})}
${custom_instructions ? `- Special instructions: ${custom_instructions}` : ""}`;

    const response = await fetch(AI_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_campaign_templates",
              description: "Return SMS campaign templates with recommendations",
              parameters: {
                type: "object",
                properties: {
                  templates: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        style: { type: "string", enum: ["formal", "friendly", "urgent"] },
                        message: { type: "string" },
                        char_count: { type: "number" },
                      },
                      required: ["style", "message", "char_count"],
                      additionalProperties: false,
                    },
                  },
                  recommended_send_time: { type: "string" },
                  recommended_frequency: { type: "string" },
                  tips: { type: "array", items: { type: "string" } },
                },
                required: ["templates", "recommended_send_time", "recommended_frequency", "tips"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_campaign_templates" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please top up your workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    let result;
    if (toolCall?.function?.arguments) {
      result = JSON.parse(toolCall.function.arguments);
    } else {
      // Fallback: try to parse from content
      const content = data.choices?.[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : { error: "Could not parse AI response" };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-campaign-builder error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
