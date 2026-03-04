// ===== TOC PANEL =====
function openTocPanel() {
  var overlay = document.getElementById('tocPanelOverlay');
  populateTocPanel();
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  setTimeout(function() {
    var active = document.querySelector('#tocPanelLinks a.active');
    if (active) active.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, 200);
}

function closeTocPanel() {
  var overlay = document.getElementById('tocPanelOverlay');
  overlay.classList.remove('open');
  document.body.style.overflow = '';
}

// Swipe-right-to-dismiss for TOC panel
(function() {
  var panel = document.getElementById('tocPanel');
  if (!panel) return;
  var startX = 0, currentX = 0, isDragging = false;
  panel.addEventListener('touchstart', function(e) {
    startX = e.touches[0].clientX; currentX = startX; isDragging = true;
  }, { passive: true });
  panel.addEventListener('touchmove', function(e) {
    if (!isDragging) return;
    currentX = e.touches[0].clientX;
    var diff = currentX - startX;
    if (diff > 0) { panel.style.transform = 'translateX(' + diff + 'px)'; panel.style.transition = 'none'; }
  }, { passive: true });
  panel.addEventListener('touchend', function() {
    if (!isDragging) return; isDragging = false;
    var diff = currentX - startX;
    panel.style.transition = ''; panel.style.transform = '';
    if (diff > 80) closeTocPanel();
  }, { passive: true });
})();

function populateTocPanel() {
  var container = document.getElementById('tocPanelLinks');
  if (!container) return;
  
  // Show article title
  var titleDiv = document.querySelector('.toc-panel-title');
  if (titleDiv && currentArticle) {
    titleDiv.textContent = currentArticle.term;
  } else if (titleDiv) {
    titleDiv.textContent = 'Sommaire';
  }
  
  var contentEl = document.getElementById('content');
  if (!contentEl) { container.innerHTML = '<div style="color:var(--muted-light);font-size:0.85rem;padding:0.5rem;">Aucun sommaire disponible.</div>'; return; }
  
  var headings = contentEl.querySelectorAll('.article-body h3, .article-body h4');
  if (headings.length < 2) {
    container.innerHTML = '<div style="color:var(--muted-light);font-size:0.85rem;padding:0.5rem;">Cet article n\u2019a pas de sections.</div>';
    return;
  }
  
  tocPanelHeadings = headings;
  var html = '';
  for (var i = 0; i < headings.length; i++) {
    var h = headings[i];
    var isSub = h.tagName === 'H4';
    html += '<a href="#" class="' + (isSub ? 'toc-sub' : '') + '" data-toc-idx="' + i + '" onclick="event.preventDefault();tocPanelJump(' + i + ')">' + h.textContent + '</a>';
  }
  
  // Add prev/next article links at bottom
  var allE = getAllEntries();
  var ci = currentArticle ? allE.findIndex(function(en) { return en.id === currentArticle.id; }) : -1;
  if (ci >= 0) {
    html += '<div style="margin-top:1rem;padding-top:0.75rem;border-top:1px solid var(--border-light);">';
    if (ci > 0) {
      html += '<a href="#" onclick="event.preventDefault();closeTocPanel();navigateTo(\'' + allE[ci-1].id + '\')" style="font-size:0.75rem;color:var(--muted-light);display:flex;align-items:center;gap:0.3rem;margin-bottom:0.3rem;">' +
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>' +
        allE[ci-1].term + '</a>';
    }
    if (ci < allE.length - 1) {
      html += '<a href="#" onclick="event.preventDefault();closeTocPanel();navigateTo(\'' + allE[ci+1].id + '\')" style="font-size:0.75rem;color:var(--muted-light);display:flex;align-items:center;gap:0.3rem;justify-content:flex-end;">' +
        allE[ci+1].term +
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg></a>';
    }
    html += '</div>';
  }
  
  container.innerHTML = html;
  updateTocPanelActive();
}

function tocPanelJump(idx) {
  var h = tocPanelHeadings[idx];
  if (h) {
    closeTocPanel();
    setTimeout(function() {
      h.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
  }
}

function updateTocPanelActive() {
  if (!tocPanelHeadings || tocPanelHeadings.length === 0) return;
  var links = document.querySelectorAll('#tocPanelLinks a[data-toc-idx]');
  var active = 0;
  for (var j = 0; j < tocPanelHeadings.length; j++) {
    if (tocPanelHeadings[j].getBoundingClientRect().top < 140) active = j;
  }
  links.forEach(function(a, i) {
    a.classList.toggle('active', i === active);
  });
}

// ===== SETTINGS PANEL =====
