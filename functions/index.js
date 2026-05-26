const functions = require("firebase-functions");
const fetch = require("node-fetch");
const admin = require("firebase-admin");

if (!admin.apps.length) admin.initializeApp();

exports.aiProxy = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") { res.status(204).send(""); return; }

  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing token" }); return;
  }
  try {
    await admin.auth().verifyIdToken(authHeader.split("Bearer ")[1]);
  } catch {
    res.status(401).json({ error: "Invalid token" }); return;
  }

  const { messages, model = "deepseek-chat", max_tokens = 600 } = req.body;
  const apiKey = process.env.DEEPSEEK_KEY;
  if (!apiKey) { res.status(500).json({ error: "API key not configured" }); return; }

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
