// Config
const DEFAULT_STREAM = "https://moj-radio.vercel.app/api/proxy?url=https://dygedge.radyotvonline.net/radyovoyage/playlist.m3u8";
const API_BASES = [
  "https://de1.api.radio-browser.info",
  "https://fr1.api.radio-browser.info",
  "https://nl1.api.radio-browser.info"
];
const url = "https://moj-radio.vercel.app/api/proxy?url=" + encodeURIComponent(apiUrl);

// Elements
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

// Init player
// Init player – čekaj da DOM i hls.js budu spremni
window.addEventListener("DOMContentLoaded", () => {
  const startWhenReady = () => {
    const audioEl = document.getElementById("audio");
    if (audioEl && window.Hls) {
      setStream(DEFAULT_STREAM, "Zadani stream");
    } else {
      // pokušavaj svakih 200 ms dok sve ne bude spremno
      setTimeout(startWhenReady, 200);
    }
  };
  startWhenReady();
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
function setStream(url, title, stationObj) {
  npTitle.textContent = title || 'Nepoznato';
  npUrl.textContent = url;

  // HLS podrška
  if (audio.canPlayType('application/vnd.apple.mpegurl')) {
    // Safari i iOS podržavaju HLS nativno
    audio.src = url;
  } else if (window.Hls && Hls.isSupported()) {
    // Chrome, Edge, Firefox, Android
    if (window.hls) {
      window.hls.destroy();
    }
    window.hls = new Hls();
    window.hls.loadSource(url);
    window.hls.attachMedia(audio);
  } else {
    console.warn('HLS nije podržan, pokušavam izravno');
    audio.src = url;
  }

  audio.load();
  updateFavButton(url);

  if (stationObj) {
    localStorage.setItem('mojiradio:last', JSON.stringify(stationObj));
  } else {
    localStorage.setItem('mojiradio:last', JSON.stringify({ name: title, urlResolved: url }));
  }
}


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
  const url = CORS_PROXY + encodeURIComponent(apiUrl);

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
    const mCodec = st.codec ? `🎵 ${st.codec} ${st.bitrate ? st.bitrate+'kbps' : ''}` : null;
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

    actions.appendChild(btnPlayItem);
    actions.appendChild(btnFavItem);

    li.appendChild(title);
    li.appendChild(meta);
    li.appendChild(actions);
    resultsEl.appendChild(li);
  });
}

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
    favs.push(station);
    localStorage.setItem('mojiradio:favs', JSON.stringify(favs));
    renderFavorites();
    updateFavButton(station.url);
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
    bPlay.textContent = 'Play';
    bPlay.addEventListener('click', () => setStream(f.url, f.name || 'Nepoznato'));
    const bDel = document.createElement('button');
    bDel.textContent = 'Ukloni';
    bDel.addEventListener('click', () => removeFavorite(f.url));

    actions.appendChild(bPlay);
    actions.appendChild(bDel);

    li.appendChild(t);
    li.appendChild(meta);
    li.appendChild(actions);
    favListEl.appendChild(li);
  });
}

// Restore last session
(function restoreLast() {
  try {
    const last = JSON.parse(localStorage.getItem('mojiradio:last') || 'null');
    if (last && last.urlResolved) {
      setStream(last.urlResolved, last.name);
    } else if (last && last.url) {
      setStream(last.url, last.name);
    }
  } catch {}
  renderFavorites();
})();
