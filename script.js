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
const nowPlayingEl = document.getElementById('nowPlaying');

// --------------------------------------------------
// INIT PLAYER
// --------------------------------------------------
window.addEventListener("DOMContentLoaded", () => {
  const startWhenReady = () => {
    const audioEl = document.getElementById("audio");
    if (audioEl && window.Hls) {
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

  // HLS podrška
  if (audio.canPlayType('application/vnd.apple.mpegurl')) {
    audio.src = url;
  } else if (window.Hls && Hls.isSupported()) {
    if (window.hls) window.hls.destroy();
    window.hls = new Hls();
    window.hls.loadSource(url);
    window.hls.attachMedia(audio);
  } else {
    audio.src = url;
  }

  audio.load();
  updateFavButton(url);

  if
