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
