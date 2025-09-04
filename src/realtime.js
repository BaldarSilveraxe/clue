// src/realtime.js
console.log('[Yjs] realtime.js loaded');
import * as Y from "yjs";
import { HocuspocusProvider } from "@hocuspocus/provider";

// Room / doc
const params   = new URLSearchParams(location.search);
const roomCode = params.get("room") || "CF-24-019";
const docName  = `clueboard:${roomCode}`;

// WS target (local dev vs prod; env override supported)
const isLocal = location.hostname === "localhost" || location.hostname === "127.0.0.1";
const WS_URL  = (import.meta?.env?.VITE_WS_URL) ?? (isLocal ? "ws://localhost:8080" : "wss://YOUR-WS-APP.example.com");
console.log("[Yjs] WS_URL =", WS_URL, "hostname =", location.hostname);

// Yjs doc + shared map
const doc    = new Y.Doc();
const yNodes = doc.getMap("nodes");

// ---- single pull() to apply inbound changes to the canvas ----
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

// Connect to Hocuspocus
const provider = new HocuspocusProvider({
  url: WS_URL,
  name: docName,
  document: doc,
  onStatus: ({ status }) => console.log("[Yjs]", status, "→", WS_URL),
});

// Ensure node exists with defaults
function ensureNode(id, init) {
  if (!yNodes.has(id)) {
    const m = new Y.Map();
    for (const [k, v] of Object.entries(init)) m.set(k, v);
    yNodes.set(id, m);
  }
  return yNodes.get(id);
}
const left   = ensureNode("left",   { id:"left",   x:80,  y:80,  w:160, h:100, label:"Left" });
const center = ensureNode("center", { id:"center", x:320, y:80,  w:160, h:100, label:"Center" });
const right  = ensureNode("right",  { id:"right",  x:560, y:80,  w:160, h:100, label:"Right" });

// Also watch individual maps (fine to keep; initial hydrate)
[left, center, right].forEach(ym => {
  ym.observe(e => {
    if (e.keysChanged.has("x") || e.keysChanged.has("y")) pull(ym);
  });
  pull(ym);
});

// ---- Throttled writes: one rAF per node id ----
const _rafById = new Map();   // id -> raf handle
const _pending = new Map();   // id -> { x, y }

window.__ySetNodePos = (id, x, y) => {
  const ym = yNodes.get(id);
  if (!ym) return;

  // store latest coords for this id (rounded for stable diffs)
  const nx = Math.round(x);
  const ny = Math.round(y);
  _pending.set(id, { x: nx, y: ny });

  // if a frame is already scheduled for this id, we're done
  if (_rafById.has(id)) return;

  const rafId = requestAnimationFrame(() => {
    _rafById.delete(id);
    const p = _pending.get(id);
    _pending.delete(id);
    if (!p) return;

    // skip no-op writes
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

// debug handle (super handy in DevTools)
window.__y = { doc, yNodes, provider };
