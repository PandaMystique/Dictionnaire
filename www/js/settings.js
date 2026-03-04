function openSettings() {
  var overlay = document.getElementById('settingsOverlay');
  overlay.classList.add('open');
  syncSettingsUI();
  document.body.style.overflow = 'hidden';
}

function closeSettings() {
  document.getElementById('settingsOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

// Swipe-to-dismiss for settings panel
(function() {
  var panel = document.getElementById('settingsPanel');
  if (!panel) return;
  var startY = 0, currentY = 0, isDragging = false;

  panel.addEventListener('touchstart', function(e) {
    if (panel.scrollTop > 5) return;
    startY = e.touches[0].clientY;
    isDragging = true;
  }, { passive: true });

  panel.addEventListener('touchmove', function(e) {
    if (!isDragging) return;
    currentY = e.touches[0].clientY;
    var diff = currentY - startY;
    if (diff > 0) {
      panel.style.transform = 'translateY(' + diff + 'px)';
      panel.style.transition = 'none';
    }
  }, { passive: true });

  panel.addEventListener('touchend', function() {
    if (!isDragging) return;
    isDragging = false;
    var diff = currentY - startY;
    panel.style.transition = '';
    panel.style.transform = '';
    if (diff > 100) {
      closeSettings();
    }
  }, { passive: true });
})();

function syncSettingsUI() {
  var fsSlider = document.getElementById('settingsFontSize');
  var fsVal = document.getElementById('settingsFontVal');
  if (fsSlider) { fsSlider.value = Data.pref('fontSize'); }
  if (fsVal) { fsVal.textContent = Data.pref('fontSize') + '%'; }

  var lhSlider = document.getElementById('settingsLineHeight');
  var lhVal = document.getElementById('settingsLHVal');
  if (lhSlider) { lhSlider.value = Data.pref('lineHeight'); }
  if (lhVal) { lhVal.textContent = (Data.pref('lineHeight') / 100).toFixed(1); }

  var twSlider = document.getElementById('settingsTextWidth');
  var twVal = document.getElementById('settingsTWVal');
  if (twSlider) { twSlider.value = Data.pref('textWidth'); }
  if (twVal) { twVal.textContent = Data.pref('textWidth') + 'px'; }

  document.querySelectorAll('#settingsFontFamily .settings-chip').forEach(function(btn) {
    btn.classList.toggle('active', btn.getAttribute('data-font') === Data.pref('bodyFont'));
  });

  var currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  updateSettingsThemeButtons(currentTheme);

  var psSlider = document.getElementById('settingsParaSpacing');
  var psVal = document.getElementById('settingsParaVal');
  if (psSlider) { psSlider.value = Data.pref('paraSpacing'); }
  if (psVal) { psVal.textContent = (Data.pref('paraSpacing') / 100).toFixed(2) + 'em'; }

  var jBtn = document.getElementById('settingsJustify');
  if (jBtn) jBtn.classList.toggle('on', Data.pref('justify'));
  var iBtn = document.getElementById('settingsIndent');
  if (iBtn) iBtn.classList.toggle('on', Data.pref('indent'));
  var letBtn = document.getElementById('settingsLettrine');
  if (letBtn) letBtn.classList.toggle('on', Data.pref('lettrine'));
  var hlBtn = document.getElementById('settingsHighlight');
  if (hlBtn) hlBtn.classList.toggle('on', Data.pref('highlightMode'));

  document.querySelectorAll('#settingsAccent .settings-chip').forEach(function(btn) {
    btn.classList.toggle('active', btn.getAttribute('data-accent') === Data.pref('accent'));
  });

  updateSettingsPreview();
}

// ===== APPEARANCE FUNCTIONS =====
function setFontSize(val) {
  Data.setPref('fontSize', parseInt(val));
  applyAppearance();
  var fsVal = document.getElementById('settingsFontVal');
  if (fsVal) fsVal.textContent = Data.pref('fontSize') + '%';
}

function setLineHeight(val) {
  Data.setPref('lineHeight', parseInt(val));
  applyAppearance();
  var lhVal = document.getElementById('settingsLHVal');
  if (lhVal) lhVal.textContent = (Data.pref('lineHeight') / 100).toFixed(1);
}

function setTextWidth(val) {
  Data.setPref('textWidth', parseInt(val));
  applyAppearance();
  var twVal = document.getElementById('settingsTWVal');
  if (twVal) twVal.textContent = Data.pref('textWidth') + 'px';
}

function setBodyFont(fontKey) {
  Data.setPref('bodyFont', fontKey);
  applyAppearance();
  document.querySelectorAll('#settingsFontFamily .settings-chip').forEach(function(btn) {
    btn.classList.toggle('active', btn.getAttribute('data-font') === fontKey);
  });
}

function toggleJustify(btn) {
  Data.setPref('justify', !Data.pref('justify'));
  btn.classList.toggle('on', Data.pref('justify'));
  applyAppearance();
}

function toggleIndent(btn) {
  Data.setPref('indent', !Data.pref('indent'));
  btn.classList.toggle('on', Data.pref('indent'));
  applyAppearance();
}

function setAccentColor(key) {
  Data.setPref('accent', key);
  applyAppearance();
  document.querySelectorAll('#settingsAccent .settings-chip').forEach(function(btn) {
    btn.classList.toggle('active', btn.getAttribute('data-accent') === key);
  });
}

function resetAppearance() {
  Data.resetPrefs();
  applyFontSize();
  applyAppearance();
  applyLettrine();
  syncSettingsUI();
}

function applyAppearance() {
  var font = Data.pref('bodyFont');
  var fontStack = fontFamilyMap[font] || fontFamilyMap['serif'];
  var scale = Data.pref('fontSize') / 100;

  var fontMult = 1;
  if (font === 'garamond') fontMult = 1.05;
  else if (font === 'ebgaramond') fontMult = 1.03;
  else if (font === 'crimson') fontMult = 1.02;
  else if (font === 'mono') fontMult = 0.88;

  ['appearance-overrides', 'font-size-override'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.remove();
  });

  var pSize = (scale * fontMult).toFixed(3);
  var lineH = Data.pref('lineHeight');
  var textW = Data.pref('textWidth');
  var justify = Data.pref('justify');
  var indent = Data.pref('indent');
  var paraSpacing = Data.pref('paraSpacing');
  var accent = Data.pref('accent');
  var css = '';

  css += '.article-body p, .article-body li { font-size: ' + pSize + 'rem !important; }\n';
  css += '.article-body h3 { font-size: ' + (1.15 * scale).toFixed(3) + 'rem !important; }\n';
  css += '.article-body h4 { font-size: ' + (1.0 * scale).toFixed(3) + 'rem !important; }\n';
  css += '.article-body blockquote { font-size: ' + (0.92 * scale * fontMult).toFixed(3) + 'rem !important; }\n';
  css += '.article-definition { font-size: ' + (1.05 * scale).toFixed(3) + 'rem !important; }\n';
  css += '.article-notes textarea { font-size: ' + (0.88 * scale).toFixed(3) + 'rem !important; }\n';

  css += '.article-body p, .article-body li, .article-body blockquote, .article-definition, .article-notes textarea { ' +
    'line-height: ' + (lineH / 100) + ' !important; ' +
    'font-family: ' + fontStack + ' !important; ' +
    (justify ? 'text-align: justify !important; hyphens: auto !important; -webkit-hyphens: auto !important; hyphenate-limit-chars: 6 3 2 !important; overflow-wrap: break-word !important; ' : '') +
    '}\n';

  if (font === 'mono') {
    css += '.article-body p, .article-body li { letter-spacing: -0.01em !important; }\n';
  }

  css += '.article-body-wrap { max-width: ' + textW + 'px !important; }\n';
  css += '.focus-mode .article-body-wrap { max-width: ' + Math.min(textW, 720) + 'px !important; }\n';

  if (!indent) {
    css += '.article-body p { text-indent: 0 !important; }\n';
  }

  var paraEm = (paraSpacing / 100).toFixed(2);
  css += '.article-body p { margin-bottom: ' + paraEm + 'em !important; }\n';

  var ac = accentColors[accent];
  if (ac && accent !== 'crimson') {
    css += ':root { --accent: ' + ac.accent + '; --accent-light: ' + ac.accentLight + '; }\n';
    css += '[data-theme="dark"] { --accent: ' + ac.darkAccent + '; --accent-light: ' + ac.darkAccentLight + '; }\n';
    css += '[data-theme="sepia"] { --accent: ' + ac.accent + '; --accent-light: ' + ac.accentLight + '; }\n';
  }

  var style = document.createElement('style');
  style.id = 'appearance-overrides';
  style.textContent = css;
  document.head.appendChild(style);

  updateSettingsPreview();
}

function updateSettingsPreview() {
  var el = document.getElementById('settingsPreviewText');
  if (!el) return;
  var fontStack = fontFamilyMap[Data.pref('bodyFont')] || fontFamilyMap['serif'];
  var scale = Data.pref('fontSize') / 100;
  el.style.fontFamily = fontStack;
  el.style.fontSize = (0.88 * scale) + 'rem';
  el.style.lineHeight = (Data.pref('lineHeight') / 100);
  el.style.textAlign = Data.pref('justify') ? 'justify' : 'left';
  el.style.textIndent = Data.pref('indent') ? '1.2em' : '0';
}

// ===== PARAGRAPH SPACING =====
function setParaSpacing(val) {
  Data.setPref('paraSpacing', parseInt(val));
  applyAppearance();
  var psVal = document.getElementById('settingsParaVal');
  if (psVal) psVal.textContent = (Data.pref('paraSpacing') / 100).toFixed(2) + 'em';
}

// ===== LETTRINE =====
function applyLettrine() {
  if (currentArticle) showArticle(currentArticle.id);
}

function toggleLettrine(btn) {
  Data.setPref('lettrine', !Data.pref('lettrine'));
  if (btn) btn.classList.toggle('on', Data.pref('lettrine'));
  if (currentArticle) showArticle(currentArticle.id);
}
