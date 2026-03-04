// ===== SEARCH HELPERS =====
// Synonym data (philosophySynonyms) is in data.js

function expandWithSynonyms(term) {
  var n = normalizeText(term);
  var synonyms = philosophySynonyms[n];
  return synonyms ? [n].concat(synonyms) : [n];
}

function fuzzyMatch(needle, haystack) {
  const n = normalizeText(needle);
  const h = normalizeText(haystack);
  // Exact substring first
  if (h.includes(n)) return true;
  // Synonym matching
  var expanded = expandWithSynonyms(needle);
  if (expanded.length > 1 && expanded.some(function(syn) { return h.includes(syn); })) return true;
  // Token matching: all words of needle must appear in haystack
  const words = n.split(/\s+/).filter(w => w.length > 1);
  if (words.length > 1) {
    return words.every(w => h.includes(w));
  }
  // Levenshtein-lite: allow 1 char difference for short terms
  if (n.length >= 4 && n.length <= 12) {
    const tokens = h.split(/[\s,\xb7:;.()\[\]]+/);
    return tokens.some(t => {
      if (Math.abs(t.length - n.length) > 1) return false;
      let diffs = 0;
      for (let i = 0; i < Math.max(t.length, n.length); i++) {
        if (t[i] !== n[i]) diffs++;
        if (diffs > 1) return false;
      }
      return true;
    });
  }
  // Prefix matching (3+ chars)
  if (n.length >= 3) {
    const tokens = h.split(/[\s,\xb7:;.()\[\]]+/);
    return tokens.some(t => t.startsWith(n));
  }
  return false;
}

// ===== CATEGORY FILTERS =====
function getCategories() {
  const cats = new Map();
  getAllEntries().forEach(e => {
    e.category.split(' \u00b7 ').forEach(c => {
      const ct = c.trim();
      cats.set(ct, (cats.get(ct) || 0) + 1);
    });
  });
  // Sort by count desc, take top 12
  return [...cats.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(e => e[0]);
}

function buildFilterBar() {
  const bar = document.getElementById('filterBar');
  if (!bar) return;
  const cats = getCategories();
  bar.innerHTML = cats.map(c => 
    `<button class="filter-chip ${activeCategoryFilter === c ? 'active' : ''}" onclick="toggleCategoryFilter('${c.replace(/'/g, "\\'")}')">${c}</button>`
  ).join('');
}

function toggleCategoryFilter(cat) {
  activeCategoryFilter = activeCategoryFilter === cat ? null : cat;
  buildFilterBar();
  renderEntryList();
}

