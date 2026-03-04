// ===== DATA LAYER =====
// Centralized data access: all persistent state and storage logic in one place.
// Other modules call Data.save() / Data.get() instead of touching PhiloDB/localStorage directly.

var Data = (function() {

  // ---- Storage keys (single source of truth) ----
  var KEYS = {
    USER_ENTRIES:     'philo-user-entries',
    BOOKMARKS:        'philo-bookmarks',
    READ_ARTICLES:    'philo-read',
    HISTORY:          'philo-history',
    NOTES:            'philo-notes',
    COLLECTIONS:      'philo-collections',
    READING_TIMES:    'philo-reading-times',
    HIGHLIGHTS:       'philo-highlights',
    HIGHLIGHT_MODE:   'philo-highlight-mode',
    SCROLL_POS:       'philo-scroll-pos',
    CUSTOM_TAGS:      'philo-custom-tags',
    ALL_CUSTOM_TAGS:  'philo-all-custom-tags',
    FONT_SIZE:        'philo-fontsize',
    LINE_HEIGHT:      'philo-line-height',
    TEXT_WIDTH:       'philo-text-width',
    BODY_FONT:        'philo-body-font',
    JUSTIFY:          'philo-justify',
    INDENT:           'philo-indent',
    ACCENT:           'philo-accent',
    PARA_SPACING:     'philo-para-spacing',
    LETTRINE:         'philo-lettrine',
    THEME:            'philo-theme',
    SORT:             'philo-sort',
    PENDING_UPDATES:  'philo-pending-updates',
    LAST_UPDATE_CHECK:'philo-last-update-check',
    ACTIVE_PARCOURS:  'philo-active-parcours',
    PARCOURS_PROGRESS:'philo-parcours-progress',
    ONBOARDED:        'philo-onboarded'
  };

  // ---- Default values ----
  var DEFAULTS = {
    FONT_SIZE:      100,
    LINE_HEIGHT:    190,
    TEXT_WIDTH:     680,
    BODY_FONT:      'serif',
    JUSTIFY:        false,
    INDENT:         true,
    ACCENT:         'crimson',
    PARA_SPACING:   125,
    LETTRINE:       true,
    HIGHLIGHT_MODE: false,
    SORT:           'alpha',
    THEME:          'light'
  };

  // ---- Persistent data stores (loaded from localStorage on init) ----
  var stores = {
    dictionary:       [],
    userEntries:      JSON.parse(lsGet(KEYS.USER_ENTRIES, '[]')),
    bookmarks:        JSON.parse(lsGet(KEYS.BOOKMARKS, '[]')),
    readArticles:     new Set(JSON.parse(lsGet(KEYS.READ_ARTICLES, '[]'))),
    readHistory:      JSON.parse(lsGet(KEYS.HISTORY, '[]')),
    articleNotes:     JSON.parse(lsGet(KEYS.NOTES, '{}')),
    collections:      JSON.parse(lsGet(KEYS.COLLECTIONS, '{"À relire":[],"Favoris":[]}')),
    readingStartTimes:JSON.parse(lsGet(KEYS.READING_TIMES, '{}')),
    articleHighlights:JSON.parse(lsGet(KEYS.HIGHLIGHTS, '{}')),
    articleScrollPos: JSON.parse(lsGet(KEYS.SCROLL_POS, '{}')),
    customArticleTags:JSON.parse(lsGet(KEYS.CUSTOM_TAGS, '{}')),
    allCustomTagNames:JSON.parse(lsGet(KEYS.ALL_CUSTOM_TAGS, '[]')),
    parcoursProgress: JSON.parse(lsGet(KEYS.PARCOURS_PROGRESS, '{}'))
  };

  // ---- Preferences (loaded from localStorage on init) ----
  var prefs = {
    fontSize:       parseInt(lsGet(KEYS.FONT_SIZE, String(DEFAULTS.FONT_SIZE))),
    lineHeight:     parseInt(lsGet(KEYS.LINE_HEIGHT, String(DEFAULTS.LINE_HEIGHT))),
    textWidth:      parseInt(lsGet(KEYS.TEXT_WIDTH, String(DEFAULTS.TEXT_WIDTH))),
    bodyFont:       lsGet(KEYS.BODY_FONT, DEFAULTS.BODY_FONT),
    justify:        lsGet(KEYS.JUSTIFY, 'false') === 'true',
    indent:         lsGet(KEYS.INDENT, 'true') === 'true',
    accent:         lsGet(KEYS.ACCENT, DEFAULTS.ACCENT),
    paraSpacing:    parseInt(lsGet(KEYS.PARA_SPACING, String(DEFAULTS.PARA_SPACING))),
    lettrine:       lsGet(KEYS.LETTRINE, 'true') === 'true',
    highlightMode:  lsGet(KEYS.HIGHLIGHT_MODE, 'false') === 'true',
    sortMode:       lsGet(KEYS.SORT, DEFAULTS.SORT)
  };

  // ---- Low-level persist helper ----
  function persist(key, value) {
    var raw = typeof value === 'string' ? value : JSON.stringify(value);
    PhiloDB.set(key, raw);
    try { localStorage.setItem(key, raw); } catch(e) {}
  }

  // ---- Public API ----
  return {
    KEYS: KEYS,
    DEFAULTS: DEFAULTS,

    // -- Entry data --
    getDictionary: function() { return stores.dictionary; },
    getUserEntries: function() { return stores.userEntries; },
    setUserEntries: function(entries) { stores.userEntries = entries; },
    getAllEntries: function() {
      return [].concat(stores.dictionary, stores.userEntries)
        .sort(function(a, b) { return a.term.localeCompare(b.term, 'fr'); });
    },
    saveUserEntries: function() {
      var json = JSON.stringify(stores.userEntries);
      try { localStorage.setItem(KEYS.USER_ENTRIES, json); } catch(e) {}
      PhiloDB.set(KEYS.USER_ENTRIES, json);
    },

    // -- Bookmarks --
    getBookmarks: function() { return stores.bookmarks; },
    setBookmarks: function(b) { stores.bookmarks = b; },
    saveBookmarks: function() { persist(KEYS.BOOKMARKS, JSON.stringify(stores.bookmarks)); },

    // -- Read tracking --
    getReadArticles: function() { return stores.readArticles; },
    setReadArticles: function(s) { stores.readArticles = s; },
    saveReadArticles: function() { persist(KEYS.READ_ARTICLES, JSON.stringify([].concat(Array.from(stores.readArticles)))); },
    getReadHistory: function() { return stores.readHistory; },
    setReadHistory: function(h) { stores.readHistory = h; },
    saveReadHistory: function() { persist(KEYS.HISTORY, JSON.stringify(stores.readHistory)); },
    trackRead: function(id) {
      stores.readArticles.add(id);
      this.saveReadArticles();
      stores.readHistory = stores.readHistory.filter(function(h) { return h.id !== id; });
      stores.readHistory.unshift({ id: id, time: Date.now() });
      if (stores.readHistory.length > 50) stores.readHistory.length = 50;
      this.saveReadHistory();
    },
    getReadStats: function() {
      var all = this.getAllEntries();
      var ra = stores.readArticles;
      return { total: all.length, read: all.filter(function(e) { return ra.has(e.id); }).length };
    },

    // -- Notes --
    getNotes: function() { return stores.articleNotes; },
    setNotes: function(n) { stores.articleNotes = n; },
    getNote: function(id) { return stores.articleNotes[id] || ''; },
    saveNote: function(id, text) {
      if (text.trim()) stores.articleNotes[id] = text.trim();
      else delete stores.articleNotes[id];
      persist(KEYS.NOTES, JSON.stringify(stores.articleNotes));
    },

    // -- Collections --
    getCollections: function() { return stores.collections; },
    setCollections: function(c) { stores.collections = c; },
    saveCollections: function() { persist(KEYS.COLLECTIONS, JSON.stringify(stores.collections)); },

    // -- Reading times --
    getReadingTimes: function() { return stores.readingStartTimes; },
    setReadingTimes: function(t) { stores.readingStartTimes = t; },
    saveReadingTimes: function() { persist(KEYS.READING_TIMES, JSON.stringify(stores.readingStartTimes)); },

    // -- Highlights --
    getHighlights: function() { return stores.articleHighlights; },
    setHighlights: function(h) { stores.articleHighlights = h; },
    saveHighlights: function() { persist(KEYS.HIGHLIGHTS, JSON.stringify(stores.articleHighlights)); },

    // -- Scroll positions --
    getScrollPositions: function() { return stores.articleScrollPos; },
    setScrollPositions: function(p) { stores.articleScrollPos = p; },
    saveScrollPositions: function() { persist(KEYS.SCROLL_POS, JSON.stringify(stores.articleScrollPos)); },

    // -- Custom tags --
    getCustomTags: function() { return stores.customArticleTags; },
    setCustomTags: function(t) { stores.customArticleTags = t; },
    getAllCustomTagNames: function() { return stores.allCustomTagNames; },
    setAllCustomTagNames: function(n) { stores.allCustomTagNames = n; },
    saveCustomTags: function() {
      persist(KEYS.CUSTOM_TAGS, JSON.stringify(stores.customArticleTags));
      persist(KEYS.ALL_CUSTOM_TAGS, JSON.stringify(stores.allCustomTagNames));
    },

    // -- Parcours --
    getParcoursProgress: function() { return stores.parcoursProgress; },
    setParcoursProgress: function(p) { stores.parcoursProgress = p; },
    saveParcoursProgress: function() { persist(KEYS.PARCOURS_PROGRESS, JSON.stringify(stores.parcoursProgress)); },

    // -- Preferences --
    pref: function(name) { return prefs[name]; },
    setPref: function(name, value) {
      prefs[name] = value;
      var keyMap = {
        fontSize: KEYS.FONT_SIZE, lineHeight: KEYS.LINE_HEIGHT,
        textWidth: KEYS.TEXT_WIDTH, bodyFont: KEYS.BODY_FONT,
        justify: KEYS.JUSTIFY, indent: KEYS.INDENT,
        accent: KEYS.ACCENT, paraSpacing: KEYS.PARA_SPACING,
        lettrine: KEYS.LETTRINE, highlightMode: KEYS.HIGHLIGHT_MODE,
        sortMode: KEYS.SORT
      };
      var key = keyMap[name];
      if (!key) return;
      // Booleans stored as 'true'/'false'
      var raw = (typeof value === 'boolean') ? (value ? 'true' : 'false') : value;
      persist(key, String(raw));
    },
    resetPrefs: function() {
      prefs.fontSize = DEFAULTS.FONT_SIZE;
      prefs.lineHeight = DEFAULTS.LINE_HEIGHT;
      prefs.textWidth = DEFAULTS.TEXT_WIDTH;
      prefs.bodyFont = DEFAULTS.BODY_FONT;
      prefs.justify = DEFAULTS.JUSTIFY;
      prefs.indent = DEFAULTS.INDENT;
      prefs.accent = DEFAULTS.ACCENT;
      prefs.paraSpacing = DEFAULTS.PARA_SPACING;
      prefs.lettrine = DEFAULTS.LETTRINE;
      // Persist all
      var self = this;
      Object.keys(prefs).forEach(function(k) { self.setPref(k, prefs[k]); });
    },

    // -- Theme (special: not in prefs object because initTheme runs before data.js sometimes) --
    getTheme: function() { return lsGet(KEYS.THEME, DEFAULTS.THEME); },
    saveTheme: function(theme) { persist(KEYS.THEME, theme); },

    // -- Wiki updates --
    getPendingUpdates: function() { return parseInt(lsGet(KEYS.PENDING_UPDATES, '0')) || 0; },
    savePendingUpdates: function(count) { persist(KEYS.PENDING_UPDATES, String(count)); },
    getLastUpdateCheck: function() { return lsGet(KEYS.LAST_UPDATE_CHECK, ''); },
    saveLastUpdateCheck: function() { persist(KEYS.LAST_UPDATE_CHECK, new Date().toISOString()); },

    // -- Parcours active --
    getActiveParcours: function() { return lsGet(KEYS.ACTIVE_PARCOURS, ''); },
    saveActiveParcours: function(id) { persist(KEYS.ACTIVE_PARCOURS, id); },

    // -- Onboarding --
    isOnboarded: function() { return lsGet(KEYS.ONBOARDED, '') === 'true'; },
    setOnboarded: function() { persist(KEYS.ONBOARDED, 'true'); },

    // -- Generic persist (for one-off calls) --
    persist: persist,

    // -- IDB restore: overwrite stores from IndexedDB if richer --
    restoreFromIDB: async function() {
      try {
        // User entries
        var idbEntries = await PhiloDB.get(KEYS.USER_ENTRIES);
        if (idbEntries) {
          var parsed = JSON.parse(idbEntries);
          if (Array.isArray(parsed) && parsed.length > stores.userEntries.length) {
            stores.userEntries = parsed;
            try { localStorage.setItem(KEYS.USER_ENTRIES, idbEntries); } catch(e) {}
            return true; // signal UI refresh needed
          }
        }

        // Bookmarks
        var idbBm = await PhiloDB.get(KEYS.BOOKMARKS);
        if (idbBm) {
          var p = JSON.parse(idbBm);
          if (Array.isArray(p) && p.length > stores.bookmarks.length) {
            stores.bookmarks = p;
            try { localStorage.setItem(KEYS.BOOKMARKS, idbBm); } catch(e) {}
          }
        }

        // Read articles
        var idbRead = await PhiloDB.get(KEYS.READ_ARTICLES);
        if (idbRead) {
          var p = JSON.parse(idbRead);
          if (Array.isArray(p) && p.length > stores.readArticles.size) {
            stores.readArticles = new Set(p);
            try { localStorage.setItem(KEYS.READ_ARTICLES, idbRead); } catch(e) {}
          }
        }

        // History
        var idbHist = await PhiloDB.get(KEYS.HISTORY);
        if (idbHist) {
          var p = JSON.parse(idbHist);
          if (Array.isArray(p) && p.length > stores.readHistory.length) {
            stores.readHistory = p;
            try { localStorage.setItem(KEYS.HISTORY, idbHist); } catch(e) {}
          }
        }

        // Theme
        var idbTheme = await PhiloDB.get(KEYS.THEME);
        if (idbTheme && !lsGet(KEYS.THEME, '')) {
          try { localStorage.setItem(KEYS.THEME, idbTheme); } catch(e) {}
        }

        // Font size
        var idbFS = await PhiloDB.get(KEYS.FONT_SIZE);
        if (idbFS) {
          var s = parseInt(idbFS);
          if (s && s !== DEFAULTS.FONT_SIZE) {
            prefs.fontSize = s;
            try { localStorage.setItem(KEYS.FONT_SIZE, idbFS); } catch(e) {}
          }
        }

        // Notes
        var idbNotes = await PhiloDB.get(KEYS.NOTES);
        if (idbNotes) {
          try {
            var p = JSON.parse(idbNotes);
            if (p && typeof p === 'object' && Object.keys(p).length > Object.keys(stores.articleNotes).length) {
              stores.articleNotes = p;
              try { localStorage.setItem(KEYS.NOTES, idbNotes); } catch(e) {}
            }
          } catch(e) {}
        }

        // Collections
        var idbColl = await PhiloDB.get(KEYS.COLLECTIONS);
        if (idbColl) {
          try {
            var p = JSON.parse(idbColl);
            if (p && typeof p === 'object') {
              stores.collections = p;
              try { localStorage.setItem(KEYS.COLLECTIONS, idbColl); } catch(e) {}
            }
          } catch(e) {}
        }

        // Reading times
        var idbTimes = await PhiloDB.get(KEYS.READING_TIMES);
        if (idbTimes) {
          try {
            var p = JSON.parse(idbTimes);
            if (p && typeof p === 'object') {
              stores.readingStartTimes = p;
              try { localStorage.setItem(KEYS.READING_TIMES, idbTimes); } catch(e) {}
            }
          } catch(e) {}
        }

        // Appearance prefs
        var idbLH = await PhiloDB.get(KEYS.LINE_HEIGHT);
        if (idbLH) { prefs.lineHeight = parseInt(idbLH) || DEFAULTS.LINE_HEIGHT; try { localStorage.setItem(KEYS.LINE_HEIGHT, idbLH); } catch(e) {} }
        var idbTW = await PhiloDB.get(KEYS.TEXT_WIDTH);
        if (idbTW) { prefs.textWidth = parseInt(idbTW) || DEFAULTS.TEXT_WIDTH; try { localStorage.setItem(KEYS.TEXT_WIDTH, idbTW); } catch(e) {} }
        var idbBF = await PhiloDB.get(KEYS.BODY_FONT);
        if (idbBF) { prefs.bodyFont = idbBF; try { localStorage.setItem(KEYS.BODY_FONT, idbBF); } catch(e) {} }
        var idbJ = await PhiloDB.get(KEYS.JUSTIFY);
        if (idbJ) { prefs.justify = idbJ === 'true'; try { localStorage.setItem(KEYS.JUSTIFY, idbJ); } catch(e) {} }
        var idbI = await PhiloDB.get(KEYS.INDENT);
        if (idbI) { prefs.indent = idbI === 'true'; try { localStorage.setItem(KEYS.INDENT, idbI); } catch(e) {} }
        var idbAc = await PhiloDB.get(KEYS.ACCENT);
        if (idbAc) { prefs.accent = idbAc; try { localStorage.setItem(KEYS.ACCENT, idbAc); } catch(e) {} }
        var idbPS = await PhiloDB.get(KEYS.PARA_SPACING);
        if (idbPS) { prefs.paraSpacing = parseInt(idbPS) || DEFAULTS.PARA_SPACING; try { localStorage.setItem(KEYS.PARA_SPACING, idbPS); } catch(e) {} }
        var idbLet = await PhiloDB.get(KEYS.LETTRINE);
        if (idbLet) { prefs.lettrine = idbLet === 'true'; try { localStorage.setItem(KEYS.LETTRINE, idbLet); } catch(e) {} }
        var idbHL = await PhiloDB.get(KEYS.HIGHLIGHTS);
        if (idbHL) { try { stores.articleHighlights = JSON.parse(idbHL); try { localStorage.setItem(KEYS.HIGHLIGHTS, idbHL); } catch(e) {} } catch(e) {} }
        var idbHLM = await PhiloDB.get(KEYS.HIGHLIGHT_MODE);
        if (idbHLM) { prefs.highlightMode = idbHLM === 'true'; try { localStorage.setItem(KEYS.HIGHLIGHT_MODE, idbHLM); } catch(e) {} }
        var idbSP = await PhiloDB.get(KEYS.SCROLL_POS);
        if (idbSP) { try { stores.articleScrollPos = JSON.parse(idbSP); try { localStorage.setItem(KEYS.SCROLL_POS, idbSP); } catch(e) {} } catch(e) {} }
        var idbCT = await PhiloDB.get(KEYS.CUSTOM_TAGS);
        if (idbCT) { try { stores.customArticleTags = JSON.parse(idbCT); try { localStorage.setItem(KEYS.CUSTOM_TAGS, idbCT); } catch(e) {} } catch(e) {} }
        var idbCTN = await PhiloDB.get(KEYS.ALL_CUSTOM_TAGS);
        if (idbCTN) { try { stores.allCustomTagNames = JSON.parse(idbCTN); try { localStorage.setItem(KEYS.ALL_CUSTOM_TAGS, idbCTN); } catch(e) {} } catch(e) {} }

      } catch(e) {
        console.log('[Data] IDB restore skipped:', e.message);
      }
      return false;
    }
  };
})();

// ===== SYNONYM DATA (pure data, no logic) =====
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

// ===== ACCENT COLOR DATA =====
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

// ===== FONT MAP DATA =====
var fontFamilyMap = {
  'serif': "'Source Serif 4', Georgia, serif",
  'garamond': "'Cormorant Garamond', Georgia, serif",
  'baskerville': "'Libre Baskerville', Georgia, serif",
  'crimson': "'Crimson Text', Georgia, serif",
  'ebgaramond': "'EB Garamond', Georgia, serif",
  'lora': "'Lora', Georgia, serif",
  'system': "system-ui, -apple-system, 'Segoe UI', sans-serif",
  'mono': "'JetBrains Mono', monospace"
};

// ===== PARCOURS DEFINITIONS DATA =====
var parcoursDefinitions = [
  { id: 'ethique', icon: '\u2696\uFE0F', title: '\u00c9thique & morale', desc: 'Les fondements de l\'action juste',
    keywords: ['\u00e9thique','morale','vertu','devoir','bien','mal','justice','bonheur','libert\u00e9','conscience','responsabilit\u00e9','volont\u00e9'] },
  { id: 'connaissance', icon: '\uD83D\uDD0D', title: 'Th\u00e9orie de la connaissance', desc: 'Savoir, croire, douter',
    keywords: ['connaissance','v\u00e9rit\u00e9','raison','empirisme','rationalisme','scepticisme','logique','science','certitude','doute','perception','jugement'] },
  { id: 'politique', icon: '\uD83C\uDFDB\uFE0F', title: 'Philosophie politique', desc: 'Pouvoir, soci\u00e9t\u00e9, contrat',
    keywords: ['politique','\u00e9tat','pouvoir','d\u00e9mocratie','libert\u00e9','droit','justice','loi','contrat','soci\u00e9t\u00e9','capitalisme','colonialisme','r\u00e9volution'] },
  { id: 'existence', icon: '\uD83D\uDCAD', title: 'Existence & m\u00e9taphysique', desc: 'L\'\u00eatre, le temps, la mort',
    keywords: ['existence','\u00eatre','n\u00e9ant','mort','temps','conscience','\u00e2me','substance','identit\u00e9','devenir','ontologie','ph\u00e9nom\u00e9nologie','absurde'] },
  { id: 'langage', icon: '\uD83D\uDCD6', title: 'Langage & pens\u00e9e', desc: 'Mots, signes, v\u00e9rit\u00e9',
    keywords: ['langage','signe','sens','v\u00e9rit\u00e9','logique','dialectique','rh\u00e9torique','herm\u00e9neutique','interpr\u00e9tation','concept','id\u00e9e','d\u00e9finition'] },
  { id: 'esthetique', icon: '\uD83C\uDFAD', title: 'Esth\u00e9tique', desc: 'Le beau, l\'art, le sublime',
    keywords: ['esth\u00e9tique','art','beau','beaut\u00e9','sublime','go\u00fbt','cr\u00e9ation','imagination','sensible','contemplation'] }
];

// ===== KNOWN PHILOSOPHERS DATA =====
var knownPhilosophers = ['Aristote','Platon','Socrate','Descartes','Kant','Hegel','Nietzsche','Heidegger','Spinoza','Leibniz','Hume','Locke','Marx','Sartre','Husserl','Wittgenstein','Bergson','Kierkegaard','Schopenhauer','\u00c9picure','Thomas d\'Aquin','Augustin','Montaigne','Pascal','Rousseau','Hobbes','Levinas','Derrida','Foucault','Deleuze','Merleau-Ponty','Russell','Frege','Quine','Popper','Kuhn','Duns Scot','Ockham','Ab\u00e9lard','Averro\u00e8s','Avicenne','Plotin'];

// ===== CATEGORY PATTERNS DATA =====
var categoryPatterns = [
  [/\b(logique|syllogisme|proposition|prédicat)\b/, 'Logique'],
  [/\b(métaphysique|substance|être|ontologi|existence)\b/, 'M\u00e9taphysique'],
  [/\b(moral|éthique|vertu|devoir|bien|mal)\b/, 'Philosophie morale'],
  [/\b(connaissance|épistémol|vérité|science|savoir)\b/, '\u00c9pist\u00e9mologie'],
  [/\b(dieu|théo|divin|religion|athé|déis|panthé)\b/, 'Philosophie de la religion'],
  [/\b(politi|état|justice|liberté|droit|citoyen)\b/, 'Philosophie politique'],
  [/\b(art|beauté|esthéti|sublime|goût)\b/, 'Esth\u00e9tique'],
  [/\b(langage|sens|signifi|sémantique|phrase)\b/, 'Philosophie du langage'],
  [/\b(esprit|conscience|perception|âme|psycho)\b/, 'Philosophie de l\'esprit'],
  [/\b(histoire|hegel|marx|dialectique|progrès)\b/, 'Philosophie de l\'histoire']
];
