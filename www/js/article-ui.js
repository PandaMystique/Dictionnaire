
// ===== MOBILE BACK =====
function mobileBack() {
  if (navHistory.length > 0) {
    // Go back to previous article
    var prevId = navHistory.pop();
    showArticle(prevId);
  } else {
    // Go to welcome screen
    mobileViewingArticle = false;
    document.getElementById('mobileArticleBar').style.display = 'none';
    document.getElementById('mobileReadingProgress').style.display = 'none';
    document.getElementById('mobileFab').classList.remove('hidden');
    document.querySelector('.mobile-tab-bar').classList.remove('reading');
    showWelcome();
  }
}

// ===== FEATURE: ARTICLE OF THE DAY =====
function getArticleOfDay() {
  var all = getAllEntries();
  if (all.length === 0) return null;
  // Deterministic: seed from date
  var d = new Date();
  var seed = d.getFullYear() * 10000 + (d.getMonth()+1) * 100 + d.getDate();
  var idx = seed % all.length;
  return all[idx];
}

// ===== FEATURE: FOCUS MODE =====
function toggleFocusMode() {
  focusMode = !focusMode;
  document.body.classList.toggle('focus-mode', focusMode);
  var btn = document.getElementById('focusToggle');
  if (btn) btn.title = focusMode ? 'Quitter le mode lecture' : 'Mode lecture';
  var strip = document.getElementById('mobileAlphaStrip');
  if (strip) strip.style.display = focusMode ? 'none' : '';
  updateRtbFocus();
}

// ===== FEATURE: RANDOM ARTICLE =====
function showRandomArticle() {
  var all = getAllEntries();
  var unread = all.filter(function(e) { return !readArticles.has(e.id); });
  var pool = unread.length > 0 ? unread : all;
  var pick = pool[Math.floor(Math.random() * pool.length)];
  if (pick) navigateTo(pick.id);
}

// ===== FEATURE: NOTES =====
function getNote(id) { return Data.getNote(id); }
function saveNote(id, text) { Data.saveNote(id, text); }

// ===== FEATURE: FICHE EXPRESS =====
function buildFicheExpress(entry) {
  var def = entry.definition.replace(/<[^>]+>/g, '');
  var body = entry.content.replace(/<[^>]+>/g, '');
  // Extract key sentences
  var sentences = body.split(/[.!?]+/).filter(function(s) { return s.trim().length > 30; });
  var keyPoints = [];
  // First sentence is often key
  if (sentences[0]) keyPoints.push(sentences[0].trim() + '.');
  // Find sentences with key markers
  var markers = ['est ', 'signifie', 'désigne', 'implique', 'suppose', 'selon ', 'pour ', 'consiste', 'se définit', 'renvoie'];
  for (var i = 1; i < sentences.length && keyPoints.length < 5; i++) {
    var s = sentences[i].trim();
    for (var m = 0; m < markers.length; m++) {
      if (s.toLowerCase().indexOf(markers[m]) >= 0 && keyPoints.indexOf(s + '.') < 0) {
        keyPoints.push(s + '.');
        break;
      }
    }
  }
  // Fill if needed
  for (var i = 1; i < sentences.length && keyPoints.length < 4; i++) {
    var s = sentences[i].trim() + '.';
    if (keyPoints.indexOf(s) < 0) keyPoints.push(s);
  }
  if (keyPoints.length === 0) keyPoints.push(def);
  var html = '<div class="fiche-express"><h4>Fiche de r\u00e9vision</h4><ul>';
  keyPoints.forEach(function(p) { html += '<li>' + p + '</li>'; });
  html += '</ul>';
  // Related terms
  var related = (entry.related || []).slice(0, 5);
  var auto = detectRelated(entry).slice(0, 5);
  auto.forEach(function(r) { if (related.indexOf(r) < 0) related.push(r); });
  if (related.length > 0) {
    var all = getAllEntries();
    html += '<div style="margin-top:0.75rem;font-family:var(--mono);font-size:0.5rem;letter-spacing:0.08em;text-transform:uppercase;color:var(--muted-light);margin-bottom:0.35rem;">\u00c0 relier</div>';
    html += '<div class="article-tags">';
    related.slice(0,6).forEach(function(rid) {
      var re = all.find(function(a) { return a.id === rid; });
      if (re) html += '<span class="article-tag" onclick="navigateTo(\'' + re.id + '\')">' + re.term + '</span>';
    });
    html += '</div>';
  }
  html += '</div>';
  return html;
}

function toggleFiche() {
  var art = document.querySelector('.article');
  if (!art) return;
  art.classList.toggle('fiche-mode');
  var btn = document.querySelector('.fiche-toggle');
  if (btn) btn.classList.toggle('active');
}

// ===== FEATURE: SHARE =====
function shareArticle() {
  if (!currentArticle) return;
  var text = currentArticle.term + ' \u2014 ' + currentArticle.definition.replace(/<[^>]+>/g, '').slice(0, 200);
  if (navigator.share) {
    navigator.share({ title: currentArticle.term, text: text }).catch(function(e) {});
  } else {
    // Copy to clipboard
    var ta = document.createElement('textarea');
    ta.value = currentArticle.term + '\n\n' + currentArticle.definition.replace(/<[^>]+>/g, '') + '\n\n' + currentArticle.content.replace(/<[^>]+>/g, '').slice(0, 500) + '...';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch(e) {}
    document.body.removeChild(ta);
    // Visual feedback
    var btn = document.querySelector('.share-btn');
    if (btn) { var orig = btn.innerHTML; btn.innerHTML = '\u2713 Copi\u00e9'; setTimeout(function() { btn.innerHTML = orig; }, 1500); }
  }
}

// ===== FEATURE: STATS =====
function showStats() {
  var all = getAllEntries();
  var readCount = 0;
  all.forEach(function(e) { if (readArticles.has(e.id)) readCount++; });
  var pct = all.length > 0 ? Math.round(readCount / all.length * 100) : 0;

  // Category breakdown
  var catCounts = {};
  var catRead = {};
  all.forEach(function(e) {
    var cats = e.category.split(' \u00b7 ');
    cats.forEach(function(c) {
      catCounts[c] = (catCounts[c] || 0) + 1;
      if (readArticles.has(e.id)) catRead[c] = (catRead[c] || 0) + 1;
    });
  });
  var sortedCats = Object.keys(catCounts).sort(function(a,b) { return catCounts[b] - catCounts[a]; });

  // Estimated total reading time
  var totalWords = 0;
  all.forEach(function(e) {
    if (readArticles.has(e.id)) {
      totalWords += e.content.replace(/<[^>]+>/g, '').split(/\s+/).length;
    }
  });
  var totalMins = Math.round(totalWords / 200);
  var totalTimeStr = totalMins < 60 ? totalMins + ' min' : Math.floor(totalMins/60) + 'h' + (totalMins%60 > 0 ? (totalMins%60) + 'min' : '');

  // Notes count
  var notesCount = Object.keys(articleNotes).length;

  // Quality metrics
  var withBiblio = 0, withNotes = 0;
  all.forEach(function(e) {
    var ws = e._wikiSource || '';
    if (/^=+\s*bibliographie\s*=+/im.test(ws)) withBiblio++;
    if (/<ref>/i.test(ws) || (e.refs && e.refs.length > 0)) withNotes++;
  });
  var noBiblio = all.length - withBiblio;
  var noNotes = all.length - withNotes;

  var barsHtml = '';
  sortedCats.slice(0, 10).forEach(function(c) {
    var total = catCounts[c];
    var read = catRead[c] || 0;
    var w = total > 0 ? Math.round(read / total * 100) : 0;
    barsHtml += '<div class="stats-bar-row">' +
      '<div class="stats-bar-label">' + c + '</div>' +
      '<div class="stats-bar"><div class="stats-bar-fill" style="width:' + w + '%"></div></div>' +
      '<div class="stats-bar-val">' + read + '/' + total + '</div></div>';
  });

  var overlay = document.createElement('div');
  overlay.className = 'stats-overlay';
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
  overlay.innerHTML = '<div class="stats-panel">' +
    '<h3>Statistiques de lecture</h3>' +
    '<div class="stats-grid">' +
      '<div class="stats-card"><div class="stats-card-num">' + readCount + '/' + all.length + '</div><div class="stats-card-label">Articles lus</div></div>' +
      '<div class="stats-card"><div class="stats-card-num">' + pct + '%</div><div class="stats-card-label">Progression</div></div>' +
      '<div class="stats-card"><div class="stats-card-num">' + totalTimeStr + '</div><div class="stats-card-label">Temps estim\u00e9</div></div>' +
    '</div>' +
    '<div class="reading-progress-bar" style="margin-bottom:1.5rem;height:10px;"><div class="reading-progress-fill" style="width:' + pct + '%"></div></div>' +
    '<div style="font-family:var(--mono);font-size:0.55rem;letter-spacing:0.08em;text-transform:uppercase;color:var(--muted-light);margin-bottom:0.6rem;">Progression par domaine</div>' +
    barsHtml +
    '<div class="stats-grid" style="margin-top:1.5rem;">' +
      '<div class="stats-card"><div class="stats-card-num">' + notesCount + '</div><div class="stats-card-label">Notes</div></div>' +
      '<div class="stats-card"><div class="stats-card-num">' + bookmarks.length + '</div><div class="stats-card-label">Favoris</div></div>' +
      '<div class="stats-card"><div class="stats-card-num">' + userEntries.length + '</div><div class="stats-card-label">Perso.</div></div>' +
    '</div>' +
    '<div style="font-family:var(--mono);font-size:0.55rem;letter-spacing:0.08em;text-transform:uppercase;color:var(--muted-light);margin:1.2rem 0 0.5rem;">Qualité des sources</div>' +
    '<div style="display:flex;gap:0.5rem;">' +
      '<div style="flex:1;padding:0.5rem;border:1px dashed var(--border-light);border-radius:6px;text-align:center;">' +
        '<div style="font-size:0.75rem;font-weight:600;color:' + (noBiblio > 0 ? 'var(--muted)' : 'var(--accent)') + ';">' + (all.length - noBiblio) + '/' + all.length + '</div>' +
        '<div style="font-family:var(--mono);font-size:0.4rem;text-transform:uppercase;letter-spacing:0.06em;color:var(--muted-light);margin-top:0.15rem;">Avec bibliographie</div>' +
      '</div>' +
      '<div style="flex:1;padding:0.5rem;border:1px dashed var(--border-light);border-radius:6px;text-align:center;">' +
        '<div style="font-size:0.75rem;font-weight:600;color:' + (noNotes > 0 ? 'var(--muted)' : 'var(--accent)') + ';">' + (all.length - noNotes) + '/' + all.length + '</div>' +
        '<div style="font-family:var(--mono);font-size:0.4rem;text-transform:uppercase;letter-spacing:0.06em;color:var(--muted-light);margin-top:0.15rem;">Avec notes / références</div>' +
      '</div>' +
    '</div>' +
    '<div style="text-align:center;"><button class="stats-close" onclick="this.closest(\'.stats-overlay\').remove()">Fermer</button></div>' +
  '</div>';
  document.body.appendChild(overlay);
}

// ===== FEATURE: SORT =====
function setSortMode(mode) {
  Data.setPref('sortMode', mode);
  renderEntryList();
}

// ===== FEATURE: VISITED LINKS =====
function markVisitedLinks() {
  document.querySelectorAll('.auto-link').forEach(function(a) {
    var onclick = a.getAttribute('onclick') || '';
    var m = onclick.match(/navigateTo\('([^']+)'\)/);
    if (m && readArticles.has(m[1])) a.classList.add('visited');
  });
}

// ===== FEATURE: MOBILE ALPHA STRIP =====
function buildMobileAlphaStrip() {
  var strip = document.getElementById('mobileAlphaStrip');
  if (!strip) return;
  var used = new Set(getAllEntries().map(function(e) { return e.letter; }));
  var letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  var html = '';
  letters.forEach(function(l) {
    if (used.has(l)) {
      html += '<a data-letter="' + l + '">' + l + '</a>';
    }
  });
  // Attach sliding touch handler
  initAlphaSlider(strip);
  strip.innerHTML = html;
}

function mobileJumpToLetter(letter) {
  if (mobileViewingArticle) return;
  switchTab('index');
  setTimeout(function() {
    drawerFilterLetter(letter);
  }, 300);
}

// ===== FEATURE: COLLECTIONS =====
function saveCollections() {
  Data.saveCollections();
}

function addToCollection(colName, articleId) {
  if (!collections[colName]) collections[colName] = [];
  if (collections[colName].indexOf(articleId) < 0) {
    collections[colName].push(articleId);
    saveCollections();
  }
}

function removeFromCollection(colName, articleId) {
  if (!collections[colName]) return;
  collections[colName] = collections[colName].filter(function(id) { return id !== articleId; });
  saveCollections();
}

function createCollection(name) {
  name = name.trim();
  if (!name || collections[name]) return;
  collections[name] = [];
  saveCollections();
}

function deleteCollection(name) {
  if (!confirm('Supprimer la collection \u00ab ' + name + ' \u00bb ?')) return;
  delete collections[name];
  if (activeCollection === name) activeCollection = null;
  saveCollections();
  renderEntryList();
}

function buildCollectionPicker(articleId) {
  var html = '<div class="collection-pills">';
  Object.keys(collections).forEach(function(name) {
    var isIn = collections[name].indexOf(articleId) >= 0;
    html += '<span class="collection-pill' + (isIn ? ' active' : '') + '" onclick="toggleArticleInCollection(\'' + escapeAttr(name) + '\',\'' + articleId + '\',this)">' + (isIn ? '\u2713 ' : '') + name + '</span>';
  });
  html += '<span class="collection-pill collection-add-btn" onclick="promptNewCollection(\'' + articleId + '\')">+ Nouvelle</span>';
  html += '</div>';
  return html;
}

function toggleArticleInCollection(name, articleId, el) {
  if (collections[name] && collections[name].indexOf(articleId) >= 0) {
    removeFromCollection(name, articleId);
  } else {
    addToCollection(name, articleId);
  }
  // Refresh the picker
  var container = el.closest('.collection-pills').parentElement;
  container.innerHTML = '<div style="font-family:var(--mono);font-size:0.55rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--gold);margin-bottom:0.4rem;display:flex;align-items:center;gap:0.4rem;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2z"/></svg> Collections</div>' + buildCollectionPicker(articleId);
}

function promptNewCollection(articleId) {
  var name = prompt('Nom de la nouvelle collection :');
  if (!name) return;
  createCollection(name);
  if (articleId) addToCollection(name, articleId);
  if (currentArticle) showArticle(currentArticle.id);
}

// ===== FEATURE: READING TIME TRACKING =====
function startReadingTimer() {
  if (currentArticle) {
    readingStartTimes._current = Date.now();
    readingStartTimes._currentId = currentArticle.id;
  }
}

function stopReadingTimer() {
  if (readingStartTimes._current && readingStartTimes._currentId) {
    var elapsed = Math.round((Date.now() - readingStartTimes._current) / 1000);
    if (elapsed > 5 && elapsed < 3600) { // Between 5s and 1h
      var id = readingStartTimes._currentId;
      readingStartTimes[id] = (readingStartTimes[id] || 0) + elapsed;
      Data.saveReadingTimes();
    }
  }
  readingStartTimes._current = null;
  readingStartTimes._currentId = null;
}

// ===== READING TOOLBAR =====
function showReadingToolbar() {
  var tb = document.getElementById('readingToolbar');
  if (tb) tb.classList.add('visible');
  document.body.classList.add('has-toolbar');
  updateRtbBookmark();
}

function hideReadingToolbar() {
  var tb = document.getElementById('readingToolbar');
  if (tb) tb.classList.remove('visible');
  document.body.classList.remove('has-toolbar');
}

function updateRtbBookmark() {
  var btn = document.getElementById('rtbBookmark');
  if (!btn || !currentArticle) return;
  var isB = bookmarks.indexOf(currentArticle.id) >= 0;
  btn.classList.toggle('active', isB);
  btn.innerHTML = isB
    ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>'
    : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>';
}

function updateRtbFocus() {
  var btn = document.getElementById('rtbFocus');
  if (btn) btn.classList.toggle('active', focusMode);
}
