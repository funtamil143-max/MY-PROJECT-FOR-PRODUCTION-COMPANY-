import express from "express";
import http from "http";
import path from "path";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  const server = http.createServer(app);
  
  // Attach WebSocket server to /api/live endpoint
  const wss = new WebSocketServer({ server, path: "/api/live" });

  const apiKey = process.env.GEMINI_API_KEY;
  const ai = apiKey ? new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  }) : null;

  // Handle WebSocket connections for Live voice API
  wss.on("connection", async (clientWs: WebSocket) => {
    console.log("Client connected to Gemini Live API WebSocket proxy");
    let session: any = null;

    if (!apiKey || !ai) {
      console.error("GEMINI_API_KEY is not defined in environment variables");
      clientWs.send(JSON.stringify({ error: "GEMINI_API_KEY is not configured on the server. Please add it in Settings > Secrets." }));
      clientWs.close();
      return;
    }

    try {
      session = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } }, // 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'
          },
          systemInstruction: `You are a friendly and encouraging "Snack Production Expert & Financial Assistant" for a traditional South Indian snack business in Tamil Nadu.
You help the user optimize their recipes (for murukku, mixture, sev, etc.), calculate cost per gram, manage inventory, and plan production batches.
You are bilingual: feel free to respond in English, pure Tamil, or a friendly, accessible mix of Tamil and English (commonly known as Tanglish), depending on how the user speaks to you.
Keep your spoken responses relatively concise, natural, warm, and highly conversational. Avoid long monologues. Since the user is talking to you over real-time audio, format your answers for speech—keep it easy to follow.`,
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            const msgAny = message as any;
            // Extract model's audio output
            const part = msgAny.serverContent?.modelTurn?.parts?.[0];
            const audio = part?.inlineData?.data;
            const text = part?.text;

            // Extract transcription or textual parts
            const responsePayload: any = {};
            if (audio) responsePayload.audio = audio;
            if (text) responsePayload.text = text;
            
            // Check for user transcription
            const userTurnText = msgAny.serverContent?.userTurn?.parts?.[0]?.text;
            if (userTurnText) responsePayload.userText = userTurnText;

            if (msgAny.serverContent?.interrupted) {
              responsePayload.interrupted = true;
            }

            if (Object.keys(responsePayload).length > 0) {
              clientWs.send(JSON.stringify(responsePayload));
            }
          },
          onclose: () => {
            console.log("Gemini Live API session closed");
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.close();
            }
          },
          onerror: (err) => {
            console.error("Gemini Live API session error:", err);
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ error: err.message || "Gemini Live API error" }));
            }
          }
        },
      });

      // Receive audio or text input from the client and stream it to Gemini
      clientWs.on("message", (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (session) {
            if (parsed.audio) {
              session.sendRealtimeInput({
                audio: { data: parsed.audio, mimeType: "audio/pcm;rate=16000" },
              });
            } else if (parsed.text) {
              session.sendRealtimeInput({
                text: parsed.text,
              });
            }
          }
        } catch (e) {
          console.error("Error processing client message:", e);
        }
      });

      clientWs.on("close", () => {
        console.log("Client closed WebSocket proxy connection");
        if (session) {
          try {
            session.close();
          } catch (e) {
            console.error("Error closing Gemini session:", e);
          }
        }
      });
    } catch (err: any) {
      console.error("Error setting up Gemini Live session:", err);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({ error: "Failed to connect to Gemini Live API: " + (err.message || err) }));
        clientWs.close();
      }
    }
  });

  // REST API Endpoints
  app.use(express.json({ limit: "10mb" }));

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", hasApiKey: !!process.env.GEMINI_API_KEY });
  });

  app.post("/api/gemini/forecast-insights", async (req, res) => {
    try {
      if (!apiKey || !ai) {
        return res.status(500).json({ error: "Gemini API key is not configured on the server." });
      }
      const { forecastSummary, scenarioName } = req.body;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: `You are an expert financial consultant & snack factory operational planner specializing in South Indian snack production (murukku, mixture, kara sev, banana chips).
Analyze the following production forecasting data and provide 4 key actionable recommendations covering:
1. Material Sourcing & Bulk Ordering strategy (to hedge against ingredient inflation)
2. Profit Margin & Pricing Strategy (Retail vs Wholesale optimization)
3. Capacity & Batch Scheduling Efficiency
4. Risk Management & Break-even Advice

Forecasting Details:
- Scenario: ${scenarioName || 'Base Plan'}
- Time Horizon: ${forecastSummary.timeFrameDays || 30} days
- Projected Batches: ${forecastSummary.totalBatches}
- Target Production Volume: ${forecastSummary.totalVolumeKg} kg
- Projected Revenue: ₹${forecastSummary.projectedRevenue}
- Projected COGS: ₹${forecastSummary.projectedCogs}
- Projected Fixed Overheads: ₹${forecastSummary.projectedOverheads}
- Projected Net Profit: ₹${forecastSummary.projectedNetProfit} (Margin: ${forecastSummary.profitMarginPercent}%)
- Break-even Batches required: ${forecastSummary.breakEvenBatches} batches (${forecastSummary.breakEvenVolumeKg} kg)
- Top Raw Material Shortages: ${forecastSummary.topMaterialShortages || 'None'}

Format your response in concise, professional Markdown bullet points with clear headings and emojis. Keep advice practical, actionable, and tailored for a snack manufacturer.`,
      });

      res.json({ text: response.text });
    } catch (err: any) {
      console.error("Error in forecast-insights endpoint:", err);
      res.status(500).json({ error: err.message || "Failed to generate AI insights" });
    }
  });

  // Vite development integration or production static file serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
