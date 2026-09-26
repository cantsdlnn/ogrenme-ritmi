import './style.css';
import {
  applyReview,
  buildDailyQueue,
  completionPercent,
  overdueDays,
  sevenDayActivity,
  validateTopic,
  type ReviewRating,
  type Topic,
} from './domain';
import { clearData, loadData, saveData } from './storage';

const rootElement = document.querySelector<HTMLDivElement>('#app');
if (!rootElement) throw new Error('Uygulama kökü yok.');
const root: HTMLDivElement = rootElement;
let data = loadData();
function today(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}
function esc(value: string): string {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ??
      character,
  );
}

function render(): void {
  const current = today();
  const queue = buildDailyQueue(data.topics, current, data.minuteBudget);
  const todayEvents = data.events.filter((event) => event.reviewedOn === current);
  const activity = sevenDayActivity(data.events, current);
  const percent = completionPercent(
    queue,
    todayEvents.map((event) => event.topicId),
  );
  root.innerHTML = `<header><div><p class="eyebrow">AÇIKLANABİLİR TEKRAR PLANI</p><h1>Öğrenme<br/><span>Ritmi</span></h1></div><div class="hero-note"><b>${queue.length}</b><span>bugünkü konu</span><small>Plan cihazında, karar sende.</small></div></header><main>
  <section class="metrics"><article><span>GÜNLÜK İLERLEME</span><strong>%${percent}</strong><i style="--value:${percent}%"></i></article><article><span>ÇALIŞMA BÜTÇESİ</span><strong>${data.minuteBudget} dk</strong><input id="budget" type="range" min="15" max="120" step="15" value="${data.minuteBudget}"/></article><article><span>7 GÜNLÜK TEKRAR</span><div class="bars">${activity.map((count) => `<i style="--height:${Math.max(8, count * 22)}%" title="${count} tekrar"></i>`).join('')}</div></article></section>
  <section class="board"><div class="queue"><div class="section-head"><div><p class="step">01 · BUGÜN</p><h2>Tekrar kuyruğu</h2></div><span>En geciken ve düşük serili konular önce</span></div>${queue.length ? queue.map((topic) => `<article class="topic"><div class="date"><b>${overdueDays(topic.dueDate, current)}</b><span>GÜN<br/>GECİKME</span></div><div><small>${esc(topic.course)}</small><h3>${esc(topic.title)}</h3><p>${topic.estimatedMinutes} dakika · ${topic.streak} başarılı tekrar · mevcut aralık ${topic.intervalDays} gün</p></div><div class="ratings"><button data-review="${esc(topic.id)}" data-rating="again">Tekrar</button><button data-review="${esc(topic.id)}" data-rating="hard">Zordu</button><button class="good" data-review="${esc(topic.id)}" data-rating="good">Biliyorum</button></div></article>`).join('') : '<div class="empty">Bugünün kuyruğu tamam. Yeni konu ekleyebilir veya bütçeyi artırabilirsiniz.</div>'}</div>
  <aside><p class="step">02 · KONU EKLE</p><h2>Yeni çalışma konusu</h2><form id="topicForm"><label>Ders<input name="course" required maxlength="50" placeholder="Veri Yapıları"/></label><label>Konu<input name="title" required maxlength="80" placeholder="Bağlı listeler"/></label><label>İlk tekrar tarihi<input name="dueDate" type="date" value="${current}" required/></label><label>Tahmini süre<input name="minutes" type="number" min="5" max="180" value="20" required/></label><p id="error" role="alert"></p><button class="primary">Konuya başla</button></form><div class="tools"><button id="sample">Örnek konular</button><button id="export">JSON yedeği</button><button id="clear">Tümünü sil</button></div></aside></section>
  <section class="all-topics"><div class="section-head"><div><p class="step">03 · KONU HARİTASI</p><h2>Tüm konular</h2></div><span>${data.topics.length} kayıt</span></div><div>${
    data.topics.length
      ? data.topics
          .slice()
          .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
          .map(
            (topic) =>
              `<article><span>${esc(topic.course)}</span><strong>${esc(topic.title)}</strong><time>${topic.dueDate}</time><button data-delete="${esc(topic.id)}">Sil</button></article>`,
          )
          .join('')
      : '<div class="empty">Henüz konu yok.</div>'
  }</div></section></main><footer>Öğrenme Ritmi · Aralık önerisi açıklanabilir kurallarla hesaplanır · Not veya sınav kararı vermez</footer>`;
  bind();
}

function bind(): void {
  document.querySelector<HTMLInputElement>('#budget')?.addEventListener('input', (event) => {
    data.minuteBudget = Number((event.currentTarget as HTMLInputElement).value);
    saveData(data);
    render();
  });
  document.querySelector<HTMLFormElement>('#topicForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!(event.currentTarget instanceof HTMLFormElement)) return;
    const form = new FormData(event.currentTarget);
    const topic: Topic = {
      id: crypto.randomUUID(),
      course: String(form.get('course') ?? '').trim(),
      title: String(form.get('title') ?? '').trim(),
      dueDate: String(form.get('dueDate') ?? ''),
      estimatedMinutes: Number(form.get('minutes')),
      intervalDays: 1,
      streak: 0,
    };
    const errors = validateTopic(topic);
    const box = document.querySelector<HTMLParagraphElement>('#error');
    if (errors.length) {
      if (box) box.textContent = errors.join(' ');
      return;
    }
    data.topics.push(topic);
    saveData(data);
    render();
  });
  document.querySelectorAll<HTMLButtonElement>('[data-review]').forEach((button) =>
    button.addEventListener('click', () => {
      const topic = data.topics.find((item) => item.id === button.dataset.review);
      if (!topic) return;
      const result = applyReview(topic, button.dataset.rating as ReviewRating, today());
      data.topics = data.topics.map((item) => (item.id === topic.id ? result.topic : item));
      data.events.push(result.event);
      saveData(data);
      render();
    }),
  );
  document.querySelectorAll<HTMLButtonElement>('[data-delete]').forEach((button) =>
    button.addEventListener('click', () => {
      data.topics = data.topics.filter((topic) => topic.id !== button.dataset.delete);
      saveData(data);
      render();
    }),
  );
  document.querySelector('#sample')?.addEventListener('click', () => {
    const date = today();
    data.topics.push(
      {
        id: crypto.randomUUID(),
        course: 'Web Programlama',
        title: 'HTTP durum kodları',
        dueDate: date,
        estimatedMinutes: 15,
        intervalDays: 1,
        streak: 0,
      },
      {
        id: crypto.randomUUID(),
        course: 'Veri Tabanı',
        title: 'JOIN türleri',
        dueDate: date,
        estimatedMinutes: 20,
        intervalDays: 3,
        streak: 2,
      },
      {
        id: crypto.randomUUID(),
        course: 'Algoritmalar',
        title: 'İkili arama sınırları',
        dueDate: date,
        estimatedMinutes: 15,
        intervalDays: 1,
        streak: 1,
      },
    );
    saveData(data);
    render();
  });
  document.querySelector('#export')?.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ogrenme-ritmi-${today()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  });
  document.querySelector('#clear')?.addEventListener('click', () => {
    if (!confirm('Tüm konu ve tekrar geçmişi silinsin mi?')) return;
    clearData();
    data = loadData();
    render();
  });
}
render();
if ('serviceWorker' in navigator)
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
