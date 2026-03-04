// ===== ARTICLE DISPLAY =====
// ===== NAVIGATION HISTORY =====
function navigateTo(id) {
  saveScrollPos();
  if (currentArticle && currentArticle.id !== id) {
    navHistory.push(currentArticle.id);
    if (navHistory.length > 30) navHistory.shift();
  }
  showArticle(id);
}

function goBack() {
  if (navHistory.length > 0) {
    var prevId = navHistory.pop();
    showArticle(prevId);
  } else {
    showWelcome();
  }
}

function showArticle(id) {
  const allEntries = getAllEntries();
  const entry = allEntries.find(e => e.id === id);
  if (!entry) return;
  
  currentArticle = entry;
  trackRead(id);
  closeTocPanel();
  closeSettings();
  const content = document.getElementById('content');
  const isBookmarked = bookmarks.includes(entry.id);
  
  // Auto-link terms in article body
  let linkedContent = autoLinkContent(entry.content, entry.id);
  
  // Build footnotes from inline refs + bibliography
  const footnoteResult = buildFootnotes(linkedContent, entry.refs || []);
  linkedContent = footnoteResult.html;
  
  // Inject lettrine on first paragraph
  if (appLettrine) {
    linkedContent = linkedContent.replace(/(<p[^>]*>)(\s*(?:<a[^>]*>)?)([\wÀ-ÿ«])/i, function(m, pTag, aTag, letter) {
      return pTag + (aTag||'') + '<span class="lettrine">' + letter + '</span>';
    });
  }
  
  // Build related articles (manual + auto-detected)
  let relatedIds = [...(entry.related || [])];
  const autoRelated = detectRelated(entry);
  autoRelated.forEach(rid => { if (!relatedIds.includes(rid)) relatedIds.push(rid); });
  relatedIds = relatedIds.slice(0, 10);
  
  let relatedHtml = '';
  if (relatedIds.length > 0) {
    const relatedEntries = relatedIds.map(rid => allEntries.find(e => e.id === rid)).filter(Boolean);
    if (relatedEntries.length > 0) {
      relatedHtml = `<div class="article-tags">${relatedEntries.map(r => 
        `<span class="article-tag" onclick="navigateTo('${r.id}')">${r.term}</span>`).join('')}</div>`;
    }
  }
  
  let tagsHtml = entry.tags.map(t => `<span class="article-tag" onclick="searchTag('${t}')">${t}</span>`).join('');
  let customTagsHtml = buildCustomTagsHtml(id);
  
  const wikiUrl = `https://fr.wikibooks.org/wiki/Dictionnaire_de_philosophie/${encodeURIComponent(entry.term.replace(/ & /g, '/').replace(/ \(logique\)/, '_(logique)'))}`;
  
  // Prev/Next navigation
  const idx = allEntries.findIndex(e => e.id === id);
  const prev = idx > 0 ? allEntries[idx - 1] : null;
  const next = idx < allEntries.length - 1 ? allEntries[idx + 1] : null;
  
  let navHtml = '<nav class="article-nav">';
  if (prev) {
    navHtml += '<button class="article-nav-btn prev" onclick="navigateTo(\'' + prev.id + '\')"><div class="nav-label">\u2190 Précédent</div><div class="nav-title">' + prev.term + '</div></button>';
  }
  navHtml += '<div class="article-nav-center"><button class="article-nav-home" onclick="showWelcome()" title="Accueil"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></button></div>';
  if (next) {
    navHtml += '<button class="article-nav-btn next" onclick="navigateTo(\'' + next.id + '\')"><div class="nav-label">Suivant \u2192</div><div class="nav-title">' + next.term + '</div></button>';
  }
  navHtml += '</nav>';
  if (isMobile()) {
    navHtml += '<div style="text-align:center;padding:0.5rem 0 0.25rem;font-family:var(--mono);font-size:0.5rem;letter-spacing:0.06em;text-transform:uppercase;color:var(--muted-light);opacity:0.6;">\u2190 Swipe pour naviguer \u2192</div>';
  }
  
  // Breadcrumb (desktop) + back link
  var backLabel = navHistory.length > 0 ? 'Retour' : 'Accueil';
  var backAction = navHistory.length > 0 ? 'goBack()' : 'showWelcome()';
  var breadcrumbHtml = '<div class="article-breadcrumb">'
    + '<a onclick="showWelcome()">Accueil</a>'
    + '<span class="bc-sep">\u203a</span>'
    + '<a onclick="searchTag(\'' + entry.category.replace(/'/g, "\\'") + '\')">' + entry.category + '</a>'
    + '<span class="bc-sep">\u203a</span>'
    + '<span class="bc-current">' + entry.term + '</span>'
    + '</div>';
  var backLinkHtml = '<a class="article-back-link" onclick="' + backAction + '">'
    + '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>'
    + backLabel + '<span class="nav-key-hint">Retour</span></a>';
  
  // User entry badge + actions
  const userBadge = entry._userEntry ? '<span class="user-entry-badge">Article personnalisé</span>' : '';
  const userActions = entry._userEntry ? `
    <div class="article-edit-actions">
      <button class="btn" onclick="openEditor('${entry.id}')">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-1px"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        Modifier
      </button>
      <button class="btn btn-danger" onclick="deleteUserEntry('${entry.id}')">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-1px"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
        Supprimer
      </button>
    </div>` : '';
  
  // Reading time (200 words/min for French)
  const wordCount = entry.content.replace(/<[^>]+>/g, '').split(/\s+/).length;
  const readMin = Math.max(1, Math.round(wordCount / 200));
  
  // Quality indicators
  const hasRefs = entry.refs && entry.refs.length > 0;
  const wikiSrc = entry._wikiSource || '';
  const hasNotes = /<ref>/i.test(wikiSrc);
  const hasBiblio = /^=+\s*bibliographie\s*=+/im.test(wikiSrc);
  var qualityHints = [];
  if (!hasBiblio) qualityHints.push('<span class="quality-hint" title="Aucune section Bibliographie détectée"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg> Sans bibliographie</span>');
  if (!hasNotes && !hasRefs) qualityHints.push('<span class="quality-hint" title="Aucune note ou référence dans le texte"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> Sans notes</span>');
  const qualityHtml = qualityHints.length > 0 ? '<div class="quality-hints">' + qualityHints.join('') + '</div>' : '';
  
  const readTimeHtml = `<div class="mobile-reading-time">${readMin} min de lecture \u00b7 ${wordCount} mots</div>` + qualityHtml;
  
  // Position counter
  var posHtml = '<div class="nav-position">Article ' + (idx + 1) + ' sur ' + allEntries.length + '</div>';
  
  // Fiche express
  var ficheHtml = buildFicheExpress(entry);
  
  // Notes
  var noteText = getNote(entry.id);
  var notesHtml = '<div class="article-notes"><div class="article-notes-title"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Notes personnelles</div><textarea placeholder="Ajoutez vos notes, r\u00e9flexions, citations\u2026" oninput="saveNote(\'' + entry.id + '\',this.value)">' + escapeHtml(noteText) + '</textarea></div>';
  
  // Share + fiche buttons
  var toolbarHtml = '<div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;margin-top:0.75rem;">' +
    '<button class="fiche-toggle" onclick="toggleFiche()">Fiche express</button>' +
    '<button class="share-btn" onclick="shareArticle()"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg> Partager</button>' +
    '</div>' +
    buildTTSBar();
  
  // Collections
  var collectHtml = '<div style="margin-top:1rem;"><div style="font-family:var(--mono);font-size:0.55rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--gold);margin-bottom:0.4rem;display:flex;align-items:center;gap:0.4rem;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2z"/></svg> Collections</div>' + buildCollectionPicker(entry.id) + '</div>';

  // Stop previous reading timer, start new one
  stopReadingTimer();
  
  // Parcours banner
  var parcoursBannerHtml = buildParcoursBanner(id);

  content.innerHTML = '\n' +
    '    <article class="article article-enter">\n' +
    backLinkHtml + '\n' +
    breadcrumbHtml + '\n' +
    parcoursBannerHtml + '\n' +
    '      <header class="article-header" style="position:relative;">\n' +
    (entry._userEntry ? '        <button class="article-edit-top" onclick="openEditor(\'' + entry.id + '\')" title="Modifier"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>' : '') + '\n' +
    '        <div class="article-category">' + (isMobile() ? '<span class="mobile-article-category-pill">' + entry.category + '</span>' : entry.category) + userBadge + '</div>\n' +
    '        <h2 class="article-title">' + entry.term + '</h2>\n' +
    readTimeHtml + '\n' +
    (entry.etymology ? '        <div class="article-etymology">' + entry.etymology + '</div>' : '') + '\n' +
    '        <div class="article-definition">' + entry.definition + '</div>\n' +
    toolbarHtml + '\n' +
    '      </header>\n' +
    ficheHtml + '\n' +
    '      <div class="article-body-wrap">\n' +
    '        <div class="article-body">' + linkedContent + '</div>\n' +
    '      </div>\n' +
    notesHtml + '\n' +
    '      <div class="article-tags" style="margin-top:2.5rem;padding-top:1.5rem;border-top:1px solid var(--border);">\n' +
    '        <span style="font-family:var(--mono);font-size:0.6rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted-light);align-self:center;margin-right:0.5rem;">Mots-cl\u00e9s</span>\n' +
    tagsHtml + '\n' + customTagsHtml + '\n' +
    '      </div>\n' +
    (relatedHtml ? '      <div style="margin-top:1rem;"><span style="font-family:var(--mono);font-size:0.6rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted-light);margin-right:0.5rem;">Articles li\u00e9s</span>' + relatedHtml + '</div>' : '') + '\n' +
    buildMiniGraph(entry) + '\n' +
    collectHtml + '\n' +
    footnoteResult.footnotesHtml + '\n' +
    (!entry._userEntry ? '      <div class="article-source"><a href="' + wikiUrl + '" target="_blank" rel="noopener">Lire sur Wikilivres \u2197</a></div>' : '') + '\n' +
    userActions + '\n' +
    posHtml + '\n' +
    navHtml + '\n' +
    '    </article>';
  
  // Post-render: TOC + font size + visited links + focus toggle
  buildTOC(content);
  applyFontSize();
  markVisitedLinks();
  restoreHighlights(id);
  startReadingTimer();
  showReadingToolbar();
  updateRtbBookmark();
  updateRtbFocus();
  // Progress map
  var pm = document.getElementById('progressMap');
  if (pm) pm.style.display = 'block';
  updateProgressMap();
  // Enable/disable TOC button based on headings count
  var rtbTocBtn = document.getElementById('rtbToc');
  if (rtbTocBtn) {
    var hCount = content.querySelectorAll('.article-body h3, .article-body h4').length;
    rtbTocBtn.style.opacity = hCount >= 2 ? '1' : '0.3';
    rtbTocBtn.style.pointerEvents = hCount >= 2 ? 'auto' : 'none';
  }
  var ft = document.getElementById('focusToggle');
  if (ft) ft.style.display = 'flex';
  
  // Desktop bookmark button
  const bookmarkBtn = document.getElementById('bookmarkBtn');
  bookmarkBtn.style.display = 'flex';
  bookmarkBtn.classList.toggle('bookmarked', isBookmarked);
  bookmarkBtn.innerHTML = isBookmarked 
    ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>'
    : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>';
  
  renderEntryList();
  
  // Mobile-specific
  if (isMobile()) {
    closeDrawer();
    mobileViewingArticle = true;
    document.getElementById('mobileArticleBar').style.display = 'flex';
    document.getElementById('mobileArticleTitle').textContent = entry.term;
    document.getElementById('mobileArticleTitle').classList.remove('visible');
    document.getElementById('mobileReadingProgress').style.display = 'block';
    document.getElementById('mobileReadingFill').style.width = '0%';
    document.getElementById('mobileFab').classList.add('hidden');
    document.querySelector('.mobile-tab-bar').classList.add('reading');
    var strip = document.getElementById('mobileAlphaStrip');
    if (strip) strip.style.display = 'none';
    updateMobileBookmarkBtn();
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    window.scrollTo({ top: 0, behavior: 'instant' });
    // Restore saved scroll position if any
    if (articleScrollPos[id]) {
      restoreScrollPos(id);
    }
  } else {
    document.getElementById('sidebar').classList.remove('mobile-open');
    content.scrollTop = 0;
    // Restore saved scroll position if any
    if (articleScrollPos[id]) {
      restoreScrollPos(id);
    }
  }
}

function updateMobileBookmarkBtn() {
  if (!currentArticle) return;
  const btn = document.getElementById('mobileBookmarkBtn');
  const isBookmarked = bookmarks.includes(currentArticle.id);
  btn.classList.toggle('bookmarked', isBookmarked);
  btn.innerHTML = isBookmarked
    ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>'
    : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>';
}

function searchTag(tag) {
  if (isMobile()) {
    switchTab('search');
    setTimeout(() => {
      const input = document.querySelector('.drawer-search');
      if (input) { input.value = tag; input.dispatchEvent(new Event('input')); }
    }, 400);
  } else {
    document.getElementById('searchInput').value = tag;
    searchQuery = tag;
    activeLetterFilter = null;
    updateAlphaNav();
    renderEntryList();
  }
}

// ===== WELCOME SCREEN =====
function showWelcome() {
  saveScrollPos();
  if (ttsActive) stopTTS();
  currentArticle = null;
  // Hide progress map
  var pm = document.getElementById('progressMap');
  if (pm) pm.style.display = 'none';
  // Exit immersive if active
  if (immersiveMode) toggleImmersive();
  mobileViewingArticle = false;
  document.getElementById('bookmarkBtn').style.display = 'none';
  var btt = document.getElementById('backToTop');
  if (btt) btt.classList.remove('visible');
  var ft = document.getElementById('focusToggle');
  if (ft) ft.style.display = 'none';
  if (focusMode) toggleFocusMode();
  stopReadingTimer();
  hideReadingToolbar();
  closeTocPanel();
  
  if (isMobile()) {
    document.getElementById('mobileArticleBar').style.display = 'none';
    document.getElementById('mobileReadingProgress').style.display = 'none';
    document.getElementById('mobileFab').classList.remove('hidden');
    document.querySelector('.mobile-tab-bar').classList.remove('reading');
    var strip = document.getElementById('mobileAlphaStrip');
    if (strip) strip.style.display = '';
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('[data-tab="home"]').classList.add('active');
  }
  
  const allEntries = getAllEntries();
  const categories = new Set();
  const philosophers = new Set();
  const nonPhilosophers = ['Religion','Langage','Logique','Vertu','Devoir','Pluralisme','Mythologie','Nature','Immanence','Substance','Providence','Transcendance','Raison','Sagesse','Libert\u00e9','Capitalisme','Colonialisme','Dialectique','Paradoxe','Identit\u00e9','Rationalisme','Empirisme','Paradigme','Mouvement','Devenir','Connaissance','Scepticisme','Th\u00e9ologie','Facticit\u00e9','Ontologie','Biologie'];
  allEntries.forEach(e => {
    e.category.split(' \u00b7 ').forEach(c => categories.add(c));
    e.tags.forEach(t => {
      if (t[0] === t[0].toUpperCase() && !nonPhilosophers.includes(t)) philosophers.add(t);
    });
  });
  
  const readStats = getReadStats();
  const readPct = allEntries.length > 0 ? Math.round(readStats.read / readStats.total * 100) : 0;
  const hasContent = allEntries.length > 5;
  
  // Update notification banner
  const updateBannerHtml = pendingUpdatesCount > 0 ? '<div class="update-banner" onclick="checkForUpdates()">' +
    '<div class="update-banner-icon">↻</div>' +
    '<div class="update-banner-text"><span class="update-banner-count">' + pendingUpdatesCount + ' article' + (pendingUpdatesCount > 1 ? 's' : '') + '</span> modifié' + (pendingUpdatesCount > 1 ? 's' : '') + ' sur Wikilivres</div>' +
    '<div class="update-banner-arrow">›</div></div>' : '';

  // Article of the day
  const aotd = getArticleOfDay();
  const aotdExcerpt = aotd ? aotd.definition.replace(/<[^>]+>/g, '').slice(0, 140) : '';
  const aotdHtml = aotd ? `
    <div class="article-of-day" onclick="navigateTo('${aotd.id}')">
      <div class="article-of-day-badge"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/></svg> Article du jour</div>
      <div class="article-of-day-title">${aotd.term}</div>
      <div class="article-of-day-excerpt">${aotdExcerpt}\u2026</div>
    </div>` : '';
  
  // Parcours guidés
  const parcoursHtml = hasContent ? buildParcoursCards() : '';

  // Smart suggestions (based on reading history) or random
  const smartEntries = readHistory.length > 3 ? getSmartSuggestions(allEntries) : [];
  const suggestionSource = smartEntries.length > 0 ? smartEntries : [...allEntries].sort(() => Math.random() - 0.5).slice(0, 4);
  const suggestionsLabel = smartEntries.length > 0 ? 'Recommandé pour vous' : '\u00c0 d\u00e9couvrir';
  const suggestionsIcon = smartEntries.length > 0 ? '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' : '';
  const suggestionsHtml = suggestionSource.length > 0 ? `
    <div style="margin-top:1.75rem;">
      <div class="dash-smart-title">${suggestionsIcon} ${suggestionsLabel}</div>
      ${suggestionSource.map(e => `
        <div class="drawer-entry" onclick="navigateTo('${e.id}')" style="border-radius:10px;margin:0 auto;max-width:420px;border:none;">
          <div class="drawer-entry-letter">${e._userEntry ? '\u270e' : e.letter}</div>
          <div class="drawer-entry-text">
            <div class="drawer-entry-name">${e.term}</div>
            <div class="drawer-entry-cat">${e.category}</div>
          </div>
          <div class="drawer-entry-arrow">\u203a</div>
        </div>`).join('')}
    </div>` : '';
  
  // Recent history (compact, max 4)
  const recentHistory = readHistory.slice(0, 4).map(h => {
    const e = allEntries.find(a => a.id === h.id);
    return e ? { ...e, time: h.time } : null;
  }).filter(Boolean);
  const historyHtml = recentHistory.length > 0 ? `
    <div style="margin-top:1.75rem;max-width:420px;margin-left:auto;margin-right:auto;">
      <div style="font-family:var(--mono);font-size:0.5rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--muted-light);margin-bottom:0.5rem;text-align:center;">Lectures r\u00e9centes</div>
      ${recentHistory.map(e => {
        const ago = Date.now() - e.time;
        const mins = Math.floor(ago / 60000);
        const timeStr = mins < 1 ? '\u00e0 l\u2019instant' : mins < 60 ? mins + ' min' : Math.floor(mins/60) + ' h';
        return `<div class="history-item" onclick="navigateTo('${e.id}')"><span class="history-time">${timeStr}</span><span>${e.term}</span></div>`;
      }).join('')}
    </div>` : '';
  
  // Dashboard stats with streak + activity heatmap
  const streak = getReadingStreak();
  const activityMap = getActivityMap();
  const streakHtml = streak > 0 ? `<div class="dash-streak"><span class="dash-streak-fire">\ud83d\udd25</span> ${streak} jour${streak > 1 ? 's' : ''} consécutif${streak > 1 ? 's' : ''}</div>` : '';
  const activityHtml = readHistory.length > 0 ? `<div class="dash-activity" title="Activité des 28 derniers jours">${activityMap.map(d => {
    var lvl = d.count === 0 ? '' : d.count === 1 ? ' l1' : d.count <= 3 ? ' l2' : d.count <= 5 ? ' l3' : ' l4';
    return '<div class="dash-day' + lvl + '" title="' + d.day + ': ' + d.count + ' article' + (d.count > 1 ? 's' : '') + '"></div>';
  }).join('')}</div>` : '';
  
  const statsLine = allEntries.length > 0 ? `
    <div style="font-family:var(--mono);font-size:0.7rem;letter-spacing:0.04em;color:var(--muted);margin-top:1.5rem;">
      ${allEntries.length} articles \u00b7 ${categories.size} domaines \u00b7 ${readStats.read} lus (${readPct}%)
    </div>
    <div style="max-width:240px;margin:0.4rem auto 0;">
      <div class="reading-progress-bar" style="height:3px;"><div class="reading-progress-fill" style="width:${readPct}%"></div></div>
    </div>
    ${streakHtml}
    ${activityHtml}` : `
    <div style="font-family:var(--mono);font-size:0.7rem;letter-spacing:0.04em;color:var(--muted);margin-top:1.5rem;">
      ${allEntries.length} articles \u00b7 ${categories.size} domaines
    </div>`;
  
  // Quick actions (mobile)
  const mobileQuickHtml = isMobile() ? `
    <div class="mobile-quick-actions" style="margin-top:1.5rem;">
      <div class="mobile-quick-btn" onclick="switchTab('search')">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        <span>Recherche</span>
      </div>
      <div class="mobile-quick-btn" onclick="switchTab('index')">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
        <span>Index</span>
      </div>
      <div class="mobile-quick-btn" onclick="showRandomArticle()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>
        <span>Hasard</span>
      </div>
    </div>` : '';
  
  // Desktop quick actions (compact row)
  const desktopQuickHtml = !isMobile() ? `
    <div style="display:flex;justify-content:center;gap:0.5rem;margin-top:1.25rem;flex-wrap:wrap;">
      <button class="share-btn" onclick="showRandomArticle()"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg> Hasard</button>
      <button class="share-btn" onclick="showPhilosopherIndex()"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg> Philosophes</button>
      <button class="share-btn" onclick="showGraph()"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="2"/><circle cx="5" cy="5" r="2"/><circle cx="19" cy="19" r="2"/><path d="M12 10V7M7 17l3 1M17 7l-3-1"/></svg> Graphe</button>
      <button class="share-btn" onclick="showGlossary()"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg> Glossaire</button>
      <button class="share-btn" onclick="showStats()"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 20V10M12 20V4M6 20v-6"/></svg> Statistiques</button>
      ${Object.keys(articleNotes).length > 0 ? '<button class="share-btn" onclick="showNotesSearch()"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Notes</button>' : ''}
      ${userEntries.length > 0 ? '<button class="share-btn" onclick="checkForUpdates()"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg> MàJ' + (pendingUpdatesCount > 0 ? ' <span class="update-badge">' + pendingUpdatesCount + '</span>' : '') + '</button>' : ''}
    </div>` : '';
  
  // Import bar (collapsed if content exists)
  const importHtml = `
    <div style="margin-top:2rem;text-align:center;">
      ${hasContent ? `<button class="share-btn" id="showImportToggle" onclick="document.getElementById('massImportWrap').style.display='block';this.style.display='none';" style="margin-bottom:0.5rem;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Importer plus d\u2019articles
      </button>` : ''}
      <div class="mass-import-bar" id="massImportWrap" ${hasContent ? 'style="display:none;"' : ''}>
        ${hasContent ? '' : '<h3>Importer le dictionnaire</h3>'}
        <p>T\u00e9l\u00e9chargez les articles du Dictionnaire de philosophie des Wikilivres.</p>
        <button class="btn btn-primary" id="massImportBtn" onclick="massImportFromWikibooks()" ${massImportRunning ? 'disabled' : ''}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Importer depuis Wikilivres
        </button>
        <div class="mass-import-progress" id="massImportProgress" style="display:none;">
          <div class="mass-import-progress-bar"><div class="mass-import-progress-fill" id="massImportFill"></div></div>
          <div class="mass-import-status" id="massImportStatus"></div>
        </div>
      </div>
    </div>`;
  
  // Secondary tools (compact)
  const toolsHtml = isMobile() ? `
    <div style="display:flex;justify-content:center;gap:0.35rem;margin-top:1.25rem;flex-wrap:wrap;">
      <button class="share-btn" onclick="showPhilosopherIndex()">Philosophes</button>
      <button class="share-btn" onclick="showGraph()">Graphe</button>
      <button class="share-btn" onclick="showGlossary()">Glossaire</button>
      <button class="share-btn" onclick="showStats()">Stats</button>
      <button class="share-btn" onclick="showNotesSearch()">Notes</button>
      <button class="share-btn" onclick="checkForUpdates()">MàJ${pendingUpdatesCount > 0 ? ' <span class="update-badge">' + pendingUpdatesCount + '</span>' : ''}</button>
      <button class="share-btn" onclick="exportJSON()">Export</button>
      <button class="share-btn" onclick="generateEPUB()">EPUB</button>
      <button class="share-btn" onclick="importJSON()">Import</button>
    </div>` : `
    <div style="display:flex;justify-content:center;gap:0.5rem;margin-top:0.75rem;flex-wrap:wrap;">
      <button class="share-btn" onclick="exportJSON()">Exporter JSON</button>
      <button class="share-btn" onclick="generateEPUB()">EPUB</button>
      <button class="share-btn" onclick="importJSON()">Importer</button>
    </div>`;
  
  document.getElementById('content').innerHTML = `
    <div class="welcome welcome-enter">
      <button onclick="openSettings()" title="Apparence" style="position:absolute;top:1rem;right:1rem;z-index:10;width:38px;height:38px;display:flex;align-items:center;justify-content:center;background:var(--paper-warm);color:var(--muted);border:1px solid var(--border);border-radius:8px;cursor:pointer;transition:all 0.2s;" onmouseover="this.style.borderColor='var(--accent)';this.style.color='var(--accent)'" onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--muted)'">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
      </button>
      <div class="welcome-ornament">\u03c6\u03b9\u03bb\u03bf\u03c3\u03bf\u03c6\u03af\u03b1</div>
      <h2>L\u2019amour de la <em>sagesse</em></h2>
      <p>Explorez les concepts de la philosophie occidentale, de l\u2019Antiquit\u00e9 \u00e0 la pens\u00e9e contemporaine.</p>
      ${statsLine}
      ${mobileQuickHtml}
      ${desktopQuickHtml}
      ${updateBannerHtml}
      ${aotdHtml}
      ${parcoursHtml}
      ${suggestionsHtml}
      ${historyHtml}
      ${importHtml}
      ${toolsHtml}
    </div>`;
  
  renderEntryList();
}

// ===== BOOKMARKS =====
function toggleBookmark() {
  if (!currentArticle) return;
  const idx = bookmarks.indexOf(currentArticle.id);
  if (idx > -1) bookmarks.splice(idx, 1);
  else bookmarks.push(currentArticle.id);
  Data.saveBookmarks();
  
  if (isMobile()) { updateMobileBookmarkBtn(); }
  showArticle(currentArticle.id);
}

function toggleBookmarkFilter() {
  showOnlyBookmarks = !showOnlyBookmarks;
  document.getElementById('bookmarkFilter').classList.toggle('active', showOnlyBookmarks);
  renderEntryList();
}

