// study.js — progress tracking + notes, all in localStorage
// Data shape:
// {
//   progress: { "01-code-quality": { "section-id": "studying|review|mastered" } },
//   notes:    { "01-code-quality": { "__page__": "...", "section-id": "..." } }
// }

const StudyStore = (() => {
  const KEY = 'szmgr-study-v1';
  const STATES = ['none', 'studying', 'review', 'mastered'];
  const NEXT = { none: 'studying', studying: 'review', review: 'mastered', mastered: 'none' };
  const ICON = { none: '○', studying: '◐', review: '⚠', mastered: '✓' };
  const LABEL = { none: 'Not started', studying: 'Studying', review: 'Needs review', mastered: 'Mastered' };

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || { progress: {}, notes: {} }; }
    catch (e) { return { progress: {}, notes: {} }; }
  }
  function save(d) { localStorage.setItem(KEY, JSON.stringify(d)); }
  function pageKey() {
    const f = location.pathname.split('/').pop() || 'index.html';
    return f.replace(/\.html$/, '') || 'index';
  }

  return {
    STATES, NEXT, ICON, LABEL,
    pageKey,
    raw: load,
    getStatus(page, id) {
      const d = load();
      return d.progress[page]?.[id] || 'none';
    },
    setStatus(page, id, status) {
      const d = load();
      d.progress[page] = d.progress[page] || {};
      if (status === 'none') delete d.progress[page][id];
      else d.progress[page][id] = status;
      if (Object.keys(d.progress[page]).length === 0) delete d.progress[page];
      save(d);
    },
    cycleStatus(page, id) {
      const cur = this.getStatus(page, id);
      const next = NEXT[cur];
      this.setStatus(page, id, next);
      return next;
    },
    getNote(page, id) {
      const d = load();
      return d.notes[page]?.[id] || '';
    },
    setNote(page, id, text) {
      const d = load();
      d.notes[page] = d.notes[page] || {};
      if (!text || !text.trim()) delete d.notes[page][id];
      else d.notes[page][id] = text;
      if (Object.keys(d.notes[page]).length === 0) delete d.notes[page];
      save(d);
    },
    // page-wide notes use the __page__ key
    getPageNote(page) { return this.getNote(page, '__page__'); },
    setPageNote(page, text) { this.setNote(page, '__page__', text); },

    // aggregate stats for the dashboard
    summary() {
      const d = load();
      const out = {};
      for (const p in d.progress) {
        const counts = { studying: 0, review: 0, mastered: 0 };
        for (const id in d.progress[p]) counts[d.progress[p][id]]++;
        out[p] = counts;
      }
      return out;
    },

    exportText() { return JSON.stringify(load(), null, 2); },
    importText(json) {
      const parsed = JSON.parse(json);
      if (!parsed.progress || !parsed.notes) throw new Error('Invalid study data');
      save(parsed);
    },
    reset() { localStorage.removeItem(KEY); }
  };
})();

// ----------------------------------------------------------------------
// UI injection — runs after the existing TOC builder in script.js
// ----------------------------------------------------------------------

function injectStudyControls() {
  const main = document.querySelector('main');
  if (!main) return;
  const page = StudyStore.pageKey();

  main.querySelectorAll('h2').forEach((h) => {
    if (!h.id) return; // built by script.js TOC pass
    if (h.dataset.studyAttached === '1') return;
    h.dataset.studyAttached = '1';

    const controls = document.createElement('span');
    controls.className = 'study-controls';
    controls.innerHTML = `
      <button type="button" class="study-pill" data-h="${h.id}" title="Cycle: Not started → Studying → Review → Mastered"></button>
      <button type="button" class="study-note-btn" data-h="${h.id}" title="Add a note for this section">notes</button>
    `;
    h.appendChild(controls);

    // initial state
    refreshPill(controls.querySelector('.study-pill'), StudyStore.getStatus(page, h.id));

    // wire pill cycle
    controls.querySelector('.study-pill').addEventListener('click', (e) => {
      e.preventDefault();
      const next = StudyStore.cycleStatus(page, h.id);
      refreshPill(e.currentTarget, next);
      // tiny pulse animation
      e.currentTarget.classList.remove('pulse');
      void e.currentTarget.offsetWidth;
      e.currentTarget.classList.add('pulse');
    });

    // wire note toggle
    controls.querySelector('.study-note-btn').addEventListener('click', (e) => {
      e.preventDefault();
      toggleSectionNote(h);
    });

    // if a note exists, render the editor in collapsed-with-content state
    if (StudyStore.getNote(page, h.id)) {
      renderSectionNote(h, /* startOpen */ false);
      controls.querySelector('.study-note-btn').classList.add('has-note');
    }
  });
}

function refreshPill(btn, status) {
  btn.dataset.status = status;
  btn.textContent = StudyStore.ICON[status];
  btn.setAttribute('aria-label', StudyStore.LABEL[status]);
}

function toggleSectionNote(h2) {
  const next = h2.nextElementSibling;
  if (next && next.classList && next.classList.contains('section-note')) {
    next.classList.toggle('open');
    if (next.classList.contains('open')) next.querySelector('textarea').focus();
  } else {
    renderSectionNote(h2, true);
  }
}

function renderSectionNote(h2, startOpen) {
  const page = StudyStore.pageKey();
  const id = h2.id;
  const wrap = document.createElement('div');
  wrap.className = 'section-note' + (startOpen ? ' open' : '');
  wrap.dataset.sectionId = id;
  wrap.innerHTML = `
    <div class="section-note-head">
      <span>Note for &ldquo;${escapeHtml(plainHeadingText(h2))}&rdquo;</span>
      <button type="button" class="section-note-close" title="Close">×</button>
    </div>
    <textarea spellcheck="false" placeholder="Type a note. Markdown not rendered. Auto-saves on blur."></textarea>
  `;
  const ta = wrap.querySelector('textarea');
  ta.value = StudyStore.getNote(page, id);
  ta.addEventListener('blur', () => {
    StudyStore.setNote(page, id, ta.value);
    const btn = h2.querySelector('.study-note-btn');
    if (btn) btn.classList.toggle('has-note', !!ta.value.trim());
  });
  wrap.querySelector('.section-note-close').addEventListener('click', () => {
    wrap.classList.remove('open');
  });
  h2.parentNode.insertBefore(wrap, h2.nextSibling);
}

function plainHeadingText(h2) {
  // strip the anchor link + study-controls
  return [...h2.childNodes]
    .filter(n => n.nodeType === Node.TEXT_NODE || (n.nodeType === Node.ELEMENT_NODE && !n.classList?.contains('study-controls') && !n.classList?.contains('anchor')))
    .map(n => n.textContent).join('').replace(/#$/, '').trim();
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ----------------------------------------------------------------------
// Floating "page notes" panel (and export/import)
// ----------------------------------------------------------------------

function injectPageNotesPanel() {
  const page = StudyStore.pageKey();
  const dock = document.createElement('div');
  dock.className = 'page-notes-dock';
  dock.innerHTML = `
    <button type="button" class="page-notes-toggle" title="Page notes &amp; study data (n)">
      <span class="dot"></span> notes
    </button>
    <div class="page-notes-panel" hidden>
      <div class="page-notes-head">
        <strong>Notes for this page</strong>
        <button type="button" class="page-notes-close" title="Close">×</button>
      </div>
      <textarea class="page-notes-textarea" spellcheck="false" placeholder="Free-form notes for this whole page. Auto-saves on blur."></textarea>
      <div class="page-notes-foot">
        <button type="button" class="study-export" title="Copy all study data to clipboard">Export JSON</button>
        <button type="button" class="study-import" title="Paste JSON to restore">Import JSON</button>
        <button type="button" class="study-reset" title="Wipe all progress and notes">Reset</button>
      </div>
    </div>
  `;
  document.body.appendChild(dock);

  const toggle = dock.querySelector('.page-notes-toggle');
  const panel = dock.querySelector('.page-notes-panel');
  const ta = dock.querySelector('.page-notes-textarea');
  const dot = dock.querySelector('.dot');

  function refreshDot() {
    dot.classList.toggle('has-content', !!StudyStore.getPageNote(page).trim());
  }
  refreshDot();
  ta.value = StudyStore.getPageNote(page);

  toggle.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    if (!panel.hidden) ta.focus();
  });
  dock.querySelector('.page-notes-close').addEventListener('click', () => { panel.hidden = true; });

  ta.addEventListener('blur', () => {
    StudyStore.setPageNote(page, ta.value);
    refreshDot();
  });

  // keyboard shortcut: press "n" outside a form field to toggle
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'n' || e.metaKey || e.ctrlKey || e.altKey) return;
    const tgt = e.target;
    if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.isContentEditable)) return;
    e.preventDefault();
    toggle.click();
  });

  dock.querySelector('.study-export').addEventListener('click', async () => {
    const json = StudyStore.exportText();
    try {
      await navigator.clipboard.writeText(json);
      flashToast(dock, 'Study data copied to clipboard.');
    } catch (err) {
      // fallback: show in textarea
      ta.value = json;
      ta.select();
      flashToast(dock, 'Copy not allowed — JSON shown in the textarea, copy manually.');
    }
  });

  dock.querySelector('.study-import').addEventListener('click', () => {
    const json = prompt('Paste your exported study JSON:');
    if (!json) return;
    try {
      StudyStore.importText(json);
      flashToast(dock, 'Imported. Refresh page to see changes.');
    } catch (err) {
      flashToast(dock, 'Import failed: ' + err.message);
    }
  });

  dock.querySelector('.study-reset').addEventListener('click', () => {
    if (!confirm('Wipe all progress and notes? This cannot be undone.')) return;
    StudyStore.reset();
    flashToast(dock, 'All data cleared. Refresh to see effect.');
  });
}

function flashToast(parent, msg) {
  const t = document.createElement('div');
  t.className = 'study-toast';
  t.textContent = msg;
  parent.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 250); }, 2500);
}

// ----------------------------------------------------------------------
// Index-page progress dashboard
// ----------------------------------------------------------------------

const QUESTION_META = [
  { slug: '01-code-quality',          label: 'Q1 Code Quality' },
  { slug: '02-software-engineering',  label: 'Q2 SW Eng' },
  { slug: '03-databases',             label: 'Q3 Databases' },
  { slug: '04-networks',              label: 'Q4 Networks' },
  { slug: '05-distributed-systems',   label: 'Q5 Distributed Systems' },
  { slug: '06-development-deployment',label: 'Q6 Dev & Deploy' },
  { slug: '07-secure-infrastructure', label: 'Q7 Secure Infrastructure' },
  { slug: '08-cloud',                 label: 'Q8 Cloud' },
  { slug: '09-operating-systems',     label: 'Q9 Operating Systems' },
  { slug: '10-nosql',                 label: 'Q10 NoSQL' }
];

function renderIndexDashboard() {
  const slot = document.getElementById('progress-dashboard');
  if (!slot) return;
  const summary = StudyStore.summary();
  const total = QUESTION_META.reduce((acc, q) => {
    const s = summary[q.slug] || {};
    acc.studying += s.studying || 0;
    acc.review   += s.review   || 0;
    acc.mastered += s.mastered || 0;
    return acc;
  }, { studying: 0, review: 0, mastered: 0 });
  const sum = total.studying + total.review + total.mastered;

  const totalsHtml = `
    <div class="dash-totals">
      <div class="dash-total mastered"><span class="n">${total.mastered}</span><span class="l">Mastered</span></div>
      <div class="dash-total review"><span class="n">${total.review}</span><span class="l">Review</span></div>
      <div class="dash-total studying"><span class="n">${total.studying}</span><span class="l">Studying</span></div>
      <div class="dash-total all"><span class="n">${sum}</span><span class="l">Total marked</span></div>
    </div>
  `;

  const rowsHtml = QUESTION_META.map(q => {
    const s = summary[q.slug] || {};
    const m = s.mastered || 0, r = s.review || 0, st = s.studying || 0;
    const tot = m + r + st;
    return `
      <a class="dash-row" href="${q.slug}.html">
        <div class="dash-row-label">${q.label}</div>
        <div class="dash-row-bar">
          ${segBar('mastered', m, tot)}
          ${segBar('review',   r, tot)}
          ${segBar('studying', st, tot)}
        </div>
        <div class="dash-row-counts">
          ${m ? `<span class="b-mastered">${m}✓</span>` : ''}
          ${r ? `<span class="b-review">${r}⚠</span>`  : ''}
          ${st? `<span class="b-studying">${st}◐</span>` : ''}
          ${tot === 0 ? '<span class="b-none">—</span>' : ''}
        </div>
      </a>
    `;
  }).join('');

  slot.innerHTML = totalsHtml + '<div class="dash-rows">' + rowsHtml + '</div>';
}

function segBar(cls, n, total) {
  if (!total || !n) return '';
  const pct = (n / Math.max(total, 1)) * 100;
  return `<span class="seg ${cls}" style="flex: ${n} 0 0;" title="${n} ${cls}"></span>`;
}

// ----------------------------------------------------------------------
// Init
// ----------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  // wait a tick so script.js can build the TOC + assign h2 IDs first
  setTimeout(() => {
    injectStudyControls();
    injectPageNotesPanel();
    renderIndexDashboard();
  }, 0);
});
