// server.js

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer } from "ws";
import { config } from "dotenv";
import axios from 'axios';

// Load environment variables
config();

// Resolve __dirname (since it's not available in ES modules by default)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static frontend files
app.use(express.static(path.join(__dirname, "../frontend"), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith(".ogg")) {
      res.set("Content-Type", "audio/ogg");
    }
  }
}));

// Start HTTP server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

// Initialize WebSocket server using the same HTTP server
const wss = new WebSocketServer({ server });

// Handle WebSocket connections
wss.on("connection", (socket) => {
  console.log("Frontend WebSocket connected");

  // Confirm connection to client
  socket.send(JSON.stringify({
    type: "connection",
    message: "WebSocket connection established",
    timestamp: new Date().toISOString()
  }));

  // Listen for messages from the client
  // socket.on("message", (message) => {
  //   console.log("✅ Message received");

  //   // const buffer = Buffer.from(message);
  //   // console.log(`📦 Binary (${buffer.length} bytes)`);
  //   // console.log(" First 10 bytes (hex):", buffer.toString('hex', 0, 10));

  // });
  socket.on("message", async (message) => {
    // console.log("✅ Message received:", message);

    try {
      // Send message to Gemini API for processing
      const response = await axios.post('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', {
        model: 'gemini-model',   // Replace with correct model name or ID
        messages: [
          { role: 'user', content: message },
        ],
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.GEMINI_API_KEY}`,  // Set your API key
        }
      });

      // Process and send response back to the client
      const geminiResponse = response.data.choices[0].message.content;
      // console.log("Gemini response:", geminiResponse);

      // Send the Gemini response to the client
      socket.send(JSON.stringify({
        type: "response",
        message: geminiResponse,
        timestamp: new Date().toISOString()
      }));
    } catch (err) {
      console.error("Error with Gemini API:", err);
    }
  });
  socket.on("close", () => {
    console.log("Client disconnected");
  });

  socket.on("error", (err) => {
    console.error("WebSocket error:", err);
  });
});

