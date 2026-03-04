// ===== HIGHLIGHT MODE =====
function toggleHighlightMode(btn) {
  Data.setPref('highlightMode', !Data.pref('highlightMode'));
  if (btn) btn.classList.toggle('on', Data.pref('highlightMode'));
  document.body.classList.toggle('highlight-mode', Data.pref('highlightMode'));
}

function handleHighlightSelection() {
  if (!Data.pref('highlightMode') || !currentArticle) return;
  var sel = window.getSelection();
  if (!sel || sel.isCollapsed || !sel.rangeCount) return;
  var range = sel.getRangeAt(0);
  var body = document.querySelector('.article-body');
  if (!body || !body.contains(range.commonAncestorContainer)) return;
  var text = sel.toString().trim();
  if (text.length < 3) return;

  var span = document.createElement('span');
  span.className = 'user-highlight';
  span.title = 'Cliquer pour supprimer le surlignage';
  span.onclick = function(e) {
    e.stopPropagation();
    var parent = this.parentNode;
    while (this.firstChild) parent.insertBefore(this.firstChild, this);
    parent.removeChild(this);
    saveHighlights();
  };
  try {
    range.surroundContents(span);
    sel.removeAllRanges();
    saveHighlights();
  } catch(e) {}
}

function saveHighlights() {
  if (!currentArticle) return;
  var body = document.querySelector('.article-body');
  if (!body) return;
  var highlights = [];
  body.querySelectorAll('.user-highlight').forEach(function(hl) {
    highlights.push(hl.textContent);
  });
  Data.getHighlights()[currentArticle.id] = highlights;
  Data.saveHighlights();
}

function restoreHighlights(id) {
  var saved = Data.getHighlights()[id];
  if (!saved || saved.length === 0) return;
  var body = document.querySelector('.article-body');
  if (!body) return;

  saved.forEach(function(text) {
    if (!text || text.length < 3) return;
    var walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT, null, false);
    var node;
    while (node = walker.nextNode()) {
      var idx = node.textContent.indexOf(text);
      if (idx >= 0 && !node.parentElement.classList.contains('user-highlight')) {
        var range = document.createRange();
        range.setStart(node, idx);
        range.setEnd(node, idx + text.length);
        var span = document.createElement('span');
        span.className = 'user-highlight';
        span.title = 'Cliquer pour supprimer le surlignage';
        span.onclick = function(e) {
          e.stopPropagation();
          var parent = this.parentNode;
          while (this.firstChild) parent.insertBefore(this.firstChild, this);
          parent.removeChild(this);
          saveHighlights();
        };
        try { range.surroundContents(span); } catch(e) {}
        break;
      }
    }
  });
}

// ===== IMMERSIVE MODE =====
var immersiveMode = false;

function toggleImmersive() {
  immersiveMode = !immersiveMode;
  document.body.classList.toggle('immersive-mode', immersiveMode);
  if (!immersiveMode) {
    if (currentArticle) {
      showReadingToolbar();
      var pm = document.getElementById('progressMap');
      if (pm) pm.style.display = currentArticle ? 'block' : 'none';
    }
  } else {
    hideReadingToolbar();
  }
}

// ===== SCROLL POSITION BOOKMARK =====
function saveScrollPos() {
  if (!currentArticle) return;
  var contentEl = document.querySelector('.content');
  var scrollY = isMobile() ? window.scrollY : (contentEl ? contentEl.scrollTop : 0);
  var article = document.querySelector('.article');
  if (!article) return;
  var articleH = article.scrollHeight;
  if (articleH < 100) return;
  var pct = scrollY / articleH;
  var positions = Data.getScrollPositions();
  if (pct < 0.03) {
    delete positions[currentArticle.id];
  } else {
    positions[currentArticle.id] = { pct: pct, time: Date.now() };
  }
  Data.saveScrollPositions();
}

function restoreScrollPos(id) {
  var positions = Data.getScrollPositions();
  var saved = positions[id];
  if (!saved || !saved.pct) return;
  if (Date.now() - saved.time > 7 * 86400000) {
    delete positions[id];
    Data.saveScrollPositions();
    return;
  }
  setTimeout(function() {
    var article = document.querySelector('.article');
    if (!article) return;
    var targetY = saved.pct * article.scrollHeight;
    if (isMobile()) {
      window.scrollTo({ top: targetY, behavior: 'smooth' });
    } else {
      var contentEl = document.querySelector('.content');
      if (contentEl) contentEl.scrollTo({ top: targetY, behavior: 'smooth' });
    }
    showResumeIndicator(targetY);
  }, 200);
}

function showResumeIndicator(scrollY) {
  var body = document.querySelector('.article-body');
  if (!body) return;
  var paras = body.querySelectorAll('p, h3, h4');
  for (var i = 0; i < paras.length; i++) {
    var elTop = paras[i].offsetTop;
    if (elTop >= scrollY - 50) {
      var marker = document.createElement('div');
      marker.className = 'scroll-resume';
      marker.title = 'Reprise de lecture';
      paras[i].style.position = 'relative';
      paras[i].appendChild(marker);
      break;
    }
  }
}

// ===== PROGRESS MAP =====
function updateProgressMap() {
  var map = document.getElementById('progressMap');
  var fill = document.getElementById('progressMapFill');
  if (!map || !fill || !currentArticle) return;

  var article = document.querySelector('.article');
  if (!article) { map.style.display = 'none'; return; }

  map.style.display = 'block';
  var contentEl = document.querySelector('.content');
  var scrollY = isMobile() ? window.scrollY : (contentEl ? contentEl.scrollTop : 0);
  var viewH = isMobile() ? window.innerHeight : (contentEl ? contentEl.clientHeight : window.innerHeight);
  var articleH = article.scrollHeight;
  var pct = Math.min(100, Math.max(0, ((scrollY + viewH * 0.5) / articleH) * 100));
  fill.style.height = pct + '%';
}

// ===== DOUBLE-TAP ZOOM (MOBILE) =====
// lastTapTime is now in state.js
