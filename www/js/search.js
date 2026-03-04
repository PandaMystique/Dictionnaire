// ===== SEARCH HELPERS =====
function normalizeText(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

// Synonym groups for philosophy search
var philosophySynonyms = {
  'morale': ['ethique','vertu','devoir','bien','mal'],
  'ethique': ['morale','vertu','devoir','bien','mal'],
  'connaissance': ['savoir','epistemologie','science','verite'],
  'epistemologie': ['connaissance','savoir','science'],
  'savoir': ['connaissance','epistemologie'],
  'verite': ['connaissance','certitude','evidence'],
  'liberte': ['libre arbitre','autonomie','emancipation','volonte'],
  'dieu': ['theologie','divin','absolu','transcendance'],
  'theologie': ['dieu','divin','religion'],
  'ame': ['esprit','psyche','conscience'],
  'esprit': ['ame','conscience','pensee','intellect','entendement'],
  'conscience': ['esprit','ame','cogito','sujet'],
  'beau': ['beaute','esthetique','art','sublime'],
  'esthetique': ['beau','beaute','art','sublime','gout'],
  'politique': ['etat','pouvoir','democratie','gouvernement','cite'],
  'etat': ['politique','pouvoir','souverainete','gouvernement'],
  'justice': ['droit','equite','loi','morale'],
  'raison': ['rationalisme','logos','logique','entendement'],
  'logique': ['raison','raisonnement','syllogisme','dialectique'],
  'existence': ['etre','ontologie','dasein','phenomenologie'],
  'etre': ['existence','ontologie','substance','essence'],
  'ontologie': ['etre','existence','metaphysique'],
  'metaphysique': ['ontologie','etre','substance','essence','absolu'],
  'langage': ['langue','signe','mot','semantique','hermeneutique'],
  'bonheur': ['felicite','eudemonisme','plaisir','hedonisme'],
  'mort': ['mortalite','finitude','neant'],
  'temps': ['duree','devenir','eternite','temporalite'],
  'nature': ['physis','cosmos','monde','univers'],
  'histoire': ['historicisme','devenir','dialectique','progres'],
  'perception': ['sensation','experience','phenomene','sensible'],
  'idee': ['concept','notion','representation','forme'],
  'materialisme': ['matiere','corps','physique'],
  'idealisme': ['idee','esprit','transcendantal'],
  'empirisme': ['experience','sensation','perception','induction'],
  'rationalisme': ['raison','innee','deduction','descartes']
};

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

