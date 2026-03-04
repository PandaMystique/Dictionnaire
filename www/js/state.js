// ===== TRANSIENT UI STATE =====
// Only session/UI state lives here. All persistent data is in Data (data.js).

let currentArticle = null;
let showOnlyBookmarks = false;
let activeLetterFilter = null;
let activeCategoryFilter = null;
let searchQuery = '';
let currentDrawerTab = null;
let isMobile = () => window.innerWidth <= 768;
let mobileViewingArticle = false;
let editingEntryId = null;
let massImportRunning = false;
let suggestHighlight = -1;
let navHistory = [];
let focusMode = false;
var activeCollection = null;
var tocPanelHeadings = [];
var lastTapTime = 0;
var lastTapTarget = null;

// ===== BACKWARD-COMPATIBLE ALIASES =====
// These bridge old code that reads/writes globals directly to the Data layer.
// Modules should migrate to Data.getXxx() / Data.pref() over time.

// dictionary / userEntries / getAllEntries / saveUserEntries are accessed everywhere
var dictionary = Data.getDictionary();

Object.defineProperty(window, 'userEntries', {
  get: function() { return Data.getUserEntries(); },
  set: function(v) { Data.setUserEntries(v); }
});

function getAllEntries() { return Data.getAllEntries(); }
function saveUserEntries() { Data.saveUserEntries(); }

Object.defineProperty(window, 'bookmarks', {
  get: function() { return Data.getBookmarks(); },
  set: function(v) { Data.setBookmarks(v); }
});

Object.defineProperty(window, 'readArticles', {
  get: function() { return Data.getReadArticles(); },
  set: function(v) { Data.setReadArticles(v); }
});

Object.defineProperty(window, 'readHistory', {
  get: function() { return Data.getReadHistory(); },
  set: function(v) { Data.setReadHistory(v); }
});

Object.defineProperty(window, 'articleNotes', {
  get: function() { return Data.getNotes(); },
  set: function(v) { Data.setNotes(v); }
});

Object.defineProperty(window, 'collections', {
  get: function() { return Data.getCollections(); },
  set: function(v) { Data.setCollections(v); }
});

Object.defineProperty(window, 'readingStartTimes', {
  get: function() { return Data.getReadingTimes(); },
  set: function(v) { Data.setReadingTimes(v); }
});

Object.defineProperty(window, 'articleHighlights', {
  get: function() { return Data.getHighlights(); },
  set: function(v) { Data.setHighlights(v); }
});

Object.defineProperty(window, 'articleScrollPos', {
  get: function() { return Data.getScrollPositions(); },
  set: function(v) { Data.setScrollPositions(v); }
});

Object.defineProperty(window, 'customArticleTags', {
  get: function() { return Data.getCustomTags(); },
  set: function(v) { Data.setCustomTags(v); }
});

Object.defineProperty(window, 'allCustomTagNames', {
  get: function() { return Data.getAllCustomTagNames(); },
  set: function(v) { Data.setAllCustomTagNames(v); }
});

Object.defineProperty(window, 'parcoursProgress', {
  get: function() { return Data.getParcoursProgress(); },
  set: function(v) { Data.setParcoursProgress(v); }
});

// Preference aliases
Object.defineProperty(window, 'currentFontSize', {
  get: function() { return Data.pref('fontSize'); },
  set: function(v) { Data.setPref('fontSize', v); }
});

Object.defineProperty(window, 'appLineHeight', {
  get: function() { return Data.pref('lineHeight'); },
  set: function(v) { Data.setPref('lineHeight', v); }
});

Object.defineProperty(window, 'appTextWidth', {
  get: function() { return Data.pref('textWidth'); },
  set: function(v) { Data.setPref('textWidth', v); }
});

Object.defineProperty(window, 'appBodyFont', {
  get: function() { return Data.pref('bodyFont'); },
  set: function(v) { Data.setPref('bodyFont', v); }
});

Object.defineProperty(window, 'appJustify', {
  get: function() { return Data.pref('justify'); },
  set: function(v) { Data.setPref('justify', v); }
});

Object.defineProperty(window, 'appIndent', {
  get: function() { return Data.pref('indent'); },
  set: function(v) { Data.setPref('indent', v); }
});

Object.defineProperty(window, 'appAccent', {
  get: function() { return Data.pref('accent'); },
  set: function(v) { Data.setPref('accent', v); }
});

Object.defineProperty(window, 'appParaSpacing', {
  get: function() { return Data.pref('paraSpacing'); },
  set: function(v) { Data.setPref('paraSpacing', v); }
});

Object.defineProperty(window, 'appLettrine', {
  get: function() { return Data.pref('lettrine'); },
  set: function(v) { Data.setPref('lettrine', v); }
});

Object.defineProperty(window, 'highlightMode', {
  get: function() { return Data.pref('highlightMode'); },
  set: function(v) { Data.setPref('highlightMode', v); }
});

Object.defineProperty(window, 'sortMode', {
  get: function() { return Data.pref('sortMode'); },
  set: function(v) { Data.setPref('sortMode', v); }
});
