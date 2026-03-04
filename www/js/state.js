// ===== DICTIONARY DATA =====
const dictionary = [];


// ===== USER ENTRIES =====
let userEntries = JSON.parse(lsGet('philo-user-entries', '[]'));

function getAllEntries() {
  return [...dictionary, ...userEntries].sort((a, b) => a.term.localeCompare(b.term, 'fr'));
}

function saveUserEntries() {
  const json = JSON.stringify(userEntries);
  try { localStorage.setItem('philo-user-entries', json); } catch(e) {}
  PhiloDB.set('philo-user-entries', json);
}

// ===== STATE =====
let currentArticle = null;
let bookmarks = JSON.parse(lsGet('philo-bookmarks', '[]'));
let showOnlyBookmarks = false;
let activeLetterFilter = null;
let activeCategoryFilter = null;
let searchQuery = '';
let currentDrawerTab = null;
let isMobile = () => window.innerWidth <= 768;
let mobileViewingArticle = false;
let editingEntryId = null;
let massImportRunning = false;
let readArticles = new Set(JSON.parse(lsGet('philo-read', '[]')));
let readHistory = JSON.parse(lsGet('philo-history', '[]'));
let currentFontSize = parseInt(lsGet('philo-fontsize', '100'));
let suggestHighlight = -1;
let navHistory = []; // Stack of article IDs for back navigation
let sortMode = lsGet('philo-sort', 'alpha'); // alpha, category, unread, recent
let focusMode = false;
var articleNotes = JSON.parse(lsGet('philo-notes', '{}'));
var collections = JSON.parse(lsGet('philo-collections', '{"À relire":[],"Favoris":[]}'));
var activeCollection = null;
var readingStartTimes = JSON.parse(lsGet('philo-reading-times', '{}'));
var appLineHeight = parseInt(lsGet('philo-line-height', '190'));
var appTextWidth = parseInt(lsGet('philo-text-width', '680'));
var appBodyFont = lsGet('philo-body-font', 'serif');
var appJustify = lsGet('philo-justify', 'false') === 'true';
var appIndent = lsGet('philo-indent', 'true') === 'true';
var appAccent = lsGet('philo-accent', 'crimson');
var tocPanelHeadings = []; // cached for TOC panel
var appParaSpacing = parseInt(lsGet('philo-para-spacing', '125'));
var appLettrine = lsGet('philo-lettrine', 'true') === 'true';
var articleScrollPos = JSON.parse(lsGet('philo-scroll-pos', '{}'));
var articleHighlights = JSON.parse(lsGet('philo-highlights', '{}'));
var highlightMode = lsGet('philo-highlight-mode', 'false') === 'true';
var lastTapTime = 0;
var lastTapTarget = null;
