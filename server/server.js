import { Server } from "@hocuspocus/server";

const PORT = Number(process.env.PORT) || 8080;
const HOST = process.env.HOST || "0.0.0.0";

// Optional: comma-separated list of allowed origins
const ALLOW_ORIGINS = (process.env.ALLOW_ORIGINS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

// Optional: token auth (?token=...)
const ROOM_TOKEN = process.env.ROOM_TOKEN || null;

const server = Server.configure({
  port: PORT,
  address: HOST,

  async onAuthenticate({ request }) {
    if (!ROOM_TOKEN) return;
    const url = new URL(request.url, "ws://localhost");
    const token = url.searchParams.get("token");
    if (token !== ROOM_TOKEN) throw new Error("unauthorized");
  },

  onConnect({ documentName, request }) {
    const origin = request?.headers?.origin || "n/a";
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

process.on("SIGINT", async () => {
  console.log("\nShutting down Hocuspocus…");
  await server.destroy();
  process.exit(0);
});
