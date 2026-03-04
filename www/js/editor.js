// ===== EDITOR =====
function openEditor(entryId) {
  editingEntryId = entryId || null;
  mobileViewingArticle = false;
  currentArticle = null;
  
  if (isMobile()) {
    closeDrawer();
    document.getElementById('mobileArticleBar').style.display = 'none';
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('[data-tab="editor"]')?.classList.add('active');
  }
  
  document.getElementById('bookmarkBtn').style.display = 'none';
  
  const content = document.getElementById('content');
  
  // Pre-fill if editing
  let existingTitle = '', existingCat = '', existingEtym = '', existingTags = '', existingWiki = '';
  let topTitle = 'Nouvel article';
  
  if (editingEntryId) {
    const entry = userEntries.find(e => e.id === editingEntryId);
    if (entry) {
      existingTitle = entry.term;
      existingCat = entry.category;
      existingEtym = entry.etymology;
      existingTags = entry.tags.join(', ');
      existingWiki = entry._wikiSource || '';
      topTitle = 'Modifier l\u2019article';
    }
  }
  
  content.innerHTML = `
    <div class="editor-container">
      <div class="editor-topbar">
        <h2>${topTitle}</h2>
        <div class="editor-actions">
          <button class="btn" onclick="showWelcome()">Annuler</button>
          <button class="btn btn-primary" onclick="saveEntry()">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align:-1px"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/></svg>
            Enregistrer
          </button>
        </div>
      </div>
      
      ${!editingEntryId ? `<div class="import-panel">
        <div class="import-panel-title">Importer depuis Wikilivres</div>
        <div class="import-panel-desc">Saisissez le nom d'un article du Dictionnaire de philosophie, ou collez une URL Wikilivres.</div>
        <div class="import-row">
          <input class="import-input" id="importInput" placeholder="Ex : Substance, Liberté, Concept…  ou URL complète" onkeydown="if(event.key==='Enter')importFromWikibooks()">
          <button class="import-btn" id="importBtn" onclick="importFromWikibooks()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Importer
          </button>
        </div>
        <div class="import-status" id="importStatus"></div>
        <div class="import-or">ou saisie manuelle</div>
      </div>` : ''}
      
      <div class="editor-field">
        <label class="editor-label">Titre de l'article</label>
        <input class="editor-input" id="editorTitle" placeholder="Ex : Substance, Libert\u00e9, Temps\u2026" value="${escapeAttr(existingTitle)}" oninput="checkDuplicate(this.value)">
        <div id="duplicateWarning"></div>
      </div>
      
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
        <div class="editor-field">
          <label class="editor-label">Catégorie</label>
          <input class="editor-input editor-input-small" id="editorCategory" placeholder="Ex : Métaphysique · Ontologie" value="${escapeAttr(existingCat)}">
        </div>
        <div class="editor-field">
          <label class="editor-label">Mots-clés (séparés par des virgules)</label>
          <input class="editor-input editor-input-small" id="editorTags" placeholder="Ex : Aristote, Heidegger, Ontologie" value="${escapeAttr(existingTags)}">
        </div>
      </div>
      
      <div class="editor-field">
        <label class="editor-label">Étymologie</label>
        <input class="editor-input editor-input-small" id="editorEtymology" placeholder="Ex : Du grec ousia (οὐσία), « ce qui est »" value="${escapeAttr(existingEtym)}">
      </div>
      
      <div class="editor-field">
        <label class="editor-label">Contenu (format MediaWiki)</label>
        <div class="editor-tabs" style="display:flex;align-items:center;">
          <button class="editor-tab active" onclick="showEditorTab('write', this)">Écriture</button>
          <button class="editor-tab" onclick="showEditorTab('preview', this)">Aperçu</button>
          <div class="editor-mode-switch" style="margin-left:auto;">
            <button class="editor-mode-btn active" data-mode="wysiwyg" onclick="switchEditorMode('wysiwyg')">Visuel</button>
            <button class="editor-mode-btn" data-mode="wikitext" onclick="switchEditorMode('wikitext')">Wiki</button>
          </div>
        </div>
        <div id="editorWritePanel">
          <div class="editor-toolbar">
            <button onclick="editorMode==='wysiwyg'?wysiwygExec('bold'):insertMarkup('bold')" title="Gras"><b>G</b></button>
            <button onclick="editorMode==='wysiwyg'?wysiwygExec('italic'):insertMarkup('italic')" title="Italique"><i>I</i></button>
            <div class="sep"></div>
            <button onclick="editorMode==='wysiwyg'?wysiwygInsertHeading(2):insertMarkup('h2')" title="Titre de section">H2</button>
            <button onclick="editorMode==='wysiwyg'?wysiwygInsertHeading(3):insertMarkup('h3')" title="Sous-section">H3</button>
            <div class="sep"></div>
            <button onclick="editorMode==='wysiwyg'?wysiwygExec('insertUnorderedList'):insertMarkup('list')" title="Liste \u00e0 puces">\u2022</button>
            <button onclick="editorMode==='wysiwyg'?wysiwygInsertQuote():insertMarkup('quote')" title="Citation">\u275d</button>
            <button onclick="insertMarkup('ref')" title="R\u00e9f\u00e9rence">[n]</button>
          </div>
          <div class="wysiwyg-area" id="wysiwygArea" contenteditable="true"></div>
          <textarea class="editor-textarea" id="editorContent" style="display:none;" placeholder="Collez ici votre texte au format MediaWiki\u2026

== Titre de section ==

Paragraphe de texte avec ''italique'' et '''gras'''.

=== Sous-section ===

* Élément de liste
* Autre élément

<ref>Auteur, Titre, Éditeur, Année</ref>">${escapeHtml(existingWiki)}</textarea>
        </div>
        <div id="editorPreviewPanel" style="display:none;">
          <div class="editor-preview" id="editorPreviewContent">
            <p style="color:var(--muted-light);font-style:italic;">Cliquez sur « Aperçu » pour voir le rendu…</p>
          </div>
        </div>
      </div>
      
      <details class="editor-help">
        <summary>Aide — Syntaxe MediaWiki</summary>
        <div class="editor-help-content">
          <code>== Titre ==</code> → Titre de section<br>
          <code>=== Sous-titre ===</code> → Sous-section<br>
          <code>''italique''</code> → <em>italique</em><br>
          <code>'''gras'''</code> → <strong>gras</strong><br>
          <code>* élément</code> → Liste à puces<br>
          <code>:texte indenté</code> → Citation / bloc indenté<br>
          <code>&lt;ref&gt;Source&lt;/ref&gt;</code> → Référence (extraite automatiquement)<br>
          <code>{{e}}</code> → <sup>e</sup> (exposant ordinal)<br>
          <code>== Bibliographie ==</code> → Section spéciale : les entrées <code>* …</code> deviennent les références affichées<br>
          <code>== Notes et références ==</code> → Section ignorée dans le corps de l'article
        </div>
      </details>
    </div>`;
  
  if (!isMobile()) content.scrollTop = 0;
  else window.scrollTo({ top: 0, behavior: 'instant' });
  
  // Init WYSIWYG with existing content
  setTimeout(function() {
    var area = document.getElementById('wysiwygArea');
    var ta = document.getElementById('editorContent');
    if (area && ta && ta.value) {
      area.innerHTML = wikitextToHtml(ta.value);
    }
    editorMode = 'wysiwyg';
  }, 50);
}

function escapeAttr(s) { return s.replace(/"/g, '&quot;').replace(/</g, '&lt;'); }
function escapeHtml(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

// ===== WIKIBOOKS IMPORT (JSONP — bypasses CORS/sandbox) =====
function jsonp(url) {
  return new Promise((resolve, reject) => {
    const cbName = '_wbcb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    const timeout = setTimeout(() => {
      delete window[cbName];
      script.remove();
      reject(new Error('timeout'));
    }, 10000);
    
    window[cbName] = (data) => {
      clearTimeout(timeout);
      delete window[cbName];
      script.remove();
      resolve(data);
    };
    
    const script = document.createElement('script');
    script.src = url + '&callback=' + cbName;
    script.onerror = () => {
      clearTimeout(timeout);
      delete window[cbName];
      script.remove();
      reject(new Error('network'));
    };
    document.head.appendChild(script);
  });
}

async function importFromWikibooks() {
  const input = document.getElementById('importInput');
  const statusEl = document.getElementById('importStatus');
  const btn = document.getElementById('importBtn');
  let raw = input.value.trim();
  
  if (!raw) { input.focus(); return; }
  
  // Extract page title from URL or use as concept name
  let pageTitle = '';
  const urlMatch = raw.match(/fr\.wikibooks\.org\/wiki\/([^#?]+)/);
  const urlMatch2 = raw.match(/fr\.wikibooks\.org\/w\/index\.php\?title=([^&#]+)/);
  
  if (urlMatch) {
    pageTitle = decodeURIComponent(urlMatch[1].replace(/_/g, ' ').trim());
  } else if (urlMatch2) {
    pageTitle = decodeURIComponent(urlMatch2[1].replace(/_/g, ' ').trim());
  } else {
    pageTitle = raw.trim();
  }
  
  // Build list of titles to try
  let pagesToTry = [];
  if (pageTitle.toLowerCase().startsWith('dictionnaire')) {
    pagesToTry.push(pageTitle);
  } else {
    const cap = pageTitle.charAt(0).toUpperCase() + pageTitle.slice(1);
    const low = pageTitle.charAt(0).toLowerCase() + pageTitle.slice(1);
    pagesToTry.push('Dictionnaire de philosophie/' + cap);
    if (cap !== low) pagesToTry.push('Dictionnaire de philosophie/' + low);
    // Variant with accented first letter kept as-is
    pagesToTry.push('Dictionnaire de philosophie/' + pageTitle);
  }
  // Deduplicate
  pagesToTry = [...new Set(pagesToTry)];
  
  statusEl.className = 'import-status loading';
  statusEl.innerHTML = '\u23f3 Chargement depuis fr.wikibooks.org\u2026';
  btn.disabled = true;
  
  let wikitext = null;
  let usedTitle = '';
  
  for (const title of pagesToTry) {
    try {
      const apiUrl = 'https://fr.wikibooks.org/w/api.php?action=query'
        + '&titles=' + encodeURIComponent(title)
        + '&prop=revisions&rvprop=content|ids|timestamp&rvslots=main'
        + '&format=json&formatversion=2';
      
      const data = await jsonp(apiUrl);
      
      if (data.query && data.query.pages) {
        const page = data.query.pages[0];
        if (page && !page.missing && page.revisions && page.revisions.length > 0) {
          const rev = page.revisions[0];
          wikitext = (rev.slots && rev.slots.main && rev.slots.main.content) || null;
          if (wikitext) {
            usedTitle = page.title || title;
            break;
          }
        }
      }
    } catch (e) {
      console.log('JSONP attempt failed for:', title, e.message);
    }
  }
  
  btn.disabled = false;
  
  if (!wikitext) {
    const tried = pagesToTry.map(t => '\u00ab\u202f' + t + '\u202f\u00bb').join(', ');
    statusEl.className = 'import-status error';
    statusEl.innerHTML = '\u2717 Article introuvable. Pages test\u00e9es\u202f: ' + tried 
      + '. <a href="https://fr.wikibooks.org/wiki/Dictionnaire_de_philosophie" target="_blank" style="color:inherit;text-decoration:underline;">V\u00e9rifier sur Wikilivres</a>';
    return;
  }
  
  // Success — fill the editor
  wikitext = cleanWikitext(wikitext);
  
  let displayTitle = usedTitle;
  if (displayTitle.includes('/')) {
    displayTitle = displayTitle.split('/').pop();
  }
  
  document.getElementById('editorTitle').value = displayTitle;
  document.getElementById('editorContent').value = wikitext;
  
  const catGuess = guessCategory(wikitext, displayTitle);
  if (catGuess && !document.getElementById('editorCategory').value) {
    document.getElementById('editorCategory').value = catGuess;
  }
  
  const tagGuess = guessTags(wikitext);
  if (tagGuess && !document.getElementById('editorTags').value) {
    document.getElementById('editorTags').value = tagGuess;
  }
  
  // Try to extract etymology
  if (!document.getElementById('editorEtymology').value) {
    const etymMatch = wikitext.match(/(?:^|\n)\s*(Du (?:latin|grec|fran[cç]ais|moyen)[^\n]{10,200})/i);
    if (etymMatch) {
      document.getElementById('editorEtymology').value = etymMatch[1].replace(/'''|''/g, '').trim();
    }
  }
  
  statusEl.className = 'import-status success';
  statusEl.innerHTML = '\u2713 Article \u00ab\u202f<strong>' + escapeHtml(displayTitle) + '</strong>\u202f\u00bb import\u00e9 depuis <em>' + escapeHtml(usedTitle) + '</em>. V\u00e9rifiez les champs et cliquez sur <strong>Enregistrer</strong>.';
  
  document.getElementById('editorTitle').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function cleanWikitext(text) {
  // Remove inter-wiki / category links at the end
  text = text.replace(/\[\[Catégorie:[^\]]*\]\]/g, '');
  text = text.replace(/\[\[(en|de|es|it|pt|ja|zh|ko):[^\]]*\]\]/g, '');
  
  // Remove __TOC__, __NOTOC__, etc.
  text = text.replace(/__[A-Z]+__/g, '');
  
  // Remove {{ébauche}}, {{à recycler}}, etc. maintenance templates (keep {{e}} and {{references}})
  text = text.replace(/\{\{(ébauche|[àa] recycler|recycler|article court|suppression|stub|cleanup|redirect)[^}]*\}\}/gi, '');
  
  // Remove image markup [[Fichier:...]] and [[File:...]]
  text = text.replace(/\[\[(Fichier|File|Image):[^\]]*\]\]/gi, '');
  
  // Trim leading/trailing whitespace and multiple blank lines
  text = text.replace(/\n{3,}/g, '\n\n').trim();
  
  return text;
}

function guessCategory(wikitext, title) {
  const text = wikitext.toLowerCase();
  const t = title.toLowerCase();

  // categoryPatterns data is in data.js
  for (const [regex, cat] of categoryPatterns) {
    if (regex.test(text) || regex.test(t)) return cat;
  }
  return 'Philosophie';
}

function guessTags(wikitext) {
  // Extract philosopher names (bold proper nouns in text)
  const boldNames = [];
  const boldRegex = /'''([A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ]+(?: [A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ]+){0,3})'''/g;
  let m;
  while ((m = boldRegex.exec(wikitext)) !== null) {
    boldNames.push(m[1]);
  }
  
  // Also look for common philosopher names mentioned
  // knownPhilosophers data is in data.js
  
  const found = new Set(boldNames);
  for (const name of knownPhilosophers) {
    if (wikitext.includes(name)) found.add(name);
  }
  
  return [...found].slice(0, 8).join(', ');
}

function showEditorTab(tab, btn) {
  document.querySelectorAll('.editor-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  
  if (tab === 'write') {
    document.getElementById('editorWritePanel').style.display = '';
    document.getElementById('editorPreviewPanel').style.display = 'none';
  } else {
    document.getElementById('editorWritePanel').style.display = 'none';
    document.getElementById('editorPreviewPanel').style.display = '';
    // Render preview
    const wikitext = document.getElementById('editorContent').value;
    const preview = document.getElementById('editorPreviewContent');
    if (wikitext.trim()) {
      const parsed = parseMediaWiki(wikitext);
      preview.innerHTML = `<div class="article-body">${parsed.html}</div>`;
      if (parsed.refs.length > 0) {
        preview.innerHTML += `<div class="article-refs" style="margin-top:1.5rem;"><h4>Références extraites (${parsed.refs.length})</h4>${parsed.refs.map(r => '<p>— ' + r + '</p>').join('')}</div>`;
      }
    } else {
      preview.innerHTML = '<p style="color:var(--muted-light);font-style:italic;">Rien à afficher. Écrivez du contenu dans l\'onglet Écriture.</p>';
    }
  }
}

function saveEntry() {
  const title = document.getElementById('editorTitle').value.trim();
  const category = document.getElementById('editorCategory').value.trim() || 'Philosophie';
  const etymology = document.getElementById('editorEtymology').value.trim();
  const tagsRaw = document.getElementById('editorTags').value.trim();
  const wikitext = getEditorWikitext();
  
  if (!title) {
    alert('Veuillez saisir un titre pour l\u2019article.');
    return;
  }
  if (!wikitext.trim()) {
    alert('Veuillez saisir du contenu au format MediaWiki.');
    return;
  }
  
  const parsed = parseMediaWiki(wikitext);
  const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];
  const letter = title.charAt(0).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const id = editingEntryId || 'user-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
  
  // Extract first paragraph as definition
  const defMatch = parsed.html.match(/<p>([\s\S]*?)<\/p>/);
  const definition = defMatch ? defMatch[1].replace(/<[^>]+>/g, '').substring(0, 300) : '';
  
  const entry = {
    id,
    term: title,
    letter: letter.length === 1 && /[A-Z]/.test(letter) ? letter : title.charAt(0).toUpperCase(),
    category,
    etymology,
    definition,
    content: parsed.html,
    tags,
    refs: parsed.refs,
    related: [],
    _userEntry: true,
    _wikiSource: wikitext
  };
  
  if (editingEntryId) {
    const idx = userEntries.findIndex(e => e.id === editingEntryId);
    if (idx > -1) userEntries[idx] = entry;
    else userEntries.push(entry);
  } else {
    userEntries.push(entry);
  }
  
  saveUserEntries();
  editingEntryId = null;
  
  // Refresh and show the new article
  updateEntryCount();
  buildAlphaNav();
  renderEntryList();
  showArticle(entry.id);
}

function deleteUserEntry(id) {
  if (!confirm('Supprimer cet article personnalisé ?')) return;
  userEntries = userEntries.filter(e => e.id !== id);
  saveUserEntries();
  updateEntryCount();
  buildAlphaNav();
  renderEntryList();
  showWelcome();
}

function updateEntryCount() {
  document.getElementById('entryCount').textContent = getAllEntries().length;
}

