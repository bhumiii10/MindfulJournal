// functions/src/index.ts
import {onRequest} from "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";

// Define a secret name. For config-based key set via:
//   firebase functions:config:set service.pplx_api_key="YOUR_KEY"
// eslint-disable-next-line max-len
// This attaches it at runtime as process.env.service_pplx_api_key when declared below.
const PPLX_API_KEY = defineSecret("pplx_api_key");

// HTTPS endpoint that proxies to Perplexity (or any external API).
export const proxyPerplexity = onRequest(
    {secrets: [PPLX_API_KEY]}, // allows process.env.service_pplx_api_key
    async (req, res): Promise<void> => {
      if (req.method !== "POST") {
        res.set("Allow", "POST");
        res.status(405).send("Method Not Allowed");
        return;
      }

      try {
        const apiKey = process.env.pplx_api_key || "";
        if (!apiKey) {
          res.status(500).send("PPLX_API_KEY not configured");
          return;
        }

        const payload =
        typeof req.body === "object" && req.body !== null ? req.body : {};

        const endpoint = "https://api.perplexity.ai/chat/completions";

        const upstream = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const data = await safeJson(upstream);
        // Send response; do not return the result
        res.status(upstream.status || 502).json(data);
        return;
      } catch (err) {
        console.error("proxyPerplexity error:", err);
        res.status(500).json({
          error: "Internal error",
          details: toErrorString(err),
        });
        return;
      }
    },
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function safeJson(r: Response): Promise<any> {
  const ct = r.headers.get("content-type") || "";
  try {
    if (ct.includes("application/json")) return await r.json();
    const text = await r.text();
    return {text};
  } catch {
    return {};
  }
}

function toErrorString(e: unknown): string {
  if (e instanceof Error) return `${e.name}: ${e.message}`;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}
