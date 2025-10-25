// server.js
import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// --- Allow mobile devices to connect over Wi-Fi ---
const HOST = "0.0.0.0"; // listen on all network interfaces

// --- Fix __dirname for ES modules ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Middleware ---
app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "public"))); // serve frontend files

// --- Gemini API Configuration ---
const MODEL = "gemini-2.5-flash";
const API_KEY = process.env.GOOGLE_API_KEY;

if (!API_KEY) {
  console.error("⚠️ GOOGLE_API_KEY not found in .env file!");
}

const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

// --- Routes ---

// ✅ Text Generation Endpoint
app.post("/generate", async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) return res.status(400).json({ error: "No prompt provided." });
  if (!API_KEY) return res.status(500).json({ error: "Missing API key." });

  try {
    const body = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    };

    console.log("📩 Received prompt:", prompt);

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const rawText = await response.text();
    console.log("🟩 Gemini raw response:", response.status, rawText);

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Gemini API error ${response.status}`,
        details: rawText,
      });
    }

    const data = JSON.parse(rawText);
    const aiText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "⚠️ No text returned from Gemini API.";

    res.json({ response: aiText });
  } catch (err) {
    console.error("🔥 Error in /generate:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Optional: Image Generation Endpoint
app.post("/generateImage", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "No prompt provided." });

  try {
    const IMAGE_MODEL = "gemini-2.0-pro-vision";
    const imageUrl = `https://generativelanguage.googleapis.com/v1beta/models/${IMAGE_MODEL}:generateContent?key=${API_KEY}`;

    const body = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { mimeType: "image/png" },
    };

    const response = await fetch(imageUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const rawText = await response.text();
    console.log("🟦 Image API response:", response.status, rawText);

    const data = JSON.parse(rawText);
    const base64Image =
      data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;

    res.json({ imageBase64: base64Image });
  } catch (err) {
    console.error("🔥 /generateImage error:", err);
    res.status(500).json({ error: err.message });
  }
});

// --- Start the Server ---
app.listen(PORT, HOST, () => {
  console.log(`✅ Server running on all interfaces`);
  console.log(`🌐 Access it from your PC: http://localhost:${PORT}`);
  console.log(`📱 Or from your phone: http://<your-computer-ip>:${PORT}`);
});
