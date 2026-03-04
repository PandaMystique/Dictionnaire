// ===== MEDIAWIKI PARSER =====
function parseMediaWiki(wikitext) {
  // Extract refs
  const refs = [];
  let text = wikitext.replace(/<ref>([\s\S]*?)<\/ref>/g, (_, content) => {
    refs.push(content.trim());
    return '';
  });
  
  // Remove {{references}} and similar
  text = text.replace(/\{\{references\}\}/gi, '');
  
  // Handle {{e}} → <sup>e</sup>
  text = text.replace(/\{\{e\}\}/g, '<sup>e</sup>');
  
  // Split into sections, extract bibliography and notes
  const lines = text.split('\n');
  let bodyLines = [];
  let bibLines = [];
  let inBib = false;
  let inNotes = false;
  let skipSection = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Detect section headers (= Title = or == Title ==)
    const h1Match = trimmed.match(/^=\s*([^=].+?[^=])\s*=$/);
    const h2Match = trimmed.match(/^==\s*(.+?)\s*==$/);
    // Single = heading (top-level mediawiki heading)
    if (h1Match && !trimmed.startsWith('==')) {
      const title = h1Match[1].trim();
      if (/^(notes?\s*(et\s*)?r[eé]f[eé]rences?|r[eé]f[eé]rences?)$/i.test(title)) {
        inNotes = true; inBib = false; skipSection = true; continue;
      }
      if (/^bibliographie$/i.test(title)) {
        inBib = true; inNotes = false; skipSection = true; continue;
      }
      if (/^(sources?\s*primaires?|[eé]tudes?)$/i.test(title)) { continue; }
      skipSection = false; inBib = false; inNotes = false;
    }
    if (h2Match && !trimmed.startsWith('===')) {
      const title = h2Match[1].trim();
      if (/^(notes?\s*(et\s*)?r[eé]f[eé]rences?|r[eé]f[eé]rences?)$/i.test(title)) {
        inNotes = true; inBib = false; skipSection = true; continue;
      }
      if (/^bibliographie$/i.test(title)) {
        inBib = true; inNotes = false; skipSection = true; continue;
      }
      if (/^(sources?\s*primaires?|[eé]tudes?)$/i.test(title)) {
        // Sub-category of bibliography, keep collecting
        continue;
      }
      skipSection = false;
      inBib = false;
      inNotes = false;
    }
    
    const h3Match = trimmed.match(/^===\s*(.+?)\s*===$/);
    if (h3Match) {
      const title = h3Match[1].trim();
      if (/^(sources?\s*primaires?|[eé]tudes?)$/i.test(title)) {
        // Sub-category of bibliography
        inBib = true; continue;
      }
      if (inBib || inNotes) continue;
    }
    
    if (inNotes && !inBib) continue; // skip notes section content
    
    if (inBib) {
      // Collect bibliography entries
      if (trimmed.startsWith('*')) {
        bibLines.push(trimmed.replace(/^\*\s*/, ''));
      }
      continue;
    }
    
    if (!skipSection) {
      bodyLines.push(line);
    }
  }
  
  // Convert body lines to HTML
  const html = convertWikiLinesToHtml(bodyLines);
  
  // Build refs from <ref> tags + bibliography
  const allRefs = [];
  // From bibliography
  for (const bib of bibLines) {
    allRefs.push(convertInlineWiki(bib));
  }
  // From inline refs (if no bibliography provided, use these)
  if (allRefs.length === 0) {
    for (const r of refs) {
      allRefs.push(convertInlineWiki(r));
    }
  }
  
  return { html, refs: allRefs };
}

function convertWikiLinesToHtml(lines) {
  let html = '';
  let inList = false;
  let paragraphBuffer = [];
  
  function flushParagraph() {
    if (paragraphBuffer.length > 0) {
      const text = paragraphBuffer.join(' ').trim();
      if (text) html += `<p>${convertInlineWiki(text)}</p>\n`;
      paragraphBuffer = [];
    }
  }
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Empty line → flush paragraph
    if (trimmed === '') {
      flushParagraph();
      if (inList) { html += '</ul>\n'; inList = false; }
      continue;
    }
    
    // H1 (= Title =) → h3 (top-level section)
    const h1Match = trimmed.match(/^=\s*([^=].+?[^=])\s*=$/);
    if (h1Match && !trimmed.startsWith('==')) {
      flushParagraph();
      if (inList) { html += '</ul>\n'; inList = false; }
      html += `<h3>${convertInlineWiki(h1Match[1])}</h3>\n`;
      continue;
    }

    // H2 (== Title ==) → h3 (section) or h4 if h1 headings exist in doc
    const h2Match = trimmed.match(/^==\s*(.+?)\s*==$/);
    if (h2Match && !trimmed.startsWith('===')) {
      flushParagraph();
      if (inList) { html += '</ul>\n'; inList = false; }
      // Check if this document uses = headings (detect by scanning)
      const hasH1 = lines.some(l => /^=\s*[^=].+[^=]\s*=$/.test(l.trim()) && !l.trim().startsWith('=='));
      html += hasH1 
        ? `<h4>${convertInlineWiki(h2Match[1])}</h4>\n`
        : `<h3>${convertInlineWiki(h2Match[1])}</h3>\n`;
      continue;
    }
    
    // H3 (=== Title ===) → h4 (subsection)
    const h3Match = trimmed.match(/^===\s*(.+?)\s*===$/);
    if (h3Match) {
      flushParagraph();
      if (inList) { html += '</ul>\n'; inList = false; }
      html += `<h4>${convertInlineWiki(h3Match[1])}</h4>\n`;
      continue;
    }
    
    // Indented line (: prefix) → blockquote
    if (trimmed.startsWith(':')) {
      flushParagraph();
      if (inList) { html += '</ul>\n'; inList = false; }
      // Collect consecutive indented lines
      let blockLines = [trimmed.replace(/^:+\s*/, '')];
      while (i + 1 < lines.length && lines[i + 1].trim().startsWith(':')) {
        i++;
        blockLines.push(lines[i].trim().replace(/^:+\s*/, ''));
      }
      html += `<blockquote>${convertInlineWiki(blockLines.join('<br>'))}</blockquote>\n`;
      continue;
    }
    
    // List item (* prefix)
    if (trimmed.startsWith('*') && !trimmed.startsWith('**')) {
      flushParagraph();
      if (!inList) { html += '<ul>\n'; inList = true; }
      html += `<li>${convertInlineWiki(trimmed.replace(/^\*\s*/, ''))}</li>\n`;
      continue;
    }
    
    // Regular text → accumulate in paragraph
    paragraphBuffer.push(trimmed);
  }
  
  flushParagraph();
  if (inList) html += '</ul>\n';
  
  return html;
}

function convertInlineWiki(text) {
  // Bold: '''text''' → <strong>
  text = text.replace(/'''(.+?)'''/g, '<strong>$1</strong>');
  // Italic: ''text'' → <em>
  text = text.replace(/''(.+?)''/g, '<em>$1</em>');
  // {{e}} remnants
  text = text.replace(/\{\{e\}\}/g, '<sup>e</sup>');
  // Remove remaining {{ }}
  text = text.replace(/\{\{.*?\}\}/g, '');
  // External links: [url text]
  text = text.replace(/\[https?:\/\/\S+\s+(.+?)\]/g, '$1');
  // Internal wikilinks: [[Page|text]] or [[Page]]
  text = text.replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, '$2');
  text = text.replace(/\[\[([^\]]+)\]\]/g, '$1');
  // Keep <br/> <br> <sup> <sub> <em> <strong>
  // Strip other HTML-like tags except safe ones
  return text;
}

