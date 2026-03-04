// ===== SEARCH SUGGESTIONS =====
function showSearchSuggestions(query) {
  const box = document.getElementById('searchSuggestions');
  if (!box) return;
  
  if (!query || query.length < 2) {
    box.classList.remove('visible');
    suggestHighlight = -1;
    return;
  }
  
  const results = getAllEntries().filter(e => {
    var ct = (customArticleTags[e.id] || []).join(' ');
    return fuzzyMatch(query, `${e.term} ${e.category} ${e.tags.join(' ')} ${ct}`);
  }).slice(0, 6);
  
  if (results.length === 0) {
    box.classList.remove('visible');
    return;
  }
  
  box.innerHTML = results.map((e, i) => `
    <div class="search-suggestion${i === suggestHighlight ? ' highlighted' : ''}" onmousedown="navigateTo('${e.id}')" data-idx="${i}">
      <div class="search-suggestion-letter">${e.letter}</div>
      <div class="search-suggestion-text">
        <div class="search-suggestion-title">${e.term}</div>
        <div class="search-suggestion-cat">${e.category}</div>
      </div>
    </div>`).join('');
  box.classList.add('visible');
}

// ===== PHILOSOPHER INDEX =====
function showPhilosopherIndex() {
  const allEntries = getAllEntries();
  const philosophers = new Map();
  // knownPhilosophers data is in data.js
  
  allEntries.forEach(e => {
    const text = e.content.replace(/<[^>]+>/g, '') + ' ' + e.tags.join(' ');
    knownPhilosophers.forEach(p => {
      if (text.includes(p)) {
        if (!philosophers.has(p)) philosophers.set(p, []);
        philosophers.get(p).push(e.id);
      }
    });
  });
  
  const sorted = [...philosophers.entries()].sort((a, b) => b[1].length - a[1].length);
  
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="article" style="animation:slideIn 0.4s ease;">
      <header class="article-header">
        <div class="article-category">Index</div>
        <h2 class="article-title">Philosophes</h2>
        <div class="article-definition">${sorted.length} penseurs r\u00e9f\u00e9renc\u00e9s dans ${allEntries.length} articles</div>
      </header>
      <div class="philosopher-grid">
        ${sorted.map(([name, ids]) => `
          <div class="philosopher-card" onclick="searchPhilosopher('${escapeAttr(name)}')">
            <div class="philosopher-card-name">${name}</div>
            <div class="philosopher-card-count">${ids.length} article${ids.length > 1 ? 's' : ''}</div>
          </div>`).join('')}
      </div>
    </div>`;
  
  currentArticle = null;
  if (isMobile()) { mobileViewingArticle = false; }
}

function searchPhilosopher(name) {
  if (isMobile()) {
    switchTab('search');
    setTimeout(() => {
      const input = document.querySelector('.drawer-search');
      if (input) { input.value = name; input.dispatchEvent(new Event('input')); }
    }, 400);
  } else {
    document.getElementById('searchInput').value = name;
    searchQuery = name;
    renderEntryList();
    showSearchSuggestions('');
  }
}

// ===== EXPORT / IMPORT =====
function exportJSON() {
  const data = {
    version: 1,
    exported: new Date().toISOString(),
    entries: userEntries,
    bookmarks,
    readArticles: [...readArticles],
    readHistory,
    customTags: customArticleTags,
    customTagNames: allCustomTagNames
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'dictionnaire-philosophie-' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importJSON() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data.entries || !Array.isArray(data.entries)) {
          alert('Format invalide.');
          return;
        }
        // Merge entries (avoid exact duplicates by id)
        const existingIds = new Set(userEntries.map(e => e.id));
        let added = 0;
        data.entries.forEach(e => {
          if (!existingIds.has(e.id)) {
            userEntries.push(e);
            existingIds.add(e.id);
            added++;
          }
        });
        // Merge bookmarks
        if (data.bookmarks) {
          data.bookmarks.forEach(b => { if (!bookmarks.includes(b)) bookmarks.push(b); });
          Data.saveBookmarks();
        }
        // Merge read data
        if (data.readArticles) {
          data.readArticles.forEach(id => readArticles.add(id));
          Data.saveReadArticles();
        }
        saveUserEntries();
        updateEntryCount();
        buildAlphaNav();
        buildFilterBar();
        renderEntryList();
        showWelcome();
        alert(`Import r\u00e9ussi : ${added} articles ajout\u00e9s (${data.entries.length - added} d\u00e9j\u00e0 pr\u00e9sents).`);
      } catch (err) {
        alert('Erreur de lecture du fichier : ' + err.message);
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

// ===== DUPLICATE DETECTION =====
function findDuplicate(title) {
  const norm = normalizeText(title);
  return getAllEntries().find(e => normalizeText(e.term) === norm);
}

// ===== EDITOR TOOLBAR =====
function insertMarkup(type) {
  const ta = document.getElementById('editorContent');
  if (!ta) return;
  const markups = {
    bold: ["'''", "'''"],
    italic: ["''", "''"],
    h2: ["\n== ", " ==\n"],
    h3: ["\n=== ", " ===\n"],
    list: ["\n* ", ""],
    quote: ["\n: ", ""],
    ref: ["<ref>", "</ref>"]
  };
  const m = markups[type];
  if (!m) return;
  const start = ta.selectionStart, end = ta.selectionEnd;
  const sel = ta.value.substring(start, end);
  const replacement = m[0] + (sel || 'texte') + m[1];
  ta.value = ta.value.substring(0, start) + replacement + ta.value.substring(end);
  ta.focus();
  ta.selectionStart = start + m[0].length;
  ta.selectionEnd = start + m[0].length + (sel || 'texte').length;
}

function checkDuplicate(title) {
  const warn = document.getElementById('duplicateWarning');
  if (!warn || !title.trim()) { if (warn) warn.innerHTML = ''; return; }
  const dup = findDuplicate(title.trim());
  if (dup && (!editingEntryId || dup.id !== editingEntryId)) {
    warn.innerHTML = `<div class="duplicate-warning">\u26a0 Un article <strong>${dup.term}</strong> existe d\u00e9j\u00e0 dans la cat\u00e9gorie ${dup.category}. <a href="#" onclick="event.preventDefault();navigateTo('${dup.id}')">Voir l\u2019article</a></div>`;
  } else {
    warn.innerHTML = '';
  }
}

// restoreFromIDB is now in Data.restoreFromIDB() (data.js), called from init.js

