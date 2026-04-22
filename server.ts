import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import path from "path";
import { fileURLToPath } from "url";

// Define __dirname and __filename for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SYSTEM_INSTRUCTION = `You are the intelligence engine for Second Sight, a calm, precise, and trustworthy mobile application that helps users preserve and understand meaningful real-world moments.

NON-NEGOTIABLE PRODUCT LANGUAGE RULES:
- You must not sound like an AI describing its perception.
- You must speak like a calm system preserving a record.
- NEVER use phrases like "You are looking at...", "This appears to be...", "I see...", "Based on the image...", or "The visible panel lists..."
- NEVER use a theatrical AI tone or generic assistant copy.
- Write in compact, specific, noun-based phrases.

Examples of GOOD Summaries:
- "Daily face wash packaging with ingredient and formulation claims."
- "Parking sign indicating 2-hour limit ending at 4:00 PM."
- "Rental car rear bumper showing existing pre-rental scratch."
- "Prescription medication label with dosage instructions."

Examples of BAD Summaries:
- "You are looking at the packaging for a daily face wash..."
- "This appears to be a parking sign that says..."
- "I can see a scratch on the bumper of the car..."

TITLES:
- 2–4 words strictly.
- Concrete, plain-language, trustworthy.
- No unnecessary adjectives. No cleverness.

STATUSES:
- Use ONLY one of the following exact phrases: 'For reference', 'Follow-up recommended', 'Reminder set', 'Needs review', 'Resolved', 'Saved'.

Be concise, restrained, and precise. Focus entirely on utility.`;

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parser with large limit to handle base64 images
  app.use(express.json({ limit: "50mb" }));

  // AI API Route
  app.post("/api/analyze", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Server misconfiguration: API key missing." });
      }

      const { base64Image, mimeType, userPrompt } = req.body;
      if (!base64Image || !mimeType) {
        return res.status(400).json({ error: "Missing image data" });
      }

      const ai = new GoogleGenAI({ apiKey });
      const prompt = userPrompt?.trim() || "What is happening here, what matters, and what should I do?";

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Image,
              },
            },
            { text: prompt },
          ],
        },
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.2,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: {
                type: Type.STRING,
                description: "A concise, 3-5 word title for this record, e.g., 'Possible package damage', 'Parking sign review', or 'Rental car scratch'.",
              },
              status: {
                type: Type.STRING,
                description: "A brief status phrase representing the outcome or next state, e.g., 'Follow-up recommended', 'For reference', 'Reminder set', 'No action needed', or 'Resolved'.",
              },
              summary: {
                type: Type.STRING,
                description: "A short, plain-language summary of what the user is looking at and what it means.",
              },
              whatMatters: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "A checklist or bullet points of the most critical details that matter in this specific situation (e.g. 'visible corner crush', 'parking ends at 4pm').",
              },
              nextActions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING, description: "A unique short id (e.g., lowercase letters) for this action." },
                    description: { type: Type.STRING, description: "Clear, actionable next step. E.g., 'Take one full-box shot'." },
                    type: {
                      type: Type.STRING,
                      description: "Categorize the action type: 'reminder' if they need to remember something later, 'export' if they need to send this data, 'note' for logging, or 'none' for a general physical action.",
                    },
                  },
                  required: ["id", "description", "type"],
                },
                description: "1-3 clear next actions the user should take. Prioritize physical actions and documentation.",
              },
              isUncertain: {
                type: Type.BOOLEAN,
                description: "True if the image is blurry, lacks context, or if the situation is genuinely ambiguous and you are unsure.",
              },
              uncertaintyReason: {
                type: Type.STRING,
                description: "If isUncertain is true, explain why. Otherwise, leave empty or omit.",
              },
            },
            required: ["title", "status", "summary", "whatMatters", "nextActions", "isUncertain"],
          },
        },
      });

      const jsonStr = response.text?.trim() || "{}";
      const parsed = JSON.parse(jsonStr);
      res.json(parsed);
    } catch (err: any) {
      console.error("AI Analysis Error:", err);
      // Determine if it's a safety block or other known issue
      if (err.message?.includes('safety') || err.message?.includes('blocked')) {
         return res.status(403).json({ error: "Image couldn't be processed due to safety guidelines." });
      }
      res.status(500).json({ error: "Analysis couldn't be completed." });
    }
  });

  // Vite development middleware vs Production static serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
