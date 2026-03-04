// ===== READING STREAK =====
function getReadingStreak() {
  // Build set of days with reading activity
  var days = new Set();
  readHistory.forEach(function(h) {
    var d = new Date(h.time);
    days.add(d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'));
  });
  
  // Count consecutive days ending today
  var streak = 0;
  var d = new Date();
  for (var i = 0; i < 365; i++) {
    var key = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    if (days.has(key)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      // Allow 1 day gap for today if nothing read yet
      if (i === 0) { d.setDate(d.getDate() - 1); continue; }
      break;
    }
  }
  return streak;
}

function getActivityMap() {
  // Last 28 days activity heatmap
  var map = [];
  var now = new Date();
  for (var i = 27; i >= 0; i--) {
    var d = new Date(now);
    d.setDate(d.getDate() - i);
    var key = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    var count = 0;
    readHistory.forEach(function(h) {
      var hd = new Date(h.time);
      var hk = hd.getFullYear() + '-' + String(hd.getMonth()+1).padStart(2,'0') + '-' + String(hd.getDate()).padStart(2,'0');
      if (hk === key) count++;
    });
    map.push({ day: d.getDate(), dow: d.getDay(), count: count, label: d.toLocaleDateString('fr-FR', {weekday:'short'}) });
  }
  return map;
}

function getSmartSuggestions(allEntries) {
  // Suggest based on: unread from read categories, related to recently read
  var suggestions = [];
  var recentCats = new Set();
  var recentTags = new Set();
  
  readHistory.slice(0, 10).forEach(function(h) {
    var e = allEntries.find(function(a) { return a.id === h.id; });
    if (e) {
      e.category.split(' · ').forEach(function(c) { recentCats.add(c); });
      e.tags.slice(0, 3).forEach(function(t) { recentTags.add(t.toLowerCase()); });
    }
  });
  
  // Score each unread article
  var scored = allEntries.filter(function(e) { return !readArticles.has(e.id); }).map(function(e) {
    var score = 0;
    e.category.split(' · ').forEach(function(c) { if (recentCats.has(c)) score += 3; });
    e.tags.forEach(function(t) { if (recentTags.has(t.toLowerCase())) score += 2; });
    // Boost if related to recently read
    var autoRel = detectRelated(e);
    readHistory.slice(0, 5).forEach(function(h) {
      if (autoRel.indexOf(h.id) >= 0) score += 5;
    });
    return { entry: e, score: score };
  }).filter(function(s) { return s.score > 0; });
  
  scored.sort(function(a, b) { return b.score - a.score; });
  return scored.slice(0, 4).map(function(s) { return s.entry; });
}


// ===== ANDROID WIDGET BRIDGE =====
function updateAndroidWidget() {
  if (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform && Capacitor.isNativePlatform()) {
    var aotd = getArticleOfDay();
    if (aotd) {
      try {
        Capacitor.Plugins?.Preferences?.set({ key: 'aotd_title', value: aotd.term });
        var excerpt = (aotd.definition || '').replace(/<[^>]+>/g, '').slice(0, 200);
        Capacitor.Plugins?.Preferences?.set({ key: 'aotd_excerpt', value: excerpt });
      } catch(e) {}
    }
  }
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

// ===== WYSIWYG EDITOR =====
var editorMode = 'wysiwyg';

function htmlToWikitext(html) {
  var text = html;
  text = text.replace(/<div><br\s*\/?><\/div>/gi, '\n');
  text = text.replace(/<div>/gi, '\n').replace(/<\/div>/gi, '');
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n== $1 ==\n');
  text = text.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '\n=== $1 ===\n');
  text = text.replace(/<b>(.*?)<\/b>/gi, "\'\'\'$1\'\'\'");
  text = text.replace(/<strong>(.*?)<\/strong>/gi, "\'\'\'$1\'\'\'");
  text = text.replace(/<i>(.*?)<\/i>/gi, "\'\'$1\'\'");
  text = text.replace(/<em>(.*?)<\/em>/gi, "\'\'$1\'\'");
  text = text.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, function(m, c) {
    return c.replace(/<[^>]+>/g, '').split('\n').map(function(l) { var t = l.trim(); return t ? ': ' + t : ''; }).filter(Boolean).join('\n');
  });
  text = text.replace(/<li[^>]*>(.*?)<\/li>/gi, '* $1');
  text = text.replace(/<\/?[ou]l[^>]*>/gi, '');
  text = text.replace(/<\/?p[^>]*>/gi, '\n');
  text = text.replace(/<[^>]+>/g, '');
  text = text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ');
  text = text.replace(/\n{3,}/g, '\n\n').trim();
  return text;
}

function wikitextToHtml(wikitext) {
  if (!wikitext || !wikitext.trim()) return '';
  var parsed = parseMediaWiki(wikitext);
  return parsed.html;
}

function switchEditorMode(mode) {
  var wysiwygArea = document.getElementById('wysiwygArea');
  var textArea = document.getElementById('editorContent');
  if (!wysiwygArea || !textArea) return;
  
  document.querySelectorAll('.editor-mode-btn').forEach(function(b) { b.classList.remove('active'); });
  var activeBtn = document.querySelector('.editor-mode-btn[data-mode="' + mode + '"]');
  if (activeBtn) activeBtn.classList.add('active');
  
  if (mode === 'wysiwyg') {
    var wiki = textArea.value;
    if (wiki) wysiwygArea.innerHTML = wikitextToHtml(wiki);
    wysiwygArea.style.display = '';
    textArea.style.display = 'none';
    editorMode = 'wysiwyg';
  } else {
    if (editorMode === 'wysiwyg') {
      textArea.value = htmlToWikitext(wysiwygArea.innerHTML);
    }
    wysiwygArea.style.display = 'none';
    textArea.style.display = '';
    editorMode = 'wikitext';
  }
}

function wysiwygExec(cmd, value) {
  document.execCommand(cmd, false, value || null);
  var area = document.getElementById('wysiwygArea');
  if (area) area.focus();
}

function wysiwygInsertHeading(level) {
  document.execCommand('formatBlock', false, level === 2 ? 'h3' : 'h4');
  var area = document.getElementById('wysiwygArea');
  if (area) area.focus();
}

function wysiwygInsertQuote() {
  document.execCommand('formatBlock', false, 'blockquote');
  var area = document.getElementById('wysiwygArea');
  if (area) area.focus();
}

function getEditorWikitext() {
  if (editorMode === 'wysiwyg') {
    var area = document.getElementById('wysiwygArea');
    return area ? htmlToWikitext(area.innerHTML) : document.getElementById('editorContent').value;
  }
  return document.getElementById('editorContent').value;
}


// ===== ALPHA SLIDER (iPhone contacts style) =====
function initAlphaSlider(strip) {
  var tooltip = document.getElementById('alphaTooltip');
  var isSliding = false;
  var lastLetter = '';
  
  function getLetterAt(y) {
    var links = strip.querySelectorAll('a[data-letter]');
    for (var i = 0; i < links.length; i++) {
      var rect = links[i].getBoundingClientRect();
      if (y >= rect.top && y <= rect.bottom) return links[i].getAttribute('data-letter');
    }
    // If above/below, return nearest
    if (links.length > 0) {
      var first = links[0].getBoundingClientRect();
      if (y < first.top) return links[0].getAttribute('data-letter');
      var last = links[links.length - 1].getBoundingClientRect();
      if (y > last.bottom) return links[links.length - 1].getAttribute('data-letter');
    }
    return null;
  }
  
  function highlightLetter(letter) {
    strip.querySelectorAll('a').forEach(function(a) { a.classList.remove('alpha-active'); });
    var active = strip.querySelector('a[data-letter="' + letter + '"]');
    if (active) active.classList.add('alpha-active');
  }
  
  function showTooltip(letter, y) {
    if (!tooltip) return;
    tooltip.textContent = letter;
    tooltip.style.top = y + 'px';
    tooltip.classList.add('visible');
  }
  
  function hideTooltip() {
    if (tooltip) tooltip.classList.remove('visible');
    strip.querySelectorAll('a').forEach(function(a) { a.classList.remove('alpha-active'); });
  }
  
  function jumpTo(letter) {
    if (letter && letter !== lastLetter) {
      lastLetter = letter;
      mobileJumpToLetter(letter);
      highlightLetter(letter);
    }
  }
  
  strip.addEventListener('touchstart', function(e) {
    e.preventDefault();
    isSliding = true;
    var touch = e.touches[0];
    var letter = getLetterAt(touch.clientY);
    if (letter) {
      jumpTo(letter);
      showTooltip(letter, touch.clientY);
    }
  }, { passive: false });
  
  strip.addEventListener('touchmove', function(e) {
    if (!isSliding) return;
    e.preventDefault();
    var touch = e.touches[0];
    var letter = getLetterAt(touch.clientY);
    if (letter) {
      jumpTo(letter);
      showTooltip(letter, touch.clientY);
    }
  }, { passive: false });
  
  strip.addEventListener('touchend', function() {
    isSliding = false;
    lastLetter = '';
    hideTooltip();
  });
  
  // Click on individual letters
  strip.addEventListener('click', function(e) {
    var letter = e.target.getAttribute('data-letter');
    if (letter) mobileJumpToLetter(letter);
  });
}

// ===== CUSTOM TAGS =====
var customArticleTags = JSON.parse(lsGet('philo-custom-tags', '{}'));
var allCustomTagNames = JSON.parse(lsGet('philo-all-custom-tags', '[]'));

function getCustomTags(id) {
  return customArticleTags[id] || [];
}

function saveCustomTags() {
  var json = JSON.stringify(customArticleTags);
  PhiloDB.set('philo-custom-tags', json);
  try { localStorage.setItem('philo-custom-tags', json); } catch(e) {}
  var names = JSON.stringify(allCustomTagNames);
  PhiloDB.set('philo-all-custom-tags', names);
  try { localStorage.setItem('philo-all-custom-tags', names); } catch(e) {}
}

function addCustomTag(id, tagName) {
  tagName = tagName.trim().toLowerCase();
  if (!tagName || tagName.length > 30) return;
  if (!customArticleTags[id]) customArticleTags[id] = [];
  if (customArticleTags[id].indexOf(tagName) >= 0) return;
  customArticleTags[id].push(tagName);
  if (allCustomTagNames.indexOf(tagName) < 0) allCustomTagNames.push(tagName);
  saveCustomTags();
  showArticle(id);
}

function removeCustomTag(id, tagName) {
  if (!customArticleTags[id]) return;
  customArticleTags[id] = customArticleTags[id].filter(function(t) { return t !== tagName; });
  if (customArticleTags[id].length === 0) delete customArticleTags[id];
  saveCustomTags();
  showArticle(id);
}

function promptAddCustomTag(id) {
  // Show inline prompt with suggestions
  var existingHtml = allCustomTagNames.length > 0
    ? '<div style="display:flex;flex-wrap:wrap;gap:0.25rem;margin-bottom:0.5rem;">' +
      allCustomTagNames.slice(0, 15).map(function(t) {
        return '<span class="custom-tag" onclick="addCustomTag(\'' + id + '\',\'' + t.replace(/'/g, "\\'") + '\')">' + t + '</span>';
      }).join('') + '</div>'
    : '';
  
  var name = prompt('Nouvelle étiquette :');
  if (name) addCustomTag(id, name);
}

function buildCustomTagsHtml(id) {
  var tags = getCustomTags(id);
  var html = '<div class="custom-tags-wrap">';
  tags.forEach(function(tag) {
    html += '<span class="custom-tag">' + tag +
      ' <span class="custom-tag-remove" onclick="event.stopPropagation();removeCustomTag(\'' + id + '\',\'' + tag.replace(/'/g, "\\'") + '\')">&times;</span></span>';
  });
  html += '<button class="custom-tag-add" onclick="promptAddCustomTag(\'' + id + '\')" title="Ajouter une étiquette">+</button>';
  html += '</div>';
  return html;
}

// ===== EPUB EXPORT =====
function generateEPUB() {
  var overlay = document.createElement('div');
  overlay.className = 'stats-overlay';
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
  
  var all = getAllEntries();
  var bkmk = all.filter(function(e) { return bookmarks.indexOf(e.id) >= 0; });
  
  overlay.innerHTML = '<div class="stats-panel" style="max-width:440px;">' +
    '<h3>Exporter en EPUB</h3>' +
    '<div style="margin:1rem 0;">' +
      '<label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;padding:0.5rem;border:1px solid var(--border-light);border-radius:8px;margin-bottom:0.4rem;" onclick="document.getElementById(\'epubScope\').value=\'all\'">' +
        '<input type="radio" name="epubScope" value="all" checked style="accent-color:var(--accent);"> ' +
        '<span style="font-size:0.85rem;">Tous les articles (' + all.length + ')</span></label>' +
      (bkmk.length > 0 ? '<label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;padding:0.5rem;border:1px solid var(--border-light);border-radius:8px;margin-bottom:0.4rem;" onclick="document.getElementById(\'epubScope\').value=\'bookmarks\'">' +
        '<input type="radio" name="epubScope" value="bookmarks" style="accent-color:var(--accent);"> ' +
        '<span style="font-size:0.85rem;">Favoris uniquement (' + bkmk.length + ')</span></label>' : '') +
    '</div>' +
    '<input type="hidden" id="epubScope" value="all">' +
    '<div style="text-align:center;">' +
      '<button class="stats-close" style="background:var(--accent);color:var(--paper);border-color:var(--accent);" ' +
        'onclick="doEpubExport(this)">Générer l\'EPUB</button> ' +
      '<button class="stats-close" onclick="this.closest(\'.stats-overlay\').remove()">Annuler</button>' +
    '</div>' +
    '<div id="epubStatus" style="text-align:center;margin-top:0.75rem;font-size:0.78rem;color:var(--muted);"></div>' +
  '</div>';
  document.body.appendChild(overlay);
}

function doEpubExport(btn) {
  var scope = 'all';
  var radios = document.querySelectorAll('input[name="epubScope"]');
  radios.forEach(function(r) { if (r.checked) scope = r.value; });
  
  var statusEl = document.getElementById('epubStatus');
  btn.disabled = true;
  statusEl.textContent = 'Génération en cours…';
  
  var all = getAllEntries();
  var entries = scope === 'bookmarks' 
    ? all.filter(function(e) { return bookmarks.indexOf(e.id) >= 0; })
    : all;
  
  if (entries.length === 0) {
    statusEl.textContent = 'Aucun article à exporter.';
    btn.disabled = false;
    return;
  }
  
  // Sort alphabetically
  entries.sort(function(a, b) { return a.term.localeCompare(b.term, 'fr'); });
  
  // Build EPUB structure
  var uuid = 'urn:uuid:' + crypto.randomUUID();
  var now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  
  // Container XML
  var container = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">\n' +
    '  <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>\n' +
    '</container>';
  
  // CSS
  var css = 'body { font-family: Georgia, serif; line-height: 1.7; margin: 1em; color: #2c2416; }\n' +
    'h1 { font-size: 1.6em; color: #8b2500; margin-bottom: 0.5em; border-bottom: 1px solid #e8e0d0; padding-bottom: 0.3em; }\n' +
    'h2 { font-size: 1.3em; color: #5a3a1a; margin-top: 1.5em; }\n' +
    'h3 { font-size: 1.1em; color: #5a3a1a; margin-top: 1.2em; }\n' +
    'p { margin: 0.8em 0; text-align: justify; }\n' +
    'blockquote { margin: 1em 0; padding: 0.8em 1em; background: #faf6f0; border-left: 3px solid #d4a843; font-style: italic; }\n' +
    '.category { font-size: 0.85em; color: #8b6914; margin-bottom: 1em; }\n' +
    '.refs { margin-top: 2em; padding-top: 1em; border-top: 1px solid #e8e0d0; font-size: 0.85em; }\n' +
    '.toc-entry { margin: 0.3em 0; }\n' +
    '.toc-entry a { color: #8b2500; text-decoration: none; }\n';
  
  // Build TOC page
  var tocHtml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml">\n<head><title>Table des matières</title>' +
    '<link rel="stylesheet" type="text/css" href="style.css"/></head>\n<body>\n' +
    '<h1>Table des matières</h1>\n';
  
  // Group by letter
  var letterGroups = {};
  entries.forEach(function(e) {
    var l = e.letter || e.term.charAt(0).toUpperCase();
    if (!letterGroups[l]) letterGroups[l] = [];
    letterGroups[l].push(e);
  });
  
  Object.keys(letterGroups).sort().forEach(function(l) {
    tocHtml += '<h2>' + l + '</h2>\n';
    letterGroups[l].forEach(function(e) {
      tocHtml += '<div class="toc-entry"><a href="art_' + e.id.replace(/[^a-zA-Z0-9-]/g,'') + '.xhtml">' + escapeHtml(e.term) + '</a></div>\n';
    });
  });
  tocHtml += '</body></html>';
  
  // Build article pages
  var articleFiles = [];
  entries.forEach(function(e, i) {
    var safeId = e.id.replace(/[^a-zA-Z0-9-]/g,'');
    var fname = 'art_' + safeId + '.xhtml';
    
    // Clean HTML for XHTML compliance
    var body = (e.content || e.definition || '').replace(/<br>/g, '<br/>').replace(/<hr>/g, '<hr/>');
    // Remove onclick handlers
    body = body.replace(/\s*onclick="[^"]*"/g, '');
    // Remove spans with class but keep text
    body = body.replace(/<span class="lettrine">([^<]*)<\/span>/g, '$1');
    body = body.replace(/<span class="auto-link[^"]*">([^<]*)<\/span>/g, '$1');
    body = body.replace(/<a class="auto-link"[^>]*>([^<]*)<\/a>/g, '$1');
    
    // Refs
    var refsHtml = '';
    if (e.refs && e.refs.length > 0) {
      refsHtml = '<div class="refs"><h3>Références</h3><ul>' +
        e.refs.map(function(r) { return '<li>' + r + '</li>'; }).join('') +
        '</ul></div>';
    }
    
    var html = '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml">\n<head>' +
      '<title>' + escapeHtml(e.term) + '</title>' +
      '<link rel="stylesheet" type="text/css" href="style.css"/></head>\n<body>\n' +
      '<h1>' + escapeHtml(e.term) + '</h1>\n' +
      '<div class="category">' + escapeHtml(e.category) + '</div>\n' +
      body + '\n' + refsHtml +
      '</body></html>';
    
    articleFiles.push({ name: fname, content: html, id: safeId, term: e.term });
  });
  
  // OPF manifest
  var opf = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="3.0">\n' +
    '  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">\n' +
    '    <dc:identifier id="BookId">' + uuid + '</dc:identifier>\n' +
    '    <dc:title>Dictionnaire de Philosophie</dc:title>\n' +
    '    <dc:language>fr</dc:language>\n' +
    '    <dc:creator>Wikilivres</dc:creator>\n' +
    '    <meta property="dcterms:modified">' + now + '</meta>\n' +
    '  </metadata>\n' +
    '  <manifest>\n' +
    '    <item id="style" href="style.css" media-type="text/css"/>\n' +
    '    <item id="toc" href="toc.xhtml" media-type="application/xhtml+xml"/>\n' +
    '    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>\n';
  
  articleFiles.forEach(function(f) {
    opf += '    <item id="' + f.id + '" href="' + f.name + '" media-type="application/xhtml+xml"/>\n';
  });
  
  opf += '  </manifest>\n  <spine>\n    <itemref idref="toc"/>\n';
  articleFiles.forEach(function(f) { opf += '    <itemref idref="' + f.id + '"/>\n'; });
  opf += '  </spine>\n</package>';
  
  // NAV document (EPUB 3)
  var nav = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">\n' +
    '<head><title>Navigation</title></head>\n<body>\n' +
    '<nav epub:type="toc" id="toc">\n<h1>Table des matières</h1>\n<ol>\n' +
    '<li><a href="toc.xhtml">Sommaire</a></li>\n';
  articleFiles.forEach(function(f) {
    nav += '<li><a href="' + f.name + '">' + escapeHtml(f.term) + '</a></li>\n';
  });
  nav += '</ol>\n</nav>\n</body></html>';
  
  // Build ZIP (minimal EPUB = ZIP with specific structure)
  // Use JSZip-like manual construction
  try {
    buildEpubZip(container, opf, css, tocHtml, nav, articleFiles, statusEl, btn);
  } catch(err) {
    statusEl.textContent = 'Erreur : ' + err.message;
    btn.disabled = false;
  }
}

async function buildEpubZip(container, opf, css, tocHtml, nav, articleFiles, statusEl, btn) {
  // We need to build a ZIP file manually or use JSZip
  // Try to load JSZip dynamically
  if (typeof JSZip === 'undefined') {
    statusEl.textContent = 'Chargement de JSZip…';
    try {
      await new Promise(function(resolve, reject) {
        var s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
    } catch(e) {
      // Fallback: generate without JSZip (plain HTML)
      statusEl.textContent = 'JSZip indisponible. Export HTML à la place…';
      exportAsHTML(articleFiles, statusEl, btn);
      return;
    }
  }
  
  var zip = new JSZip();
  
  // mimetype must be first and uncompressed
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
  zip.file('META-INF/container.xml', container);
  zip.file('OEBPS/content.opf', opf);
  zip.file('OEBPS/style.css', css);
  zip.file('OEBPS/toc.xhtml', tocHtml);
  zip.file('OEBPS/nav.xhtml', nav);
  
  articleFiles.forEach(function(f) {
    zip.file('OEBPS/' + f.name, f.content);
  });
  
  statusEl.textContent = 'Compression…';
  
  var blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'dictionnaire-philosophie.epub';
  a.click();
  URL.revokeObjectURL(url);
  
  statusEl.textContent = '✓ EPUB téléchargé (' + articleFiles.length + ' articles)';
  btn.disabled = false;
}

function exportAsHTML(articleFiles, statusEl, btn) {
  var html = '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">' +
    '<title>Dictionnaire de Philosophie</title>' +
    '<style>body{font-family:Georgia,serif;max-width:700px;margin:0 auto;padding:2rem;color:#2c2416;line-height:1.7;}' +
    'h1{color:#8b2500;border-bottom:2px solid #d4a843;padding-bottom:0.3em;}' +
    'h2{color:#5a3a1a;margin-top:2em;border-bottom:1px solid #e8e0d0;padding-bottom:0.2em;}' +
    'blockquote{border-left:3px solid #d4a843;padding:0.5em 1em;background:#faf6f0;}</style></head><body>';
  html += '<h1>Dictionnaire de Philosophie</h1>';
  articleFiles.forEach(function(f) {
    html += '<h2 id="' + f.id + '">' + f.term + '</h2>';
    html += f.content.replace(/<\?xml[^?]*\?>/, '').replace(/<(!DOCTYPE|html|head|title|link|body|\/?html|\/?head|\/?body)[^>]*>/gi, '');
  });
  html += '</body></html>';
  
  var blob = new Blob([html], { type: 'text/html' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'dictionnaire-philosophie.html';
  a.click();
  URL.revokeObjectURL(url);
  
  statusEl.textContent = '✓ HTML téléchargé (EPUB indisponible hors ligne)';
  btn.disabled = false;
}

// ===== CHECK FOR WIKI UPDATES =====
var updateCheckRunning = false;
var pendingUpdatesCount = parseInt(lsGet("philo-pending-updates", "0")) || 0;

async function silentUpdateCheck() {
  if (updateCheckRunning) return;
  if (userEntries.length === 0) return;
  
  // Only check once per 24h
  var lastCheck = lsGet('philo-last-update-check', '');
  if (lastCheck) {
    var elapsed = Date.now() - new Date(lastCheck).getTime();
    if (elapsed < 24 * 3600 * 1000) return;
  }
  
  updateCheckRunning = true;
  console.log('[UpdateCheck] Starting silent check...');
  
  var wikiEntries = userEntries.filter(function(e) {
    return e._userEntry && (e._wikiTitle || e._wikiSource);
  });
  if (wikiEntries.length === 0) { updateCheckRunning = false; return; }
  
  var titleMap = {};
  wikiEntries.forEach(function(e) {
    titleMap[e._wikiTitle || ('Dictionnaire de philosophie/' + e.term)] = e;
  });
  
  var titles = Object.keys(titleMap);
  var outdatedCount = 0;
  var batchSize = 50;
  
  try {
    for (var b = 0; b < titles.length; b += batchSize) {
      var batch = titles.slice(b, b + batchSize);
      var data = await jsonp(
        'https://fr.wikibooks.org/w/api.php?action=query'
        + '&titles=' + encodeURIComponent(batch.join('|'))
        + '&prop=revisions&rvprop=ids'
        + '&format=json&formatversion=2'
      );
      
      if (data.query && data.query.pages) {
        data.query.pages.forEach(function(page) {
          if (page.missing || !page.revisions || !page.revisions[0]) return;
          var rev = page.revisions[0];
          var entry = titleMap[page.title];
          if (!entry) {
            Object.keys(titleMap).forEach(function(k) {
              if (k.toLowerCase() === page.title.toLowerCase()) entry = titleMap[k];
            });
          }
          if (!entry) return;
          if (entry._wikiRevId && rev.revid && rev.revid !== entry._wikiRevId) {
            outdatedCount++;
          } else if (!entry._wikiRevId) {
            var age = entry._importDate ? (Date.now() - new Date(entry._importDate).getTime()) : Infinity;
            if (age > 30 * 86400000) outdatedCount++;
          }
        });
      }
      await new Promise(function(r) { setTimeout(r, 100); });
    }
  } catch(e) {
    console.log('[UpdateCheck] Error:', e.message);
  }
  
  // Store result
  pendingUpdatesCount = outdatedCount;
  PhiloDB.set('philo-pending-updates', String(outdatedCount));
  try { localStorage.setItem('philo-pending-updates', String(outdatedCount)); } catch(e) {}
  PhiloDB.set('philo-last-update-check', new Date().toISOString());
  try { localStorage.setItem('philo-last-update-check', new Date().toISOString()); } catch(e) {}
  
  updateCheckRunning = false;
  console.log('[UpdateCheck] Done. ' + outdatedCount + ' updates available.');
  
  // Refresh welcome page if currently shown
  if (!currentArticle && outdatedCount > 0) {
    showWelcome();
  }
  
  // Android notification
  if (outdatedCount > 0) {
    sendUpdateNotification(outdatedCount);
  }
}

function sendUpdateNotification(count) {
  // Browser Notification API
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Dictionnaire de Philosophie', {
      body: count + ' article' + (count > 1 ? 's ont' : ' a') + ' été mis à jour sur Wikilivres.',
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">φ</text></svg>',
      tag: 'philo-updates'
    });
  } else if ('Notification' in window && Notification.permission !== 'denied') {
    // Request permission for next time
    Notification.requestPermission();
  }
  
  // Capacitor Local Notifications (Android)
  if (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform && Capacitor.isNativePlatform()) {
    try {
      if (Capacitor.Plugins && Capacitor.Plugins.LocalNotifications) {
        Capacitor.Plugins.LocalNotifications.schedule({
          notifications: [{
            title: 'Mises à jour disponibles',
            body: count + ' article' + (count > 1 ? 's ont' : ' a') + ' été modifié' + (count > 1 ? 's' : '') + ' sur Wikilivres.',
            id: 1001,
            schedule: { at: new Date(Date.now() + 1000) },
            sound: null,
            smallIcon: 'ic_launcher',
            actionTypeId: 'OPEN_APP'
          }]
        });
      }
    } catch(e) { console.log('[Widget] Notification error:', e); }
  }
}

async function checkForUpdates() {
  if (updateCheckRunning) return;
  updateCheckRunning = true;
  
  var overlay = document.createElement('div');
  overlay.className = 'stats-overlay';
  overlay.id = 'updateOverlay';
  overlay.onclick = function(e) { if (e.target === overlay && !updateCheckRunning) overlay.remove(); };
  overlay.innerHTML = '<div class="stats-panel" style="max-width:460px;">' +
    '<h3>Vérification des mises à jour</h3>' +
    '<div id="updateStatus" style="text-align:center;padding:1rem 0;font-size:0.85rem;color:var(--muted);">⏳ Analyse des articles importés…</div>' +
    '<div class="reading-progress-bar" style="margin:0.5rem 0 1rem;"><div class="reading-progress-fill" id="updateProgressFill" style="width:0%;transition:width 0.2s;"></div></div>' +
    '<div id="updateResults"></div>' +
    '<div style="text-align:center;" id="updateActions"></div>' +
  '</div>';
  document.body.appendChild(overlay);
  
  var statusEl = document.getElementById('updateStatus');
  var fillEl = document.getElementById('updateProgressFill');
  var resultsEl = document.getElementById('updateResults');
  var actionsEl = document.getElementById('updateActions');
  
  // Collect wiki-sourced entries with their titles
  var wikiEntries = userEntries.filter(function(e) {
    return e._userEntry && (e._wikiTitle || e._wikiSource);
  });
  
  if (wikiEntries.length === 0) {
    statusEl.textContent = 'Aucun article importé depuis Wikilivres.';
    actionsEl.innerHTML = '<button class="stats-close" onclick="this.closest(\'.stats-overlay\').remove()">Fermer</button>';
    updateCheckRunning = false;
    return;
  }
  
  // Build title map: wikiTitle → entry
  // For entries without _wikiTitle, reconstruct it
  var titleMap = {};
  wikiEntries.forEach(function(e) {
    var title = e._wikiTitle || ('Dictionnaire de philosophie/' + e.term);
    titleMap[title] = e;
  });
  
  var titles = Object.keys(titleMap);
  var outdated = [];
  var checked = 0;
  var batchSize = 50;
  
  // Query API in batches of 50 (titles only, no content — fast)
  for (var b = 0; b < titles.length; b += batchSize) {
    var batch = titles.slice(b, b + batchSize);
    var pct = Math.round(((b + batch.length) / titles.length) * 100);
    statusEl.textContent = 'Vérification… ' + Math.min(b + batchSize, titles.length) + '/' + titles.length;
    fillEl.style.width = pct + '%';
    
    try {
      var data = await jsonp(
        'https://fr.wikibooks.org/w/api.php?action=query'
        + '&titles=' + encodeURIComponent(batch.join('|'))
        + '&prop=revisions&rvprop=ids|timestamp'
        + '&format=json&formatversion=2'
      );
      
      if (data.query && data.query.pages) {
        data.query.pages.forEach(function(page) {
          if (page.missing || !page.revisions || page.revisions.length === 0) return;
          var rev = page.revisions[0];
          var entry = titleMap[page.title];
          if (!entry) {
            // Try normalized title matching
            Object.keys(titleMap).forEach(function(k) {
              if (k.toLowerCase() === page.title.toLowerCase()) entry = titleMap[k];
            });
          }
          if (!entry) return;
          checked++;
          
          // Compare revision IDs
          if (entry._wikiRevId && rev.revid && rev.revid !== entry._wikiRevId) {
            outdated.push({
              entry: entry,
              title: page.title,
              oldRevId: entry._wikiRevId,
              newRevId: rev.revid,
              newTimestamp: rev.timestamp
            });
          } else if (!entry._wikiRevId) {
            // No stored revId → might be outdated, flag if imported long ago
            var importAge = entry._importDate ? (Date.now() - new Date(entry._importDate).getTime()) : Infinity;
            if (importAge > 30 * 86400000) { // > 30 days
              outdated.push({
                entry: entry,
                title: page.title,
                oldRevId: null,
                newRevId: rev.revid,
                newTimestamp: rev.timestamp,
                uncertain: true
              });
            }
          }
        });
      }
    } catch (e) {
      console.log('Update check batch failed:', e.message);
    }
    
    await new Promise(function(r) { setTimeout(r, 100); });
  }
  
  fillEl.style.width = '100%';
  updateCheckRunning = false;
  
  if (outdated.length === 0) {
    statusEl.innerHTML = '✓ Tous les articles sont à jour (' + checked + ' vérifiés)';
    pendingUpdatesCount = 0;
    PhiloDB.set('philo-pending-updates', '0');
    try { localStorage.setItem('philo-pending-updates', '0'); } catch(e) {}
    actionsEl.innerHTML = '<button class="stats-close" onclick="this.closest(\'.stats-overlay\').remove()">Fermer</button>';
    // Store check date
    PhiloDB.set('philo-last-update-check', new Date().toISOString());
    try { localStorage.setItem('philo-last-update-check', new Date().toISOString()); } catch(e) {}
    return;
  }
  
  // Show outdated articles
  var certain = outdated.filter(function(o) { return !o.uncertain; });
  var uncertain = outdated.filter(function(o) { return o.uncertain; });
  
  statusEl.innerHTML = '<strong>' + certain.length + ' article' + (certain.length > 1 ? 's' : '') + 
    ' modifié' + (certain.length > 1 ? 's' : '') + ' sur Wikilivres</strong>' +
    (uncertain.length > 0 ? '<br><span style="font-size:0.75rem;color:var(--muted-light);">+ ' + uncertain.length + ' sans version connue (importés il y a plus de 30 jours)</span>' : '');
  
  resultsEl.innerHTML = '<div style="max-height:200px;overflow-y:auto;margin:0.75rem 0;">' +
    outdated.map(function(o) {
      var dateStr = o.newTimestamp ? new Date(o.newTimestamp).toLocaleDateString('fr-FR') : '?';
      return '<div style="display:flex;align-items:center;gap:0.5rem;padding:0.35rem 0.5rem;border-bottom:1px solid var(--border-light);">' +
        '<input type="checkbox" checked data-update-id="' + o.entry.id + '" data-update-title="' + o.title + '" style="accent-color:var(--accent);">' +
        '<span style="flex:1;font-size:0.82rem;color:var(--ink);">' + o.entry.term + '</span>' +
        '<span style="font-family:var(--mono);font-size:0.45rem;color:var(--muted-light);">' + dateStr + '</span>' +
        (o.uncertain ? '<span style="font-family:var(--mono);font-size:0.4rem;color:var(--gold);">?</span>' : '') +
      '</div>';
    }).join('') + '</div>';
  
  actionsEl.innerHTML = '<button class="stats-close" style="background:var(--accent);color:var(--paper);border-color:var(--accent);margin-right:0.5rem;" ' +
    'onclick="updateSelectedArticles()">Mettre à jour (' + outdated.length + ')</button>' +
    '<button class="stats-close" onclick="this.closest(\'.stats-overlay\').remove()">Annuler</button>';
}

async function updateSelectedArticles() {
  var checkboxes = document.querySelectorAll('[data-update-id]:checked');
  if (checkboxes.length === 0) return;
  
  var statusEl = document.getElementById('updateStatus');
  var fillEl = document.getElementById('updateProgressFill');
  var resultsEl = document.getElementById('updateResults');
  var actionsEl = document.getElementById('updateActions');
  
  actionsEl.innerHTML = '';
  fillEl.style.width = '0%';
  
  var toUpdate = [];
  checkboxes.forEach(function(cb) {
    toUpdate.push({ id: cb.getAttribute('data-update-id'), title: cb.getAttribute('data-update-title') });
  });
  
  var updated = 0;
  var failed = 0;
  
  for (var i = 0; i < toUpdate.length; i++) {
    var item = toUpdate[i];
    var pct = Math.round(((i + 1) / toUpdate.length) * 100);
    statusEl.textContent = 'Mise à jour ' + (i + 1) + '/' + toUpdate.length + '…';
    fillEl.style.width = pct + '%';
    
    try {
      var data = await jsonp(
        'https://fr.wikibooks.org/w/api.php?action=query'
        + '&titles=' + encodeURIComponent(item.title)
        + '&prop=revisions&rvprop=content|ids|timestamp&rvslots=main'
        + '&format=json&formatversion=2'
      );
      
      var page = data.query && data.query.pages && data.query.pages[0];
      if (page && !page.missing && page.revisions && page.revisions.length > 0) {
        var rev = page.revisions[0];
        var wikitext = cleanWikitext(rev.slots && rev.slots.main && rev.slots.main.content || '');
        if (wikitext.length > 50) {
          var parsed = parseMediaWiki(wikitext);
          var defMatch = parsed.html.match(/<p>([\s\S]*?)<\/p>/);
          var definition = defMatch ? defMatch[1].replace(/<[^>]+>/g, '').substring(0, 300) : '';
          
          // Find and update the entry
          var entryIdx = userEntries.findIndex(function(e) { return e.id === item.id; });
          if (entryIdx >= 0) {
            userEntries[entryIdx].content = parsed.html;
            userEntries[entryIdx].definition = definition;
            userEntries[entryIdx].refs = parsed.refs;
            userEntries[entryIdx].tags = guessTags(wikitext).split(', ').filter(Boolean);
            userEntries[entryIdx].category = guessCategory(wikitext, userEntries[entryIdx].term);
            userEntries[entryIdx]._wikiSource = wikitext;
            userEntries[entryIdx]._wikiRevId = rev.revid || null;
            userEntries[entryIdx]._wikiTimestamp = rev.timestamp || null;
            userEntries[entryIdx]._wikiTitle = item.title;
            userEntries[entryIdx]._importDate = new Date().toISOString();
            updated++;
          }
        }
      }
    } catch (e) {
      failed++;
    }
    
    await new Promise(function(r) { setTimeout(r, 150); });
  }
  
  // Save
  saveUserEntries();
  PhiloDB.set('philo-last-update-check', new Date().toISOString());
  try { localStorage.setItem('philo-last-update-check', new Date().toISOString()); } catch(e) {}
  
  fillEl.style.width = '100%';
  pendingUpdatesCount = 0;
  PhiloDB.set('philo-pending-updates', '0');
  try { localStorage.setItem('philo-pending-updates', '0'); } catch(e) {}
  statusEl.innerHTML = '✓ ' + updated + ' article' + (updated > 1 ? 's' : '') + ' mis à jour' +
    (failed > 0 ? ' (' + failed + ' échec' + (failed > 1 ? 's' : '') + ')' : '');
  resultsEl.innerHTML = '';
  actionsEl.innerHTML = '<button class="stats-close" onclick="this.closest(\'.stats-overlay\').remove();showWelcome();">Fermer</button>';
}

// ===== START =====
init();
