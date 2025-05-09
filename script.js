const API_BASE = 'https://api.github.com/repos/rustem4uz/rustem4uz-music-site'; // это ссылка на ваш репозиторий
const CONTENTS = `${API_BASE}/contents/audios`; // тут папка в которой музыка
const TOKEN = '' // сюда свой токен вводите от гитхаба, у токена должен быть доступ к чтению и изменению файлов

async function fetchTracks() {
  const res = await fetch(CONTENTS);
  const data = await res.json();
  return data.filter(item => item.name.endsWith('.mp3'));
}

async function fetchAuthor(name) {
  const res = await fetch(`${API_BASE}/commits?path=audios/${name}&per_page=1`);
  const [latest] = await res.json();
  return latest.author?.login || 'Unknown';
}

async function deleteTrack(name, sha, el) {
  if (!confirm(`Удалить ${name}?`)) return;
  const res = await fetch(`${CONTENTS}/${name}`, {
    method: 'DELETE',
    headers: { 'Authorization': `token ${TOKEN}`, 'Accept': 'application/vnd.github.v3+json' },
    body: JSON.stringify({ message: `Delete ${name}`, sha })
  });
  if (res.ok) showNotification(`Файл ${name} удалён`, true), el.remove();
  else showNotification('Ошибка удаления', false);
}

function showNotification(text, success) {
  const area = document.getElementById('notification-area');
  const note = document.createElement('div');
  note.className = 'notification';
  note.innerHTML = `<p>${text}</p><button class="close">&times;</button>`;
  area.append(note);
  note.querySelector('.close').addEventListener('click', () => note.remove());
  setTimeout(() => note.remove(), 4000); // убирается через 4сек
}

function createTrackCard(track) {
  const div = document.createElement('div');
  div.className = 'track';

  const info = document.createElement('div');
  info.className = 'track-info';
  const title = document.createElement('p');
  title.textContent = track.name; // отображаем название которое было при загрузке
  const authorEl = document.createElement('p');
  authorEl.textContent = 'Добавил: ...';
  info.append(title, authorEl);

  const audio = document.createElement('audio');
  audio.controls = true;
  audio.src = track.download_url;

  const del = document.createElement('button');
  del.className = 'btn btn-delete';
  del.textContent = 'Удалить';
  del.addEventListener('click', () => deleteTrack(track.name, track.sha, div));

  div.append(info, audio, del);
  fetchAuthor(track.name).then(login => authorEl.textContent = `Добавил: ${login}`);
  return div;
}

async function loadAll() {
  try {
    const tracks = await fetchTracks();
    const container = document.getElementById('tracks');
    container.innerHTML = '';
    tracks.forEach(t => container.append(createTrackCard(t)));
  } catch (e) {
    console.error('Ошибка:', e);
  }
}

function playRandom(tracks) {
  const idx = Math.floor(Math.random() * tracks.length);
  const container = document.getElementById('tracks');
  container.innerHTML = '';
  container.append(createTrackCard(tracks[idx]));
}

document.getElementById('refresh-btn').addEventListener('click', loadAll);
document.getElementById('random-btn').addEventListener('click', async () => {
  const all = await fetchTracks();
  playRandom(all);
});
document.getElementById('search-input').addEventListener('input', async (e) => {
  const term = e.target.value.toLowerCase();
  const all = await fetchTracks();
  const filtered = all.filter(t => t.name.toLowerCase().includes(term));
  const container = document.getElementById('tracks');
  container.innerHTML = '';
  filtered.forEach(t => container.append(createTrackCard(t)));
});

window.onload = loadAll();