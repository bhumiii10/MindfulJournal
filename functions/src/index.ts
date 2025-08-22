// functions/src/index.ts
import {onRequest} from "firebase-functions/v2/https";

// If you need env/secrets, use params or process.env; see notes below
export const queryPerplexity = onRequest(
  {region: "us-central1"}, // set your region here
  async (req, res) => {
    try {
      if (req.method !== "POST") {
        res.status(405).send("Method Not Allowed");
        return;
      }

      const {prompt, ...rest} = (req.body || {}) as { prompt?: string };
      if (!prompt) {
        res.status(400).json({error: "Missing prompt"});
        return;
      }

      // Use global fetch in Node 18 runtime
      const apiKey = process.env.PERPLEXITY_API_KEY;
      if (!apiKey) {
        res.status(500).json({error: "Missing API key"});
        return;
      }

      const r = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "sonar",
          messages: [{role: "user", content: prompt}],
          ...rest,
        }),
      });

      const data = await r.json();
      if (!r.ok) {
        res.status(r.status).json(data);
        return;
      }
      res.json(data);
    } catch (e: any) {
      res.status(500).json({error: e?.message || "Unknown error"});
    }
  }
);
