// ===== AUTO-LINKING =====
function autoLinkContent(html, currentId) {
  const allEntries = getAllEntries();
  // Build lookup of terms → ids (longest first to avoid partial matches)
  const terms = allEntries
    .filter(e => e.id !== currentId)
    .map(e => ({ term: e.term, id: e.id }))
    .sort((a, b) => b.term.length - a.term.length);
  
  // Only replace in text nodes (not inside tags or existing links)
  // We process the HTML by splitting around tags
  const linked = new Set();
  
  for (const { term, id } of terms) {
    if (linked.has(id)) continue;
    // Escape special regex characters in term
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Match whole word, case insensitive, but not inside HTML tags or already linked
    const regex = new RegExp(`(?<![<\\/\\w"=])\\b(${escaped})\\b(?![^<]*>)(?![^<]*<\\/a>)`, 'i');
    if (regex.test(html)) {
      html = html.replace(regex, `<a class="auto-link" onclick="navigateTo('${id}')">$1</a>`);
      linked.add(id);
    }
  }
  
  return html;
}

// ===== AUTO-DETECT RELATED =====
function detectRelated(entry) {
  const allEntries = getAllEntries();
  const content = (entry.content + ' ' + entry.definition + ' ' + entry.tags.join(' ')).toLowerCase();
  const related = [];
  
  for (const other of allEntries) {
    if (other.id === entry.id) continue;
    if (entry.related && entry.related.includes(other.id)) continue;
    // Check if the other term appears in this article's content
    const termNorm = normalizeText(other.term);
    const contentNorm = normalizeText(content);
    if (contentNorm.includes(termNorm) && termNorm.length > 3) {
      related.push(other.id);
    }
  }
  
  return related.slice(0, 8);
}

// ===== MASS IMPORT =====
async function massImportFromWikibooks() {
  if (massImportRunning) return;
  massImportRunning = true;
  
  const statusEl = document.getElementById('massImportStatus');
  const progressFill = document.getElementById('massImportFill');
  const progressPanel = document.getElementById('massImportProgress');
  const btn = document.getElementById('massImportBtn');
  
  if (progressPanel) progressPanel.style.display = 'block';
  if (btn) btn.disabled = true;
  
  const setStatus = (text, pct) => {
    if (statusEl) statusEl.innerHTML = `<span>${text}</span><span>${Math.round(pct)}%</span>`;
    if (progressFill) progressFill.style.width = pct + '%';
  };
  
  setStatus('R\u00e9cup\u00e9ration de la liste des articles\u2026', 2);
  
  // Step 1: Get list of all subpages of Dictionnaire_de_philosophie
  let pageList = [];
  try {
    const data = await jsonp(
      'https://fr.wikibooks.org/w/api.php?action=query&list=allpages'
      + '&apprefix=Dictionnaire+de+philosophie/'
      + '&apnamespace=0&aplimit=500&format=json'
    );
    if (data.query && data.query.allpages) {
      pageList = data.query.allpages.map(p => p.title);
    }
  } catch (e) {
    setStatus('\u2717 Impossible de r\u00e9cup\u00e9rer la liste. V\u00e9rifiez votre connexion.', 0);
    massImportRunning = false;
    if (btn) btn.disabled = false;
    return;
  }
  
  if (pageList.length === 0) {
    setStatus('\u2717 Aucun article trouv\u00e9 sur Wikilivres.', 0);
    massImportRunning = false;
    if (btn) btn.disabled = false;
    return;
  }
  
  // Filter out already existing entries and single-letter index pages
  const existingTerms = new Set(getAllEntries().map(e => normalizeText(e.term)));
  const toImport = pageList.filter(title => {
    const display = title.split('/').pop();
    // Skip single-letter index pages (A, B, C, etc.)
    if (/^[A-Z\u00C0-\u00FF]$/i.test(display.trim())) return false;
    // Skip meta pages (Sommaire, Index, etc.)
    if (/^(Sommaire|Index|Pr[eé]face)$/i.test(display.trim())) return false;
    return !existingTerms.has(normalizeText(display));
  });
  
  setStatus(`${toImport.length} articles \u00e0 importer (${pageList.length - toImport.length} d\u00e9j\u00e0 pr\u00e9sents)`, 5);
  
  if (toImport.length === 0) {
    setStatus('✓ Tous les articles sont déjà importés. <a href="#" onclick="event.preventDefault();document.getElementById(\'updateOverlay\')?.remove();checkForUpdates();" style="color:var(--accent);text-decoration:underline;">Vérifier les mises à jour</a>', 100);
    massImportRunning = false;
    if (btn) btn.disabled = false;
    return;
  }
  
  // Step 2: Import each article
  let imported = 0;
  let failed = 0;
  
  for (let i = 0; i < toImport.length; i++) {
    const title = toImport[i];
    const pct = 5 + (95 * (i + 1) / toImport.length);
    const displayTitle = title.split('/').pop().replace(/\//g, ' & ');
    
    setStatus(`${displayTitle} (${i + 1}/${toImport.length})`, pct);
    
    try {
      const data = await jsonp(
        'https://fr.wikibooks.org/w/api.php?action=query'
        + '&titles=' + encodeURIComponent(title)
        + '&prop=revisions&rvprop=content|ids|timestamp&rvslots=main'
        + '&format=json&formatversion=2'
      );
      
      const page = data.query?.pages?.[0];
      if (page && !page.missing && page.revisions?.length > 0) {
        const rev = page.revisions[0];
        const wikitext = cleanWikitext(rev.slots?.main?.content || '');
        if (wikitext.length > 50) {
          const parsed = parseMediaWiki(wikitext);
          const letter = displayTitle.charAt(0).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const defMatch = parsed.html.match(/<p>([\s\S]*?)<\/p>/);
          const definition = defMatch ? defMatch[1].replace(/<[^>]+>/g, '').substring(0, 300) : '';
          
          const entry = {
            id: 'user-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
            term: displayTitle,
            letter: /^[A-Z]$/.test(letter) ? letter : displayTitle.charAt(0).toUpperCase(),
            category: guessCategory(wikitext, displayTitle),
            etymology: '',
            definition,
            content: parsed.html,
            tags: guessTags(wikitext).split(', ').filter(Boolean),
            refs: parsed.refs,
            related: [],
            _userEntry: true,
            _wikiSource: wikitext,
            _wikiRevId: rev.revid || null,
            _wikiTimestamp: rev.timestamp || null,
            _wikiTitle: title,
            _importDate: new Date().toISOString()
          };
          
          userEntries.push(entry);
          imported++;
          
          // Periodic save every 10 articles (prevents data loss on crash)
          if (imported % 10 === 0) {
            saveUserEntries();
          }
        }
      }
    } catch (e) {
      failed++;
    }
    
    // Small delay to not hammer the API
    await new Promise(r => setTimeout(r, 150));
  }
  
  // Final save and refresh
  saveUserEntries();
  updateEntryCount();
  buildAlphaNav();
  buildFilterBar();
  renderEntryList();
  
  // Ensure completion shows even if DOM was partially refreshed
  const finalStatus = document.getElementById('massImportStatus');
  const finalFill = document.getElementById('massImportFill');
  if (finalStatus) finalStatus.innerHTML = `<span>✓ Import terminé\u202f: ${imported} articles importés` + (failed > 0 ? `, ${failed} échecs` : '') + `</span><span>100%</span>`;
  if (finalFill) finalFill.style.width = '100%';
  
  massImportRunning = false;
  if (btn) btn.disabled = false;
} // if editing an existing user entry

