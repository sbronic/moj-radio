// --------------------------------------------------
// CONFIG
// --------------------------------------------------
const DEFAULT_STREAM = "https://moj-radio.vercel.app/api/proxy?url=https://dygedge.radyotvonline.net/radyovoyage/playlist.m3u8";
const API_BASES = [
  "https://de1.api.radio-browser.info",
  "https://fr1.api.radio-browser.info",
  "https://nl1.api.radio-browser.info"
];

// --------------------------------------------------
// ELEMENTS
// --------------------------------------------------
const audio = document.getElementById('audio');
const btnPlay = document.getElementById('btnPlay');
const btnStop = document.getElementById('btnStop');
const btnFav = document.getElementById('btnFav');
const npTitle = document.getElementById('npTitle');
const npUrl = document.getElementById('npUrl');
const resultsEl = document.getElementById('results');
const favListEl = document.getElementById('favList');
const btnClearFavs = document.getElementById('btnClearFavs');
const qName = document.getElementById('qName');
const qCountry = document.getElementById('qCountry');
const qTag = document.getElementById('qTag');
const btnSearch = document.getElementById('btnSearch');
const customUrl = document.getElementById('customUrl');
const btnLoad = document.getElementById('btnLoad');
const btnExport = document.getElementById('btnExport');
const btnImport = document.getElementById('btnImport');
const importFile = document.getElementById('importFile');

// --------------------------------------------------
// INIT PLAYER
// --------------------------------------------------
window.addEventListener("DOMContentLoaded", () => {
  const startWhenReady = () => {
    if (audio && window.Hls) {
      setStream(DEFAULT_STREAM, "Zadani stream");
    } else {
      setTimeout(startWhenReady, 200);
    }
  };
  startWhenReady();
});

btnPlay.addEventListener('click', () => { audio.play().catch(console.warn); });
btnStop.addEventListener('click', () => { audio.pause(); audio.currentTime = 0; });
btnFav.addEventListener('click', toggleFavorite);
btnLoad.addEventListener('click', () => {
  const url = customUrl.value.trim();
  if (!url) return;
  setStream(url, "Prilagođeni stream");
});
btnSearch.addEventListener('click', searchStations);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (document.activeElement === qName || document.activeElement === qCountry || document.activeElement === qTag)) {
    searchStations();
  }
});
btnClearFavs.addEventListener('click', () => {
  if (confirm('Jeste li sigurni da želite obrisati sve favorite?')) {
    if (confirm('Stvarno želite obrisati sve favorite? Ova radnja se ne može poništiti.')) {
      localStorage.removeItem('mojiradio:favs');
      renderFavorites();
      alert('Svi favoriti su obrisani.');
    }
  }
});

// --------------------------------------------------
// PLAYER FUNCTIONS
// --------------------------------------------------
function setStream(url, title, stationObj) {
  npTitle.textContent = title || 'Nepoznato';
  npUrl.textContent = url;

  // Ako URL nije već proxy, omotaj ga
  let streamUrl = url;
  if (!url.startsWith("https://moj-radio.vercel.app/api/proxy?")) {
    streamUrl = "https://moj-radio.vercel.app/api/proxy?url=" + encodeURIComponent(url);
  }

  // HLS ili obični stream
  if (audio.canPlayType('application/vnd.apple.mpegurl')) {
    audio.src = streamUrl;
  } else if (window.Hls && Hls.isSupported()) {
    if (window.hls) window.hls.destroy();
    window.hls = new Hls();
    window.hls.loadSource(streamUrl);
    window.hls.attachMedia(audio);
  } else {
    audio.src = streamUrl;
  }

  audio.load();
  updateFavButton(url);

  if (stationObj) {
    localStorage.setItem('mojiradio:last', JSON.stringify(stationObj));
  } else {
    localStorage.setItem('mojiradio:last', JSON.stringify({ name: title, urlResolved: url }));
  }
}


// --------------------------------------------------
// RADIO-BROWSER SEARCH
// --------------------------------------------------
function getApiBase() {
  const idx = Math.floor(Math.random() * API_BASES.length);
  return API_BASES[idx];
}

async function searchStations() {
  const base = getApiBase();
  const params = new URLSearchParams();
  params.set('limit', '50');
  params.set('hidebroken', 'true');
  if (qName.value.trim()) params.set('name', qName.value.trim());
  if (qCountry.value.trim()) params.set('country', qCountry.value.trim());
  if (qTag.value.trim()) params.set('tag', qTag.value.trim());

  const apiUrl = `${base}/json/stations/search?${params.toString()}`;
  const url = "https://moj-radio.vercel.app/api/proxy?url=" + encodeURIComponent(apiUrl);

  resultsEl.innerHTML = '<li>Tražim…</li>';
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      resultsEl.innerHTML = '<li>Nema rezultata.</li>';
      return;
    }
    renderResults(data);
  } catch (e) {
    console.error(e);
    resultsEl.innerHTML = '<li>Pogreška pri dohvaćanju. Pokušaj ponovno.</li>';
  }
}

function renderResults(stations) {
  resultsEl.innerHTML = '';
  stations.forEach(st => {
    const li = document.createElement('li');
    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = st.name || 'Nepoznato';

    const meta = document.createElement('div');
    meta.className = 'meta';
    const mCountry = st.country ? `🌍 ${st.country}` : null;
    const mTags = st.tags ? `🏷️ ${st.tags}` : null;
    const mCodec = st.codec ? `🎵 ${st.codec} ${st.bitrate ? st.bitrate + 'kbps' : ''}` : null;
    [mCountry, mTags, mCodec].filter(Boolean).forEach(t => {
      const span = document.createElement('span');
      span.textContent = t;
      meta.appendChild(span);
    });

    const actions = document.createElement('div');
    actions.className = 'item-actions';
    const btnPlayItem = document.createElement('button');
    btnPlayItem.textContent = 'Play';
    btnPlayItem.addEventListener('click', () => setStream(st.url_resolved || st.url, st.name || 'Nepoznato', { name: st.name, urlResolved: st.url_resolved || st.url }));

    const btnFavItem = document.createElement('button');
    btnFavItem.textContent = '☆ Spremi';
    btnFavItem.addEventListener('click', () => saveFavorite({ name: st.name, url: st.url_resolved || st.url }));

    actions.append(btnPlayItem, btnFavItem);
    li.append(title, meta, actions);
    resultsEl.appendChild(li);
  });
}

// --------------------------------------------------
// FAVORITES MANAGEMENT
// --------------------------------------------------
function loadFavorites() {
  try {
    return JSON.parse(localStorage.getItem('mojiradio:favs') || '[]');
  } catch {
    return [];
  }
}

function saveFavorite(station) {
  const favs = loadFavorites();
  if (!favs.find(f => f.url === station.url)) {
    let customName = prompt("Unesite naziv stanice:", station.name || "Nova stanica");
    if (!customName) customName = station.name || "Nepoznato";
    station.name = customName.trim();
    favs.push(station);
    localStorage.setItem('mojiradio:favs', JSON.stringify(favs));
    renderFavorites();
    updateFavButton(station.url);
    alert(`Spremljeno kao "${customName}"`);
  }
}

function removeFavorite(url) {
  const favs = loadFavorites().filter(f => f.url !== url);
  localStorage.setItem('mojiradio:favs', JSON.stringify(favs));
  renderFavorites();
  updateFavButton(npUrl.textContent);
}

function isFavorite(url) {
  return loadFavorites().some(f => f.url === url);
}

function updateFavButton(currentUrl) {
  if (isFavorite(currentUrl)) {
    btnFav.textContent = '★ U favoritima';
    btnFav.dataset.state = 'saved';
  } else {
    btnFav.textContent = '☆ Spremi';
    btnFav.dataset.state = 'unsaved';
  }
}

function toggleFavorite() {
  const url = npUrl.textContent;
  if (!url) return;
  if (isFavorite(url)) {
    removeFavorite(url);
  } else {
    saveFavorite({ name: npTitle.textContent, url });
  }
}

function renderFavorites() {
  const favs = loadFavorites();
  favListEl.innerHTML = '';
  if (favs.length === 0) {
    favListEl.innerHTML = '<li>Nema spremljenih favorita.</li>';
    return;
  }
  favs.forEach(f => {
    const li = document.createElement('li');
    const t = document.createElement('div');
    t.className = 'title';
    t.textContent = f.name || 'Nepoznato';
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = f.url;

    const actions = document.createElement('div');
    actions.className = 'item-actions';

    const bPlay = document.createElement('button');
    bPlay.textContent = '▶️ Play';
    bPlay.addEventListener('click', () => setStream(f.url, f.name || 'Nepoznato'));

    const bRename = document.createElement('button');
    bRename.textContent = '✏️ Preimenuj';
    bRename.addEventListener('click', () => {
      const newName = prompt('Unesite novi naziv stanice:', f.name || 'Nepoznato');
      if (newName) {
        f.name = newName.trim();
        localStorage.setItem('mojiradio:favs', JSON.stringify(favs));
        renderFavorites();
      }
    });

    const bDel = document.createElement('button');
    bDel.textContent = '❌ Ukloni';
    bDel.addEventListener('click', () => removeFavorite(f.url));

    actions.append(bPlay, bRename, bDel);
    li.append(t, meta, actions);
    favListEl.appendChild(li);
  });
}

// --------------------------------------------------
// BACKUP / IMPORT FAVORITA
// --------------------------------------------------
btnExport.addEventListener('click', () => {
  const favs = loadFavorites();
  const blob = new Blob([JSON.stringify(favs, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'mojiradio-favoriti.json';
  a.click();
});

btnImport.addEventListener('click', () => importFile.click());
importFile.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const favs = JSON.parse(ev.target.result);
      if (Array.isArray(favs)) {
        localStorage.setItem('mojiradio:favs', JSON.stringify(favs));
        renderFavorites();
        alert('Favoriti su uspješno učitani!');
      } else {
        alert('Nevažeća datoteka.');
      }
    } catch (err) {
      alert('Greška pri učitavanju datoteke.');
    }
  };
  reader.readAsText(file);
});

// --------------------------------------------------
// RESTORE LAST SESSION
// --------------------------------------------------
(function restoreLast() {
  try {
    const last = JSON.parse(localStorage.getItem('mojiradio:last') || 'null');
    if (last && last.urlResolved) setStream(last.urlResolved, last.name);
    else if (last && last.url) setStream(last.url, last.name);
  } catch {}
  renderFavorites();
})();

// --- Upute: otvori / zatvori modal ---
window.addEventListener("DOMContentLoaded", () => {
  const helpBtn = document.getElementById('helpBtn');
  const helpModal = document.getElementById('helpModal');
  const helpClose = document.getElementById('helpClose');
  if (!helpBtn || !helpModal || !helpClose) return;

  helpModal.setAttribute('hidden',''); // sigurno sakrij modal na startu

  const open = () => { helpModal.removeAttribute('hidden'); document.body.style.overflow='hidden'; };
  const close = () => { helpModal.setAttribute('hidden',''); document.body.style.overflow=''; };

  helpBtn.addEventListener('click', open);
  helpClose.addEventListener('click', close);
  helpModal.addEventListener('click', (e) => { if (e.target === helpModal) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !helpModal.hasAttribute('hidden')) close(); });
});
