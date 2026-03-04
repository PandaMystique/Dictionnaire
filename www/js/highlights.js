// ===== HIGHLIGHT MODE =====
function toggleHighlightMode(btn) {
  highlightMode = !highlightMode;
  if (btn) btn.classList.toggle('on', highlightMode);
  document.body.classList.toggle('highlight-mode', highlightMode);
  PhiloDB.set('philo-highlight-mode', highlightMode ? 'true' : 'false');
  try { localStorage.setItem('philo-highlight-mode', highlightMode ? 'true' : 'false'); } catch(e) {}
}

function handleHighlightSelection() {
  if (!highlightMode || !currentArticle) return;
  var sel = window.getSelection();
  if (!sel || sel.isCollapsed || !sel.rangeCount) return;
  var range = sel.getRangeAt(0);
  var body = document.querySelector('.article-body');
  if (!body || !body.contains(range.commonAncestorContainer)) return;
  var text = sel.toString().trim();
  if (text.length < 3) return;
  
  // Wrap selection in highlight span
  var span = document.createElement('span');
  span.className = 'user-highlight';
  span.title = 'Cliquer pour supprimer le surlignage';
  span.onclick = function(e) {
    e.stopPropagation();
    // Unwrap highlight
    var parent = this.parentNode;
    while (this.firstChild) parent.insertBefore(this.firstChild, this);
    parent.removeChild(this);
    saveHighlights();
  };
  try {
    range.surroundContents(span);
    sel.removeAllRanges();
    saveHighlights();
  } catch(e) { /* cross-element selections */ }
}

function saveHighlights() {
  if (!currentArticle) return;
  var body = document.querySelector('.article-body');
  if (!body) return;
  var highlights = [];
  body.querySelectorAll('.user-highlight').forEach(function(hl) {
    highlights.push(hl.textContent);
  });
  articleHighlights[currentArticle.id] = highlights;
  PhiloDB.set('philo-highlights', JSON.stringify(articleHighlights));
}

function restoreHighlights(id) {
  var saved = articleHighlights[id];
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
    // Restore UI elements
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
  if (pct < 0.03) {
    // Near top: remove saved position
    delete articleScrollPos[currentArticle.id];
  } else {
    articleScrollPos[currentArticle.id] = { pct: pct, time: Date.now() };
  }
  PhiloDB.set('philo-scroll-pos', JSON.stringify(articleScrollPos));
}

function restoreScrollPos(id) {
  var saved = articleScrollPos[id];
  if (!saved || !saved.pct) return;
  // Only restore if saved recently (within 7 days)
  if (Date.now() - saved.time > 7 * 86400000) {
    delete articleScrollPos[id];
    PhiloDB.set('philo-scroll-pos', JSON.stringify(articleScrollPos));
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
    // Show a subtle resume indicator
    showResumeIndicator(targetY);
  }, 200);
}

function showResumeIndicator(scrollY) {
  var body = document.querySelector('.article-body');
  if (!body) return;
  // Find the paragraph at this scroll position
  var paras = body.querySelectorAll('p, h3, h4');
  for (var i = 0; i < paras.length; i++) {
    var rect = paras[i].getBoundingClientRect();
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
var lastTapTime = 0;
