/* ==========================================================
   script.js — Drive management SOP.
   1 Data · 2 Helpers · 3 Layout · 4 One module per page
   Each page sets <body data-page="..."> and only its module runs.
   ========================================================== */
'use strict';

/* ---------- 1. Data ---------- */
const PAGES = [
  { id: 'home', href: 'index.html', label: 'Home' },
  { id: 'structure', href: 'structure.html', label: 'Structure' },
  { id: 'naming', href: 'naming.html', label: 'Naming' },
  { id: 'archiving', href: 'archiving.html', label: 'Archiving' },
];

// Every project or initiative gets the same subfolders.
const PROJECT = [
  { n: 'README', note: 'Start here: what is in this drive, who to ask, and the archive log.' },
  {
    n: 'Literature_Evidence', note: 'Intervention summaries, resources, literature.', kids: [
      { n: 'Evaluation_Summaries' },
      { n: 'Knowledge_Sharing' },
    ]
  },
  {
    n: 'Program_Management', note: 'Work plans, trackers, reports and outreach content.', kids: [
      { n: 'Work_Plans' },
      { n: 'Trackers' },
      { n: 'Copy_Edited_Reports' },
      {
        n: 'Social_Media', kids: [
          { n: 'Photo_library' },
          { n: 'Posts_Articles_Blogs' },
          { n: 'Videos' },
          { n: 'Pitches_Pagers' }
        ]
      },
    ]
  },
  {
    n: 'Grant_Management', note: 'Applications, budgets and everything donors need.', kids: [
      { n: 'Applications_Award_Letters' },
      { n: 'Budgets' },
      { n: 'Cost_effectiveness_Calculations' },
      { n: 'Charge_Codes' },
      { n: 'Donor_Deliverables' },
      { n: 'Vendor_Contracts' },
      { n: 'Invoices' },
    ]
  },
  {
    n: 'Governance', note: 'Outreach, agreements, and resources from the government.', kids: [
      {
        n: '<state_folder>', note: 'One folder per state: decks, curricula, reports, GOs.', ph: true, kids: [
          { n: 'Agreements', note: 'LoS and MoU.' },
          { n: 'Orders', note: 'Released notices and orders.' },
          { n: 'Outreach', note: 'Decks, pagers, eval summaries.' },
          { n: 'Policy_Collateral', note: 'Policies, curricula, state reports.' },
        ]
      }
    ]
  },
  {
    n: 'Reserch_and_Operations', note: 'State material, agreements and research work.', kids: [
      {
        n: '<state_folder>', note: 'One folder per state: RO, data, analysis, reports.', ph: true, kids: [
          { n: 'Raw_Data', note: 'Encrypted data files.' },
          { n: 'Analysis_Code', note: 'Clean data and analysis code.' },
          { n: 'Reports_Outputs', note: 'Code output and designed reports.' },
          { n: 'Operations', note: 'M&E tools, RO collateral, field plans and attendance.' },
        ]
      },
      { n: 'Theory_of_Change' }, { n: 'Monitoring_tools' }, { n: 'M&E_Transfer_Resources' },
    ]
  },
  { n: 'Partner_Folder', note: 'The only place partner-shared files live. Keep internal drafts out.' },
  {
    n: 'Archive', note: 'Closed or superseded files, filed by theme. See Archiving.', kids: [
      { n: '<Theme_YYYY_MM_DD>', ph: true },
    ]
  },
];

// (1) Root folder: shared resources only. Projects are NOT kept here.
const ROOT_FOLDER = [
  { n: 'README', note: 'Start here: what is in this drive, who to ask, and the archive log.' },
  {
    n: 'Human_Resource', note: 'Team-only material, not shared with partners or donors.', kids: [
      { n: 'Hiring' }, { n: 'Onboarding' }, { n: 'Teach_Backs' },
    ]
  },
  {
    n: 'Initiatives', note: 'One subfolder per initiative. A new initiative gets a subfolder here.', kids: [
      {
        n: '<initiative_name>', ph: true, note: 'Everything for one initiative.', kids: [
          { n: 'Background_Literature_Review' },
          { n: 'Notes_Minutes' },
          { n: 'Budgets_Reports' },
          { n: 'Onboarding' },
          { n: 'Outreach' },
        ]
      },
    ]
  },
  {
    n: 'Common_Resources', note: 'Reusable material that applies across projects and initiatives.', kids: [
      { n: 'Meeting_Notes' }, { n: 'Strategic_Thinking' }, { n: 'Comms_Templates' },
    ]
  },
  {
    n: 'Archive', note: 'Closed or superseded files, filed by theme. See Archiving.', kids: [
      { n: '<Theme_YYYY_MM_DD>', ph: true },
    ]
  },
];

// Both structures shown on the Structure page. `start` = first folder number (null = unnumbered).
const EXPLORERS = {
  root: {
    n: '<root_folder>', ph: true, start: 0, kids: ROOT_FOLDER,
    note: 'The team drive folder. Shared resources only. Projects live in their own drive folders.'
  },
  project: {
    n: '<project_drive>', ph: true, start: 0, kids: PROJECT,
    note: 'Each new project gets its own drive. Every project has the same subfolders.'
  },
};

const FORBIDDEN = /[\\/:*?"<>|]/g;
const VAGUE = /\b(final|new|latest|copy|old|temp|misc|untitled)\b/i;

/* ---------- 2. Helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const val = id => $('#' + id)?.value ?? '';
const radio = name => $(`input[name="${name}"]:checked`)?.value;
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
const clean = s => (s || '').replace(FORBIDDEN, '').replace(/\s+/g, ' ').trim();
const today = () => new Date().toISOString().slice(0, 10);
const el = (tag, cls, text) => Object.assign(document.createElement(tag), { className: cls || '', textContent: text || '' });

const store = {
  get(k, d) { try { return localStorage.getItem('sop:' + k) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('sop:' + k, v); } catch { /* storage unavailable */ } },
};
const projectCode = () => clean(store.get('project', 'GEC')).replace(/\s/g, '') || 'GEC';

// Run fn now and whenever anything inside `node` changes.
function live(node, fn) { ['input', 'change'].forEach(e => node.addEventListener(e, fn)); fn(); }

// Inputs with data-persist="key" are remembered across pages.
function initPersist() {
  $$('[data-persist]').forEach(i => {
    const saved = store.get(i.dataset.persist, null);
    if (saved !== null) i.value = saved;
    i.addEventListener('input', () => store.set(i.dataset.persist, i.value));
  });
}

// <button data-copy="#id"> copies that element's text.
document.addEventListener('click', e => {
  const btn = e.target.closest('[data-copy]'); if (!btn) return;
  const text = $(btn.dataset.copy).textContent;
  const fallback = () => { const t = document.createElement('textarea'); t.value = text; document.body.append(t); t.select(); document.execCommand('copy'); t.remove(); };
  (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).catch(fallback).then(() => {
    const t = el('div', 'toast', 'Copied'); document.body.append(t); setTimeout(() => t.remove(), 1200);
  });
});

// items: [{ s: 'ok' | 'warn' | 'bad', t: 'text' }]
const renderChecks = (ul, items) => ul.replaceChildren(...items.map(i => el('li', i.s, i.t)));

/* ---------- 3. Layout (shared header + footer) ---------- */
function renderLayout() {
  const page = document.body.dataset.page;
  const nav = PAGES.map(p => `<a href="${p.href}"${p.id === page ? ' aria-current="page"' : ''}>${p.label}</a>`).join('');
  $('#site-header').outerHTML = `
    <header class="site-header"><div class="container bar">
      <a class="brand" href="index.html" aria-label="J-PAL South Asia, home"><img class="logo" src="assets/logo.png" alt="J-PAL South Asia"></a>
      <nav class="nav" aria-label="Main">${nav}</nav>
    </div></header>`;

  const i = PAGES.findIndex(p => p.id === page), prev = PAGES[i - 1], next = PAGES[i + 1];
  $('#site-footer').outerHTML = `
    <div class="container">${i > 0 ? `<div class="pager">
      ${prev.id === 'home' ? '<span></span>' : `<a class="btn btn--ghost" href="${prev.href}">← ${prev.label}</a>`}
      ${next ? `<a class="btn" href="${next.href}">${next.label} →</a>` : '<span></span>'}</div>` : ''}</div>
    <footer class="site-footer"><div class="container">J-PAL South Asia · Drive management SOP</div></footer>`;
}

/* ---------- 4a. Page: Structure ---------- */
function initStructure() {
  $$('[data-explorer]').forEach(box => {
    const cfg = EXPLORERS[box.dataset.explorer], detail = $('.detail', box); let selected;
    const label = (node, i, start) => start === null ? node.n : `${i + start}_${node.n}`;

    // Click a folder to open it and read what goes inside
    function select(btn, node, path) {
      selected?.removeAttribute('aria-current');
      selected = btn; btn.setAttribute('aria-current', 'true');
      detail.replaceChildren(
        el('h3', '', btn.dataset.label), el('p', 'path', path.join(' / ')),
        el('p', '', node.note || `Part of “${path[path.length - 2] || 'the drive'}”.`),
        el('p', 'muted small', node.kids ? `${node.kids.length} subfolders` : 'Lowest level: files live here.'));
    }
    function build(nodes, path, start) {
      const ul = el('ul');
      nodes.forEach((node, i) => {
        const text = label(node, i, start), here = [...path, text];
        const li = el('li'), btn = el('button', 'node'); btn.type = 'button'; btn.dataset.label = text;
        btn.append(el('span', 'ico'), el('span', node.ph ? 'ph' : '', text));
        li.append(btn);
        let sub;
        if (node.kids) { sub = build(node.kids, here, path.length === 0 ? cfg.start : null); sub.hidden = true; li.append(sub); btn.setAttribute('aria-expanded', 'false'); }
        btn.addEventListener('click', () => {
          select(btn, node, here);
          if (sub) { sub.hidden = !sub.hidden; btn.setAttribute('aria-expanded', String(!sub.hidden)); }
        });
        ul.append(li);
      });
      return ul;
    }
    const tree = build([cfg], [], null); tree.className = 'tree';
    $('.tree-host', box).append(tree);
    const rootBtn = $('.node', tree); rootBtn.click();
    const rootSub = $('ul', tree);
    const setAll = open => $$('ul', tree).forEach(u => { u.hidden = !open; u.previousElementSibling.setAttribute('aria-expanded', String(open)); });
    $('[data-expand]', box).addEventListener('click', () => setAll(true));
    $('[data-collapse]', box).addEventListener('click', () => { setAll(false); rootSub.hidden = false; rootBtn.setAttribute('aria-expanded', 'true'); });
  });
}

/* ---------- 4b. Page: File names ---------- */
function initNaming() {
  $('#date').value = today();
  const words = s => s.replace(/&/g, ' and ').replace(/[^A-Za-z0-9\s-]/g, ' ').split(/[\s-]+/).filter(Boolean);
  const low = w => w.toLowerCase(), pas = w => cap(low(w));
  // Recommended style keeps acronyms: "q1 budget REVIEW" -> "Q1-budget-REVIEW"
  const mixed = ws => ws.map((w, i) => (w.length > 1 && w === w.toUpperCase()) ? w : (i ? low(w) : pas(w))).join('-');

  const STYLES = {
    mixed: (p, ws, d) => [p, mixed(ws), d].filter(Boolean).join('_'),
    snake: (p, ws, d) => [p, ...ws, ...d.split('-')].filter(Boolean).map(low).join('_'),
    kebab: (p, ws, d) => [p, ...ws, ...d.split('-')].filter(Boolean).map(low).join('-'),
    camel: (p, ws, d) => low(p) + ws.map(pas).join('') + d.replace(/-/g, ''),
    pascal: (p, ws, d) => pas(p) + ws.map(pas).join('') + d.replace(/-/g, ''),
  };

  live($('#nameForm'), () => {
    const project = clean(val('project')).replace(/\s/g, ''), raw = val('purpose'), ws = words(raw), date = val('date');
    const name = (project && ws.length && date) ? STYLES[radio('conv')](project, ws, date) : '';
    $('#nameOut').textContent = name || 'Fill in the fields above';
    const purpose = ws.join(' ');

    const len = name.length;
    renderChecks($('#nameChecks'), [
      project ? { s: 'ok', t: 'Has a project name.' } : { s: 'bad', t: 'Add a project name.' },
      purpose ? { s: 'ok', t: 'Says what the file is.' } : { s: 'bad', t: 'Say what the file is.' },
      date ? { s: 'ok', t: 'Has a date (YYYY-MM-DD).' } : { s: 'warn', t: 'Add a date.' },
      len <= 50 ? { s: 'ok', t: `${len} characters (50 or fewer).` } : { s: 'warn', t: `${len} characters: shorten the purpose.` },
      VAGUE.test(raw) ? { s: 'warn', t: 'Avoid “final”, “new”, “copy”. The date shows which is latest.' } : { s: 'ok', t: 'No vague words like “final” or “copy”.' },
    ]);
  });
}

/* ---------- 4c. Page: Archiving ---------- */
function initArchiving() {
  $('#theme').value = projectCode();
  $('#year').value = new Date().getFullYear();
  const snakeCase = value => value.replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase();

  live($('#archForm'), () => {
    const file = snakeCase(clean(val('file'))) || 'file-name.docx';
    const theme = snakeCase(clean(val('theme'))) || '<Milestone>';
    const year = val('year') || new Date().getFullYear();
    const dir = (radio('conv') === 'A' ? `Archive/${theme}/` : `Archive/${year}/`);
    $('#archPath').textContent = dir;
    $('#archLog').textContent = [today(), file, `moved to ${dir}`].join(' | ');
  });

  const boxes = $$('#archList input');
  const update = () => {
    const n = boxes.filter(b => b.checked).length, done = n === boxes.length;
    $('#progress').value = n;
    $('#progressText').textContent = done ? 'Ready to archive' : `${n} of ${boxes.length} done`;
    $('#progressText').className = done ? 'ready' : 'muted';
  };
  boxes.forEach(b => b.addEventListener('change', update)); update();
}

/* ---------- Boot ---------- */
renderLayout();
initPersist();
({ structure: initStructure, naming: initNaming, archiving: initArchiving })[document.body.dataset.page]?.();
