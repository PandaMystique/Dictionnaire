// ===== FOOTNOTES =====
function buildFootnotes(html, refs) {
  // Convert <ref>...</ref> markers into numbered superscripts
  let noteIndex = 0;
  const notes = [];
  
  // Extract inline refs from HTML
  html = html.replace(/<ref[^>]*>([\s\S]*?)<\/ref>/gi, (match, content) => {
    noteIndex++;
    notes.push(content.replace(/<[^>]+>/g, '').trim());
    return `<span class="footnote-ref" onclick="document.getElementById('fn-${noteIndex}').scrollIntoView({behavior:'smooth',block:'center'})" title="${escapeAttr(notes[notes.length-1].substring(0,100))}">[${noteIndex}]</span>`;
  });
  
  // Add refs from parsed bibliography as additional notes
  refs.forEach(r => {
    noteIndex++;
    notes.push(r);
  });
  
  // Build footnotes section
  let footnotesHtml = '';
  if (notes.length > 0) {
    footnotesHtml = `<div class="footnotes-section"><h4>Notes & Références (${notes.length})</h4>` +
      notes.map((n, i) => `<div class="footnote-item" id="fn-${i+1}"><span class="footnote-num">${i+1}.</span><span>${n}</span></div>`).join('') +
      `</div>`;
  }
  
  return { html, footnotesHtml };
}

// ===== TABLE OF CONTENTS =====
function buildTOC(contentEl) {
  const headings = contentEl.querySelectorAll('.article-body h3, .article-body h4');
  if (headings.length < 3) return;
  
  // Add IDs to headings
  headings.forEach(function(h, i) { h.id = 'section-' + i; });
  
  if (isMobile()) {
    var tocBtn = document.createElement('div');
    var links = [];
    for (var i = 0; i < headings.length; i++) {
      var h = headings[i];
      var isSub = h.tagName === 'H4';
      links.push('<a href="#section-' + i + '" class="' + (isSub ? 'toc-sub' : '') + '" onclick="event.preventDefault();document.getElementById(\'section-' + i + '\').scrollIntoView({behavior:\'smooth\',block:\'start\'})">' + h.textContent + '</a>');
    }
    tocBtn.innerHTML = '<button class="toc-mobile-toggle" onclick="this.nextElementSibling.classList.toggle(\'open\')">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M3 6h18M3 18h12"/></svg>' +
      'Sommaire (' + headings.length + ' sections)' +
      '</button><div class="toc-mobile-list">' + links.join('') + '</div>';
    var body = contentEl.querySelector('.article-body');
    if (body) body.insertBefore(tocBtn, body.firstChild);
  } else {
    var toc = document.createElement('div');
    toc.className = 'toc-float';
    var links = [];
    for (var i = 0; i < headings.length; i++) {
      var h = headings[i];
      var isSub = h.tagName === 'H4';
      links.push('<a href="#section-' + i + '" data-idx="' + i + '" class="' + (isSub ? 'toc-sub' : '') + '" onclick="event.preventDefault();document.getElementById(\'section-' + i + '\').scrollIntoView({behavior:\'smooth\',block:\'start\'})">' + h.textContent + '</a>');
    }
    toc.innerHTML = '<div class="toc-float-title">Sommaire</div>' + links.join('') +
      '<div style="margin-top:0.75rem;padding-top:0.6rem;border-top:1px solid var(--border);">' +
        '<div class="font-size-controls" style="justify-content:center;">' +
          '<button class="font-size-btn" onclick="adjustFontSize(-1)">A\u2212</button>' +
          '<span style="font-family:var(--mono);font-size:0.5rem;color:var(--muted-light);">' + currentFontSize + '%</span>' +
          '<button class="font-size-btn" onclick="adjustFontSize(1)">A+</button>' +
        '</div>' +
      '</div>';
    var wrap = contentEl.querySelector('.article-body-wrap');
    if (wrap) wrap.appendChild(toc);
    
    // Scroll spy
    var content = document.querySelector('.content');
    var spy = function() {
      var tocLinks = toc.querySelectorAll('a[data-idx]');
      var active = 0;
      for (var j = 0; j < headings.length; j++) {
        if (headings[j].getBoundingClientRect().top < 120) active = j;
      }
      for (var j = 0; j < tocLinks.length; j++) {
        if (j === active) tocLinks[j].classList.add('active');
        else tocLinks[j].classList.remove('active');
      }
    };
    (content || window).addEventListener('scroll', spy, { passive: true });
    spy();
  }
}

// ===== GRAPH =====
function showGraph() {
  const allEntries = getAllEntries();
  if (allEntries.length === 0) return;
  
  const overlay = document.createElement('div');
  overlay.className = 'graph-overlay';
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  
  overlay.innerHTML = `<div class="graph-container">
    <div class="graph-header">
      <h3>Graphe des relations</h3>
      <button class="graph-close" onclick="this.closest('.graph-overlay').remove()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    </div>
    <div class="graph-canvas-wrap"><canvas id="graphCanvas"></canvas></div>
  </div>`;
  document.body.appendChild(overlay);
  
  const canvas = document.getElementById('graphCanvas');
  const wrap = canvas.parentElement;
  canvas.width = wrap.clientWidth * 2;
  canvas.height = wrap.clientHeight * 2;
  canvas.style.width = wrap.clientWidth + 'px';
  canvas.style.height = wrap.clientHeight + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(2, 2);
  
  const W = wrap.clientWidth, H = wrap.clientHeight;
  
  // Build nodes (limit to entries with connections)
  const entryMap = new Map(allEntries.map(e => [e.id, e]));
  const links = [];
  const connectedIds = new Set();
  
  allEntries.forEach(e => {
    const related = [...(e.related || []), ...detectRelated(e).slice(0, 4)];
    related.forEach(rid => {
      if (entryMap.has(rid) && rid !== e.id) {
        links.push({ source: e.id, target: rid });
        connectedIds.add(e.id);
        connectedIds.add(rid);
      }
    });
  });
  
  // Take top connected nodes (max 60)
  const nodeCounts = new Map();
  links.forEach(l => {
    nodeCounts.set(l.source, (nodeCounts.get(l.source)||0)+1);
    nodeCounts.set(l.target, (nodeCounts.get(l.target)||0)+1);
  });
  const topIds = [...nodeCounts.entries()].sort((a,b) => b[1]-a[1]).slice(0, 60).map(e => e[0]);
  const nodeSet = new Set(topIds);
  
  const nodes = topIds.map((id, i) => {
    const e = entryMap.get(id);
    const angle = (i / topIds.length) * Math.PI * 2;
    const r = Math.min(W, H) * 0.35;
    return { id, label: e.term, x: W/2 + Math.cos(angle) * r + (Math.random()-0.5)*40, y: H/2 + Math.sin(angle) * r + (Math.random()-0.5)*40, vx:0, vy:0 };
  });
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const filteredLinks = links.filter(l => nodeSet.has(l.source) && nodeSet.has(l.target));
  
  // Simple force simulation
  function tick() {
    // Center gravity
    nodes.forEach(n => { n.vx += (W/2 - n.x) * 0.001; n.vy += (H/2 - n.y) * 0.001; });
    // Repulsion
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i+1; j < nodes.length; j++) {
        let dx = nodes[j].x - nodes[i].x, dy = nodes[j].y - nodes[i].y;
        const d = Math.sqrt(dx*dx + dy*dy) || 1;
        const f = 800 / (d * d);
        nodes[i].vx -= dx/d * f; nodes[i].vy -= dy/d * f;
        nodes[j].vx += dx/d * f; nodes[j].vy += dy/d * f;
      }
    }
    // Attraction along links
    filteredLinks.forEach(l => {
      const s = nodeMap.get(l.source), t = nodeMap.get(l.target);
      if (!s || !t) return;
      let dx = t.x - s.x, dy = t.y - s.y;
      const d = Math.sqrt(dx*dx + dy*dy) || 1;
      const f = (d - 80) * 0.005;
      s.vx += dx/d * f; s.vy += dy/d * f;
      t.vx -= dx/d * f; t.vy -= dy/d * f;
    });
    // Apply + dampen
    nodes.forEach(n => {
      n.vx *= 0.85; n.vy *= 0.85;
      n.x += n.vx; n.y += n.vy;
      n.x = Math.max(40, Math.min(W-40, n.x));
      n.y = Math.max(30, Math.min(H-30, n.y));
    });
  }
  
  function draw() {
    ctx.clearRect(0, 0, W, H);
    // Links
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--border').trim();
    ctx.lineWidth = 0.5;
    filteredLinks.forEach(l => {
      const s = nodeMap.get(l.source), t = nodeMap.get(l.target);
      if (!s || !t) return;
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(t.x, t.y); ctx.stroke();
    });
    // Nodes
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    const ink = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim();
    nodes.forEach(n => {
      const count = nodeCounts.get(n.id) || 1;
      const r = 3 + Math.min(count * 1.5, 8);
      ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI*2);
      ctx.fillStyle = accent; ctx.globalAlpha = 0.7; ctx.fill(); ctx.globalAlpha = 1;
      ctx.font = '500 ' + Math.max(8, Math.min(11, 7 + count)) + 'px "Cormorant Garamond"';
      ctx.fillStyle = ink;
      ctx.textAlign = 'center';
      ctx.fillText(n.label, n.x, n.y - r - 3);
    });
  }
  
  let frame = 0;
  function animate() {
    tick(); draw(); frame++;
    if (frame < 200 && document.body.contains(canvas)) requestAnimationFrame(animate);
  }
  animate();
  
  // Click on node → open article
  canvas.onclick = (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    for (const n of nodes) {
      const dx = mx - n.x, dy = my - n.y;
      if (dx*dx + dy*dy < 200) {
        overlay.remove();
        navigateTo(n.id);
        return;
      }
    }
  };
}


// ===== MINI CONNECTION GRAPH =====
function buildMiniGraph(entry) {
  var allEntries = getAllEntries();
  var relatedIds = (entry.related || []).slice();
  var autoRelated = detectRelated(entry);
  autoRelated.forEach(function(rid) { if (relatedIds.indexOf(rid) < 0) relatedIds.push(rid); });
  relatedIds = relatedIds.slice(0, 8);
  
  var nodes = relatedIds.map(function(rid) { return allEntries.find(function(e) { return e.id === rid; }); }).filter(Boolean);
  if (nodes.length < 2) return '';
  
  var w = 460, h = 220;
  var cx = w / 2, cy = h / 2;
  var rx = w * 0.38, ry = h * 0.36;
  
  var svg = '<div class="mini-graph-wrap">' +
    '<div class="mini-graph-title">Réseau de connexions</div>' +
    '<svg class="mini-graph-svg" viewBox="0 0 ' + w + ' ' + h + '">';
  
  var nodePositions = [];
  nodes.forEach(function(n, i) {
    var angle = (2 * Math.PI * i / nodes.length) - Math.PI / 2;
    nodePositions.push({
      x: cx + rx * Math.cos(angle),
      y: cy + ry * Math.sin(angle),
      entry: n
    });
  });
  
  // Edges center → nodes
  nodePositions.forEach(function(np) {
    svg += '<line class="mini-graph-edge" x1="' + cx + '" y1="' + cy + '" x2="' + np.x + '" y2="' + np.y + '"/>';
  });
  
  // Cross-edges between related nodes
  for (var i = 0; i < nodes.length; i++) {
    for (var j = i + 1; j < nodes.length; j++) {
      var niContent = normalizeText((nodes[i].content || '') + ' ' + nodes[i].tags.join(' '));
      var njTerm = normalizeText(nodes[j].term);
      if (njTerm.length > 3 && niContent.indexOf(njTerm) >= 0) {
        svg += '<line class="mini-graph-edge" x1="' + nodePositions[i].x + '" y1="' + nodePositions[i].y + 
          '" x2="' + nodePositions[j].x + '" y2="' + nodePositions[j].y + '" style="opacity:0.15"/>';
      }
    }
  }
  
  // Outer nodes
  nodePositions.forEach(function(np) {
    var termShort = np.entry.term.length > 16 ? np.entry.term.slice(0, 14) + '\u2026' : np.entry.term;
    svg += '<g class="mini-graph-node" onclick="navigateTo(\'' + np.entry.id + '\')">' +
      '<circle cx="' + np.x + '" cy="' + np.y + '" r="5" fill="var(--border)" stroke="var(--muted-light)" stroke-width="1"/>' +
      '<text class="mini-graph-label" x="' + np.x + '" y="' + (np.y < cy ? np.y - 10 : np.y + 16) + 
      '" text-anchor="middle">' + escapeHtml(termShort) + '</text></g>';
  });
  
  // Center node
  var centerShort = entry.term.length > 18 ? entry.term.slice(0, 16) + '\u2026' : entry.term;
  svg += '<circle cx="' + cx + '" cy="' + cy + '" r="8" fill="var(--accent)" stroke="var(--paper)" stroke-width="2"/>' +
    '<text class="mini-graph-label-center" x="' + cx + '" y="' + (cy - 14) + '" text-anchor="middle">' + escapeHtml(centerShort) + '</text>';
  
  svg += '</svg></div>';
  return svg;
}
