import { Server } from "@hocuspocus/server";

const PORT = Number(process.env.PORT) || 8080;
const HOST = process.env.HOST || "0.0.0.0";

// Optional: comma-separated origins to allow (e.g. "http://localhost:5173,https://clue.example.com")
const ALLOW_ORIGINS = (process.env.ALLOW_ORIGINS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

// Optional: set ROOM_TOKEN to require ?token=... in the WS URL
const ROOM_TOKEN = process.env.ROOM_TOKEN || null;

const server = Server.configure({
  port: PORT,
  address: HOST,

  async onAuthenticate({ request }) {
    if (!ROOM_TOKEN) return; // no auth required unless you set it
    // Hocuspocus passes a ws:// URL; use a base to parse reliably
    const url = new URL(request.url, "ws://localhost");
    const token = url.searchParams.get("token");
    if (token !== ROOM_TOKEN) {
      throw new Error("unauthorized");
    }
  },

  onConnect({ documentName, request }) {
    const origin = request?.headers?.origin || "n/a";

    // Optional origin allow-list
    if (ALLOW_ORIGINS.length > 0 && origin !== "n/a" && !ALLOW_ORIGINS.includes(origin)) {
      console.warn("Blocked origin:", origin);
      throw new Error("forbidden");
    }

    console.log("Client connected:", documentName, "origin:", origin);
  },

  onDisconnect({ documentName }) {
    console.log("Client disconnected:", documentName);
  },
});

server.listen(() => {
  console.log(`Hocuspocus running on ws://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}`);
  console.log(
    ALLOW_ORIGINS.length
      ? `Allowed origins: ${ALLOW_ORIGINS.join(", ")}`
      : "Allowed origins: * (development)"
  );
  if (ROOM_TOKEN) console.log("Auth: token required (?token=...)");
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\nShutting down Hocuspocus…");
  await server.destroy();
  process.exit(0);
});

