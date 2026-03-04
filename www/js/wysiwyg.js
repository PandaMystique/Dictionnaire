// ===== WYSIWYG EDITOR =====
var editorMode = 'wysiwyg';

function htmlToWikitext(html) {
  var text = html;
  text = text.replace(/<div><br\s*\/?><\/div>/gi, '\n');
  text = text.replace(/<div>/gi, '\n').replace(/<\/div>/gi, '');
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n== $1 ==\n');
  text = text.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '\n=== $1 ===\n');
  text = text.replace(/<b>(.*?)<\/b>/gi, "\'\'\'$1\'\'\'");
  text = text.replace(/<strong>(.*?)<\/strong>/gi, "\'\'\'$1\'\'\'");
  text = text.replace(/<i>(.*?)<\/i>/gi, "\'\'$1\'\'");
  text = text.replace(/<em>(.*?)<\/em>/gi, "\'\'$1\'\'");
  text = text.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, function(m, c) {
    return c.replace(/<[^>]+>/g, '').split('\n').map(function(l) { var t = l.trim(); return t ? ': ' + t : ''; }).filter(Boolean).join('\n');
  });
  text = text.replace(/<li[^>]*>(.*?)<\/li>/gi, '* $1');
  text = text.replace(/<\/?[ou]l[^>]*>/gi, '');
  text = text.replace(/<\/?p[^>]*>/gi, '\n');
  text = text.replace(/<[^>]+>/g, '');
  text = text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ');
  text = text.replace(/\n{3,}/g, '\n\n').trim();
  return text;
}

function wikitextToHtml(wikitext) {
  if (!wikitext || !wikitext.trim()) return '';
  var parsed = parseMediaWiki(wikitext);
  return parsed.html;
}

function switchEditorMode(mode) {
  var wysiwygArea = document.getElementById('wysiwygArea');
  var textArea = document.getElementById('editorContent');
  if (!wysiwygArea || !textArea) return;
  
  document.querySelectorAll('.editor-mode-btn').forEach(function(b) { b.classList.remove('active'); });
  var activeBtn = document.querySelector('.editor-mode-btn[data-mode="' + mode + '"]');
  if (activeBtn) activeBtn.classList.add('active');
  
  if (mode === 'wysiwyg') {
    var wiki = textArea.value;
    if (wiki) wysiwygArea.innerHTML = wikitextToHtml(wiki);
    wysiwygArea.style.display = '';
    textArea.style.display = 'none';
    editorMode = 'wysiwyg';
  } else {
    if (editorMode === 'wysiwyg') {
      textArea.value = htmlToWikitext(wysiwygArea.innerHTML);
    }
    wysiwygArea.style.display = 'none';
    textArea.style.display = '';
    editorMode = 'wikitext';
  }
}

function wysiwygExec(cmd, value) {
  document.execCommand(cmd, false, value || null);
  var area = document.getElementById('wysiwygArea');
  if (area) area.focus();
}

function wysiwygInsertHeading(level) {
  document.execCommand('formatBlock', false, level === 2 ? 'h3' : 'h4');
  var area = document.getElementById('wysiwygArea');
  if (area) area.focus();
}

function wysiwygInsertQuote() {
  document.execCommand('formatBlock', false, 'blockquote');
  var area = document.getElementById('wysiwygArea');
  if (area) area.focus();
}

function getEditorWikitext() {
  if (editorMode === 'wysiwyg') {
    var area = document.getElementById('wysiwygArea');
    return area ? htmlToWikitext(area.innerHTML) : document.getElementById('editorContent').value;
  }
  return document.getElementById('editorContent').value;
}
