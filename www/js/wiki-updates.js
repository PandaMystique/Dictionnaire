// ===== CHECK FOR WIKI UPDATES =====
var updateCheckRunning = false;
var pendingUpdatesCount = parseInt(lsGet("philo-pending-updates", "0")) || 0;

async function silentUpdateCheck() {
  if (updateCheckRunning) return;
  if (userEntries.length === 0) return;
  
  // Only check once per 24h
  var lastCheck = lsGet('philo-last-update-check', '');
  if (lastCheck) {
    var elapsed = Date.now() - new Date(lastCheck).getTime();
    if (elapsed < 24 * 3600 * 1000) return;
  }
  
  updateCheckRunning = true;
  console.log('[UpdateCheck] Starting silent check...');
  
  var wikiEntries = userEntries.filter(function(e) {
    return e._userEntry && (e._wikiTitle || e._wikiSource);
  });
  if (wikiEntries.length === 0) { updateCheckRunning = false; return; }
  
  var titleMap = {};
  wikiEntries.forEach(function(e) {
    titleMap[e._wikiTitle || ('Dictionnaire de philosophie/' + e.term)] = e;
  });
  
  var titles = Object.keys(titleMap);
  var outdatedCount = 0;
  var batchSize = 50;
  
  try {
    for (var b = 0; b < titles.length; b += batchSize) {
      var batch = titles.slice(b, b + batchSize);
      var data = await jsonp(
        'https://fr.wikibooks.org/w/api.php?action=query'
        + '&titles=' + encodeURIComponent(batch.join('|'))
        + '&prop=revisions&rvprop=ids'
        + '&format=json&formatversion=2'
      );
      
      if (data.query && data.query.pages) {
        data.query.pages.forEach(function(page) {
          if (page.missing || !page.revisions || !page.revisions[0]) return;
          var rev = page.revisions[0];
          var entry = titleMap[page.title];
          if (!entry) {
            Object.keys(titleMap).forEach(function(k) {
              if (k.toLowerCase() === page.title.toLowerCase()) entry = titleMap[k];
            });
          }
          if (!entry) return;
          if (entry._wikiRevId && rev.revid && rev.revid !== entry._wikiRevId) {
            outdatedCount++;
          } else if (!entry._wikiRevId) {
            var age = entry._importDate ? (Date.now() - new Date(entry._importDate).getTime()) : Infinity;
            if (age > 30 * 86400000) outdatedCount++;
          }
        });
      }
      await new Promise(function(r) { setTimeout(r, 100); });
    }
  } catch(e) {
    console.log('[UpdateCheck] Error:', e.message);
  }
  
  // Store result
  pendingUpdatesCount = outdatedCount;
  PhiloDB.set('philo-pending-updates', String(outdatedCount));
  try { localStorage.setItem('philo-pending-updates', String(outdatedCount)); } catch(e) {}
  PhiloDB.set('philo-last-update-check', new Date().toISOString());
  try { localStorage.setItem('philo-last-update-check', new Date().toISOString()); } catch(e) {}
  
  updateCheckRunning = false;
  console.log('[UpdateCheck] Done. ' + outdatedCount + ' updates available.');
  
  // Refresh welcome page if currently shown
  if (!currentArticle && outdatedCount > 0) {
    showWelcome();
  }
  
  // Android notification
  if (outdatedCount > 0) {
    sendUpdateNotification(outdatedCount);
  }
}

function sendUpdateNotification(count) {
  // Browser Notification API
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Dictionnaire de Philosophie', {
      body: count + ' article' + (count > 1 ? 's ont' : ' a') + ' été mis à jour sur Wikilivres.',
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">φ</text></svg>',
      tag: 'philo-updates'
    });
  } else if ('Notification' in window && Notification.permission !== 'denied') {
    // Request permission for next time
    Notification.requestPermission();
  }
  
  // Capacitor Local Notifications (Android)
  if (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform && Capacitor.isNativePlatform()) {
    try {
      if (Capacitor.Plugins && Capacitor.Plugins.LocalNotifications) {
        Capacitor.Plugins.LocalNotifications.schedule({
          notifications: [{
            title: 'Mises à jour disponibles',
            body: count + ' article' + (count > 1 ? 's ont' : ' a') + ' été modifié' + (count > 1 ? 's' : '') + ' sur Wikilivres.',
            id: 1001,
            schedule: { at: new Date(Date.now() + 1000) },
            sound: null,
            smallIcon: 'ic_launcher',
            actionTypeId: 'OPEN_APP'
          }]
        });
      }
    } catch(e) { console.log('[Widget] Notification error:', e); }
  }
}

async function checkForUpdates() {
  if (updateCheckRunning) return;
  updateCheckRunning = true;
  
  var overlay = document.createElement('div');
  overlay.className = 'stats-overlay';
  overlay.id = 'updateOverlay';
  overlay.onclick = function(e) { if (e.target === overlay && !updateCheckRunning) overlay.remove(); };
  overlay.innerHTML = '<div class="stats-panel" style="max-width:460px;">' +
    '<h3>Vérification des mises à jour</h3>' +
    '<div id="updateStatus" style="text-align:center;padding:1rem 0;font-size:0.85rem;color:var(--muted);">⏳ Analyse des articles importés…</div>' +
    '<div class="reading-progress-bar" style="margin:0.5rem 0 1rem;"><div class="reading-progress-fill" id="updateProgressFill" style="width:0%;transition:width 0.2s;"></div></div>' +
    '<div id="updateResults"></div>' +
    '<div style="text-align:center;" id="updateActions"></div>' +
  '</div>';
  document.body.appendChild(overlay);
  
  var statusEl = document.getElementById('updateStatus');
  var fillEl = document.getElementById('updateProgressFill');
  var resultsEl = document.getElementById('updateResults');
  var actionsEl = document.getElementById('updateActions');
  
  // Collect wiki-sourced entries with their titles
  var wikiEntries = userEntries.filter(function(e) {
    return e._userEntry && (e._wikiTitle || e._wikiSource);
  });
  
  if (wikiEntries.length === 0) {
    statusEl.textContent = 'Aucun article importé depuis Wikilivres.';
    actionsEl.innerHTML = '<button class="stats-close" onclick="this.closest(\'.stats-overlay\').remove()">Fermer</button>';
    updateCheckRunning = false;
    return;
  }
  
  // Build title map: wikiTitle → entry
  // For entries without _wikiTitle, reconstruct it
  var titleMap = {};
  wikiEntries.forEach(function(e) {
    var title = e._wikiTitle || ('Dictionnaire de philosophie/' + e.term);
    titleMap[title] = e;
  });
  
  var titles = Object.keys(titleMap);
  var outdated = [];
  var checked = 0;
  var batchSize = 50;
  
  // Query API in batches of 50 (titles only, no content — fast)
  for (var b = 0; b < titles.length; b += batchSize) {
    var batch = titles.slice(b, b + batchSize);
    var pct = Math.round(((b + batch.length) / titles.length) * 100);
    statusEl.textContent = 'Vérification… ' + Math.min(b + batchSize, titles.length) + '/' + titles.length;
    fillEl.style.width = pct + '%';
    
    try {
      var data = await jsonp(
        'https://fr.wikibooks.org/w/api.php?action=query'
        + '&titles=' + encodeURIComponent(batch.join('|'))
        + '&prop=revisions&rvprop=ids|timestamp'
        + '&format=json&formatversion=2'
      );
      
      if (data.query && data.query.pages) {
        data.query.pages.forEach(function(page) {
          if (page.missing || !page.revisions || page.revisions.length === 0) return;
          var rev = page.revisions[0];
          var entry = titleMap[page.title];
          if (!entry) {
            // Try normalized title matching
            Object.keys(titleMap).forEach(function(k) {
              if (k.toLowerCase() === page.title.toLowerCase()) entry = titleMap[k];
            });
          }
          if (!entry) return;
          checked++;
          
          // Compare revision IDs
          if (entry._wikiRevId && rev.revid && rev.revid !== entry._wikiRevId) {
            outdated.push({
              entry: entry,
              title: page.title,
              oldRevId: entry._wikiRevId,
              newRevId: rev.revid,
              newTimestamp: rev.timestamp
            });
          } else if (!entry._wikiRevId) {
            // No stored revId → might be outdated, flag if imported long ago
            var importAge = entry._importDate ? (Date.now() - new Date(entry._importDate).getTime()) : Infinity;
            if (importAge > 30 * 86400000) { // > 30 days
              outdated.push({
                entry: entry,
                title: page.title,
                oldRevId: null,
                newRevId: rev.revid,
                newTimestamp: rev.timestamp,
                uncertain: true
              });
            }
          }
        });
      }
    } catch (e) {
      console.log('Update check batch failed:', e.message);
    }
    
    await new Promise(function(r) { setTimeout(r, 100); });
  }
  
  fillEl.style.width = '100%';
  updateCheckRunning = false;
  
  if (outdated.length === 0) {
    statusEl.innerHTML = '✓ Tous les articles sont à jour (' + checked + ' vérifiés)';
    pendingUpdatesCount = 0;
    PhiloDB.set('philo-pending-updates', '0');
    try { localStorage.setItem('philo-pending-updates', '0'); } catch(e) {}
    actionsEl.innerHTML = '<button class="stats-close" onclick="this.closest(\'.stats-overlay\').remove()">Fermer</button>';
    // Store check date
    PhiloDB.set('philo-last-update-check', new Date().toISOString());
    try { localStorage.setItem('philo-last-update-check', new Date().toISOString()); } catch(e) {}
    return;
  }
  
  // Show outdated articles
  var certain = outdated.filter(function(o) { return !o.uncertain; });
  var uncertain = outdated.filter(function(o) { return o.uncertain; });
  
  statusEl.innerHTML = '<strong>' + certain.length + ' article' + (certain.length > 1 ? 's' : '') + 
    ' modifié' + (certain.length > 1 ? 's' : '') + ' sur Wikilivres</strong>' +
    (uncertain.length > 0 ? '<br><span style="font-size:0.75rem;color:var(--muted-light);">+ ' + uncertain.length + ' sans version connue (importés il y a plus de 30 jours)</span>' : '');
  
  resultsEl.innerHTML = '<div style="max-height:200px;overflow-y:auto;margin:0.75rem 0;">' +
    outdated.map(function(o) {
      var dateStr = o.newTimestamp ? new Date(o.newTimestamp).toLocaleDateString('fr-FR') : '?';
      return '<div style="display:flex;align-items:center;gap:0.5rem;padding:0.35rem 0.5rem;border-bottom:1px solid var(--border-light);">' +
        '<input type="checkbox" checked data-update-id="' + o.entry.id + '" data-update-title="' + o.title + '" style="accent-color:var(--accent);">' +
        '<span style="flex:1;font-size:0.82rem;color:var(--ink);">' + o.entry.term + '</span>' +
        '<span style="font-family:var(--mono);font-size:0.45rem;color:var(--muted-light);">' + dateStr + '</span>' +
        (o.uncertain ? '<span style="font-family:var(--mono);font-size:0.4rem;color:var(--gold);">?</span>' : '') +
      '</div>';
    }).join('') + '</div>';
  
  actionsEl.innerHTML = '<button class="stats-close" style="background:var(--accent);color:var(--paper);border-color:var(--accent);margin-right:0.5rem;" ' +
    'onclick="updateSelectedArticles()">Mettre à jour (' + outdated.length + ')</button>' +
    '<button class="stats-close" onclick="this.closest(\'.stats-overlay\').remove()">Annuler</button>';
}

async function updateSelectedArticles() {
  var checkboxes = document.querySelectorAll('[data-update-id]:checked');
  if (checkboxes.length === 0) return;
  
  var statusEl = document.getElementById('updateStatus');
  var fillEl = document.getElementById('updateProgressFill');
  var resultsEl = document.getElementById('updateResults');
  var actionsEl = document.getElementById('updateActions');
  
  actionsEl.innerHTML = '';
  fillEl.style.width = '0%';
  
  var toUpdate = [];
  checkboxes.forEach(function(cb) {
    toUpdate.push({ id: cb.getAttribute('data-update-id'), title: cb.getAttribute('data-update-title') });
  });
  
  var updated = 0;
  var failed = 0;
  
  for (var i = 0; i < toUpdate.length; i++) {
    var item = toUpdate[i];
    var pct = Math.round(((i + 1) / toUpdate.length) * 100);
    statusEl.textContent = 'Mise à jour ' + (i + 1) + '/' + toUpdate.length + '…';
    fillEl.style.width = pct + '%';
    
    try {
      var data = await jsonp(
        'https://fr.wikibooks.org/w/api.php?action=query'
        + '&titles=' + encodeURIComponent(item.title)
        + '&prop=revisions&rvprop=content|ids|timestamp&rvslots=main'
        + '&format=json&formatversion=2'
      );
      
      var page = data.query && data.query.pages && data.query.pages[0];
      if (page && !page.missing && page.revisions && page.revisions.length > 0) {
        var rev = page.revisions[0];
        var wikitext = cleanWikitext(rev.slots && rev.slots.main && rev.slots.main.content || '');
        if (wikitext.length > 50) {
          var parsed = parseMediaWiki(wikitext);
          var defMatch = parsed.html.match(/<p>([\s\S]*?)<\/p>/);
          var definition = defMatch ? defMatch[1].replace(/<[^>]+>/g, '').substring(0, 300) : '';
          
          // Find and update the entry
          var entryIdx = userEntries.findIndex(function(e) { return e.id === item.id; });
          if (entryIdx >= 0) {
            userEntries[entryIdx].content = parsed.html;
            userEntries[entryIdx].definition = definition;
            userEntries[entryIdx].refs = parsed.refs;
            userEntries[entryIdx].tags = guessTags(wikitext).split(', ').filter(Boolean);
            userEntries[entryIdx].category = guessCategory(wikitext, userEntries[entryIdx].term);
            userEntries[entryIdx]._wikiSource = wikitext;
            userEntries[entryIdx]._wikiRevId = rev.revid || null;
            userEntries[entryIdx]._wikiTimestamp = rev.timestamp || null;
            userEntries[entryIdx]._wikiTitle = item.title;
            userEntries[entryIdx]._importDate = new Date().toISOString();
            updated++;
          }
        }
      }
    } catch (e) {
      failed++;
    }
    
    await new Promise(function(r) { setTimeout(r, 150); });
  }
  
  // Save
  saveUserEntries();
  PhiloDB.set('philo-last-update-check', new Date().toISOString());
  try { localStorage.setItem('philo-last-update-check', new Date().toISOString()); } catch(e) {}
  
  fillEl.style.width = '100%';
  pendingUpdatesCount = 0;
  PhiloDB.set('philo-pending-updates', '0');
  try { localStorage.setItem('philo-pending-updates', '0'); } catch(e) {}
  statusEl.innerHTML = '✓ ' + updated + ' article' + (updated > 1 ? 's' : '') + ' mis à jour' +
    (failed > 0 ? ' (' + failed + ' échec' + (failed > 1 ? 's' : '') + ')' : '');
  resultsEl.innerHTML = '';
  actionsEl.innerHTML = '<button class="stats-close" onclick="this.closest(\'.stats-overlay\').remove();showWelcome();">Fermer</button>';
}
