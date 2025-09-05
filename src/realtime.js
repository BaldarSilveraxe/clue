// src/realtime.js
console.log("[Yjs] realtime.js loaded");
console.log("[Yjs] import.meta.env dump =", import.meta?.env);
console.log("[Yjs] VITE_WS_URL =", import.meta?.env?.VITE_WS_URL);
import * as Y from "yjs";
import { HocuspocusProvider } from "@hocuspocus/provider";

// ---------- Room / document ----------
const params   = new URLSearchParams(location.search);
const roomCode = params.get("room") || "CF-24-019";
const docName  = `clueboard:${roomCode}`;

// ---------- WS target (env-aware) ----------
const isLocal = location.hostname === "localhost" || location.hostname === "127.0.0.1";

// Provided by Vite (set in Vercel → Project → Settings → Environment Variables)
const envWs = (import.meta?.env?.VITE_WS_URL || "").trim();
const token = (import.meta?.env?.VITE_WS_TOKEN || "").trim();

// In dev, default to localhost if not provided. In prod, require envWs.
const base   = isLocal ? (envWs || "ws://localhost:8080") : envWs;
const WS_URL = token ? `${base}${base.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}` : base;

if (!base) {
  console.error("[Yjs] Missing VITE_WS_URL in production. Set it in Vercel → Settings → Environment Variables.");
}
console.log("[Yjs] WS_URL =", WS_URL, "hostname =", location.hostname);

// ---------- Yjs doc + shared map ----------
const doc    = new Y.Doc();
const yNodes = doc.getMap("nodes");

// Apply inbound changes to your canvas
function pull(ymap) {
  if (!ymap) return;
  const id = ymap.get("id");
  const x  = ymap.get("x");
  const y  = ymap.get("y");
  if (id != null && x != null && y != null) {
    window.__clue?.setPos?.(id, x, y);
    window.__clue?.draw?.();
  }
}

// Catch all nested map changes (robust against identity changes)
yNodes.observeDeep(events => {
  for (const evt of events) {
    const tgt = evt.target;
    if (tgt && typeof tgt.get === "function" && tgt.get("id")) pull(tgt);
  }
});

// ---------- Connect to Hocuspocus ----------
const provider = new HocuspocusProvider({
  url: WS_URL,
  name: docName,
  document: doc,
  onStatus: ({ status }) => console.log("[Yjs]", status, "→", WS_URL),
});

// ---------- Ensure initial nodes exist ----------
function ensureNode(id, init) {
  if (!yNodes.has(id)) {
    const m = new Y.Map();
    for (const [k, v] of Object.entries(init)) m.set(k, v);
    yNodes.set(id, m);
  }
  return yNodes.get(id);
}
const left   = ensureNode("left",   { id: "left",   x:  80, y: 80, w: 160, h: 100, label: "Left" });
const center = ensureNode("center", { id: "center", x: 320, y: 80, w: 160, h: 100, label: "Center" });
const right  = ensureNode("right",  { id: "right",  x: 560, y: 80, w: 160, h: 100, label: "Right" });

// Also watch these individual maps & hydrate once
[left, center, right].forEach(ym => {
  ym.observe(e => {
    if (e.keysChanged.has("x") || e.keysChanged.has("y")) pull(ym);
  });
  pull(ym);
});

// ---------- Throttled writes: one rAF per node id ----------
const _rafById = new Map(); // id -> raf handle
const _pending = new Map(); // id -> { x, y }

window.__ySetNodePos = (id, x, y) => {
  const ym = yNodes.get(id);
  if (!ym) return;

  const nx = Math.round(x);
  const ny = Math.round(y);
  _pending.set(id, { x: nx, y: ny });

  if (_rafById.has(id)) return;

  const rafId = requestAnimationFrame(() => {
    _rafById.delete(id);
    const p = _pending.get(id);
    _pending.delete(id);
    if (!p) return;

    const curX = ym.get("x");
    const curY = ym.get("y");
    if (curX === p.x && curY === p.y) return;

    doc.transact(() => {
      ym.set("x", p.x);
      ym.set("y", p.y);
    });
  });

  _rafById.set(id, rafId);
};

// ---------- Debug handle ----------
window.__y = { doc, yNodes, provider };
