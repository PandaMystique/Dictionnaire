// lastTapTarget is now in state.js

function handleDoubleTap(e) {
  if (!isMobile() || !currentArticle) return;
  var target = e.target.closest('.article-body p, .article-body blockquote');
  if (!target) return;
  
  var now = Date.now();
  if (now - lastTapTime < 350 && lastTapTarget === target) {
    // Double tap detected
    e.preventDefault();
    target.classList.toggle('para-zoomed');
    lastTapTime = 0;
    lastTapTarget = null;
  } else {
    lastTapTime = now;
    lastTapTarget = target;
  }
}

// ===== PARCOURS GUIDÉS =====
// parcoursDefinitions data is in data.js
var activeParcoursId = Data.getActiveParcours();

function getParcoursArticles(parcours) {
  var all = getAllEntries();
  var found = [];
  var kws = parcours.keywords.map(function(k) { return k.toLowerCase(); });
  all.forEach(function(e) {
    var term = e.term.toLowerCase();
    var cats = e.category.toLowerCase();
    var tags = e.tags.map(function(t) { return t.toLowerCase(); });
    var def = (e.definition || '').toLowerCase();
    var score = 0;
    kws.forEach(function(k) {
      if (term.includes(k)) score += 5;
      if (tags.some(function(t) { return t.includes(k); })) score += 3;
      if (cats.includes(k)) score += 2;
      if (def.includes(k)) score += 1;
    });
    if (score > 0) found.push({ entry: e, score: score });
  });
  found.sort(function(a, b) { return b.score - a.score; });
  return found.slice(0, 12).map(function(f) { return f.entry; });
}

function buildParcoursCards() {
  var all = getAllEntries();
  if (all.length < 10) return '';
  var html = '<div style="margin-top:1.75rem;">' +
    '<div style="font-family:var(--mono);font-size:0.5rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--muted-light);margin-bottom:0.5rem;text-align:center;">Parcours thématiques</div>';
  
  parcoursDefinitions.forEach(function(p) {
    var articles = getParcoursArticles(p);
    if (articles.length < 3) return;
    var prog = parcoursProgress[p.id] || [];
    var done = prog.filter(function(id) { return articles.some(function(a) { return a.id === id; }); }).length;
    var pct = Math.round(done / articles.length * 100);
    html += '<button class="parcours-card" onclick="startParcours(\'' + p.id + '\')">' +
      '<div class="parcours-icon">' + p.icon + '</div>' +
      '<div class="parcours-info"><div class="parcours-title">' + p.title + '</div>' +
      '<div class="parcours-meta">' + articles.length + ' articles · ' + p.desc + '</div></div>' +
      '<div class="parcours-progress">' + (done > 0 ? pct + '%' : '→') + '</div></button>';
  });
  html += '</div>';
  return html;
}

function startParcours(id) {
  var parcours = parcoursDefinitions.find(function(p) { return p.id === id; });
  if (!parcours) return;
  activeParcoursId = id;
  Data.saveActiveParcours(id);
  var articles = getParcoursArticles(parcours);
  if (articles.length === 0) return;
  // Find first unread in this parcours
  var prog = parcoursProgress[id] || [];
  var next = articles.find(function(a) { return prog.indexOf(a.id) < 0; });
  navigateTo((next || articles[0]).id);
}

function getParcoursForArticle(id) {
  if (!activeParcoursId) return null;
  var parcours = parcoursDefinitions.find(function(p) { return p.id === activeParcoursId; });
  if (!parcours) return null;
  var articles = getParcoursArticles(parcours);
  var idx = articles.findIndex(function(a) { return a.id === id; });
  if (idx < 0) return null;
  return { parcours: parcours, articles: articles, index: idx };
}

function buildParcoursBanner(id) {
  var info = getParcoursForArticle(id);
  if (!info) return '';
  var prog = parcoursProgress[info.parcours.id] || [];
  // Mark current as done
  if (prog.indexOf(id) < 0) {
    prog.push(id);
    parcoursProgress[info.parcours.id] = prog;
    Data.saveParcoursProgress();
  }
  var dots = info.articles.map(function(a, i) {
    var cls = 'parcours-banner-dot';
    if (a.id === id) cls += ' current';
    else if (prog.indexOf(a.id) >= 0) cls += ' done';
    return '<div class="' + cls + '"></div>';
  }).join('');
  var nextIdx = info.index + 1;
  var nextBtn = nextIdx < info.articles.length
    ? '<span class="parcours-banner-next" onclick="navigateTo(\'' + info.articles[nextIdx].id + '\')">Suivant →</span>'
    : '<span class="parcours-banner-next" onclick="activeParcoursId=\'\';Data.saveActiveParcours(\'\');showWelcome();">\u2713 Termin\u00e9</span>';
  return '<div class="parcours-banner">' +
    '<span>' + info.parcours.icon + ' ' + info.parcours.title + ' · ' + (info.index + 1) + '/' + info.articles.length + '</span>' +
    '<div class="parcours-banner-dots">' + dots + '</div>' +
    nextBtn + '</div>';
}

// ===== NOTES SEARCH =====
function showNotesSearch() {
  var overlay = document.createElement('div');
  overlay.className = 'stats-overlay';
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
  overlay.innerHTML = '<div class="stats-panel" style="max-width:460px;">' +
    '<h3>Recherche dans les notes</h3>' +
    '<input type="text" id="notesSearchInput" placeholder="Mot-clé…" ' +
    'style="width:100%;padding:0.5rem 0.75rem;border:1px solid var(--border);border-radius:8px;' +
    'background:var(--paper-warm);font-size:0.88rem;color:var(--ink);font-family:var(--body);' +
    'box-sizing:border-box;outline:none;" oninput="filterNotes(this.value)">' +
    '<div id="notesSearchResults" class="notes-search-results"></div>' +
    '<div style="text-align:center;"><button class="stats-close" onclick="this.closest(\'.stats-overlay\').remove()">Fermer</button></div>' +
  '</div>';
  document.body.appendChild(overlay);
  setTimeout(function() { document.getElementById('notesSearchInput').focus(); }, 100);
  filterNotes('');
}

function filterNotes(query) {
  var results = document.getElementById('notesSearchResults');
  if (!results) return;
  var q = query.toLowerCase().trim();
  var all = getAllEntries();
  var matches = [];
  
  Object.keys(articleNotes).forEach(function(id) {
    var note = articleNotes[id];
    if (!note || !note.trim()) return;
    var entry = all.find(function(e) { return e.id === id; });
    if (!entry) return;
    if (q && note.toLowerCase().indexOf(q) < 0 && entry.term.toLowerCase().indexOf(q) < 0) return;
    matches.push({ entry: entry, note: note });
  });
  
  if (matches.length === 0) {
    results.innerHTML = '<div style="text-align:center;padding:1rem;color:var(--muted-light);font-size:0.8rem;">' +
      (q ? 'Aucun résultat pour « ' + q + ' »' : 'Aucune note enregistrée') + '</div>';
    return;
  }
  
  results.innerHTML = matches.map(function(m) {
    var excerpt = m.note.length > 120 ? m.note.slice(0, 120) + '…' : m.note;
    if (q) {
      var re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
      excerpt = excerpt.replace(re, '<mark>$1</mark>');
    }
    return '<div class="notes-result" onclick="this.closest(\'.stats-overlay\').remove();navigateTo(\'' + m.entry.id + '\')">' +
      '<div class="notes-result-term">' + m.entry.term + '</div>' +
      '<div class="notes-result-excerpt">' + excerpt + '</div></div>';
  }).join('');
}

// ===== ONBOARDING =====
function showOnboarding() {
  if (Data.isOnboarded()) return;
  var overlay = document.createElement('div');
  overlay.className = 'onboarding-overlay';
  overlay.id = 'onboardingOverlay';
  overlay.innerHTML = '<div class="onboarding-panel">' +
    '<div class="onboarding-slide active" data-slide="0">' +
      '<div class="onboarding-icon">φ</div>' +
      '<div class="onboarding-title">Bienvenue dans le<br>Dictionnaire de Philosophie</div>' +
      '<div class="onboarding-text">Explorez plus de 140 articles sur les grands concepts de la pensée occidentale, de l\'Antiquité à nos jours.</div>' +
      '<div class="onboarding-dots"><div class="onboarding-dot active"></div><div class="onboarding-dot"></div><div class="onboarding-dot"></div></div>' +
      '<button class="onboarding-btn" onclick="nextOnboardingSlide(1)">Suivant</button>' +
      '<button class="onboarding-skip" onclick="closeOnboarding()">Passer</button>' +
    '</div>' +
    '<div class="onboarding-slide" data-slide="1">' +
      '<div class="onboarding-icon">📚</div>' +
      '<div class="onboarding-title">Importez les articles</div>' +
      '<div class="onboarding-text">Cliquez sur « Importer depuis Wikilivres » pour télécharger le dictionnaire complet. Tout est stocké localement, aucun compte nécessaire.</div>' +
      '<div class="onboarding-dots"><div class="onboarding-dot"></div><div class="onboarding-dot active"></div><div class="onboarding-dot"></div></div>' +
      '<button class="onboarding-btn" onclick="nextOnboardingSlide(2)">Suivant</button>' +
      '<button class="onboarding-skip" onclick="closeOnboarding()">Passer</button>' +
    '</div>' +
    '<div class="onboarding-slide" data-slide="2">' +
      '<div class="onboarding-icon">⚙️</div>' +
      '<div class="onboarding-title">Personnalisez votre lecture</div>' +
      '<div class="onboarding-text">Thème sombre ou sépia, choix de police, taille du texte, lettrine… Accédez aux paramètres via l\'icône engrenage en haut à droite.</div>' +
      '<div class="onboarding-dots"><div class="onboarding-dot"></div><div class="onboarding-dot"></div><div class="onboarding-dot active"></div></div>' +
      '<button class="onboarding-btn" onclick="closeOnboarding()">Commencer</button>' +
    '</div>' +
  '</div>';
  document.body.appendChild(overlay);
}

function nextOnboardingSlide(n) {
  document.querySelectorAll('.onboarding-slide').forEach(function(s) { s.classList.remove('active'); });
  var slide = document.querySelector('[data-slide="' + n + '"]');
  if (slide) slide.classList.add('active');
}

function closeOnboarding() {
  var overlay = document.getElementById('onboardingOverlay');
  if (overlay) overlay.remove();
  Data.setOnboarded();
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
