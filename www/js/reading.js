// ===== READ TRACKING =====
function trackRead(id) {
  readArticles.add(id);
  PhiloDB.set('philo-read', JSON.stringify([...readArticles]));
  // Add to history
  readHistory = readHistory.filter(h => h.id !== id);
  readHistory.unshift({ id, time: Date.now() });
  if (readHistory.length > 50) readHistory.length = 50;
  PhiloDB.set('philo-history', JSON.stringify(readHistory));
}

function getReadStats() {
  const all = getAllEntries();
  return { total: all.length, read: all.filter(e => readArticles.has(e.id)).length };
}

// ===== FONT SIZE =====
function adjustFontSize(delta) {
  currentFontSize = Math.max(75, Math.min(150, currentFontSize + delta * 5));
  PhiloDB.set('philo-fontsize', currentFontSize);
  applyFontSize();
  // Sync settings slider if open
  var sl = document.getElementById('settingsFontSize');
  if (sl) sl.value = currentFontSize;
  var val = document.getElementById('settingsFontVal');
  if (val) val.textContent = currentFontSize + '%';
}

function applyFontSize() {
  // Delegate to applyAppearance which handles all text styling in one place
  applyAppearance();
}

