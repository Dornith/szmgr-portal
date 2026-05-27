// SZMGR-SWE Portal — small helpers (no dependencies)

document.documentElement.classList.add('auto-theme');

// ---- Theme toggle (overrides prefers-color-scheme) ----
const storedTheme = localStorage.getItem('szmgr-theme');
if (storedTheme === 'light') {
  document.documentElement.style.colorScheme = 'light';
  document.documentElement.classList.remove('auto-theme');
  document.documentElement.classList.add('light-forced');
} else if (storedTheme === 'dark') {
  document.documentElement.style.colorScheme = 'dark';
  document.documentElement.classList.remove('auto-theme');
}

function toggleTheme() {
  const current = localStorage.getItem('szmgr-theme') || 'auto';
  const next = current === 'auto' ? 'dark' : current === 'dark' ? 'light' : 'auto';
  localStorage.setItem('szmgr-theme', next);
  location.reload();
}

// ---- Auto-build TOC from h2/h3 ----
function buildTOC() {
  const toc = document.querySelector('.toc ol');
  if (!toc) return;
  const main = document.querySelector('main');
  if (!main) return;
  const headings = main.querySelectorAll('h2, h3');
  headings.forEach((h) => {
    if (!h.id) {
      h.id = h.textContent.toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
    }
    // Add anchor link to heading
    const anchor = document.createElement('a');
    anchor.href = '#' + h.id;
    anchor.className = 'anchor';
    anchor.textContent = '#';
    anchor.setAttribute('aria-label', 'Permalink');
    h.appendChild(anchor);

    const li = document.createElement('li');
    if (h.tagName === 'H3') li.className = 'toc-l2';
    const a = document.createElement('a');
    a.href = '#' + h.id;
    a.textContent = h.textContent.replace(/#$/, '').trim();
    li.appendChild(a);
    toc.appendChild(li);
  });
}

// ---- Highlight current TOC entry on scroll ----
function setupScrollSpy() {
  const links = document.querySelectorAll('.toc a');
  if (!links.length) return;
  const headings = [...document.querySelectorAll('main h2, main h3')];

  function onScroll() {
    const fromTop = window.scrollY + 120;
    let activeIdx = 0;
    headings.forEach((h, i) => {
      if (h.offsetTop <= fromTop) activeIdx = i;
    });
    links.forEach((l) => l.classList.remove('active'));
    if (links[activeIdx]) links[activeIdx].classList.add('active');
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// ---- Highlight active top-nav link ----
function highlightActiveNav() {
  const here = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.topnav nav a').forEach((a) => {
    const href = a.getAttribute('href') || '';
    if (href === here) a.classList.add('active');
  });
}

// ---- Tiny SQL/code syntax helper (opt-in via class) ----
function highlightInlineCode() {
  document.querySelectorAll('pre.lang-sql code, pre.sql code').forEach((el) => {
    const kws = /\b(SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|ON|AS|GROUP|BY|ORDER|HAVING|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|DROP|ALTER|ADD|COLUMN|PRIMARY|KEY|FOREIGN|REFERENCES|NOT|NULL|UNIQUE|CHECK|INDEX|VIEW|DISTINCT|UNION|INTERSECT|MINUS|EXCEPT|IN|BETWEEN|AND|OR|LIKE|IS|EXISTS|CASCADE|COMMIT|ROLLBACK|SAVEPOINT|BEGIN|TRANSACTION|GRANT|REVOKE|IF)\b/gi;
    el.innerHTML = el.innerHTML
      .replace(/--.*$/gm, (m) => `<span class="com">${m}</span>`)
      .replace(/'[^']*'/g, (m) => `<span class="str">${m}</span>`)
      .replace(kws, (m) => `<span class="kw">${m.toUpperCase()}</span>`)
      .replace(/\b(\d+)\b/g, '<span class="num">$1</span>');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  buildTOC();
  setupScrollSpy();
  highlightActiveNav();
  highlightInlineCode();
  const toggle = document.querySelector('.theme-toggle');
  if (toggle) toggle.addEventListener('click', toggleTheme);
});
