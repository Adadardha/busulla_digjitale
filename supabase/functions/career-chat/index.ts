// Career chat via Lovable AI Gateway (no user key needed)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ChatMsg { role: "user" | "assistant"; content: string; }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { message, history = [], careerPath, weakAreas } = await req.json();
    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "Missing message" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contextParts: string[] = [];
    if (careerPath) contextParts.push(`Karriera e rekomanduar: ${careerPath}`);
    if (Array.isArray(weakAreas) && weakAreas.length) {
      contextParts.push(`Fusha për përmirësim: ${weakAreas.join(", ")}`);
    }

    const systemPrompt = `Ti je "Busulla", një këshilltar karriere miqësor dhe profesional për nxënësit e gjimnazit në Shqipëri.

RREGULLAT:
- GJITHMONË përgjigju në gjuhën shqipe
- Qëndro i fokusuar në karrierë, arsim, dhe zhvillim profesional
- Ji i ngrohtë, inkurajues dhe praktik
- Jep këshilla konkrete për kontekstin shqiptar (universitete, tregu i punës, praktika)
- Nëse pyetja nuk lidhet me karrierën, kthehu me mirësjellje tek tema
- MOS përdor emoji

KONTEKSTI I PËRDORUESIT:
${contextParts.length ? contextParts.join("\n") : "Asnjë kontekst specifik"}`;

    const recentHistory = (history as ChatMsg[]).slice(-8).map((m) => ({
      role: m.role, content: m.content,
    }));

    const messages = [
      { role: "system", content: systemPrompt },
      ...recentHistory,
      { role: "user", content: message },
    ];

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("AI gateway error:", resp.status, errText);
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "rate_limit" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "payment_required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "ai_error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content?.trim?.() || "";

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("career-chat error:", err);
    return new Response(JSON.stringify({ error: "server_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
