(() => {
  const canvas = document.getElementById('clueboardCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: false });

  // Optional inspector elements you already have
  const inspX = document.getElementById('insp-x');
  const inspY = document.getElementById('insp-y');
  const inspW = document.getElementById('insp-w');
  const inspH = document.getElementById('insp-h');
  const inspStatus = document.getElementById('insp-status');

  const btnCenter = document.getElementById('btnCenter');
  const btnReset  = document.getElementById('btnReset');

  const NODE_W = 160, NODE_H = 100;

  const state = {
    nodes: [
      { id: 'left',   label: 'Left',   x: null, y: null, w: NODE_W, h: NODE_H },
      { id: 'center', label: 'Center', x: null, y: null, w: NODE_W, h: NODE_H },
      { id: 'right',  label: 'Right',  x: null, y: null, w: NODE_W, h: NODE_H },
    ],
    selected: 1,          // start with 'center'
    dragging: -1,         // index if dragging, else -1
    grab: { x: 0, y: 0 }, // pointer-to-rect offset while dragging
    laidOut: false        // first-time responsive layout
  };

  // ------ utilities ------
  const cs = () => getComputedStyle(canvas);
  const ropeColor   = () => cs().getPropertyValue('--line-hover')?.trim() || 'rgba(255,255,255,.4)';
  const panelBg     = () => cs().getPropertyValue('--panelBG')?.trim() || '#1e1e1e';
  const cardBg      = () => cs().getPropertyValue('--cardBG')?.trim()  || '#2a2a2a';
  const borderColor = () => cs().getPropertyValue('--line')?.trim()     || 'rgba(255,255,255,.25)';
  const accent      = () => cs().getPropertyValue('--brandFG')?.trim()  || '#6ea8fe';

  function nodeCenter(n)  { return { x: n.x + n.w/2, y: n.y + n.h/2 }; }
  function clampNode(n) {
    const b = canvas.getBoundingClientRect();
    n.x = Math.max(0, Math.min(n.x, b.width  - n.w));
    n.y = Math.max(0, Math.min(n.y, b.height - n.h));
  }
  function hit(n, px, py) { return px >= n.x && px <= n.x+n.w && py >= n.y && py <= n.y+n.h; }

  function defaultLayout() {
    const b = canvas.getBoundingClientRect();
    const cy = Math.max(0, (b.height - NODE_H)/2);
    // centers at ~20%, 50%, 80%
    const px = (p) => Math.max(0, p * b.width - NODE_W/2);
    state.nodes[0].x = px(0.20); state.nodes[0].y = cy;
    state.nodes[1].x = px(0.50); state.nodes[1].y = cy;
    state.nodes[2].x = px(0.80); state.nodes[2].y = cy;
    state.laidOut = true;
  }

  // ------ drawing ------
  function drawNode(n, selected=false) {
    // body
    ctx.fillStyle   = cardBg();
    ctx.strokeStyle = selected ? accent() : borderColor();
    ctx.lineWidth = selected ? 2 : 1;
    ctx.fillRect(n.x, n.y, n.w, n.h);
    ctx.strokeRect(n.x, n.y, n.w, n.h);

    // label
    ctx.font = '600 13px system-ui, -apple-system, Segoe UI, Roboto, Arial';
    ctx.fillStyle = cs().getPropertyValue('--bodyFB')?.trim() || '#eee';
    ctx.textBaseline = 'top';
    ctx.fillText(n.label, n.x + 8, n.y + 8);
  }

  function drawRope(a, b) {
    const A = nodeCenter(a), B = nodeCenter(b);
    const dx = B.x - A.x, dy = B.y - A.y;
    const dist = Math.hypot(dx, dy);
    const mx = (A.x + B.x) / 2;
    const my = (A.y + B.y) / 2;
    const sag = Math.max(12, Math.min(60, dist * 0.10)); // gentle “string” sag

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // shadow pass
    ctx.beginPath();
    ctx.moveTo(A.x, A.y);
    ctx.quadraticCurveTo(mx, my + sag, B.x, B.y);
    ctx.strokeStyle = 'rgba(0,0,0,.35)';
    ctx.lineWidth = 4;
    ctx.setLineDash([]);
    ctx.stroke();

    // rope pass
    ctx.beginPath();
    ctx.moveTo(A.x, A.y);
    ctx.quadraticCurveTo(mx, my + sag, B.x, B.y);
    ctx.strokeStyle = ropeColor();
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]); // looks like string/twine
    ctx.stroke();

    // end caps
    ctx.setLineDash([]);
    ctx.fillStyle = ropeColor();
    ctx.beginPath(); ctx.arc(A.x, A.y, 2.5, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(B.x, B.y, 2.5, 0, Math.PI*2); ctx.fill();
  }

  function draw() {
    const b = canvas.getBoundingClientRect();
    // background
    ctx.clearRect(0, 0, b.width, b.height);
    ctx.fillStyle = panelBg();
    ctx.fillRect(0, 0, b.width, b.height);

    // ropes behind nodes: center↔left and center↔right
    const left = state.nodes[0], center = state.nodes[1], right = state.nodes[2];
    drawRope(center, left);
    drawRope(center, right);

    // nodes (left, center, right)
    state.nodes.forEach((n, i) => drawNode(n, i === state.selected));

    // inspector
    const sel = state.nodes[state.selected];
    inspX && (inspX.textContent = Math.round(sel.x));
    inspY && (inspY.textContent = Math.round(sel.y));
    inspW && (inspW.textContent = sel.w);
    inspH && (inspH.textContent = sel.h);
  }

  // ------ resize / DPR ------
  function resize() {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const box = canvas.getBoundingClientRect();
    canvas.width  = Math.max(1, Math.floor(box.width  * dpr));
    canvas.height = Math.max(1, Math.floor(box.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (!state.laidOut) defaultLayout(); // first time
    // keep nodes inside if container shrank
    state.nodes.forEach(clampNode);
    draw();
  }

  // ------ pointer interactivity ------
  function toLocal(e) {
    const b = canvas.getBoundingClientRect();
    return { x: e.clientX - b.left, y: e.clientY - b.top };
  }

  canvas.addEventListener('pointerdown', (e) => {
    const p = toLocal(e);
    // choose topmost node under pointer (reverse order)
    for (let i = state.nodes.length - 1; i >= 0; i--) {
      const n = state.nodes[i];
      if (hit(n, p.x, p.y)) {
        state.dragging = i;
        state.selected = i;
        state.grab.x = p.x - n.x;
        state.grab.y = p.y - n.y;
        canvas.setPointerCapture(e.pointerId);
        inspStatus && (inspStatus.textContent = `Dragging ${state.nodes[i].label}`);
        draw();
        return;
      }
    }
    // click empty space: just select center (or keep current)
  });

  canvas.addEventListener('pointermove', (e) => {
    if (state.dragging < 0) return;
    const p = toLocal(e);
    const n = state.nodes[state.dragging];
    n.x = p.x - state.grab.x;
    n.y = p.y - state.grab.y;
    clampNode(n);
    draw();
  });

  function endDrag(e) {
    if (state.dragging < 0) return;
    try { canvas.releasePointerCapture(e.pointerId); } catch {}
    state.dragging = -1;
    inspStatus && (inspStatus.textContent = 'Idle');
    draw();
  }
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('pointerleave', endDrag);

  // ------ buttons ------
  btnCenter?.addEventListener('click', () => {
    const b = canvas.getBoundingClientRect();
    const cy = Math.max(0, (b.height - NODE_H)/2);
    // center node in middle; align left/right horizontally around it
    const centerNode = state.nodes[1];
    centerNode.x = Math.max(0, (b.width - NODE_W)/2);
    centerNode.y = cy;

    state.nodes[0].x = Math.max(0, b.width * 0.20 - NODE_W/2);
    state.nodes[0].y = cy;

    state.nodes[2].x = Math.max(0, b.width * 0.80 - NODE_W/2);
    state.nodes[2].y = cy;

    draw();
  });

  btnReset?.addEventListener('click', () => {
    state.laidOut = false; // force fresh layout next resize()
    resize();
    inspStatus && (inspStatus.textContent = 'Reset');
  });

  // React to size and theme changes
  new ResizeObserver(resize).observe(canvas);
  new MutationObserver(() => draw()).observe(document.documentElement, {
    attributes: true, attributeFilter: ['data-theme']
  });

  // init
  resize();
})();
