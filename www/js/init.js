// ===== INITIALIZATION =====
function init() {
  initTheme();
  applyAppearance();
  if (highlightMode) document.body.classList.add('highlight-mode');
  updateEntryCount();
  buildAlphaNav();
  buildFilterBar();
  buildMobileAlphaStrip();
  renderEntryList();
  showWelcome();
  
  // Stop reading timer when page hidden
  document.addEventListener('visibilitychange', function() {
    if (document.hidden) { stopReadingTimer(); saveScrollPos(); }
    else {
      if (currentArticle) startReadingTimer();
      // Check for updates when returning to app (throttled to 24h)
      setTimeout(function() { if (userEntries.length > 0) silentUpdateCheck(); }, 5000);
    }
  });
  
  // Double-tap zoom on mobile
  document.addEventListener('touchend', handleDoubleTap, { passive: false });
  
  // Highlight mode: capture selection
  document.addEventListener('mouseup', handleHighlightSelection);
  document.addEventListener('touchend', function(e) {
    setTimeout(handleHighlightSelection, 100);
  }, { passive: true });
  
  // Escape from immersive mode
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && immersiveMode) { toggleImmersive(); e.stopPropagation(); }
  });
  
  // Update Android widget if native
  try { updateAndroidWidget(); } catch(e) {}

  // Restore data from IndexedDB (survives Android WebView localStorage wipes)
  Data.restoreFromIDB().then(function(needsRefresh) {
    if (needsRefresh) {
      updateEntryCount();
      buildAlphaNav();
      buildFilterBar();
      renderEntryList();
      if (!currentArticle) showWelcome();
      console.log('[Data] Restored entries from IndexedDB');
    }
    applyAppearance();
    if (Data.pref('highlightMode')) document.body.classList.add('highlight-mode');
    initTheme();
  });
  
  // First-launch onboarding
  showOnboarding();
  
  // Silent background update check (10s after startup)
  setTimeout(function() {
    if (userEntries.length > 0) silentUpdateCheck();
  }, 10000);
  
  // Desktop search with suggestions
  const searchEl = document.getElementById('searchInput');
  searchEl.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim();
    activeLetterFilter = null;
    updateAlphaNav();
    renderEntryList();
    showSearchSuggestions(searchQuery);
  });
  searchEl.addEventListener('focus', () => { if (searchQuery.length >= 2) showSearchSuggestions(searchQuery); });
  searchEl.addEventListener('blur', () => { setTimeout(() => showSearchSuggestions(''), 200); });
  searchEl.addEventListener('keydown', (e) => {
    const box = document.getElementById('searchSuggestions');
    const items = box?.querySelectorAll('.search-suggestion') || [];
    if (e.key === 'ArrowDown') { e.preventDefault(); suggestHighlight = Math.min(suggestHighlight + 1, items.length - 1); showSearchSuggestions(searchQuery); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); suggestHighlight = Math.max(suggestHighlight - 1, -1); showSearchSuggestions(searchQuery); }
    else if (e.key === 'Enter' && suggestHighlight >= 0 && items[suggestHighlight]) {
      e.preventDefault();
      items[suggestHighlight].dispatchEvent(new Event('mousedown'));
    }
  });
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !e.ctrlKey && !e.metaKey && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault();
      if (isMobile()) { switchTab('search'); } 
      else { document.getElementById('searchInput').focus(); }
    }
    if (e.key === 'Escape') {
      // Close panels first
      var tocOpen = document.getElementById('tocPanelOverlay')?.classList.contains('open');
      var settingsOpen = document.getElementById('settingsOverlay')?.classList.contains('open');
      if (tocOpen) { closeTocPanel(); return; }
      if (settingsOpen) { closeSettings(); return; }
      if (isMobile()) { closeDrawer(); }
      else {
        document.getElementById('searchInput').blur();
        document.getElementById('searchInput').value = '';
        searchQuery = '';
        renderEntryList();
        showSearchSuggestions('');
      }
    }
    // Article navigation: Left/Right arrows, Backspace to go back
    if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      if (e.key === 'ArrowLeft' && currentArticle) {
        e.preventDefault();
        var allE = getAllEntries();
        var ci = allE.findIndex(function(en) { return en.id === currentArticle.id; });
        if (ci > 0) navigateTo(allE[ci - 1].id);
      }
      if (e.key === 'ArrowRight' && currentArticle) {
        e.preventDefault();
        var allE = getAllEntries();
        var ci = allE.findIndex(function(en) { return en.id === currentArticle.id; });
        if (ci >= 0 && ci < allE.length - 1) navigateTo(allE[ci + 1].id);
      }
      if (e.key === 'Backspace') {
        e.preventDefault();
        goBack();
      }
      if (e.key === 'r' || e.key === 'R') {
        showRandomArticle();
      }
      if ((e.key === 't' || e.key === 'T') && currentArticle) {
        openTocPanel();
      }
      if (e.key === 'f' || e.key === 'F') {
        if (currentArticle) toggleFocusMode();
      }
    }
  });
  
  // Back-to-top button visibility
  var bttBtn = document.getElementById('backToTop');
  var contentEl = document.querySelector('.content');
  var scrollTarget = contentEl || window;
  
  function updateBackToTop() {
    var scrollY = contentEl ? contentEl.scrollTop : window.scrollY;
    if (bttBtn) {
      if (scrollY > 400 && currentArticle) {
        bttBtn.classList.add('visible');
      } else {
        bttBtn.classList.remove('visible');
      }
    }
    // Also update TOC panel active state
    if (document.getElementById('tocPanelOverlay')?.classList.contains('open')) {
      updateTocPanelActive();
    }
  }
  
  function onArticleScroll() {
    updateBackToTop();
    updateProgressMap();
  }
  (contentEl || window).addEventListener('scroll', onArticleScroll, { passive: true });
  window.addEventListener('scroll', onArticleScroll, { passive: true });
  
  // Save scroll position periodically
  var scrollSaveTimer = null;
  function debouncedSaveScroll() {
    clearTimeout(scrollSaveTimer);
    scrollSaveTimer = setTimeout(saveScrollPos, 1000);
  }
  (contentEl || window).addEventListener('scroll', debouncedSaveScroll, { passive: true });
  window.addEventListener('scroll', debouncedSaveScroll, { passive: true });
  
  // Drawer touch-to-dismiss
  const drawerPanel = document.getElementById('drawerPanel');
  let touchStartY = 0;
  drawerPanel.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });
  drawerPanel.addEventListener('touchmove', (e) => {
    const dy = e.touches[0].clientY - touchStartY;
    if (dy > 80 && drawerPanel.scrollTop <= 0) {
      closeDrawer();
    }
  }, { passive: true });
  
  // Mobile article scroll → show title in bar + reading progress + hide tab/fab
  window.addEventListener('scroll', () => {
    if (!isMobile() || !mobileViewingArticle) return;
    const titleEl = document.querySelector('.article-title');
    if (titleEl) {
      const rect = titleEl.getBoundingClientRect();
      document.getElementById('mobileArticleTitle').classList.toggle('visible', rect.bottom < 60);
    }
    // Reading progress
    const article = document.querySelector('.article');
    if (article) {
      const articleTop = article.offsetTop;
      const articleH = article.scrollHeight;
      const scrollY = window.scrollY - articleTop;
      const winH = window.innerHeight;
      const pct = Math.min(100, Math.max(0, (scrollY / (articleH - winH)) * 100));
      const fill = document.getElementById('mobileReadingFill');
      if (fill) fill.style.width = pct + '%';
    }
  }, { passive: true });
  
  // Swipe left/right between articles on mobile
  let swipeStartX = 0, swipeStartY = 0, swiping = false;
  document.addEventListener('touchstart', (e) => {
    if (!isMobile() || !mobileViewingArticle) return;
    swipeStartX = e.touches[0].clientX;
    swipeStartY = e.touches[0].clientY;
    swiping = true;
  }, { passive: true });
  
  document.addEventListener('touchend', (e) => {
    if (!swiping || !mobileViewingArticle) return;
    swiping = false;
    const dx = e.changedTouches[0].clientX - swipeStartX;
    const dy = e.changedTouches[0].clientY - swipeStartY;
    // Only trigger on horizontal swipes (dx > 80px, not too vertical)
    if (Math.abs(dx) > 80 && Math.abs(dy) < Math.abs(dx) * 0.6) {
      const allEntries = getAllEntries();
      const idx = allEntries.findIndex(e => e.id === currentArticle?.id);
      if (idx < 0) return;
      if (dx < 0 && idx < allEntries.length - 1) {
        // Swipe left → next
        navigateTo(allEntries[idx + 1].id);
      } else if (dx > 0 && idx > 0) {
        // Swipe right → prev
        navigateTo(allEntries[idx - 1].id);
      }
    }
  }, { passive: true });
}

// ===== ALPHABET NAV (Desktop) =====
function buildAlphaNav() {
  const nav = document.getElementById('alphaNav');
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const usedLetters = new Set(getAllEntries().map(e => e.letter));
  nav.innerHTML = letters.map(l => 
    `<button class="alpha-btn ${usedLetters.has(l) ? 'has-entries' : ''}" onclick="filterByLetter('${l}')">${l}</button>`
  ).join('');
}

function updateAlphaNav() {
  document.querySelectorAll('.alpha-btn').forEach(btn => {
    btn.classList.toggle('active', btn.textContent === activeLetterFilter);
  });
}

function filterByLetter(letter) {
  activeLetterFilter = activeLetterFilter === letter ? null : letter;
  searchQuery = '';
  document.getElementById('searchInput').value = '';
  updateAlphaNav();
  renderEntryList();
}

// ===== DESKTOP ENTRY LIST =====
function renderEntryList() {
  const container = document.getElementById('entryList');
  let entries = getFilteredEntries();
  
  // Sort controls
  var sortHtml = '<div class="sort-controls">' +
    '<span style="font-family:var(--mono);font-size:0.45rem;letter-spacing:0.06em;text-transform:uppercase;color:var(--muted-light);align-self:center;margin-right:0.2rem;">Tri</span>' +
    '<button class="sort-btn' + (sortMode==='alpha' ? ' active' : '') + '" onclick="setSortMode(\'alpha\')">A\u2192Z</button>' +
    '<button class="sort-btn' + (sortMode==='category' ? ' active' : '') + '" onclick="setSortMode(\'category\')">Cat.</button>' +
    '<button class="sort-btn' + (sortMode==='unread' ? ' active' : '') + '" onclick="setSortMode(\'unread\')">Non lus</button>' +
    '<button class="sort-btn' + (sortMode==='recent' ? ' active' : '') + '" onclick="setSortMode(\'recent\')">R\u00e9cents</button>' +
    '</div>';
  
  // Recent sidebar section (show recent 5)
  var recentHtml = '';
  if (!searchQuery && !activeLetterFilter && !activeCategoryFilter && !showOnlyBookmarks) {
    var recentItems = readHistory.slice(0, 5);
    var allE = getAllEntries();
    if (recentItems.length > 0) {
      recentHtml = '<div class="sidebar-recent"><div class="sidebar-recent-title">R\u00e9cemment lus</div>';
      recentItems.forEach(function(h) {
        var e = allE.find(function(a) { return a.id === h.id; });
        if (e) {
          var ago = Date.now() - h.time;
          var mins = Math.floor(ago / 60000);
          var tStr = mins < 1 ? 'maintenant' : mins < 60 ? mins + 'min' : Math.floor(mins/60) + 'h';
          recentHtml += '<div class="sidebar-recent-item" onclick="navigateTo(\'' + e.id + '\')"><span class="sidebar-recent-time">' + tStr + '</span> ' + e.term + '</div>';
        }
      });
      recentHtml += '</div>';
    }
  }
  
  if (entries.length === 0) {
    container.innerHTML = sortHtml + recentHtml + `<div class="sidebar-section"><div class="no-results"><div class="no-results-icon">\u2205</div><h3>Aucun r\u00e9sultat</h3><p>Essayez une autre recherche</p></div></div>`;
    return;
  }
  
  // Apply sort
  if (sortMode === 'category') {
    entries.sort(function(a,b) { return a.category.localeCompare(b.category) || a.term.localeCompare(b.term); });
  } else if (sortMode === 'unread') {
    entries.sort(function(a,b) {
      var aR = readArticles.has(a.id) ? 1 : 0;
      var bR = readArticles.has(b.id) ? 1 : 0;
      return aR - bR || a.term.localeCompare(b.term);
    });
  } else if (sortMode === 'recent') {
    var timeMap = {};
    readHistory.forEach(function(h, i) { if (!timeMap[h.id]) timeMap[h.id] = h.time; });
    entries.sort(function(a,b) { return (timeMap[b.id] || 0) - (timeMap[a.id] || 0); });
  }
  // Default alpha: already sorted by letter
  
  var groupKey = (sortMode === 'category') ? 'category' : 'letter';
  const grouped = {};
  entries.forEach(function(e) {
    var key = (groupKey === 'category') ? e.category.split(' \u00b7 ')[0] : e.letter;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(e);
  });
  
  let html = sortHtml + recentHtml;
  var keys = Object.keys(grouped).sort();
  if (sortMode === 'recent') keys = Object.keys(grouped); // Keep order
  
  keys.forEach(function(key) {
    html += `<div class="sidebar-section"><div class="letter-group-header">${key}</div><ul class="entry-list">`;
    grouped[key].forEach(function(entry) {
      const isActive = currentArticle && currentArticle.id === entry.id;
      const isBookmarked = bookmarks.includes(entry.id);
      const isUser = entry._userEntry;
      const isRead = readArticles.has(entry.id);
      html += `<li class="entry-item ${isActive ? 'active' : ''}" onclick="navigateTo('${entry.id}')">
        <span class="entry-letter">${isBookmarked ? '\u2605' : isUser ? '\u270e' : entry.letter}</span>
        <div><span class="entry-name">${entry.term}</span><span class="entry-category">${entry.category}</span></div>
        ${!isRead ? '<div class="read-dot" title="Non lu"></div>' : ''}</li>`;
    });
    html += `</ul></div>`;
  });
  container.innerHTML = html;
}

function getFilteredEntries() {
  let entries = getAllEntries();
  if (searchQuery) {
    entries = entries.filter(e => {
      // Search in all fields including full article content
      const target = `${e.term} ${e.category} ${e.definition} ${e.tags.join(' ')} ${e.etymology} ${e.content.replace(/<[^>]+>/g, '')}`;
      return fuzzyMatch(searchQuery, target);
    });
  }
  if (activeLetterFilter) entries = entries.filter(e => e.letter === activeLetterFilter);
  if (activeCategoryFilter) entries = entries.filter(e => e.category.includes(activeCategoryFilter));
  if (showOnlyBookmarks) entries = entries.filter(e => bookmarks.includes(e.id));
  if (activeCollection && collections[activeCollection]) {
    entries = entries.filter(function(e) { return collections[activeCollection].indexOf(e.id) >= 0; });
  }
  return entries;
}

