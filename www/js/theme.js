// ===== THEME =====
function initTheme() {
  const saved = Data.getTheme();
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeIcons(saved);
}

function toggleTheme() {
  var current = document.documentElement.getAttribute('data-theme') || 'light';
  var order = ['light', 'sepia', 'dark'];
  var idx = order.indexOf(current);
  var next = order[(idx + 1) % 3];
  setTheme(next);
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  Data.saveTheme(theme);
  updateThemeIcons(theme);
  updateSettingsThemeButtons(theme);
}

function updateSettingsThemeButtons(theme) {
  document.querySelectorAll('.settings-theme-btn').forEach(function(btn) {
    btn.classList.toggle('active', btn.getAttribute('data-stheme') === theme);
  });
}

function updateThemeIcons(theme) {
  var isDark = theme === 'dark';
  document.querySelectorAll('[id$="ThemeSun"], [id$="IconSun"]').forEach(function(el) {
    el.style.display = isDark ? 'none' : 'block';
  });
  document.querySelectorAll('[id$="ThemeMoon"], [id$="IconMoon"]').forEach(function(el) {
    el.style.display = isDark ? 'block' : 'none';
  });
  updateSettingsThemeButtons(theme);
}
