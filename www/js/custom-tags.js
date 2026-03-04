// ===== CUSTOM TAGS =====
var customArticleTags = JSON.parse(lsGet('philo-custom-tags', '{}'));
var allCustomTagNames = JSON.parse(lsGet('philo-all-custom-tags', '[]'));

function getCustomTags(id) {
  return customArticleTags[id] || [];
}

function saveCustomTags() {
  var json = JSON.stringify(customArticleTags);
  PhiloDB.set('philo-custom-tags', json);
  try { localStorage.setItem('philo-custom-tags', json); } catch(e) {}
  var names = JSON.stringify(allCustomTagNames);
  PhiloDB.set('philo-all-custom-tags', names);
  try { localStorage.setItem('philo-all-custom-tags', names); } catch(e) {}
}

function addCustomTag(id, tagName) {
  tagName = tagName.trim().toLowerCase();
  if (!tagName || tagName.length > 30) return;
  if (!customArticleTags[id]) customArticleTags[id] = [];
  if (customArticleTags[id].indexOf(tagName) >= 0) return;
  customArticleTags[id].push(tagName);
  if (allCustomTagNames.indexOf(tagName) < 0) allCustomTagNames.push(tagName);
  saveCustomTags();
  showArticle(id);
}

function removeCustomTag(id, tagName) {
  if (!customArticleTags[id]) return;
  customArticleTags[id] = customArticleTags[id].filter(function(t) { return t !== tagName; });
  if (customArticleTags[id].length === 0) delete customArticleTags[id];
  saveCustomTags();
  showArticle(id);
}

function promptAddCustomTag(id) {
  // Show inline prompt with suggestions
  var existingHtml = allCustomTagNames.length > 0
    ? '<div style="display:flex;flex-wrap:wrap;gap:0.25rem;margin-bottom:0.5rem;">' +
      allCustomTagNames.slice(0, 15).map(function(t) {
        return '<span class="custom-tag" onclick="addCustomTag(\'' + id + '\',\'' + t.replace(/'/g, "\\'") + '\')">' + t + '</span>';
      }).join('') + '</div>'
    : '';
  
  var name = prompt('Nouvelle étiquette :');
  if (name) addCustomTag(id, name);
}

function buildCustomTagsHtml(id) {
  var tags = getCustomTags(id);
  var html = '<div class="custom-tags-wrap">';
  tags.forEach(function(tag) {
    html += '<span class="custom-tag">' + tag +
      ' <span class="custom-tag-remove" onclick="event.stopPropagation();removeCustomTag(\'' + id + '\',\'' + tag.replace(/'/g, "\\'") + '\')">&times;</span></span>';
  });
  html += '<button class="custom-tag-add" onclick="promptAddCustomTag(\'' + id + '\')" title="Ajouter une étiquette">+</button>';
  html += '</div>';
  return html;
}
