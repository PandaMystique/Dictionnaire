// ===== GLOSSAIRE TRANSVERSAL =====
var glossaryTerms = null; // lazy-built

var PHILO_GLOSSARY = {
  'a priori': "Connaissance indépendante de l'expérience, antérieure à toute observation empirique.",
  'a posteriori': "Connaissance dérivée de l'expérience sensible et de l'observation.",
  'absolu': "Ce qui est sans condition, sans limite, indépendant de toute relation.",
  'abstraction': "Opération de l'esprit qui isole un élément d'un ensemble pour le considérer à part.",
  'accident': "Propriété non essentielle d'une chose, qui peut changer sans altérer sa nature.",
  'aliénation': "Processus par lequel un sujet devient étranger à lui-même ou à son essence.",
  'analogie': "Rapport de ressemblance entre des réalités fondamentalement différentes.",
  'antinomie': "Conflit entre deux propositions également démontrables et contradictoires.",
  'aporie': "Difficulté logique insoluble, impasse dans un raisonnement.",
  'argument': "Suite de propositions visant à établir la vérité ou la fausseté d'une thèse.",
  'ataraxie': "Absence de trouble de l'âme, tranquillité parfaite visée par les stoïciens et épicuriens.",
  'autonomie': "Capacité d'un sujet à se donner sa propre loi morale.",
  'axiome': "Proposition admise sans démonstration comme fondement d'un système.",
  'catégorie': "Concept fondamental servant à classer les modes d'être ou de penser.",
  'causalité': "Relation nécessaire entre une cause et son effet.",
  'concept': "Représentation mentale abstraite et générale d'un objet de pensée.",
  'conscience': "Capacité de se représenter soi-même et le monde, savoir intérieur immédiat.",
  'contingence': "Caractère de ce qui pourrait ne pas être ou être autrement.",
  'contradiction': "Opposition entre deux propositions dont l'une est la négation de l'autre.",
  'déduction': "Raisonnement allant du général au particulier, du principe à la conséquence.",
  'déterminisme': "Doctrine selon laquelle tout événement est l'effet nécessaire de causes antérieures.",
  'dialectique': "Méthode de raisonnement procédant par oppositions et dépassements successifs.",
  'dualisme': "Doctrine posant deux principes irréductibles (matière/esprit, bien/mal).",
  'empirisme': "Doctrine fondant toute connaissance sur l'expérience sensible.",
  'entéléchie': "Réalisation complète de la puissance d'un être, son accomplissement.",
  'épistémologie': "Étude critique des sciences, de leurs méthodes et de leurs fondements.",
  'essence': "Ce qui fait qu'une chose est ce qu'elle est, sa nature fondamentale.",
  'éthique': "Réflexion philosophique sur la morale, les valeurs et la conduite humaine.",
  'eudémonisme': "Doctrine morale fondant le bien sur la recherche du bonheur.",
  'existence': "Le fait d'être, la réalité concrète d'un être par opposition à son essence.",
  'finalité': "Caractère de ce qui tend vers un but, une fin.",
  'herméneutique': "Art et science de l'interprétation des textes et des signes.",
  'heuristique': "Méthode de découverte et d'invention procédant par essais et hypothèses.",
  'hypothèse': "Proposition admise provisoirement comme point de départ d'un raisonnement.",
  'idéalisme': "Doctrine ramenant l'être à la pensée ou à l'esprit.",
  'immanence': "Caractère de ce qui est contenu dans la nature d'un être sans le dépasser.",
  'impératif': "Commandement moral. Chez Kant : catégorique (inconditionnel) ou hypothétique.",
  'induction': "Raisonnement allant du particulier au général, des faits à la loi.",
  'matérialisme': "Doctrine considérant la matière comme seule réalité fondamentale.",
  'métaphysique': "Étude de l'être en tant qu'être, au-delà de la physique.",
  'monisme': "Doctrine ne reconnaissant qu'un seul principe fondamental de la réalité.",
  'nihilisme': "Doctrine niant toute valeur, tout fondement, toute vérité absolue.",
  'noumène': "Chez Kant : la chose en soi, inaccessible à la connaissance sensible.",
  'ontologie': "Étude de l'être en général et de ses propriétés fondamentales.",
  'paradigme': "Modèle théorique dominant organisant la vision du monde d'une époque.",
  'phénoménologie': "Étude des phénomènes tels qu'ils apparaissent à la conscience.",
  'phénomène': "Ce qui apparaît à la conscience, l'objet tel qu'il se manifeste.",
  'positivisme': "Doctrine limitant la connaissance aux faits observables et aux lois scientifiques.",
  'pragmatisme': "Doctrine jugeant la vérité des idées à leurs conséquences pratiques.",
  'praxis': "Action humaine transformatrice, par opposition à la théorie pure.",
  'rationalisme': "Doctrine fondant la connaissance sur la raison plutôt que sur l'expérience.",
  'relativisme': "Doctrine selon laquelle toute connaissance ou valeur est relative à un contexte.",
  'scepticisme': "Attitude philosophique de doute systématique envers toute certitude.",
  'solipsisme': "Thèse selon laquelle seul le sujet pensant peut être assuré d'exister.",
  'sophisme': "Raisonnement qui a l'apparence de la validité mais qui est fallacieux.",
  'substance': "Ce qui existe par soi-même et sert de support aux propriétés.",
  'syllogisme': "Raisonnement déductif en trois propositions : majeure, mineure, conclusion.",
  'synthèse': "Opération unissant des éléments divers en un tout cohérent.",
  'téléologie': "Étude des fins et des causes finales dans la nature ou l'histoire.",
  'transcendance': "Caractère de ce qui dépasse un domaine donné, qui est au-delà.",
  'universaux': "Concepts généraux (genres, espèces) et la question de leur réalité.",
  'utilitarisme': "Doctrine morale fondant le bien sur l'utilité et le bonheur du plus grand nombre."
};

function buildGlossary() {
  if (glossaryTerms) return glossaryTerms;
  var allEntries = getAllEntries();
  var termCounts = {};
  
  // Count term occurrences across all articles
  Object.keys(PHILO_GLOSSARY).forEach(function(term) {
    var count = 0;
    var re = new RegExp('\\b' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');
    allEntries.forEach(function(e) {
      var text = (e.content || '').replace(/<[^>]+>/g, '') + ' ' + (e.definition || '');
      var matches = text.match(re);
      if (matches) count += matches.length;
    });
    if (count >= 2) {
      termCounts[term] = count;
    }
  });
  
  // Sort by frequency
  glossaryTerms = Object.keys(termCounts).sort(function(a, b) {
    return termCounts[b] - termCounts[a];
  }).map(function(term) {
    return { term: term, def: PHILO_GLOSSARY[term], count: termCounts[term] };
  });
  
  return glossaryTerms;
}

function showGlossary() {
  var terms = buildGlossary();
  
  var overlay = document.createElement('div');
  overlay.className = 'stats-overlay';
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
  
  // Group by first letter
  var grouped = {};
  terms.forEach(function(t) {
    var letter = t.term[0].toUpperCase();
    if (!grouped[letter]) grouped[letter] = [];
    grouped[letter].push(t);
  });
  
  var html = '';
  Object.keys(grouped).sort().forEach(function(letter) {
    html += '<div class="glossary-letter">' + letter + '</div>';
    grouped[letter].forEach(function(t) {
      html += '<div class="glossary-item">' +
        '<div class="glossary-term">' + t.term +
        '<span class="glossary-count">' + t.count + '×</span></div>' +
        '<div class="glossary-def">' + t.def + '</div></div>';
    });
  });
  
  overlay.innerHTML = '<div class="stats-panel" style="max-width:520px;max-height:80vh;overflow-y:auto;">' +
    '<h3>Glossaire philosophique</h3>' +
    '<div style="font-family:var(--mono);font-size:0.5rem;letter-spacing:0.06em;text-transform:uppercase;color:var(--muted-light);margin-bottom:1rem;">' + terms.length + ' termes détectés dans vos articles</div>' +
    '<input type="text" class="glossary-search" id="glossaryFilter" placeholder="Filtrer les termes…" oninput="filterGlossary(this.value)">' +
    '<div id="glossaryContent">' + html + '</div>' +
    '<div style="text-align:center;margin-top:1rem;"><button class="stats-close" onclick="this.closest(\'.stats-overlay\').remove()">Fermer</button></div>' +
  '</div>';
  document.body.appendChild(overlay);
}

function filterGlossary(query) {
  var q = query.toLowerCase().trim();
  document.querySelectorAll('.glossary-item').forEach(function(el) {
    var term = el.querySelector('.glossary-term').textContent.toLowerCase();
    var def = el.querySelector('.glossary-def').textContent.toLowerCase();
    el.style.display = (!q || term.includes(q) || def.includes(q)) ? '' : 'none';
  });
  document.querySelectorAll('.glossary-letter').forEach(function(el) {
    var next = el.nextElementSibling;
    var hasVisible = false;
    while (next && !next.classList.contains('glossary-letter')) {
      if (next.style.display !== 'none') hasVisible = true;
      next = next.nextElementSibling;
    }
    el.style.display = hasVisible ? '' : 'none';
  });
}

// ===== TTS (Text-to-Speech) =====
var ttsUtterance = null;
var ttsPaused = false;
var ttsRate = 1.0;
var ttsActive = false;

function getTTSVoice() {
  var voices = speechSynthesis.getVoices();
  // Prefer French voices
  var fr = voices.filter(function(v) { return v.lang && v.lang.startsWith('fr'); });
  if (fr.length > 0) return fr[0];
  return voices[0] || null;
}

function startTTS() {
  if (!('speechSynthesis' in window)) {
    alert('La synthèse vocale n\'est pas supportée par votre navigateur.');
    return;
  }
  
  if (ttsActive && !ttsPaused) {
    pauseTTS();
    return;
  }
  if (ttsPaused) {
    resumeTTS();
    return;
  }
  
  // Get article text
  var bodyEl = document.querySelector('.article-body');
  if (!bodyEl) return;
  var text = bodyEl.innerText || bodyEl.textContent || '';
  if (!text.trim()) return;
  
  speechSynthesis.cancel();
  ttsUtterance = new SpeechSynthesisUtterance(text);
  ttsUtterance.lang = 'fr-FR';
  ttsUtterance.rate = ttsRate;
  var voice = getTTSVoice();
  if (voice) ttsUtterance.voice = voice;
  
  ttsUtterance.onend = function() { stopTTS(); };
  ttsUtterance.onerror = function() { stopTTS(); };
  
  speechSynthesis.speak(ttsUtterance);
  ttsActive = true;
  ttsPaused = false;
  updateTTSUI();
}

function pauseTTS() {
  speechSynthesis.pause();
  ttsPaused = true;
  updateTTSUI();
}

function resumeTTS() {
  speechSynthesis.resume();
  ttsPaused = false;
  updateTTSUI();
}

function stopTTS() {
  speechSynthesis.cancel();
  ttsActive = false;
  ttsPaused = false;
  ttsUtterance = null;
  updateTTSUI();
}

function setTTSRate(rate) {
  ttsRate = parseFloat(rate);
  var label = document.getElementById('ttsRateLabel');
  if (label) label.textContent = ttsRate.toFixed(1) + '×';
  // If playing, restart with new rate
  if (ttsActive) {
    stopTTS();
    setTimeout(startTTS, 100);
  }
}

function updateTTSUI() {
  var bar = document.getElementById('ttsBar');
  if (!bar) return;
  var playBtn = bar.querySelector('.tts-play');
  var stopBtn = bar.querySelector('.tts-stop');
  if (playBtn) {
    if (ttsActive && !ttsPaused) {
      playBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
      playBtn.title = 'Pause';
    } else {
      playBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
      playBtn.title = 'Lire';
    }
  }
  if (stopBtn) stopBtn.style.opacity = ttsActive ? '1' : '0.3';
}

function buildTTSBar() {
  if (!('speechSynthesis' in window)) return '';
  return '<div class="tts-bar" id="ttsBar">' +
    '<button class="tts-btn tts-play" onclick="startTTS()" title="Lire">' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>' +
    '</button>' +
    '<button class="tts-btn tts-stop" onclick="stopTTS()" title="Arrêter" style="opacity:0.3;">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>' +
    '</button>' +
    '<div class="tts-speed">' +
      '<input type="range" min="0.5" max="2" step="0.1" value="' + ttsRate + '" oninput="setTTSRate(this.value)" class="tts-range">' +
      '<span class="tts-rate-label" id="ttsRateLabel">' + ttsRate.toFixed(1) + '×</span>' +
    '</div>' +
    '<span class="tts-label">Lecture audio</span>' +
  '</div>';
}

