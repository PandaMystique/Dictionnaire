// ===== CUSTOM TAGS =====
// Data (customArticleTags, allCustomTagNames) is managed by Data layer via aliases in state.js

function getCustomTags(id) {
  return Data.getCustomTags()[id] || [];
}

function saveCustomTags() {
  Data.saveCustomTags();
}

function addCustomTag(id, tagName) {
  tagName = tagName.trim().toLowerCase();
  if (!tagName || tagName.length > 30) return;
  var tags = Data.getCustomTags();
  var names = Data.getAllCustomTagNames();
  if (!tags[id]) tags[id] = [];
  if (tags[id].indexOf(tagName) >= 0) return;
  tags[id].push(tagName);
  if (names.indexOf(tagName) < 0) names.push(tagName);
  saveCustomTags();
  showArticle(id);
}

function removeCustomTag(id, tagName) {
  var tags = Data.getCustomTags();
  if (!tags[id]) return;
  tags[id] = tags[id].filter(function(t) { return t !== tagName; });
  if (tags[id].length === 0) delete tags[id];
  saveCustomTags();
  showArticle(id);
}

function promptAddCustomTag(id) {
  var name = prompt('Nouvelle \u00e9tiquette :');
  if (name) addCustomTag(id, name);
}

function buildCustomTagsHtml(id) {
  var tags = getCustomTags(id);
  var html = '<div class="custom-tags-wrap">';
  tags.forEach(function(tag) {
    html += '<span class="custom-tag">' + tag +
      ' <span class="custom-tag-remove" onclick="event.stopPropagation();removeCustomTag(\'' + id + '\',\'' + tag.replace(/'/g, "\\'") + '\')">&times;</span></span>';
  });
  html += '<button class="custom-tag-add" onclick="promptAddCustomTag(\'' + id + '\')" title="Ajouter une \u00e9tiquette">+</button>';
  html += '</div>';
  return html;
}
