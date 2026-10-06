const functions = require("firebase-functions");
const fetch = require("node-fetch");

exports.aiProxy = functions
  .runWith({ secrets: ["DEEPSEEK_KEY"] })
  .https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.status(204).send(""); return; }

  const { messages, model = "deepseek-chat", max_tokens = 600 } = req.body;
  const apiKey = process.env.DEEPSEEK_KEY;
  if (!apiKey) { res.status(502).json({ error: "API key not configured" }); return; }

  try {
    const r = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + apiKey },
      body: JSON.stringify({ model, max_tokens, messages })
    });
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});
