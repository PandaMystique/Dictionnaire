function openSettings() {
  var overlay = document.getElementById('settingsOverlay');
  overlay.classList.add('open');
  syncSettingsUI();
  // Prevent body scroll while settings open
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
    // Only start drag if at scroll top or touching the handle area
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
  // Font size
  var fsSlider = document.getElementById('settingsFontSize');
  var fsVal = document.getElementById('settingsFontVal');
  if (fsSlider) { fsSlider.value = currentFontSize; }
  if (fsVal) { fsVal.textContent = currentFontSize + '%'; }
  
  // Line height
  var lhSlider = document.getElementById('settingsLineHeight');
  var lhVal = document.getElementById('settingsLHVal');
  if (lhSlider) { lhSlider.value = appLineHeight; }
  if (lhVal) { lhVal.textContent = (appLineHeight / 100).toFixed(1); }
  
  // Text width
  var twSlider = document.getElementById('settingsTextWidth');
  var twVal = document.getElementById('settingsTWVal');
  if (twSlider) { twSlider.value = appTextWidth; }
  if (twVal) { twVal.textContent = appTextWidth + 'px'; }
  
  // Font family
  document.querySelectorAll('#settingsFontFamily .settings-chip').forEach(function(btn) {
    btn.classList.toggle('active', btn.getAttribute('data-font') === appBodyFont);
  });
  
  // Theme buttons
  var currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  updateSettingsThemeButtons(currentTheme);
  
  // Para spacing
  var psSlider = document.getElementById('settingsParaSpacing');
  var psVal = document.getElementById('settingsParaVal');
  if (psSlider) { psSlider.value = appParaSpacing; }
  if (psVal) { psVal.textContent = (appParaSpacing / 100).toFixed(2) + 'em'; }

  // Toggles
  var jBtn = document.getElementById('settingsJustify');
  if (jBtn) jBtn.classList.toggle('on', appJustify);
  var iBtn = document.getElementById('settingsIndent');
  if (iBtn) iBtn.classList.toggle('on', appIndent);
  var letBtn = document.getElementById('settingsLettrine');
  if (letBtn) letBtn.classList.toggle('on', appLettrine);
  var hlBtn = document.getElementById('settingsHighlight');
  if (hlBtn) hlBtn.classList.toggle('on', highlightMode);
  
  // Accent color
  document.querySelectorAll('#settingsAccent .settings-chip').forEach(function(btn) {
    btn.classList.toggle('active', btn.getAttribute('data-accent') === appAccent);
  });
  
  // Preview
  updateSettingsPreview();
}

// ===== APPEARANCE FUNCTIONS =====
function setFontSize(val) {
  currentFontSize = parseInt(val);
  PhiloDB.set('philo-fontsize', currentFontSize);
  applyAppearance();
  var fsVal = document.getElementById('settingsFontVal');
  if (fsVal) fsVal.textContent = currentFontSize + '%';
}

function setLineHeight(val) {
  appLineHeight = parseInt(val);
  PhiloDB.set('philo-line-height', appLineHeight);
  applyAppearance();
  var lhVal = document.getElementById('settingsLHVal');
  if (lhVal) lhVal.textContent = (appLineHeight / 100).toFixed(1);
}

function setTextWidth(val) {
  appTextWidth = parseInt(val);
  PhiloDB.set('philo-text-width', appTextWidth);
  applyAppearance();
  var twVal = document.getElementById('settingsTWVal');
  if (twVal) twVal.textContent = appTextWidth + 'px';
}

function setBodyFont(fontKey) {
  appBodyFont = fontKey;
  PhiloDB.set('philo-body-font', fontKey);
  applyAppearance();
  document.querySelectorAll('#settingsFontFamily .settings-chip').forEach(function(btn) {
    btn.classList.toggle('active', btn.getAttribute('data-font') === fontKey);
  });
}

function toggleJustify(btn) {
  appJustify = !appJustify;
  btn.classList.toggle('on', appJustify);
  PhiloDB.set('philo-justify', appJustify ? 'true' : 'false');
  applyAppearance();
}

function toggleIndent(btn) {
  appIndent = !appIndent;
  btn.classList.toggle('on', appIndent);
  PhiloDB.set('philo-indent', appIndent ? 'true' : 'false');
  applyAppearance();
}

var accentColors = {
  crimson:  { accent: '#8b2500', accentLight: '#c4502a', darkAccent: '#d4734a', darkAccentLight: '#e8956a' },
  navy:     { accent: '#1a4a6e', accentLight: '#2d6fa0', darkAccent: '#5a9fce', darkAccentLight: '#7cb8dc' },
  forest:   { accent: '#2d5a27', accentLight: '#408a38', darkAccent: '#5dae54', darkAccentLight: '#7ec876' },
  plum:     { accent: '#6b2d5b', accentLight: '#9a4282', darkAccent: '#c06aaa', darkAccentLight: '#d48cc0' },
  amber:    { accent: '#b8860b', accentLight: '#d4a020', darkAccent: '#e8b830', darkAccentLight: '#f0cc60' },
  burgundy: { accent: '#722f37', accentLight: '#9a3f4a', darkAccent: '#c86070', darkAccentLight: '#d88898' },
  teal:     { accent: '#1a6e5e', accentLight: '#289a84', darkAccent: '#3cc8aa', darkAccentLight: '#60d8be' },
  slate:    { accent: '#4a5568', accentLight: '#6b7d95', darkAccent: '#90a4bc', darkAccentLight: '#a8bcd0' }
};

function setAccentColor(key) {
  appAccent = key;
  PhiloDB.set('philo-accent', key);
  applyAppearance();
  document.querySelectorAll('#settingsAccent .settings-chip').forEach(function(btn) {
    btn.classList.toggle('active', btn.getAttribute('data-accent') === key);
  });
}

function resetAppearance() {
  currentFontSize = 100; appLineHeight = 190; appTextWidth = 680;
  appBodyFont = 'serif'; appJustify = false; appIndent = true;
  appAccent = 'crimson'; appParaSpacing = 125; appLettrine = true;
  PhiloDB.set('philo-fontsize', 100);
  PhiloDB.set('philo-line-height', 190);
  PhiloDB.set('philo-text-width', 680);
  PhiloDB.set('philo-body-font', 'serif');
  PhiloDB.set('philo-justify', 'false');
  PhiloDB.set('philo-indent', 'true');
  PhiloDB.set('philo-accent', 'crimson');
  PhiloDB.set('philo-para-spacing', 125);
  PhiloDB.set('philo-lettrine', 'true');
  applyFontSize();
  applyAppearance();
  applyLettrine();
  syncSettingsUI();
}

function applyAppearance() {
  var fontMap = {
    'serif': "'Source Serif 4', Georgia, serif",
    'garamond': "'Cormorant Garamond', Georgia, serif",
    'baskerville': "'Libre Baskerville', Georgia, serif",
    'crimson': "'Crimson Text', Georgia, serif",
    'ebgaramond': "'EB Garamond', Georgia, serif",
    'lora': "'Lora', Georgia, serif",
    'system': "system-ui, -apple-system, 'Segoe UI', sans-serif",
    'mono': "'JetBrains Mono', monospace"
  };
  var fontStack = fontMap[appBodyFont] || fontMap['serif'];
  var scale = currentFontSize / 100;
  
  // Font-size multiplier per font (garamond renders larger, mono smaller)
  var fontMult = 1;
  if (appBodyFont === 'garamond') fontMult = 1.05;
  else if (appBodyFont === 'ebgaramond') fontMult = 1.03;
  else if (appBodyFont === 'crimson') fontMult = 1.02;
  else if (appBodyFont === 'mono') fontMult = 0.88;
  
  // Remove both old style IDs (legacy + current)
  ['appearance-overrides', 'font-size-override'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.remove();
  });
  
  // Build one unified stylesheet
  var pSize = (scale * fontMult).toFixed(3);
  var css = '';
  
  // Font-size for all text elements (always set, even at 100%, to keep garamond/mono ratios)
  css += '.article-body p, .article-body li { font-size: ' + pSize + 'rem !important; }\n';
  css += '.article-body h3 { font-size: ' + (1.15 * scale).toFixed(3) + 'rem !important; }\n';
  css += '.article-body h4 { font-size: ' + (1.0 * scale).toFixed(3) + 'rem !important; }\n';
  css += '.article-body blockquote { font-size: ' + (0.92 * scale * fontMult).toFixed(3) + 'rem !important; }\n';
  css += '.article-definition { font-size: ' + (1.05 * scale).toFixed(3) + 'rem !important; }\n';
  css += '.article-notes textarea { font-size: ' + (0.88 * scale).toFixed(3) + 'rem !important; }\n';
  
  // Font-family + line-height + text options
  css += '.article-body p, .article-body li, .article-body blockquote, .article-definition, .article-notes textarea { ' +
    'line-height: ' + (appLineHeight / 100) + ' !important; ' +
    'font-family: ' + fontStack + ' !important; ' +
    (appJustify ? 'text-align: justify !important; hyphens: auto !important; -webkit-hyphens: auto !important; hyphenate-limit-chars: 6 3 2 !important; overflow-wrap: break-word !important; ' : '') +
    '}\n';
  
  // Mono letter-spacing
  if (appBodyFont === 'mono') {
    css += '.article-body p, .article-body li { letter-spacing: -0.01em !important; }\n';
  }
  
  // Text width
  css += '.article-body-wrap { max-width: ' + appTextWidth + 'px !important; }\n';
  css += '.focus-mode .article-body-wrap { max-width: ' + Math.min(appTextWidth, 720) + 'px !important; }\n';
  
  // Text indent
  if (!appIndent) {
    css += '.article-body p { text-indent: 0 !important; }\n';
  }

  // Paragraph spacing
  var paraEm = (appParaSpacing / 100).toFixed(2);
  css += '.article-body p { margin-bottom: ' + paraEm + 'em !important; }\n';
  
  // Accent color overrides
  var ac = accentColors[appAccent];
  if (ac && appAccent !== 'crimson') {
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
  var fontMap = {
    'serif': "'Source Serif 4', Georgia, serif",
    'garamond': "'Cormorant Garamond', Georgia, serif",
    'baskerville': "'Libre Baskerville', Georgia, serif",
    'crimson': "'Crimson Text', Georgia, serif",
    'ebgaramond': "'EB Garamond', Georgia, serif",
    'lora': "'Lora', Georgia, serif",
    'system': "system-ui, -apple-system, 'Segoe UI', sans-serif",
    'mono': "'JetBrains Mono', monospace"
  };
  var fontStack = fontMap[appBodyFont] || fontMap['serif'];
  var scale = currentFontSize / 100;
  el.style.fontFamily = fontStack;
  el.style.fontSize = (0.88 * scale) + 'rem';
  el.style.lineHeight = (appLineHeight / 100);
  el.style.textAlign = appJustify ? 'justify' : 'left';
  el.style.textIndent = appIndent ? '1.2em' : '0';
}

// ===== PARAGRAPH SPACING =====
function setParaSpacing(val) {
  appParaSpacing = parseInt(val);
  PhiloDB.set('philo-para-spacing', appParaSpacing);
  applyAppearance();
  var psVal = document.getElementById('settingsParaVal');
  if (psVal) psVal.textContent = (appParaSpacing / 100).toFixed(2) + 'em';
}

// ===== LETTRINE =====
var highlightMode = lsGet('philo-highlight-mode', 'false') === 'true';

function applyLettrine() {
  // Lettrine is now injected via HTML in showArticle, so re-render if needed
  if (currentArticle) showArticle(currentArticle.id);
}

function toggleLettrine(btn) {
  appLettrine = !appLettrine;
  if (btn) btn.classList.toggle('on', appLettrine);
  PhiloDB.set('philo-lettrine', appLettrine ? 'true' : 'false');
  if (currentArticle) showArticle(currentArticle.id);
}

