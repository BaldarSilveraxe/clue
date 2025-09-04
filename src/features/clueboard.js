export function initClueCanvas() {
  const canvas = document.getElementById('clueboardCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: false });

  // Inspector bits
  const outSel = document.getElementById('insp-selected');
  const outX = document.getElementById('insp-x');
  const outY = document.getElementById('insp-y');
  const outW = document.getElementById('insp-w');
  const outH = document.getElementById('insp-h');
  const btnCenter = document.getElementById('btnCenter');
  const btnReset  = document.getElementById('btnReset');

  const NODE_W = 160, NODE_H = 100;

  const state = {
    nodes: [
      { id:'left',   label:'Left',   x:  80, y: 80, w:NODE_W, h:NODE_H },
      { id:'center', label:'Center', x: 320, y: 80, w:NODE_W, h:NODE_H },
      { id:'right',  label:'Right',  x: 560, y: 80, w:NODE_W, h:NODE_H },
    ],
    selected: 1,
    dragging: -1,
    grab: { x:0, y:0 },
    laidOut: false,
  };

  // --- helpers ---
  const cs = () => getComputedStyle(canvas);
  const panelBg  = () => cs().getPropertyValue('--panelBG')?.trim() || '#111';
  const cardBg   = () => cs().getPropertyValue('--cardBG')?.trim() || '#1a1a1a';
  const line     = () => cs().getPropertyValue('--line')?.trim()    || '#444';
  const brand    = () => cs().getPropertyValue('--brand')?.trim()   || '#6ea8fe';
  const text     = () => cs().getPropertyValue('--text')?.trim()    || '#eaeaea';

  function clampNode(n) {
    const b = canvas.getBoundingClientRect();
    n.x = Math.max(0, Math.min(n.x, b.width - n.w));
    n.y = Math.max(0, Math.min(n.y, b.height - n.h));
  }
  const hit = (n, px, py) => px >= n.x && px <= n.x+n.w && py >= n.y && py <= n.y+n.h;

  function defaultLayout() {
    const b = canvas.getBoundingClientRect();
    const cy = Math.max(0, (b.height - NODE_H)/2);
    const px = p => Math.max(0, p * b.width - NODE_W/2);
    state.nodes[0].x = px(0.20); state.nodes[0].y = cy;
    state.nodes[1].x = px(0.50); state.nodes[1].y = cy;
    state.nodes[2].x = px(0.80); state.nodes[2].y = cy;
    state.laidOut = true;
  }

  // --- drawing ---
  function drawNode(n, selected=false) {
    ctx.fillStyle = cardBg();
    ctx.strokeStyle = selected ? brand() : line();
    ctx.lineWidth = selected ? 2 : 1;
    ctx.fillRect(n.x, n.y, n.w, n.h);
    ctx.strokeRect(n.x, n.y, n.w, n.h);

    ctx.font = '600 13px system-ui, -apple-system, Segoe UI, Roboto, Arial';
    ctx.fillStyle = text();
    ctx.textBaseline = 'top';
    ctx.fillText(n.label, n.x + 8, n.y + 8);
  }

  function drawRope(a, b) {
    const A = { x: a.x + a.w/2, y: a.y + a.h/2 };
    const B = { x: b.x + b.w/2, y: b.y + b.h/2 };
    const mx = (A.x + B.x) / 2;
    const my = (A.y + B.y) / 2;
    const dist = Math.hypot(B.x - A.x, B.y - A.y);
    const sag = Math.max(12, Math.min(60, dist * 0.10));

    // shadow
    ctx.beginPath();
    ctx.moveTo(A.x, A.y);
    ctx.quadraticCurveTo(mx, my + sag, B.x, B.y);
    ctx.strokeStyle = 'rgba(0,0,0,.35)';
    ctx.lineWidth = 4;
    ctx.setLineDash([]);
    ctx.stroke();

    // rope
    ctx.beginPath();
    ctx.moveTo(A.x, A.y);
    ctx.quadraticCurveTo(mx, my + sag, B.x, B.y);
    ctx.strokeStyle = 'rgba(255,255,255,.35)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6,4]);
    ctx.stroke();

    // end caps
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    ctx.beginPath(); ctx.arc(A.x, A.y, 2.5, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(B.x, B.y, 2.5, 0, Math.PI*2); ctx.fill();
  }

  function draw() {
    const b = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, b.width, b.height);
    ctx.fillStyle = panelBg();
    ctx.fillRect(0, 0, b.width, b.height);

    const [left, center, right] = state.nodes;
    drawRope(center, left);
    drawRope(center, right);

    state.nodes.forEach((n, i) => drawNode(n, i === state.selected));

    const sel = state.nodes[state.selected];
    outSel && (outSel.textContent = sel?.id || '');
    outX && (outX.textContent = Math.round(sel.x));
    outY && (outY.textContent = Math.round(sel.y));
    outW && (outW.textContent = sel.w);
    outH && (outH.textContent = sel.h);
  }

  // --- resize / DPR ---
  function resize() {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const box = canvas.getBoundingClientRect();
    canvas.width  = Math.max(1, Math.floor(box.width  * dpr));
    canvas.height = Math.max(1, Math.floor(box.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (!state.laidOut) defaultLayout();
    state.nodes.forEach(clampNode);
    draw();
  }

  // --- pointer interactions ---
  const toLocal = e => {
    const b = canvas.getBoundingClientRect();
    return { x: e.clientX - b.left, y: e.clientY - b.top };
  };

  canvas.addEventListener('pointerdown', (e) => {
    const p = toLocal(e);
    for (let i = state.nodes.length - 1; i >= 0; i--) {
      const n = state.nodes[i];
      if (hit(n, p.x, p.y)) {
        state.dragging = i;
        state.selected = i;
        state.grab.x = p.x - n.x;
        state.grab.y = p.y - n.y;
        canvas.setPointerCapture(e.pointerId);
        draw();
        return;
      }
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    if (state.dragging < 0) return;
    const p = toLocal(e);
    const n = state.nodes[state.dragging];
    n.x = p.x - state.grab.x;
    n.y = p.y - state.grab.y;
    clampNode(n);
    // (for realtime later)
    if (window.__ySetNodePos) window.__ySetNodePos(n.id, n.x, n.y);
    draw();
  });

  function endDrag(e) {
    if (state.dragging < 0) return;
    try { canvas.releasePointerCapture(e.pointerId); } catch {}
    state.dragging = -1;
  }
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('pointerleave', endDrag);

  // --- buttons ---
  btnCenter?.addEventListener('click', () => {
    const b = canvas.getBoundingClientRect();
    const cy = Math.max(0, (b.height - NODE_H)/2);
    state.nodes[1].x = Math.max(0, (b.width - NODE_W)/2);
    state.nodes[1].y = cy;
    state.nodes[0].x = Math.max(0, b.width * 0.20 - NODE_W/2);
    state.nodes[0].y = cy;
    state.nodes[2].x = Math.max(0, b.width * 0.80 - NODE_W/2);
    state.nodes[2].y = cy;
    draw();
  });

  btnReset?.addEventListener('click', () => {
    state.laidOut = false;
    resize();
  });

  // Expose tiny API for Yjs later
  window.__clue = {
    draw,
    setPos(id, x, y) {
      const n = state.nodes.find(n => n.id === id);
      if (!n) return;
      n.x = x; n.y = y; clampNode(n); draw();
    }
  };

  // react to size & theme changes
  new ResizeObserver(resize).observe(canvas);
  resize();
}
