// Cloudflare Worker: secure proxy between your website chatbot and the Claude API.
// Your API key stays secret here (never put it inside website files).
// Deploy steps are in worker/README.md

const ALLOWED_ORIGINS = [
  "https://hihidigitizing.com",
  "https://www.hihidigitizing.com",
  "https://hds.github.io" // change to your real GitHub Pages domain
];

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const cors = {
      "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (request.method !== "POST" || !ALLOWED_ORIGINS.includes(origin))
      return new Response("Forbidden", { status: 403, headers: cors });

    let body;
    try { body = await request.json(); } catch { return new Response("Bad request", { status: 400, headers: cors }); }

    const messages = (body.messages || []).slice(-10).map(m => ({
      role: m.role === "user" ? "user" : "assistant",
      content: String(m.content || "").slice(0, 600)
    }));
    if (!messages.length || messages[messages.length - 1].role !== "user")
      return new Response("Bad request", { status: 400, headers: cors });

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-5-5",
        max_tokens: 300,
        system: String(body.system || "").slice(0, 2000),
        messages
      })
    });
    if (!r.ok) return new Response(JSON.stringify({ reply: "" }), { status: 502, headers: { ...cors, "Content-Type": "application/json" } });
    const data = await r.json();
    const reply = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("\n");
    return new Response(JSON.stringify({ reply }), { headers: { ...cors, "Content-Type": "application/json" } });
  }
};
