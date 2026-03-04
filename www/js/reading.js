// ===== READ TRACKING =====
function trackRead(id) {
  Data.trackRead(id);
}

function getReadStats() {
  return Data.getReadStats();
}

// ===== FONT SIZE =====
function adjustFontSize(delta) {
  var newSize = Math.max(75, Math.min(150, Data.pref('fontSize') + delta * 5));
  Data.setPref('fontSize', newSize);
  applyFontSize();
  var sl = document.getElementById('settingsFontSize');
  if (sl) sl.value = newSize;
  var val = document.getElementById('settingsFontVal');
  if (val) val.textContent = newSize + '%';
}

function applyFontSize() {
  applyAppearance();
}
