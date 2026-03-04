// ===== READING STREAK =====
function getReadingStreak() {
  // Build set of days with reading activity
  var days = new Set();
  readHistory.forEach(function(h) {
    var d = new Date(h.time);
    days.add(d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'));
  });
  
  // Count consecutive days ending today
  var streak = 0;
  var d = new Date();
  for (var i = 0; i < 365; i++) {
    var key = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    if (days.has(key)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      // Allow 1 day gap for today if nothing read yet
      if (i === 0) { d.setDate(d.getDate() - 1); continue; }
      break;
    }
  }
  return streak;
}

function getActivityMap() {
  // Last 28 days activity heatmap
  var map = [];
  var now = new Date();
  for (var i = 27; i >= 0; i--) {
    var d = new Date(now);
    d.setDate(d.getDate() - i);
    var key = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    var count = 0;
    readHistory.forEach(function(h) {
      var hd = new Date(h.time);
      var hk = hd.getFullYear() + '-' + String(hd.getMonth()+1).padStart(2,'0') + '-' + String(hd.getDate()).padStart(2,'0');
      if (hk === key) count++;
    });
    map.push({ day: d.getDate(), dow: d.getDay(), count: count, label: d.toLocaleDateString('fr-FR', {weekday:'short'}) });
  }
  return map;
}

function getSmartSuggestions(allEntries) {
  // Suggest based on: unread from read categories, related to recently read
  var suggestions = [];
  var recentCats = new Set();
  var recentTags = new Set();
  
  readHistory.slice(0, 10).forEach(function(h) {
    var e = allEntries.find(function(a) { return a.id === h.id; });
    if (e) {
      e.category.split(' · ').forEach(function(c) { recentCats.add(c); });
      e.tags.slice(0, 3).forEach(function(t) { recentTags.add(t.toLowerCase()); });
    }
  });
  
  // Score each unread article
  var scored = allEntries.filter(function(e) { return !readArticles.has(e.id); }).map(function(e) {
    var score = 0;
    e.category.split(' · ').forEach(function(c) { if (recentCats.has(c)) score += 3; });
    e.tags.forEach(function(t) { if (recentTags.has(t.toLowerCase())) score += 2; });
    // Boost if related to recently read
    var autoRel = detectRelated(e);
    readHistory.slice(0, 5).forEach(function(h) {
      if (autoRel.indexOf(h.id) >= 0) score += 5;
    });
    return { entry: e, score: score };
  }).filter(function(s) { return s.score > 0; });
  
  scored.sort(function(a, b) { return b.score - a.score; });
  return scored.slice(0, 4).map(function(s) { return s.entry; });
}


// ===== ANDROID WIDGET BRIDGE =====
function updateAndroidWidget() {
  if (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform && Capacitor.isNativePlatform()) {
    var aotd = getArticleOfDay();
    if (aotd) {
      try {
        Capacitor.Plugins?.Preferences?.set({ key: 'aotd_title', value: aotd.term });
        var excerpt = (aotd.definition || '').replace(/<[^>]+>/g, '').slice(0, 200);
        Capacitor.Plugins?.Preferences?.set({ key: 'aotd_excerpt', value: excerpt });
      } catch(e) {}
    }
  }
}
