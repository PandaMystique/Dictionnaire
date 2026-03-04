// ===== MOBILE TAB BAR =====
function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`[data-tab="${tab}"]`)?.classList.add('active');
  
  if (tab === 'home') {
    closeDrawer();
    showWelcome();
    return;
  }
  
  if (tab === 'editor') {
    closeDrawer();
    openEditor();
    return;
  }
  
  currentDrawerTab = tab;
  openDrawer(tab);
}

// ===== MOBILE DRAWER =====
function openDrawer(tab) {
  const drawer = document.getElementById('mobileDrawer');
  const header = document.getElementById('drawerHeader');
  const content = document.getElementById('drawerContent');
  const alphaStrip = document.getElementById('drawerAlpha');
  
  drawer.classList.add('open');
  document.body.style.overflow = 'hidden';
  
  const allEntries = getAllEntries();
  
  if (tab === 'index') {
    header.innerHTML = `<div class="drawer-title">Index des articles</div>`;
    buildDrawerAlpha();
    alphaStrip.style.display = 'flex';
    renderDrawerEntries(allEntries);
  } else if (tab === 'search') {
    header.innerHTML = `
      <div class="drawer-title">Recherche</div>
      <div class="drawer-search-wrap">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        <input type="text" class="drawer-search" placeholder="Concept, philosophe, domaine\u2026" autocomplete="off">
      </div>`;
    
    // Category filter chips
    const cats = getCategories();
    const filterHtml = `<div class="drawer-filter-strip" id="drawerFilterStrip">
      <button class="drawer-filter-chip active" data-cat="" onclick="drawerFilterCategory('', this)">Tout</button>
      ${cats.map(c => `<button class="drawer-filter-chip" data-cat="${c}" onclick="drawerFilterCategory('${c.replace(/'/g, "\\'")}', this)">${c}</button>`).join('')}
    </div>`;
    
    alphaStrip.style.display = 'none';
    
    // Insert filter strip after header
    content.innerHTML = '';
    header.insertAdjacentHTML('afterend', filterHtml);
    
    drawerSearchState = { query: '', category: '' };
    renderDrawerSearchResults(allEntries);
    
    setTimeout(() => {
      const input = document.querySelector('.drawer-search');
      input?.focus();
      input?.addEventListener('input', (e) => {
        drawerSearchState.query = e.target.value.trim();
        applyDrawerSearch(allEntries);
      });
    }, 400);
  } else if (tab === 'favorites') {
    header.innerHTML = `<div class="drawer-title">Favoris</div>`;
    alphaStrip.style.display = 'none';
    const favEntries = allEntries.filter(e => bookmarks.includes(e.id));
    if (favEntries.length === 0) {
      content.innerHTML = `<div style="text-align:center;padding:3rem 1.5rem;">
        <div style="font-size:2.5rem;opacity:0.2;margin-bottom:1rem;">\u2605</div>
        <div style="font-family:var(--serif);font-size:1.2rem;color:var(--muted);margin-bottom:0.5rem;">Aucun favori</div>
        <div style="font-size:0.85rem;color:var(--muted-light);">Ajoutez des articles \u00e0 vos favoris pour les retrouver ici.</div>
      </div>`;
    } else {
      renderDrawerEntries(favEntries);
    }
  }
}

let drawerSearchState = { query: '', category: '' };

function drawerFilterCategory(cat, btn) {
  drawerSearchState.category = cat;
  document.querySelectorAll('.drawer-filter-chip').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const allEntries = getAllEntries();
  applyDrawerSearch(allEntries);
}

function applyDrawerSearch(allEntries) {
  let results = allEntries;
  if (drawerSearchState.query) {
    results = results.filter(ent => {
      const target = `${ent.term} ${ent.category} ${ent.definition} ${ent.tags.join(' ')} ${ent.etymology} ${ent.content.replace(/<[^>]+>/g, '')}`;
      return fuzzyMatch(drawerSearchState.query, target);
    });
  }
  if (drawerSearchState.category) {
    results = results.filter(ent => ent.category.includes(drawerSearchState.category));
  }
  renderDrawerSearchResults(results);
}

function renderDrawerSearchResults(entries) {
  // Add count before entries
  const countEl = document.getElementById('drawerResultsCount');
  if (countEl) countEl.remove();
  
  const content = document.getElementById('drawerContent');
  const countHtml = `<div class="drawer-results-count" id="drawerResultsCount">${entries.length} r\u00e9sultat${entries.length !== 1 ? 's' : ''}</div>`;
  content.insertAdjacentHTML('beforebegin', countHtml);
  
  renderDrawerEntries(entries);
}

function closeDrawer() {
  const drawer = document.getElementById('mobileDrawer');
  drawer.classList.remove('open');
  document.body.style.overflow = '';
  currentDrawerTab = null;
  // Cleanup injected elements
  document.getElementById('drawerResultsCount')?.remove();
  document.getElementById('drawerFilterStrip')?.remove();
}

function buildDrawerAlpha() {
  const strip = document.getElementById('drawerAlpha');
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const usedLetters = new Set(getAllEntries().map(e => e.letter));
  
  strip.innerHTML = `<button class="drawer-alpha-btn active" onclick="drawerFilterLetter(null, this)">\u2217</button>` +
    letters.map(l => 
      `<button class="drawer-alpha-btn ${usedLetters.has(l) ? 'has-entries' : ''}" onclick="drawerFilterLetter('${l}', this)">${l}</button>`
    ).join('');
}

let drawerLetterFilterState = null;

function drawerFilterLetter(letter, btn) {
  drawerLetterFilterState = letter;
  document.querySelectorAll('.drawer-alpha-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  
  let entries = getAllEntries();
  if (letter) entries = entries.filter(e => e.letter === letter);
  renderDrawerEntries(entries);
  
  btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
}

function renderDrawerEntries(entries) {
  const content = document.getElementById('drawerContent');
  
  if (entries.length === 0) {
    content.innerHTML = `<div style="text-align:center;padding:3rem 1.5rem;">
      <div style="font-size:2.5rem;opacity:0.2;margin-bottom:1rem;">\u2205</div>
      <div style="font-family:var(--serif);font-size:1.2rem;color:var(--muted);">Aucun r\u00e9sultat</div>
    </div>`;
    return;
  }
  
  const grouped = {};
  entries.forEach(e => {
    if (!grouped[e.letter]) grouped[e.letter] = [];
    grouped[e.letter].push(e);
  });
  
  let html = '';
  Object.keys(grouped).sort().forEach(letter => {
    html += `<div class="drawer-letter-divider">${letter}</div>`;
    grouped[letter].forEach(entry => {
      const isBookmarked = bookmarks.includes(entry.id);
      const isUser = entry._userEntry;
      html += `
        <div class="drawer-entry" onclick="navigateTo('${entry.id}')">
          <div class="drawer-entry-letter">${isUser ? '\u270e' : entry.letter}</div>
          <div class="drawer-entry-text">
            <div class="drawer-entry-name">${entry.term}</div>
            <div class="drawer-entry-cat">${entry.category}</div>
          </div>
          ${isBookmarked ? '<div class="drawer-entry-bookmark">\u2605</div>' : ''}
          <div class="drawer-entry-arrow">\u203a</div>
        </div>`;
    });
  });
  content.innerHTML = html;
}
