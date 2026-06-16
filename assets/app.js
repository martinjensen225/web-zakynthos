import {
  createTrip,
  deleteChecklistItem,
  deleteNote,
  getSession,
  loadTrip,
  loadTrips,
  login,
  logout,
  removeTrip,
  saveChecklistItem,
  saveNote,
  saveSection,
  setFavorite,
  updateTrip
} from '../data/trip.js';

const page = document.body.dataset.page;
const main = document.querySelector('#content');
const primaryNav = [
  ['trip.html', 'Cockpit'],
  ['itinerary.html', 'Plan'],
  ['map.html', 'Map'],
  ['more.html', 'More']
];
const quickPages = [
  ['./trip.html', 'Cockpit'],
  ['./itinerary.html', 'Plan timeline'],
  ['./map.html', 'Map'],
  ['./more.html', 'More'],
  ['./stay.html', 'Stay details'],
  ['./guide.html', 'Travel wallet'],
  ['./food.html', 'Food ideas'],
  ['./attractions.html', 'Ideas board'],
  ['./planning.html', 'Tasks and packing']
];
const workspacePages = new Set(['trip', 'itinerary', 'map', 'more', 'attractions', 'stay', 'food', 'guide', 'planning']);
const secondaryPageNames = new Set(['attractions', 'stay', 'food', 'guide', 'planning']);
const urlParams = new URLSearchParams(window.location.search);
const selectedTripId = urlParams.get('trip') || '';
const periodChoices = ['Morning', 'Afternoon', 'Evening', 'Flexible'];
const statusChoices = ['Idea', 'Suggested', 'Discussing', 'Planned', 'Booked', 'Confirmed', 'Cancelled', 'Needs attention'];
const decisionStatuses = ['Needs vote', 'Waiting for partner', 'Tie', 'Recommended match', 'Decided', 'Archived', 'Discussing'];
const taskStatuses = ['To do', 'In progress', 'Waiting', 'Done', 'Needs attention'];
const documentStatuses = ['Missing', 'Added manually', 'Confirmed', 'Not needed yet'];
const planTypes = ['Activity', 'Transport', 'Accommodation', 'Meal', 'Restaurant', 'Reminder', 'Task', 'Note', 'Free time'];

let trip;
let trips = [];
let session;
let editMode = false;
let dirtyDrafts = new Set();
let sectionDrafts = new Map();
let draggedItem = null;
let showAddPanel = false;
let showTripForm = false;
let editingTripId = '';

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function slug(value) {
  return String(value || 'new-item')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 44) || 'new-item';
}

function uniqueId(prefix, items) {
  const existing = new Set(items.map((item) => item?.id).filter(Boolean));
  let index = items.length + 1;
  let id = `${prefix}-${index}`;
  while (existing.has(id)) {
    index += 1;
    id = `${prefix}-${index}`;
  }
  return id;
}

function allPlanItemIds(days) {
  return new Set(days.flatMap((day) => dayItems(day).map((item) => item.id)).filter(Boolean));
}

function uniquePlanItemId(days, title) {
  const existing = allPlanItemIds(days);
  const base = `item-${slug(title)}`;
  let id = base;
  let index = 2;
  while (existing.has(id)) {
    id = `${base}-${index}`;
    index += 1;
  }
  return id;
}

function tripUrl(href, tripId = trip?.id ?? selectedTripId) {
  if (!tripId) {
    return href;
  }
  const [path, hash = ''] = href.split('#');
  const normalizedPath = path || './trip.html';
  const separator = normalizedPath.includes('?') ? '&' : '?';
  return `${normalizedPath}${separator}trip=${encodeURIComponent(tripId)}${hash ? `#${hash}` : ''}`;
}

function portfolioUrl() {
  return './index.html';
}

function draftKey(sectionKey) {
  return `trip:${trip.id}:draft:${sectionKey}`;
}

function normalizeDraft(sectionKey, draft) {
  if (sectionKey === 'itinerary') {
    for (const day of draft) {
      if (!Array.isArray(day.items)) {
        day.items = dayItems(day);
      }
    }
  }

  if (sectionKey === 'planning') {
    draft.decisions ??= [];
    draft.tasks ??= [];
    draft.documents ??= [];
    draft.packing = (draft.packing ?? []).map((item, index) => typeof item === 'string'
      ? { id: `pack-${index + 1}`, text: item, owner: 'Shared', category: 'Packing', essential: false, packed: false }
      : item);
    draft.openQuestions = (draft.openQuestions ?? []).map((item, index) => typeof item === 'string'
      ? { id: `question-${index + 1}`, title: item, status: 'Open', linkedDecisionId: '' }
      : item);
  }

  return draft;
}

function getSectionDraft(sectionKey) {
  if (sectionDrafts.has(sectionKey)) {
    return sectionDrafts.get(sectionKey);
  }

  const saved = window.localStorage.getItem(draftKey(sectionKey));
  const draft = normalizeDraft(sectionKey, saved ? JSON.parse(saved) : clone(trip[sectionKey]));
  sectionDrafts.set(sectionKey, draft);
  return draft;
}

function sectionValue(sectionKey) {
  return editMode && session.authenticated ? getSectionDraft(sectionKey) : trip[sectionKey];
}

function saveDraft(sectionKey) {
  window.localStorage.setItem(draftKey(sectionKey), JSON.stringify(getSectionDraft(sectionKey)));
  dirtyDrafts.add(sectionKey);
}

function clearDraft(sectionKey) {
  window.localStorage.removeItem(draftKey(sectionKey));
  dirtyDrafts.delete(sectionKey);
  sectionDrafts.delete(sectionKey);
}

function parsePath(value) {
  return JSON.parse(value);
}

function pathAttr(path) {
  return escapeHtml(JSON.stringify(path));
}

function getAtPath(root, path) {
  return path.reduce((value, key) => value?.[key], root);
}

function setAtPath(root, path, value) {
  let target = root;
  for (let index = 0; index < path.length - 1; index += 1) {
    target = target[path[index]];
  }
  target[path.at(-1)] = value;
}

function removeAtPath(root, path) {
  const parent = getAtPath(root, path.slice(0, -1));
  const key = path.at(-1);
  if (Array.isArray(parent)) {
    parent.splice(key, 1);
  } else if (parent) {
    delete parent[key];
  }
}

function moveArrayItem(items, fromIndex, toIndex) {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= items.length || toIndex >= items.length) {
    return;
  }
  const [item] = items.splice(fromIndex, 1);
  items.splice(toIndex, 0, item);
}

function normalizeStatus(status) {
  const map = {
    placeholder: 'Needs attention',
    wishlist: 'Idea',
    planned: 'Planned',
    booked: 'Booked',
    confirmed: 'Confirmed'
  };
  return map[String(status ?? '').toLowerCase()] ?? (status || 'Idea');
}

function statusClass(status) {
  return `status-${slug(normalizeStatus(status))}`;
}

function statusPill(status) {
  return `<span class="status-pill ${statusClass(status)}">${escapeHtml(normalizeStatus(status))}</span>`;
}

function favoriteTargets() {
  return new Set(trip.favorites.map((favorite) => favorite.targetId));
}

function noteByTarget(targetId) {
  return trip.notes.find((note) => note.targetId === targetId);
}

function locationById(id) {
  const locations = editMode && sectionDrafts.has('locations') ? getSectionDraft('locations') : trip.locations;
  return locations.find((location) => location.id === id);
}

function mapsUrl(location) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.mapQuery)}`;
}

function mapLink(location, compact = false) {
  if (!location) {
    return '';
  }

  return `<a class="map-link ${compact ? 'compact' : ''}" href="${mapsUrl(location)}" target="_blank" rel="noreferrer">Open in Maps</a>`;
}

function formatDate(value) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.valueOf())
    ? value
    : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function tripLength(meta = trip.meta) {
  const start = new Date(`${meta.startDate}T00:00:00`);
  const end = new Date(`${meta.endDate}T00:00:00`);
  if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf())) {
    return 'Dates pending';
  }
  const nights = Math.max(0, Math.round((end - start) / 86400000));
  return `${nights} nights`;
}

function daysUntil(meta = trip.meta) {
  const targetDate = new Date(`${meta.startDate}T00:00:00`);
  if (Number.isNaN(targetDate.valueOf())) {
    return 'Dates pending';
  }
  const days = Math.ceil((targetDate.valueOf() - Date.now()) / 86400000);
  if (days > 1) {
    return `${days} days to go`;
  }
  if (days === 1) {
    return 'Tomorrow';
  }
  if (days === 0) {
    return 'Trip starts today';
  }
  return 'Trip dates are in the past';
}

function list(items, className = 'plain-list') {
  return `<ul class="${className}">${items.map((item) => `<li>${escapeHtml(typeof item === 'string' ? item : item.text ?? item.title ?? '')}</li>`).join('')}</ul>`;
}

function pageHeader(eyebrow, title, description) {
  return `<section class="page-header"><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p class="lead">${description}</p></section>`;
}

function card({ id, title, meta = '', favorite = false, body = '', tone = '', image = '', editAttrs = '', actions = '' }) {
  return `
    <article class="card ${tone}" data-card-id="${escapeHtml(id)}" ${editAttrs}>
      ${image ? `<img class="card-media" src="${escapeHtml(image)}" alt="">` : ''}
      <div class="card-title-row">
        <div>${meta ? `<p class="card-meta">${escapeHtml(meta)}</p>` : ''}<h2>${escapeHtml(title)}</h2></div>
        <div class="card-actions">
          ${favorite && !editMode ? `<button class="icon-button favorite-button" type="button" data-favorite-id="${escapeHtml(id)}" aria-pressed="${favoriteTargets().has(id)}" aria-label="Save ${escapeHtml(title)} as favorite"><span aria-hidden="true">*</span></button>` : ''}
          ${actions}
        </div>
      </div>
      ${body}
    </article>
  `;
}

function noteBox(targetId, label = 'Notes') {
  const note = noteByTarget(targetId);
  const disabled = session.authenticated ? '' : 'disabled';
  return `
    <div class="note-box" data-note-box="${escapeHtml(targetId)}" data-note-id="${escapeHtml(note?.id ?? '')}">
      <label><span>${escapeHtml(label)}</span><textarea data-note-body rows="4" placeholder="${session.authenticated ? 'Add a shared trip note' : 'Log in to edit shared notes'}" ${disabled}>${escapeHtml(note?.body ?? '')}</textarea></label>
      <div class="mini-actions">
        <button class="button compact" type="button" data-note-save ${disabled}>Save</button>
        ${note ? `<button class="button compact ghost" type="button" data-note-delete ${disabled}>Delete</button>` : ''}
        <span class="form-status" data-note-status></span>
      </div>
    </div>
  `;
}

function editField(sectionKey, path, label, value, options = {}) {
  const type = options.type ?? 'text';
  const labelClass = options.hideLabel ? ' class="visually-hidden"' : '';
  const fieldClass = options.inline ? 'edit-field inline-text-field' : 'edit-field';
  const placeholder = options.placeholder ? `placeholder="${escapeHtml(options.placeholder)}"` : '';
  const required = options.required ? 'required' : '';
  if (type === 'checkbox') {
    return `<label class="${fieldClass} checkbox-field"><input type="checkbox" data-inline-section="${sectionKey}" data-inline-path="${pathAttr(path)}" data-inline-type="boolean" ${value ? 'checked' : ''}><span${labelClass}>${escapeHtml(label)}</span></label>`;
  }
  if (type === 'textarea') {
    return `<label class="${fieldClass}"><span${labelClass}>${escapeHtml(label)}</span><textarea data-inline-section="${sectionKey}" data-inline-path="${pathAttr(path)}" rows="${options.rows ?? 3}" ${placeholder} ${required}>${escapeHtml(value)}</textarea></label>`;
  }
  if (type === 'number') {
    return `<label class="${fieldClass}"><span${labelClass}>${escapeHtml(label)}</span><input type="number" data-inline-section="${sectionKey}" data-inline-path="${pathAttr(path)}" data-inline-type="number" value="${escapeHtml(value)}" ${placeholder} ${required}></label>`;
  }
  if (type === 'csv') {
    return `<label class="${fieldClass}"><span${labelClass}>${escapeHtml(label)}</span><input data-inline-section="${sectionKey}" data-inline-path="${pathAttr(path)}" data-inline-type="csv" value="${escapeHtml((value ?? []).join(', '))}" ${placeholder}></label>`;
  }
  return `<label class="${fieldClass}"><span${labelClass}>${escapeHtml(label)}</span><input type="${type}" data-inline-section="${sectionKey}" data-inline-path="${pathAttr(path)}" value="${escapeHtml(value)}" ${placeholder} ${required}></label>`;
}

function editSelect(sectionKey, path, label, value, choices, options = {}) {
  const allChoices = choices.includes(value) || !value ? choices : [value, ...choices];
  const labelClass = options.hideLabel ? ' class="visually-hidden"' : '';
  return `
    <label class="edit-field ${options.inline ? 'inline-text-field' : ''}">
      <span${labelClass}>${escapeHtml(label)}</span>
      <select data-inline-section="${sectionKey}" data-inline-path="${pathAttr(path)}">
        ${allChoices.map((choice) => `<option value="${escapeHtml(choice)}" ${choice === value ? 'selected' : ''}>${escapeHtml(choice)}</option>`).join('')}
      </select>
    </label>
  `;
}

function placePicker(sectionKey, path, selectedValue, options = {}) {
  const multiple = Boolean(options.multiple);
  const selected = new Set(multiple ? selectedValue ?? [] : selectedValue ? [selectedValue] : []);
  const locations = sectionValue('locations');
  return `
    <div class="place-picker">
      <p>${escapeHtml(options.label ?? 'Place')}</p>
      <div class="chip-grid">
        ${locations.map((location) => `
          <button class="place-chip" type="button" data-place-section="${sectionKey}" data-place-path="${pathAttr(path)}" data-place-id="${escapeHtml(location.id)}" data-place-mode="${multiple ? 'multiple' : 'single'}" aria-pressed="${selected.has(location.id)}">
            ${escapeHtml(location.name)}
          </button>
        `).join('')}
      </div>
      <a class="text-link small-link" href="${tripUrl('./map.html')}">Manage places on the Map page</a>
    </div>
  `;
}

function quickLinkPicker(link, index) {
  const known = quickPages.some(([href]) => href === link.href);
  return `
    <div class="quick-link-picker">
      ${editField('quickLinks', [index, 'label'], 'Label', link.label, { inline: true, hideLabel: true, placeholder: 'Button label' })}
      <label class="edit-field inline-text-field">
        <span class="visually-hidden">Page</span>
        <select data-inline-section="quickLinks" data-inline-path="${pathAttr([index, 'href'])}">
          ${quickPages.map(([href, label]) => `<option value="${href}" ${href === link.href ? 'selected' : ''}>${label}</option>`).join('')}
          <option value="${escapeHtml(link.href)}" ${known ? '' : 'selected'}>Custom link</option>
        </select>
      </label>
    </div>
  `;
}

function editActions(sectionKey, path, index, total) {
  return `
    <div class="inline-edit-actions">
      <button class="icon-button small drag-handle" type="button" aria-label="Drag to reorder">::</button>
      <button class="button compact ghost" type="button" data-move-section="${sectionKey}" data-move-path="${pathAttr(path)}" data-move-index="${index}" data-move-direction="-1" ${index === 0 ? 'disabled' : ''}>Up</button>
      <button class="button compact ghost" type="button" data-move-section="${sectionKey}" data-move-path="${pathAttr(path)}" data-move-index="${index}" data-move-direction="1" ${index === total - 1 ? 'disabled' : ''}>Down</button>
      <button class="button compact danger" type="button" data-remove-section="${sectionKey}" data-remove-path="${pathAttr([...path, index])}">Delete</button>
    </div>
  `;
}

function editableItemAttrs(sectionKey, path, index) {
  return `draggable="true" data-reorder-section="${sectionKey}" data-reorder-path="${pathAttr(path)}" data-reorder-index="${index}"`;
}

function sectionToolbar(sectionKey, label, addKind = '', addPath = null) {
  if (!editMode || !session.authenticated) {
    return '';
  }
  const restored = window.localStorage.getItem(draftKey(sectionKey)) ? 'Unsaved draft on this device.' : '';
  const addPathAttr = addPath ? ` data-add-path="${pathAttr(addPath)}"` : '';
  return `
    <div class="edit-toolbar" data-section-toolbar="${sectionKey}">
      <p><strong>${escapeHtml(label)}</strong><span data-section-status>${restored}</span></p>
      <div class="editor-actions">
        ${addKind ? `<button class="button compact secondary" type="button" data-add-section="${sectionKey}" data-add-kind="${addKind}"${addPathAttr}>Add</button>` : ''}
        <button class="button compact" type="button" data-save-section="${sectionKey}">Save</button>
        <button class="button compact ghost" type="button" data-reset-section="${sectionKey}">Reset</button>
      </div>
    </div>
  `;
}

function editorBar() {
  const editorText = session.authenticated ? `Signed in as ${escapeHtml(session.editor.displayName)}` : 'Sign in to update the shared trip plan';
  return `
    <section class="editor-bar">
      <p>${editorText}</p>
      <div class="editor-actions">
        ${session.authenticated ? `<button class="button secondary" type="button" data-edit-toggle>${editMode ? 'Done editing' : 'Edit trip'}</button><button class="button secondary" type="button" data-logout>Log out</button>` : '<button class="button secondary" type="button" data-show-login>Editor login</button>'}
      </div>
    </section>
  `;
}

function loginView(message = '') {
  main.innerHTML = `
    ${pageHeader('Private trip', 'Editor login', 'Shared planning details are protected before the trip.')}
    <section class="auth-panel">
      <form data-login-form>
        <label><span>Username</span><input name="username" autocomplete="username" required></label>
        <label><span>Password</span><input name="password" type="password" autocomplete="current-password" required></label>
        <button class="button primary" type="submit">Log in</button>
        <p class="form-status" data-login-status>${escapeHtml(message)}</p>
      </form>
    </section>
  `;
  setupLogin();
}

function renderShell() {
  const title = page === 'home' ? 'TandemTrip' : trip?.meta?.title ?? 'Trip not found';
  document.title = page === 'home' ? 'TandemTrip · All trips' : `${pageTitle()} · ${title}`;
  document.querySelector('meta[name="description"]')?.setAttribute('content', page === 'home' ? 'Trip portfolio and shared travel planning workspaces.' : trip?.meta?.subtitle ?? 'Selected trip workspace.');
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#7a4a35');
  document.querySelector('[data-brand]').textContent = 'TripTogether';
  document.querySelector('[data-brand]').setAttribute('href', portfolioUrl());
  if (page === 'home') {
    document.querySelector('[data-nav]').innerHTML = '<a href="./index.html" aria-current="page">Trips</a>';
  } else {
    document.querySelector('[data-nav]').innerHTML = primaryNav.map(([href, label]) => {
    const currentPage = href.replace('.html', '');
    const current = page === currentPage || (label === 'More' && secondaryPageNames.has(page));
    return `<a href="${tripUrl(`./${href}`)}" ${current ? 'aria-current="page"' : ''}>${label}</a>`;
    }).join('');
  }
  document.querySelector('[data-footer]').textContent = page === 'home'
    ? 'Shared trip portfolio backed by protected Cloudflare D1 storage.'
    : `${trip?.meta?.title ?? 'Trip'} workspace backed by protected Cloudflare D1 storage.`;
}

function pageTitle() {
  const titles = {
    home: 'All trips',
    trip: 'Cockpit',
    itinerary: 'Plan',
    map: 'Map',
    more: 'More',
    attractions: 'Ideas',
    stay: 'Stay',
    food: 'Food',
    planning: 'Tasks and packing',
    guide: 'Travel wallet'
  };
  return titles[page] ?? 'Trip';
}

function dayItems(day) {
  if (Array.isArray(day.items)) {
    return day.items;
  }
  return ['morning', 'afternoon', 'evening'].map((period) => {
    const block = day[period] ?? {};
    return {
      id: `${day.id}-${period}`,
      type: period === 'evening' ? 'Meal' : 'Activity',
      period: period[0].toUpperCase() + period.slice(1),
      title: block.title ?? period,
      locationId: block.locationIds?.[0] ?? '',
      status: 'Suggested',
      notes: [block.plan, block.notes].filter(Boolean).join(' ')
    };
  });
}

function allPlanItems(days = sectionValue('itinerary')) {
  return days.flatMap((day) => dayItems(day).map((item) => ({ ...item, day })));
}

function itemMeta(item, day) {
  const parts = [day?.label, item.period, item.time].filter(Boolean);
  return parts.join(' · ');
}

function itemIndicators(item) {
  const indicators = [];
  if (item.cost) {
    indicators.push(`Cost: ${item.cost}`);
  }
  if (item.booking) {
    indicators.push(`Booking: ${item.booking}`);
  }
  if (item.documentId) {
    indicators.push('Document');
  }
  const noteCount = trip.notes.filter((note) => note.targetId === `note-${item.id}`).length;
  if (noteCount > 0) {
    indicators.push(`${noteCount} note${noteCount === 1 ? '' : 's'}`);
  }
  return indicators.length ? `<div class="indicator-row">${indicators.map((indicator) => `<span>${escapeHtml(indicator)}</span>`).join('')}</div>` : '';
}

function planItemCard(item, day) {
  const location = locationById(item.locationId);
  return card({
    id: item.id,
    title: item.title,
    meta: `${item.type} · ${itemMeta(item, day)}`,
    favorite: item.type !== 'Task',
    body: `
      <div class="card-chip-row">${statusPill(item.status)}${location ? `<span class="soft-chip">${escapeHtml(location.name)}</span>` : '<span class="soft-chip">Location later</span>'}</div>
      ${item.notes ? `<p>${escapeHtml(item.notes)}</p>` : '<p class="muted">Add details when this plan firms up.</p>'}
      ${itemIndicators(item)}
      <div class="inline-links">${mapLink(location, true)}</div>
      ${noteBox(`note-${item.id}`, 'Shared card notes')}
    `
  });
}

function editablePlanItem(item, dayIndex, itemIndex, total) {
  const basePath = [dayIndex, 'items', itemIndex];
  return `
    <article class="timeline-item editable-card" ${editableItemAttrs('itinerary', [dayIndex, 'items'], itemIndex)} data-card-id="${escapeHtml(item.id)}">
      <div class="same-card-editor">
        <div class="plan-card-top">
          ${editSelect('itinerary', [...basePath, 'type'], 'Type', item.type, planTypes, { inline: true, hideLabel: true })}
          ${editSelect('itinerary', [...basePath, 'status'], 'Status', item.status, statusChoices, { inline: true, hideLabel: true })}
        </div>
        ${editField('itinerary', [...basePath, 'title'], 'Title', item.title, { inline: true, hideLabel: true, placeholder: 'Title' })}
        <div class="editor-grid compact">
          ${editSelect('itinerary', [...basePath, 'period'], 'Period', item.period ?? 'Flexible', periodChoices)}
          ${editField('itinerary', [...basePath, 'time'], 'Time', item.time ?? '', { placeholder: 'Optional time' })}
        </div>
        ${placePicker('itinerary', [...basePath, 'locationId'], item.locationId ?? '', { label: 'Location' })}
        <div class="editor-grid compact">
          ${editField('itinerary', [...basePath, 'cost'], 'Cost', item.cost ?? '', { placeholder: 'EUR 40 or blank' })}
          ${editField('itinerary', [...basePath, 'booking'], 'Booking/status detail', item.booking ?? '', { placeholder: 'Ref, missing info, or blank' })}
        </div>
        ${editField('itinerary', [...basePath, 'notes'], 'Notes', item.notes ?? '', { type: 'textarea', rows: 3 })}
        ${editActions('itinerary', [dayIndex, 'items'], itemIndex, total)}
      </div>
    </article>
  `;
}

function readinessSummary(meta, itinerary, planning, stay, duringTrip) {
  const items = allPlanItems(itinerary);
  const documents = planning.documents ?? [];
  const tasks = planning.tasks ?? [];
  const packing = planning.packing ?? [];
  const checks = [
    { label: 'Dates set', done: Boolean(meta.startDate && meta.endDate), detail: `${formatDate(meta.startDate)} to ${formatDate(meta.endDate)}` },
    { label: 'Accommodation', done: stay.bookingReference && !stay.bookingReference.toLowerCase().includes('add'), detail: stay.bookingReference || 'Add stay booking' },
    { label: 'Transport', done: items.some((item) => item.type === 'Transport' && ['Booked', 'Confirmed'].includes(normalizeStatus(item.status))), detail: 'Flights and transfers need details' },
    { label: 'Documents', done: documents.some((document) => normalizeStatus(document.status) === 'Confirmed'), detail: `${documents.filter((document) => document.important).length} important records` },
    { label: 'Daily plan', done: itinerary.length > 0 && items.length >= itinerary.length * 2, detail: `${items.length} plan cards` },
    { label: 'Packing', done: packing.length > 0, detail: `${packing.length} packing items` },
    { label: 'Emergency info', done: (duringTrip.emergency ?? []).some((item) => !item.toLowerCase().includes('add')), detail: 'Travel wallet needs final numbers' }
  ];
  const done = checks.filter((check) => check.done).length;
  const score = Math.round((done / checks.length) * 100);
  const state = score >= 85 ? 'Ready to travel' : score >= 65 ? 'Looking good' : score >= 40 ? 'A few things left' : 'Needs attention';
  return { score, state, checks };
}

function priorityCard(planning, itinerary) {
  const openDecision = (planning.decisions ?? []).find((decision) => !['Decided', 'Archived'].includes(decision.status));
  if (openDecision) {
    return {
      title: openDecision.title,
      meta: 'Open decision',
      text: openDecision.notes || 'Vote, compare, and decide together.',
      href: tripUrl('./more.html#decisions')
    };
  }
  const task = (planning.tasks ?? []).find((item) => item.status !== 'Done');
  if (task) {
    return {
      title: task.title,
      meta: 'Next task',
      text: task.notes || 'Keep the trip moving without a spreadsheet.',
      href: tripUrl('./more.html#tasks')
    };
  }
  const attention = allPlanItems(itinerary).find((item) => normalizeStatus(item.status) === 'Needs attention');
  if (attention) {
    return {
      title: attention.title,
      meta: 'Needs attention',
      text: attention.notes || 'Add the missing detail.',
      href: tripUrl('./itinerary.html')
    };
  }
  return {
    title: 'Plan looks calm',
    meta: 'Next action',
    text: 'Review the day cards and add details as bookings land.',
    href: tripUrl('./itinerary.html')
  };
}

function renderPortfolio() {
  renderShell();
  main.innerHTML = `
    ${editorBar()}
    <section class="page-header">
      <p class="eyebrow">Trip portfolio</p>
      <h1>All trips</h1>
      <p class="lead">Pick a trip workspace, or create a new planning cockpit for the next journey.</p>
      ${session.authenticated ? '<button class="button primary" type="button" data-new-trip>New trip</button>' : ''}
    </section>
    ${showTripForm ? tripForm() : ''}
    <section class="portfolio-grid">
      ${trips.length ? trips.map((summary) => tripSummaryCard(summary)).join('') : '<article class="empty-state"><h2>No trips yet</h2><p>Create the first trip after signing in as an editor.</p></article>'}
    </section>
  `;
  setupEditorChrome();
  setupTripManagement();
}

function tripSummaryCard(summary) {
  const isEditing = editingTripId === summary.id;
  if (isEditing) {
    return `<article class="card trip-card">${tripForm(summary)}</article>`;
  }
  return `
    <article class="card trip-card">
      ${summary.coverImage ? `<img class="card-media" src="${escapeHtml(summary.coverImage)}" alt="${escapeHtml(summary.coverAlt ?? '')}">` : ''}
      <div class="card-title-row">
        <div>
          <p class="card-meta">${escapeHtml(summary.destination || 'Destination pending')}</p>
          <h2>${escapeHtml(summary.title)}</h2>
        </div>
        ${session.authenticated ? `
          <div class="card-actions">
            <button class="button compact ghost" type="button" data-edit-trip="${escapeHtml(summary.id)}">Edit</button>
            <button class="button compact danger" type="button" data-delete-trip="${escapeHtml(summary.id)}" data-trip-title="${escapeHtml(summary.title)}">Delete</button>
          </div>
        ` : ''}
      </div>
      <p>${escapeHtml(summary.subtitle || 'Open the trip workspace to continue planning.')}</p>
      <div class="card-chip-row">
        <span class="soft-chip">${escapeHtml(formatDate(summary.startDate))} - ${escapeHtml(formatDate(summary.endDate))}</span>
        <span class="soft-chip">${escapeHtml(summary.travelers || 'Travelers pending')}</span>
        ${statusPill(summary.status)}
      </div>
      <div class="indicator-row">
        <span>${summary.readiness}% ready</span>
        <span>${summary.openDecisions} decisions</span>
        <span>${summary.openTasks} tasks</span>
      </div>
      <a class="button primary" href="${tripUrl('./trip.html', summary.id)}">Open trip</a>
    </article>
  `;
}

function tripForm(summary = null) {
  const isEdit = Boolean(summary);
  const mood = Array.isArray(summary?.mood) ? summary.mood.join(', ') : '';
  return `
    <section class="${isEdit ? 'trip-management-form embedded' : 'trip-management-form card'}">
      <form data-trip-form="${isEdit ? escapeHtml(summary.id) : ''}">
        <div class="editor-grid compact">
          <label><span>Trip title</span><input name="title" value="${escapeHtml(summary?.title ?? '')}" required></label>
          <label><span>Destination</span><input name="destination" value="${escapeHtml(summary?.destination ?? '')}" required></label>
          <label><span>Start date</span><input name="startDate" type="date" value="${escapeHtml(summary?.startDate ?? '')}" required></label>
          <label><span>End date</span><input name="endDate" type="date" value="${escapeHtml(summary?.endDate ?? '')}" required></label>
        </div>
        <label><span>Travelers</span><input name="travelers" value="${escapeHtml(summary?.travelers ?? '')}" placeholder="Martin and Marta"></label>
        <label><span>Subtitle</span><textarea name="subtitle" rows="2">${escapeHtml(summary?.subtitle ?? '')}</textarea></label>
        <div class="editor-grid compact">
          <label><span>Mood</span><input name="mood" value="${escapeHtml(mood)}" placeholder="Romantic, relaxed"></label>
          <label><span>Cover image</span><input name="coverImage" value="${escapeHtml(summary?.coverImage ?? '')}" placeholder="./public/images/zakynthos-hero.png"></label>
        </div>
        <div class="mini-actions">
          <button class="button primary" type="submit">${isEdit ? 'Save trip' : 'Create trip'}</button>
          <button class="button ghost" type="button" data-cancel-trip-form>Cancel</button>
          <span class="form-status" data-trip-form-status></span>
        </div>
      </form>
    </section>
  `;
}

function renderHome() {
  const meta = sectionValue('meta');
  const itinerary = sectionValue('itinerary');
  const planning = sectionValue('planning');
  const stay = sectionValue('stay');
  const duringTrip = sectionValue('duringTrip');
  const quickLinks = sectionValue('quickLinks');
  const highlights = sectionValue('highlights');
  const readiness = readinessSummary(meta, itinerary, planning, stay, duringTrip);
  const priority = priorityCard(planning, itinerary);
  const previewDay = itinerary[0];

  main.innerHTML = `
    ${editorBar()}
    <section class="cockpit-hero">
      <img src="${escapeHtml(meta.coverImage ?? './public/images/zakynthos-hero.png')}" alt="${escapeHtml(meta.coverAlt ?? '')}">
      <div class="cockpit-hero-content">
        ${editMode && session.authenticated ? `
          ${sectionToolbar('meta', 'Trip summary')}
          <div class="inline-edit-form hero-editor">
            ${editField('meta', ['title'], 'Trip name', meta.title)}
            ${editField('meta', ['destination'], 'Destination', meta.destination)}
            ${editField('meta', ['subtitle'], 'Description', meta.subtitle, { type: 'textarea', rows: 2 })}
            ${editField('meta', ['startDate'], 'Start date', meta.startDate, { type: 'date' })}
            ${editField('meta', ['endDate'], 'End date', meta.endDate, { type: 'date' })}
            ${editField('meta', ['travelers'], 'Travelers', meta.travelers)}
            ${editField('meta', ['mood'], 'Mood', meta.mood ?? [], { type: 'csv', placeholder: 'Romantic, relaxed' })}
            ${editField('meta', ['coverImage'], 'Cover image path', meta.coverImage ?? '')}
          </div>
        ` : `
          <p class="eyebrow">${escapeHtml(meta.destination)}</p>
          <h1>${escapeHtml(meta.title)}</h1>
          <p>${escapeHtml(meta.subtitle)}</p>
          <div class="hero-metadata">
            <span>${escapeHtml(formatDate(meta.startDate))} - ${escapeHtml(formatDate(meta.endDate))}</span>
            <span>${escapeHtml(daysUntil(meta))}</span>
            <span>${escapeHtml(meta.travelers)}</span>
          </div>
          <div class="mood-row">${(meta.mood ?? []).map((mood) => `<span>${escapeHtml(mood)}</span>`).join('')}</div>
        `}
      </div>
    </section>
    <section class="cockpit-grid">
      ${card({ id: 'priority', title: priority.title, meta: priority.meta, tone: 'priority-card', body: `<p>${escapeHtml(priority.text)}</p><a class="text-link" href="${escapeHtml(priority.href)}">Open</a>` })}
      ${card({ id: 'readiness', title: `${readiness.score}% ready`, meta: readiness.state, body: `
        <div class="readiness-meter"><span style="width: ${readiness.score}%"></span></div>
        <div class="mini-checks">${readiness.checks.map((check) => `<span class="${check.done ? 'is-done' : ''}">${escapeHtml(check.label)}</span>`).join('')}</div>
      ` })}
    </section>
    <section class="content-grid two">
      ${card({ id: 'today-preview', title: previewDay ? `${previewDay.label}: ${previewDay.focus}` : 'First day', meta: previewDay?.date ?? 'Add a day', body: previewDay ? `<div class="mini-timeline">${dayItems(previewDay).slice(0, 4).map((item) => `<div><span>${escapeHtml(item.period ?? 'Flexible')}</span><strong>${escapeHtml(item.title)}</strong>${statusPill(item.status)}</div>`).join('')}</div><a class="text-link" href="${tripUrl('./itinerary.html')}">Open plan</a>` : '<p>Add the first day in edit mode.</p>' })}
      ${card({ id: 'open-items', title: 'Open decisions and attention', meta: 'Planning pulse', body: openItemsList(planning) })}
    </section>
    <section class="section">
      <div class="section-heading"><p class="eyebrow">Quick actions</p><h2>Most useful right now</h2></div>
      ${sectionToolbar('quickLinks', 'Quick links', 'quickLink')}
      <div class="quick-link-grid editable-list">${quickLinks.map((link, index) => editMode && session.authenticated ? editableQuickLink(link, index, quickLinks.length) : `<a class="quick-link" href="${escapeHtml(tripUrl(link.href))}">${escapeHtml(link.label)}</a>`).join('')}</div>
    </section>
    <section class="section">
      <div class="section-heading"><p class="eyebrow">Trip mood</p><h2>What this trip is about</h2></div>
      ${sectionToolbar('highlights', 'Highlights', 'highlight')}
      <div class="content-grid two editable-list">${highlights.map((highlight, index) => editMode && session.authenticated ? editableHighlight(highlight, index, highlights.length) : card({ id: `highlight-${index}`, title: highlight, body: '<p class="muted">A shared anchor for choices, pacing, and tradeoffs.</p>' })).join('')}</div>
    </section>
  `;
}

function openItemsList(planning) {
  const decisions = (planning.decisions ?? []).filter((decision) => !['Decided', 'Archived'].includes(decision.status)).slice(0, 3);
  const questions = (planning.openQuestions ?? []).slice(0, 3);
  const items = [
    ...decisions.map((decision) => ({ title: decision.title, status: decision.status })),
    ...questions.map((question) => ({ title: typeof question === 'string' ? question : question.title, status: typeof question === 'string' ? 'Open' : question.status }))
  ];
  if (!items.length) {
    return '<p class="muted">No open items yet. Add a decision or task when something needs attention.</p>';
  }
  return `<div class="attention-list">${items.map((item) => `<div><strong>${escapeHtml(item.title)}</strong>${statusPill(item.status)}</div>`).join('')}</div><a class="text-link" href="${tripUrl('./more.html#decisions')}">Review decisions</a>`;
}

function editableHighlight(highlight, index, total) {
  return card({
    id: `highlight-${index}`,
    title: 'Highlight',
    body: `<div class="inline-edit-form">${editField('highlights', [index], 'Text', highlight, { type: 'textarea', rows: 2 })}${editActions('highlights', [], index, total)}</div>`,
    editAttrs: editableItemAttrs('highlights', [], index)
  });
}

function editableQuickLink(link, index, total) {
  return `
    <article class="quick-link editable-quick-link" ${editableItemAttrs('quickLinks', [], index)}>
      ${quickLinkPicker(link, index)}
      ${editActions('quickLinks', [], index, total)}
    </article>
  `;
}

function renderItinerary() {
  const itinerary = sectionValue('itinerary');
  main.innerHTML = `
    ${editorBar()}
    ${pageHeader('Shared plan', 'Day-by-day timeline', 'Cards for activities, transport, accommodation, meals, reminders, and flexible ideas.')}
    <div class="toolbar print-hidden"><button class="button secondary" type="button" data-print>Print plan</button></div>
    ${sectionToolbar('itinerary', 'Trip days', 'day')}
    <section class="timeline editable-list">
      ${itinerary.map((day, index) => editMode && session.authenticated ? editableDay(day, index, itinerary.length) : itineraryDay(day)).join('')}
    </section>
  `;
}

function itineraryDay(day) {
  return `
    <section class="day-section" id="${escapeHtml(day.id)}">
      <div class="day-heading">
        <div>
          <p class="eyebrow">${escapeHtml(day.date ?? day.isoDate ?? day.label)}</p>
          <h2>${escapeHtml(day.label)}: ${escapeHtml(day.focus)}</h2>
          <p>${escapeHtml(day.destination ?? '')}</p>
        </div>
        <div class="balance-chip ${statusClass(day.balance)}">
          <strong>${escapeHtml(day.balance ?? 'Balanced')}</strong>
          <span>${escapeHtml(day.balanceReason ?? 'Adjust the day as details land.')}</span>
        </div>
      </div>
      <div class="timeline-list">
        ${dayItems(day).map((item) => planItemCard(item, day)).join('')}
      </div>
    </section>
  `;
}

function editableDay(day, index, total) {
  const items = day.items ?? dayItems(day);
  if (!day.items) {
    day.items = items;
  }
  return `
    <section class="day-section editable-day" ${editableItemAttrs('itinerary', [], index)} id="${escapeHtml(day.id)}">
      <div class="day-heading">
        <div class="same-card-editor">
          ${editField('itinerary', [index, 'date'], 'Date label', day.date ?? '', { inline: true, hideLabel: true })}
          ${editField('itinerary', [index, 'label'], 'Day label', day.label, { inline: true, hideLabel: true })}
          ${editField('itinerary', [index, 'focus'], 'Focus', day.focus, { type: 'textarea', rows: 2, inline: true, hideLabel: true })}
          <div class="editor-grid compact">
            ${editField('itinerary', [index, 'isoDate'], 'Calendar date', day.isoDate ?? '', { type: 'date' })}
            ${editField('itinerary', [index, 'destination'], 'Destination', day.destination ?? '')}
            ${editField('itinerary', [index, 'mood'], 'Day mood', day.mood ?? '')}
            ${editSelect('itinerary', [index, 'balance'], 'Balance', day.balance ?? 'Balanced', ['Relaxed', 'Balanced', 'Busy', 'Overloaded'])}
          </div>
          ${editField('itinerary', [index, 'balanceReason'], 'Balance reason', day.balanceReason ?? '', { type: 'textarea', rows: 2 })}
          ${editActions('itinerary', [], index, total)}
        </div>
      </div>
      <div class="edit-toolbar compact-toolbar" data-section-toolbar="itinerary">
        <p><strong>${escapeHtml(day.label)} cards</strong><span data-section-status></span></p>
        <div class="editor-actions"><button class="button compact secondary" type="button" data-add-plan-day="${index}">Add item</button></div>
      </div>
      <div class="timeline-list editable-list">
        ${items.map((item, itemIndex) => editablePlanItem(item, index, itemIndex, items.length)).join('')}
      </div>
    </section>
  `;
}

function renderMap() {
  const locations = sectionValue('locations');
  const plannedLocationIds = new Set(allPlanItems().map((item) => item.locationId).filter(Boolean));
  main.innerHTML = `
    ${editorBar()}
    ${pageHeader('Saved places', 'Map board', 'Google Maps links, trip layers, and nearby planning cues without a paid map API.')}
    ${sectionToolbar('locations', 'Map places', 'location')}
    <section class="map-layout">
      <div class="map-visual" aria-label="Map overview placeholder">
        <img src="./public/images/zakynthos-hero.png" alt="">
        <div class="map-visual-content">
          <p class="eyebrow">Layers</p>
          <h2>${locations.length} saved places</h2>
          <div class="layer-chips">
            <span>Planned: ${plannedLocationIds.size}</span>
            <span>Ideas: ${locations.filter((location) => !plannedLocationIds.has(location.id)).length}</span>
            <span>Stay</span>
            <span>Food</span>
          </div>
          <a class="button primary" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trip.meta.destination)}" target="_blank" rel="noreferrer">Open destination in Maps</a>
        </div>
      </div>
      <aside class="map-drawer">
        ${card({ id: 'nearby', title: "Nearby from our plan", meta: 'Travel mode later', body: '<p>Saved places are grouped here now. Location-aware nearby suggestions need browser location and map/geocoding work later.</p>' })}
      </aside>
    </section>
    <section class="content-grid two editable-list">
      ${locations.map((location, index) => editMode && session.authenticated ? editableLocation(location, index, locations.length) : locationCard(location, plannedLocationIds.has(location.id))).join('')}
    </section>
  `;
}

function locationCard(location, planned) {
  return card({
    id: `map-${location.id}`,
    title: location.name,
    meta: `${location.category} · ${location.area}`,
    favorite: true,
    image: location.image,
    body: `
      <div class="card-chip-row">${statusPill(location.status ?? (planned ? 'Planned' : 'Idea'))}${planned ? '<span class="soft-chip">In plan</span>' : '<span class="soft-chip">Idea layer</span>'}</div>
      ${location.notes ? `<p>${escapeHtml(location.notes)}</p>` : '<p class="muted">Add why this place matters.</p>'}
      <p class="muted">Search query: ${escapeHtml(location.mapQuery)}</p>
      ${mapLink(location)}
    `
  });
}

function editableLocation(location, index, total) {
  return card({
    id: `map-${location.id}`,
    title: location.name,
    meta: location.area,
    image: location.image,
    body: `
      <div class="same-card-editor">
        ${editField('locations', [index, 'name'], 'Title', location.name, { inline: true, hideLabel: true, placeholder: 'Place name' })}
        <div class="editor-grid compact">
          ${editField('locations', [index, 'area'], 'Area', location.area)}
          ${editField('locations', [index, 'category'], 'Category', location.category)}
          ${editSelect('locations', [index, 'status'], 'Status', location.status ?? 'Idea', statusChoices)}
        </div>
        ${editField('locations', [index, 'mapQuery'], 'Google Maps search', location.mapQuery)}
        ${editField('locations', [index, 'notes'], 'Description', location.notes ?? '', { type: 'textarea', rows: 2 })}
        <details class="optional-edit"><summary>Image</summary>${editField('locations', [index, 'image'], 'Image URL', location.image ?? '')}</details>
        ${editActions('locations', [], index, total)}
      </div>
    `,
    editAttrs: editableItemAttrs('locations', [], index)
  });
}

function statCard(label, value) {
  return `<article class="stat-card"><p>${escapeHtml(label)}</p><strong>${escapeHtml(value)}</strong></article>`;
}

function renderMore() {
  const planning = sectionValue('planning');
  const stay = sectionValue('stay');
  const duringTrip = sectionValue('duringTrip');
  main.innerHTML = `
    ${editorBar()}
    ${pageHeader('Shared tools', 'More', 'Ideas, decisions, documents, packing, tasks, stay details, and travel wallet.')}
    <section class="more-grid">
      <a class="tool-tile" href="#ideas"><strong>Ideas</strong><span>Attractions and food candidates</span></a>
      <a class="tool-tile" href="#decisions"><strong>Decisions</strong><span>Votes and open choices</span></a>
      <a class="tool-tile" href="#documents"><strong>Documents</strong><span>Manual travel wallet records</span></a>
      <a class="tool-tile" href="#packing"><strong>Packing</strong><span>Shared and personal list</span></a>
      <a class="tool-tile" href="#tasks"><strong>Tasks</strong><span>Countdown checklist</span></a>
      <a class="tool-tile" href="#wallet"><strong>Wallet</strong><span>Travel-day essentials</span></a>
    </section>
    <section class="section" id="ideas">
      <div class="section-heading"><p class="eyebrow">Ideas board</p><h2>Saved inspiration</h2></div>
      ${ideasBoard()}
    </section>
    <section class="section" id="decisions">
      <div class="section-heading"><p class="eyebrow">Decide together</p><h2>Open choices</h2></div>
      ${sectionToolbar('planning', 'Decisions', 'decision', ['decisions'])}
      <div class="content-grid two editable-list">${(planning.decisions ?? []).map((decision, index) => editMode && session.authenticated ? editableDecision(decision, index, planning.decisions.length) : decisionCard(decision)).join('') || emptyState('No decisions yet', 'Add choices like stay area, car rental, or dinner booking.')}</div>
    </section>
    <section class="section" id="documents">
      <div class="section-heading"><p class="eyebrow">Travel wallet</p><h2>Documents and references</h2></div>
      ${sectionToolbar('planning', 'Documents', 'document', ['documents'])}
      <div class="content-grid two editable-list">${(planning.documents ?? []).map((document, index) => editMode && session.authenticated ? editableDocument(document, index, planning.documents.length) : documentCard(document)).join('') || emptyState('No documents yet', 'Add manual booking references now; uploads can come later.')}</div>
    </section>
    <section class="section" id="packing">
      <div class="section-heading"><p class="eyebrow">Packing</p><h2>Shared packing list</h2></div>
      ${sectionToolbar('planning', 'Packing', 'packing', ['packing'])}
      <div class="content-grid two editable-list">${(planning.packing ?? []).map((item, index) => editMode && session.authenticated ? editablePackingItem(item, index, planning.packing.length) : packingCard(item)).join('') || emptyState('No packing items yet', 'Add documents, beach, clothes, medicine, and last-minute items.')}</div>
    </section>
    <section class="section" id="tasks">
      <div class="section-heading"><p class="eyebrow">Tasks</p><h2>Countdown checklist</h2></div>
      <div class="content-grid two">
        ${sharedChecklistCard()}
        ${card({ id: 'task-list', title: 'Planning responsibilities', body: `${sectionToolbar('planning', 'Tasks', 'task', ['tasks'])}<div class="editable-list task-stack">${(planning.tasks ?? []).map((task, index) => editMode && session.authenticated ? editableTask(task, index, planning.tasks.length) : taskCard(task)).join('')}</div>` })}
      </div>
    </section>
    <section class="section" id="wallet">
      <div class="section-heading"><p class="eyebrow">During the trip</p><h2>Travel wallet</h2></div>
      <div class="content-grid two">
        ${card({ id: 'stay-main', title: stay.name, meta: stay.address, tone: 'accent-card', body: `<dl class="details-list"><div><dt>Check-in</dt><dd>${escapeHtml(stay.checkIn)}</dd></div><div><dt>Check-out</dt><dd>${escapeHtml(stay.checkOut)}</dd></div><div><dt>Booking ref</dt><dd>${escapeHtml(stay.bookingReference)}</dd></div></dl>${mapLink(locationById(stay.locationId))}` })}
        ${card({ id: 'wallet-notes', title: 'Wallet notes', meta: 'Manual records only', body: `${list(duringTrip.wallet ?? [])}<p class="muted">Offline files, QR codes, and uploads are not implemented yet.</p>` })}
      </div>
    </section>
  `;
}

function ideasBoard() {
  const attractions = sectionValue('attractions');
  const restaurants = sectionValue('restaurants');
  return `
    <div class="content-grid two">
      ${card({ id: 'ideas-attractions', title: 'Activities and places', meta: `${attractions.length} ideas`, body: `<a class="text-link" href="${tripUrl('./attractions.html')}">Open ideas page</a>` })}
      ${card({ id: 'ideas-food', title: 'Food wishlist', meta: `${restaurants.length} food ideas`, body: `<a class="text-link" href="${tripUrl('./food.html')}">Open food page</a>` })}
    </div>
  `;
}

function decisionCard(decision) {
  return card({
    id: decision.id,
    title: decision.title,
    meta: decision.type ?? 'Decision',
    body: `
      <div class="card-chip-row">${statusPill(decision.status)}</div>
      <p>${escapeHtml(decision.notes ?? '')}</p>
      <div class="option-list">${(decision.options ?? []).map((option) => `<div><strong>${escapeHtml(option.title)}</strong><span>Martin: ${escapeHtml(option.martin ?? 'Pending')} · Marta: ${escapeHtml(option.marta ?? 'Pending')}</span></div>`).join('')}</div>
    `
  });
}

function editableDecision(decision, index, total) {
  const path = ['decisions', index];
  return card({
    id: decision.id,
    title: decision.title,
    body: `
      <div class="same-card-editor">
        ${editField('planning', [...path, 'title'], 'Title', decision.title, { inline: true, hideLabel: true })}
        <div class="editor-grid compact">
          ${editField('planning', [...path, 'type'], 'Type', decision.type ?? '')}
          ${editSelect('planning', [...path, 'status'], 'Status', decision.status, decisionStatuses)}
        </div>
        ${editField('planning', [...path, 'notes'], 'Notes', decision.notes ?? '', { type: 'textarea', rows: 2 })}
        <div class="option-editor">
          ${(decision.options ?? []).map((option, optionIndex) => `
            <div class="editor-row">
              <div class="inline-edit-form">
                ${editField('planning', [...path, 'options', optionIndex, 'title'], 'Option', option.title)}
                <div class="editor-grid compact">
                  ${editField('planning', [...path, 'options', optionIndex, 'martin'], 'Martin vote', option.martin ?? '')}
                  ${editField('planning', [...path, 'options', optionIndex, 'marta'], 'Marta vote', option.marta ?? '')}
                </div>
                ${editField('planning', [...path, 'options', optionIndex, 'notes'], 'Option notes', option.notes ?? '', { type: 'textarea', rows: 2 })}
              </div>
              <button class="button compact danger" type="button" data-remove-section="planning" data-remove-path="${pathAttr([...path, 'options', optionIndex])}">Delete</button>
            </div>
          `).join('')}
          <button class="button compact secondary" type="button" data-add-section="planning" data-add-kind="decisionOption" data-add-path="${pathAttr([...path, 'options'])}">Add option</button>
        </div>
        ${editActions('planning', ['decisions'], index, total)}
      </div>
    `,
    editAttrs: editableItemAttrs('planning', ['decisions'], index)
  });
}

function documentCard(document) {
  return card({
    id: document.id,
    title: document.title,
    meta: document.type,
    body: `
      <div class="card-chip-row">${statusPill(document.status)}${document.important ? '<span class="soft-chip">Important</span>' : ''}${document.offline ? '<span class="soft-chip">Offline</span>' : ''}</div>
      <dl class="details-list compact"><div><dt>Reference</dt><dd>${escapeHtml(document.reference || 'Add later')}</dd></div><div><dt>Linked item</dt><dd>${escapeHtml(document.linkedItemId || 'None')}</dd></div></dl>
      <p>${escapeHtml(document.notes ?? '')}</p>
    `
  });
}

function editableDocument(document, index, total) {
  const path = ['documents', index];
  return card({
    id: document.id,
    title: document.title,
    body: `
      <div class="same-card-editor">
        ${editField('planning', [...path, 'title'], 'Title', document.title, { inline: true, hideLabel: true })}
        <div class="editor-grid compact">
          ${editField('planning', [...path, 'type'], 'Type', document.type)}
          ${editSelect('planning', [...path, 'status'], 'Status', document.status, documentStatuses)}
        </div>
        ${editField('planning', [...path, 'reference'], 'Reference', document.reference ?? '')}
        ${editField('planning', [...path, 'linkedItemId'], 'Linked item id', document.linkedItemId ?? '')}
        ${editField('planning', [...path, 'notes'], 'Notes', document.notes ?? '', { type: 'textarea', rows: 2 })}
        <div class="editor-grid compact">
          ${editField('planning', [...path, 'important'], 'Important', document.important ?? false, { type: 'checkbox' })}
          ${editField('planning', [...path, 'offline'], 'Offline', document.offline ?? false, { type: 'checkbox' })}
        </div>
        ${editActions('planning', ['documents'], index, total)}
      </div>
    `,
    editAttrs: editableItemAttrs('planning', ['documents'], index)
  });
}

function packingCard(item) {
  const packed = typeof item === 'string' ? false : item.packed;
  const text = typeof item === 'string' ? item : item.text;
  return card({
    id: typeof item === 'string' ? slug(item) : item.id,
    title: text,
    meta: typeof item === 'string' ? 'Packing' : `${item.category ?? 'Packing'} · ${item.owner ?? 'Shared'}`,
    body: `<div class="card-chip-row"><span class="status-pill ${packed ? 'status-confirmed' : 'status-idea'}">${packed ? 'Packed' : 'To pack'}</span>${typeof item !== 'string' && item.essential ? '<span class="soft-chip">Essential</span>' : ''}</div>`
  });
}

function editablePackingItem(item, index, total) {
  const value = typeof item === 'string' ? { id: `pack-${index + 1}`, text: item, owner: 'Shared', category: 'Packing', essential: false, packed: false } : item;
  const path = ['packing', index];
  return card({
    id: value.id,
    title: value.text,
    body: `
      <div class="same-card-editor">
        ${editField('planning', [...path, 'text'], 'Item', value.text)}
        <div class="editor-grid compact">
          ${editField('planning', [...path, 'owner'], 'Owner', value.owner ?? '')}
          ${editField('planning', [...path, 'category'], 'Category', value.category ?? '')}
        </div>
        <div class="editor-grid compact">
          ${editField('planning', [...path, 'essential'], 'Essential', value.essential ?? false, { type: 'checkbox' })}
          ${editField('planning', [...path, 'packed'], 'Packed', value.packed ?? false, { type: 'checkbox' })}
        </div>
        ${editActions('planning', ['packing'], index, total)}
      </div>
    `,
    editAttrs: editableItemAttrs('planning', ['packing'], index)
  });
}

function taskCard(task) {
  return `<div class="task-card"><strong>${escapeHtml(task.title)}</strong><span>${escapeHtml(task.assignee ?? 'Unassigned')} · ${escapeHtml(task.dueDate ?? 'No due date')}</span>${statusPill(task.status)}<p>${escapeHtml(task.notes ?? '')}</p></div>`;
}

function editableTask(task, index, total) {
  const path = ['tasks', index];
  return `
    <article class="task-card editable-card" ${editableItemAttrs('planning', ['tasks'], index)}>
      <div class="same-card-editor">
        ${editField('planning', [...path, 'title'], 'Title', task.title)}
        <div class="editor-grid compact">
          ${editField('planning', [...path, 'assignee'], 'Assignee', task.assignee ?? '')}
          ${editField('planning', [...path, 'dueDate'], 'Due date', task.dueDate ?? '', { type: 'date' })}
          ${editField('planning', [...path, 'priority'], 'Priority', task.priority ?? '')}
          ${editSelect('planning', [...path, 'status'], 'Status', task.status, taskStatuses)}
        </div>
        ${editField('planning', [...path, 'linkedItemId'], 'Linked item id', task.linkedItemId ?? '')}
        ${editField('planning', [...path, 'notes'], 'Notes', task.notes ?? '', { type: 'textarea', rows: 2 })}
        ${editActions('planning', ['tasks'], index, total)}
      </div>
    </article>
  `;
}

function sharedChecklistCard() {
  const items = trip.checklistItems.length
    ? trip.checklistItems
    : trip.planning.checklist.map((item, index) => ({ ...item, done: false, sortOrder: index + 1 }));
  return card({
    id: 'planning-checklist',
    title: 'Shared checklist',
    body: `
      <ul class="checklist">${items.map((item) => `
        <li data-checklist-row="${escapeHtml(item.id)}">
          <label><input type="checkbox" data-checklist-toggle="${escapeHtml(item.id)}" ${item.done ? 'checked' : ''} ${session.authenticated ? '' : 'disabled'}><span>${escapeHtml(item.text)}</span></label>
          ${statusPill(item.status)}
          ${session.authenticated ? `<button class="icon-button small" type="button" data-checklist-delete="${escapeHtml(item.id)}" aria-label="Delete checklist item">x</button>` : ''}
        </li>
      `).join('')}</ul>
      ${session.authenticated ? `<form class="inline-form" data-checklist-form><input name="text" placeholder="Add checklist item" required maxlength="160"><select name="status">${taskStatuses.map((status) => `<option value="${escapeHtml(status)}">${escapeHtml(status)}</option>`).join('')}</select><button class="button compact" type="submit">Add</button><span class="form-status" data-checklist-status></span></form>` : ''}
    `
  });
}

function renderAttractions() {
  const attractions = sectionValue('attractions');
  const categories = [...new Set(attractions.map((attraction) => attraction.category))];
  main.innerHTML = `
    ${editorBar()}
    ${pageHeader('Ideas board', 'Activities and places', 'Inspiration before it becomes a confirmed plan.')}
    ${sectionToolbar('attractions', 'Attraction cards', 'attraction')}
    ${categories.map((category) => `
      <section class="section">
        <div class="section-heading"><p class="eyebrow">${escapeHtml(category)}</p><h2>${escapeHtml(category)} ideas</h2></div>
        <div class="content-grid two editable-list">${attractions.map((attraction, index) => attraction.category === category ? (editMode && session.authenticated ? editableAttraction(attraction, index, attractions.length) : attractionCard(attraction)) : '').join('')}</div>
      </section>
    `).join('')}
  `;
}

function attractionCard(attraction) {
  return card({
    id: attraction.id,
    title: attraction.name,
    meta: `${attraction.category} · ${attraction.area}`,
    favorite: true,
    image: attraction.image,
    body: `<div class="card-chip-row">${statusPill(attraction.mustDo ? 'Suggested' : attraction.status ?? 'Idea')}${attraction.mustDo ? '<span class="soft-chip">Must do candidate</span>' : ''}</div><p>${escapeHtml(attraction.summary)}</p><p class="muted"><strong>Best for:</strong> ${escapeHtml(attraction.bestFor)}</p>${mapLink(locationById(attraction.locationId))}`
  });
}

function editableAttraction(attraction, index, total) {
  return card({
    id: attraction.id,
    title: attraction.name,
    meta: attraction.area,
    image: attraction.image,
    body: `
      <div class="same-card-editor">
        ${editField('attractions', [index, 'name'], 'Title', attraction.name)}
        <div class="editor-grid compact">
          ${editField('attractions', [index, 'area'], 'Area', attraction.area)}
          ${editField('attractions', [index, 'category'], 'Category', attraction.category)}
          ${editSelect('attractions', [index, 'status'], 'Status', attraction.status ?? 'Idea', statusChoices)}
        </div>
        ${editField('attractions', [index, 'summary'], 'Description', attraction.summary, { type: 'textarea', rows: 2 })}
        ${editField('attractions', [index, 'bestFor'], 'Best for', attraction.bestFor, { type: 'textarea', rows: 2 })}
        ${placePicker('attractions', [index, 'locationId'], attraction.locationId ?? '', { label: 'Map place' })}
        <details class="optional-edit"><summary>Image</summary>${editField('attractions', [index, 'image'], 'Image URL', attraction.image ?? '')}</details>
        ${editField('attractions', [index, 'mustDo'], 'Must do', attraction.mustDo ?? false, { type: 'checkbox' })}
        ${editActions('attractions', [], index, total)}
      </div>
    `,
    editAttrs: editableItemAttrs('attractions', [], index)
  });
}

function renderFood() {
  const restaurants = sectionValue('restaurants');
  main.innerHTML = `
    ${editorBar()}
    ${pageHeader('Food ideas', 'Restaurants and dinner choices', 'Track romantic dinner candidates, backups, and booking status.')}
    ${sectionToolbar('restaurants', 'Restaurant cards', 'restaurant')}
    <section class="content-grid two editable-list">
      ${restaurants.map((restaurant, index) => editMode && session.authenticated ? editableRestaurant(restaurant, index, restaurants.length) : restaurantCard(restaurant)).join('')}
    </section>
  `;
}

function restaurantCard(restaurant) {
  return card({
    id: restaurant.id,
    title: restaurant.name,
    meta: `${restaurant.area} · ${restaurant.cuisine}`,
    favorite: true,
    image: restaurant.image,
    body: `${statusPill(restaurant.status)}<p>${escapeHtml(restaurant.notes)}</p><div class="indicator-row"><span>${escapeHtml(restaurant.price ?? 'Price later')}</span><span>${escapeHtml(restaurant.votes ?? 'Votes pending')}</span></div>${mapLink(locationById(restaurant.locationId))}${noteBox(`note-${restaurant.id}`, 'Food notes')}`
  });
}

function editableRestaurant(restaurant, index, total) {
  return card({
    id: restaurant.id,
    title: restaurant.name,
    meta: restaurant.area,
    image: restaurant.image,
    body: `
      <div class="same-card-editor">
        ${editField('restaurants', [index, 'name'], 'Title', restaurant.name)}
        <div class="editor-grid compact">
          ${editField('restaurants', [index, 'area'], 'Area', restaurant.area)}
          ${editField('restaurants', [index, 'cuisine'], 'Cuisine', restaurant.cuisine)}
          ${editSelect('restaurants', [index, 'status'], 'Status', restaurant.status, statusChoices)}
        </div>
        ${editField('restaurants', [index, 'notes'], 'Description', restaurant.notes, { type: 'textarea', rows: 2 })}
        <div class="editor-grid compact">
          ${editField('restaurants', [index, 'price'], 'Price', restaurant.price ?? '')}
          ${editField('restaurants', [index, 'votes'], 'Votes', restaurant.votes ?? '')}
        </div>
        ${placePicker('restaurants', [index, 'locationId'], restaurant.locationId ?? '', { label: 'Map place' })}
        <details class="optional-edit"><summary>Image</summary>${editField('restaurants', [index, 'image'], 'Image URL', restaurant.image ?? '')}</details>
        ${editActions('restaurants', [], index, total)}
      </div>
    `,
    editAttrs: editableItemAttrs('restaurants', [], index)
  });
}

function renderStay() {
  const stay = sectionValue('stay');
  const flights = sectionValue('flights');
  main.innerHTML = `
    ${editorBar()}
    ${pageHeader('Stay and flights', 'Base camp', 'Accommodation, flight notes, arrival logistics, and booking references.')}
    <section class="content-grid two">
      ${editMode && session.authenticated ? editableStay(stay) : card({ id: 'stay-main', title: stay.name, meta: stay.address, favorite: true, tone: 'accent-card', image: stay.image, body: `<dl class="details-list"><div><dt>Check-in</dt><dd>${escapeHtml(stay.checkIn)}</dd></div><div><dt>Check-out</dt><dd>${escapeHtml(stay.checkOut)}</dd></div><div><dt>Contact</dt><dd>${escapeHtml(stay.contact)}</dd></div><div><dt>Booking ref</dt><dd>${escapeHtml(stay.bookingReference)}</dd></div></dl>${mapLink(locationById(stay.locationId))}` })}
      ${editMode && session.authenticated ? editableFlights(flights) : card({ id: 'flight-details', title: 'Flights', meta: 'Travel details', body: `<h3>Outbound</h3><p>${escapeHtml(flights.outbound)}</p><h3>Return</h3><p>${escapeHtml(flights.return)}</p>${list(flights.notes)}` })}
    </section>
    <section class="section">${card({ id: 'stay-notes', title: 'Stay notes', body: `${list(stay.notes)}${noteBox('note-stay')}` })}</section>
  `;
}

function editableStay(stay) {
  return card({
    id: 'stay-main',
    title: 'Stay details',
    tone: 'accent-card',
    image: stay.image,
    body: `
      ${sectionToolbar('stay', 'Stay details')}
      <div class="same-card-editor">
        ${editField('stay', ['name'], 'Name', stay.name)}
        ${editField('stay', ['address'], 'Address', stay.address)}
        <div class="editor-grid compact">
          ${editField('stay', ['checkIn'], 'Check-in', stay.checkIn)}
          ${editField('stay', ['checkOut'], 'Check-out', stay.checkOut)}
        </div>
        ${editField('stay', ['contact'], 'Contact', stay.contact, { type: 'textarea', rows: 2 })}
        ${editField('stay', ['bookingReference'], 'Booking reference', stay.bookingReference)}
        ${placePicker('stay', ['locationId'], stay.locationId, { label: 'Map place' })}
        <details class="optional-edit"><summary>Image</summary>${editField('stay', ['image'], 'Image URL', stay.image ?? '')}</details>
        ${simpleListEditor('stay', ['notes'], stay.notes, 'Stay note')}
      </div>
    `
  });
}

function editableFlights(flights) {
  return card({
    id: 'flight-details',
    title: 'Flights',
    body: `
      ${sectionToolbar('flights', 'Flight details')}
      <div class="inline-edit-form">
        ${editField('flights', ['outbound'], 'Outbound', flights.outbound, { type: 'textarea' })}
        ${editField('flights', ['return'], 'Return', flights.return, { type: 'textarea' })}
        ${simpleListEditor('flights', ['notes'], flights.notes, 'Flight note')}
      </div>
    `
  });
}

function renderGuide() {
  const duringTrip = sectionValue('duringTrip');
  main.innerHTML = `
    ${editorBar()}
    ${pageHeader('Travel mode', 'Travel wallet', 'Fast access to emergency placeholders, transport notes, essentials, and saved places.')}
    <section class="content-grid two">
      ${editMode && session.authenticated ? editableGuideList('wallet', 'Wallet notes', duringTrip.wallet ?? [], 'accent-card') : card({ id: 'guide-wallet', title: 'Wallet notes', tone: 'accent-card', body: list(duringTrip.wallet ?? []) })}
      ${editMode && session.authenticated ? editableGuideList('emergency', 'Emergency and contacts', duringTrip.emergency) : card({ id: 'guide-emergency', title: 'Emergency and contacts', body: list(duringTrip.emergency) })}
      ${editMode && session.authenticated ? editableGuideList('transport', 'Transport notes', duringTrip.transport) : card({ id: 'guide-transport', title: 'Transport notes', body: list(duringTrip.transport) })}
      ${editMode && session.authenticated ? editableGuideList('dailyEssentials', 'Daily essentials', duringTrip.dailyEssentials) : card({ id: 'guide-essentials', title: 'Daily essentials', body: list(duringTrip.dailyEssentials) })}
      ${editMode && session.authenticated ? editableGuideList('savedPlaces', 'Saved places', duringTrip.savedPlaces) : card({ id: 'guide-saved', title: 'Saved places', body: '<ul class="saved-list" data-saved-list></ul>' + list(duringTrip.savedPlaces) + noteBox('note-during-trip', 'Quick trip notes') })}
    </section>
  `;
}

function editableGuideList(key, title, items, tone = '') {
  return card({
    id: `guide-${key}`,
    title,
    tone,
    body: `${sectionToolbar('duringTrip', title)}<div class="inline-edit-form">${simpleListEditor('duringTrip', [key], items, title)}</div>`
  });
}

function renderPlanning() {
  renderMore();
}

function simpleListEditor(sectionKey, path, items, label) {
  return `
    <div class="simple-list-editor editable-list">
      ${items.map((item, index) => `
        <div class="editor-row" ${editableItemAttrs(sectionKey, path, index)}>
          ${editField(sectionKey, [...path, index], `${label} ${index + 1}`, item, { type: 'textarea', rows: 2 })}
          ${editActions(sectionKey, path, index, items.length)}
        </div>
      `).join('')}
      <button class="button compact secondary" type="button" data-add-section="${sectionKey}" data-add-kind="text" data-add-path="${pathAttr(path)}">Add</button>
    </div>
  `;
}

function emptyState(title, text) {
  return `<article class="empty-state"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(text)}</p></article>`;
}

function floatingAdd() {
  const addPages = new Set(['trip', 'itinerary', 'map', 'more']);
  if (!addPages.has(page)) {
    return '';
  }
  return `
    <button class="fab" type="button" data-open-add aria-expanded="${showAddPanel ? 'true' : 'false'}"><span aria-hidden="true">+</span><span>Add</span></button>
    ${showAddPanel ? addPanel() : ''}
  `;
}

function addPanel() {
  const itinerary = sectionValue('itinerary');
  const locations = sectionValue('locations');
  return `
    <section class="add-panel" aria-label="Add trip item">
      <div class="add-panel-header">
        <div><p class="eyebrow">Quick add</p><h2>Add something useful</h2></div>
        <button class="icon-button small" type="button" data-close-add aria-label="Close add panel">x</button>
      </div>
      <form data-add-form>
        <label><span>Type</span><select name="kind">
          <option value="activity">Activity</option>
          <option value="transport">Transport</option>
          <option value="accommodation">Accommodation</option>
          <option value="restaurant">Restaurant</option>
          <option value="idea">Idea</option>
          <option value="task">Task</option>
          <option value="document">Document</option>
          <option value="note">Note</option>
        </select></label>
        <label><span>Title</span><input name="title" required maxlength="120" placeholder="Dinner, transfer, ticket, task..."></label>
        <div class="editor-grid compact">
          <label><span>Day</span><select name="dayId">${itinerary.map((day) => `<option value="${escapeHtml(day.id)}">${escapeHtml(day.label)} · ${escapeHtml(day.date ?? '')}</option>`).join('')}</select></label>
          <label><span>Time</span><input name="time" placeholder="Optional"></label>
        </div>
        <label><span>Location</span><select name="locationId"><option value="">Add later</option>${locations.map((location) => `<option value="${escapeHtml(location.id)}">${escapeHtml(location.name)}</option>`).join('')}</select></label>
        <label><span>Notes</span><textarea name="notes" rows="3" placeholder="Optional details"></textarea></label>
        <div class="editor-grid compact">
          <label><span>Status</span><select name="status">${statusChoices.map((status) => `<option value="${escapeHtml(status)}">${escapeHtml(status)}</option>`).join('')}</select></label>
        </div>
        <div class="mini-actions">
          <button class="button primary" type="submit">Add draft</button>
          <button class="button ghost" type="button" data-close-add>Cancel</button>
          <span class="form-status">Save the affected section when ready.</span>
        </div>
      </form>
    </section>
  `;
}

function defaultItem(kind, currentItems) {
  if (kind === 'highlight') {
    return 'New trip highlight';
  }
  if (kind === 'quickLink') {
    return { label: 'New link', href: './more.html' };
  }
  if (kind === 'day') {
    const id = uniqueId('day', currentItems);
    return {
      id,
      label: `Day ${currentItems.length + 1}`,
      date: 'Editable date',
      isoDate: '',
      destination: trip.meta.destination,
      focus: 'Add the day focus.',
      mood: 'Flexible',
      balance: 'Balanced',
      balanceReason: 'Add why this day feels balanced.',
      items: []
    };
  }
  if (kind === 'attraction') {
    const id = uniqueId('att', currentItems);
    return { id, name: 'New idea', category: 'Idea', area: trip.meta.destination, status: 'Idea', summary: 'Add a short description.', bestFor: 'Add what this is best for.', locationId: trip.locations[0]?.id ?? '', image: '', mustDo: false };
  }
  if (kind === 'restaurant') {
    const id = uniqueId('food', currentItems);
    return { id, name: 'New restaurant', area: trip.meta.destination, status: 'Idea', cuisine: 'Add cuisine', notes: 'Add booking or menu notes.', locationId: trip.locations[0]?.id ?? '', image: '', price: '', votes: 'Pending' };
  }
  if (kind === 'location') {
    const id = uniqueId('place', currentItems);
    return { id, name: 'New place', area: trip.meta.destination, category: 'Place', mapQuery: trip.meta.destination, notes: '', image: '', status: 'Idea' };
  }
  if (kind === 'expense') {
    const id = uniqueId('expense', currentItems);
    return { id, title: 'New expense', amount: 0, currency: 'EUR', category: 'Trip', paidBy: 'TBD', splitBetween: 'Martin and Marta', status: 'Estimate', linkedItemId: '', notes: '' };
  }
  if (kind === 'document') {
    const id = uniqueId('doc', currentItems);
    return { id, title: 'New document record', type: 'Custom document', status: 'Missing', linkedItemId: '', important: false, offline: false, reference: '', notes: 'Manual record only; upload support is not implemented yet.' };
  }
  if (kind === 'decision') {
    const id = uniqueId('decision', currentItems);
    return { id, title: 'New decision', type: 'Choose one', status: 'Needs vote', linkedItemId: '', finalChoice: '', notes: '', options: [] };
  }
  if (kind === 'decisionOption') {
    const id = uniqueId('option', currentItems);
    return { id, title: 'New option', martin: 'Pending', marta: 'Pending', notes: '' };
  }
  if (kind === 'task') {
    const id = uniqueId('task', currentItems);
    return { id, title: 'New task', assignee: 'Shared', dueDate: '', priority: 'Medium', status: 'To do', linkedItemId: '', notes: '' };
  }
  if (kind === 'packing') {
    const id = uniqueId('pack', currentItems);
    return { id, text: 'New packing item', owner: 'Shared', category: 'Packing', essential: false, packed: false };
  }
  return 'New item';
}

function addPlanItemToDay(dayIndex) {
  const itinerary = getSectionDraft('itinerary');
  const day = itinerary[dayIndex];
  day.items = day.items ?? dayItems(day);
  day.items.push({
    id: uniquePlanItemId(itinerary, 'New plan item'),
    type: 'Activity',
    period: 'Flexible',
    time: '',
    title: 'New plan item',
    locationId: '',
    status: 'Idea',
    cost: '',
    booking: '',
    notes: ''
  });
  saveDraft('itinerary');
  setToolbarStatus('itinerary', 'Draft saved on this device.');
  renderPage();
}

function addFromForm(form) {
  const kind = form.kind.value;
  const title = form.title.value.trim();
  const notes = form.notes.value.trim();
  const status = form.status.value;
  if (['activity', 'transport', 'accommodation', 'note'].includes(kind)) {
    const itinerary = getSectionDraft('itinerary');
    const day = itinerary.find((candidate) => candidate.id === form.dayId.value) ?? itinerary[0];
    day.items = day.items ?? dayItems(day);
    const typeMap = { activity: 'Activity', transport: 'Transport', accommodation: 'Accommodation', note: 'Note' };
    day.items.push({
      id: uniquePlanItemId(itinerary, title),
      type: typeMap[kind],
      period: 'Flexible',
      time: form.time.value.trim(),
      title,
      locationId: form.locationId.value,
      status,
      cost: '',
      booking: '',
      notes
    });
    saveDraft('itinerary');
    return 'itinerary';
  }
  if (kind === 'restaurant') {
    const restaurants = getSectionDraft('restaurants');
    restaurants.push({ id: uniqueId('food', restaurants), name: title, area: trip.meta.destination, status, cuisine: 'Add cuisine', notes, locationId: form.locationId.value, image: '', price: '', votes: 'Pending' });
    saveDraft('restaurants');
    return 'restaurants';
  }
  if (kind === 'idea') {
    const attractions = getSectionDraft('attractions');
    attractions.push({ id: uniqueId('att', attractions), name: title, category: 'Idea', area: trip.meta.destination, status, summary: notes || 'Add a short description.', bestFor: 'Add what this is best for.', locationId: form.locationId.value, image: '', mustDo: false });
    saveDraft('attractions');
    return 'attractions';
  }
  const planning = getSectionDraft('planning');
  if (kind === 'task') {
    planning.tasks ??= [];
    planning.tasks.push({ id: uniqueId('task', planning.tasks), title, assignee: 'Shared', dueDate: '', priority: 'Medium', status: 'To do', linkedItemId: '', notes });
  }
  if (kind === 'document') {
    planning.documents ??= [];
    planning.documents.push({ id: uniqueId('doc', planning.documents), title, type: 'Custom document', status: 'Missing', linkedItemId: '', important: false, offline: false, reference: '', notes: notes || 'Manual record only; upload support is not implemented yet.' });
  }
  saveDraft('planning');
  return 'planning';
}

function setupEditorChrome() {
  document.querySelector('[data-edit-toggle]')?.addEventListener('click', () => {
    editMode = !editMode;
    showAddPanel = false;
    renderPage();
  });

  document.querySelector('[data-logout]')?.addEventListener('click', async () => {
    await logout();
    window.location.reload();
  });

  document.querySelector('[data-show-login]')?.addEventListener('click', () => {
    loginView();
  });
}

function setupLogin() {
  document.querySelector('[data-login-form]')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const status = form.querySelector('[data-login-status]');
    status.textContent = 'Signing in...';
    try {
      await login(form.username.value, form.password.value);
      await boot();
    } catch (error) {
      status.textContent = error.message;
    }
  });
}

function setupFavorites() {
  document.querySelectorAll('[data-favorite-id]').forEach((button) => {
    button.addEventListener('click', async () => {
      if (!session.authenticated) {
        return;
      }

      const favoriteId = button.dataset.favoriteId;
      const next = button.getAttribute('aria-pressed') !== 'true';
      button.disabled = true;
      try {
        await setFavorite(trip.id, favoriteId, next);
        if (next) {
          trip.favorites = [{ targetId: favoriteId }, ...trip.favorites.filter((favorite) => favorite.targetId !== favoriteId)];
        } else {
          trip.favorites = trip.favorites.filter((favorite) => favorite.targetId !== favoriteId);
        }
        button.setAttribute('aria-pressed', String(next));
        updateSavedList();
      } catch (error) {
        window.alert(error.message);
      } finally {
        button.disabled = false;
      }
    });
  });
  updateSavedList();
}

function updateSavedList() {
  const savedList = document.querySelector('[data-saved-list]');
  if (!savedList) {
    return;
  }
  const titles = new Map();
  document.querySelectorAll('[data-card-id]').forEach((cardElement) => {
    titles.set(cardElement.dataset.cardId, cardElement.querySelector('h2, strong')?.textContent ?? cardElement.dataset.cardId);
  });
  savedList.innerHTML = trip.favorites.length
    ? trip.favorites.map((favorite) => `<li>${escapeHtml(titles.get(favorite.targetId) ?? favorite.targetId)}</li>`).join('')
    : '<li>No shared favorites saved yet.</li>';
}

function setupNotes() {
  document.querySelectorAll('[data-note-box]').forEach((box) => {
    const textarea = box.querySelector('[data-note-body]');
    const status = box.querySelector('[data-note-status]');
    box.querySelector('[data-note-save]')?.addEventListener('click', async () => {
      status.textContent = 'Saving...';
      try {
        const saved = await saveNote(trip.id, { id: box.dataset.noteId || undefined, targetId: box.dataset.noteBox, body: textarea.value });
        trip.notes = [saved, ...trip.notes.filter((note) => note.id !== saved.id && note.targetId !== saved.targetId)];
        box.dataset.noteId = saved.id;
        status.textContent = 'Saved.';
      } catch (error) {
        status.textContent = error.message;
      }
    });

    box.querySelector('[data-note-delete]')?.addEventListener('click', async () => {
      status.textContent = 'Deleting...';
      try {
        await deleteNote(trip.id, box.dataset.noteId);
        trip.notes = trip.notes.filter((note) => note.id !== box.dataset.noteId);
        renderPage();
      } catch (error) {
        status.textContent = error.message;
      }
    });
  });
}

function setupChecklist() {
  document.querySelectorAll('[data-checklist-toggle]').forEach((checkbox) => {
    checkbox.addEventListener('change', async () => {
      const item = trip.checklistItems.find((candidate) => candidate.id === checkbox.dataset.checklistToggle);
      if (!item) {
        return;
      }
      checkbox.disabled = true;
      try {
        await saveChecklistItem(trip.id, { ...item, done: checkbox.checked });
        item.done = checkbox.checked;
      } catch (error) {
        checkbox.checked = !checkbox.checked;
        window.alert(error.message);
      } finally {
        checkbox.disabled = false;
      }
    });
  });

  document.querySelectorAll('[data-checklist-delete]').forEach((button) => {
    button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        await deleteChecklistItem(trip.id, button.dataset.checklistDelete);
        trip.checklistItems = trip.checklistItems.filter((item) => item.id !== button.dataset.checklistDelete);
        renderPage();
      } catch (error) {
        button.disabled = false;
        window.alert(error.message);
      }
    });
  });

  document.querySelector('[data-checklist-form]')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const status = form.querySelector('[data-checklist-status]');
    status.textContent = 'Saving...';
    try {
      const saved = await saveChecklistItem(trip.id, {
        text: form.text.value.trim(),
        status: form.status.value,
        done: false,
        sortOrder: trip.checklistItems.length + 1
      });
      trip.checklistItems.push(saved);
      form.reset();
      renderPage();
    } catch (error) {
      status.textContent = error.message;
    }
  });
}

function setToolbarStatus(sectionKey, message) {
  document.querySelectorAll(`[data-section-toolbar="${sectionKey}"] [data-section-status]`).forEach((status) => {
    status.textContent = message;
  });
}

function setupInlineEditing() {
  document.querySelectorAll('[data-inline-path]').forEach((input) => {
    input.addEventListener('input', () => {
      const sectionKey = input.dataset.inlineSection;
      const draft = getSectionDraft(sectionKey);
      const path = parsePath(input.dataset.inlinePath);
      let value = input.type === 'checkbox' ? input.checked : input.value;
      if (input.dataset.inlineType === 'csv') {
        value = input.value.split(',').map((item) => item.trim()).filter(Boolean);
      }
      if (input.dataset.inlineType === 'number') {
        value = Number(input.value || 0);
      }
      setAtPath(draft, path, value);
      saveDraft(sectionKey);
      setToolbarStatus(sectionKey, 'Draft saved on this device.');
    });
  });

  document.querySelectorAll('[data-add-section]').forEach((button) => {
    button.addEventListener('click', () => {
      const sectionKey = button.dataset.addSection;
      const draft = getSectionDraft(sectionKey);
      const path = button.dataset.addPath ? parsePath(button.dataset.addPath) : [];
      const target = path.length ? getAtPath(draft, path) : draft;
      if (!Array.isArray(target)) {
        setToolbarStatus(sectionKey, 'This field cannot add items.');
        return;
      }
      target.push(defaultItem(button.dataset.addKind, target));
      saveDraft(sectionKey);
      renderPage();
    });
  });

  document.querySelectorAll('[data-add-plan-day]').forEach((button) => {
    button.addEventListener('click', () => addPlanItemToDay(Number(button.dataset.addPlanDay)));
  });

  document.querySelectorAll('[data-remove-section]').forEach((button) => {
    button.addEventListener('click', () => {
      const sectionKey = button.dataset.removeSection;
      const draft = getSectionDraft(sectionKey);
      removeAtPath(draft, parsePath(button.dataset.removePath));
      saveDraft(sectionKey);
      renderPage();
    });
  });

  document.querySelectorAll('[data-move-section]').forEach((button) => {
    button.addEventListener('click', () => {
      const sectionKey = button.dataset.moveSection;
      const draft = getSectionDraft(sectionKey);
      const items = getAtPath(draft, parsePath(button.dataset.movePath));
      moveArrayItem(items, Number(button.dataset.moveIndex), Number(button.dataset.moveIndex) + Number(button.dataset.moveDirection));
      saveDraft(sectionKey);
      renderPage();
    });
  });

  document.querySelectorAll('[data-place-section]').forEach((button) => {
    button.addEventListener('click', () => {
      const sectionKey = button.dataset.placeSection;
      const draft = getSectionDraft(sectionKey);
      const path = parsePath(button.dataset.placePath);
      const mode = button.dataset.placeMode;
      const placeId = button.dataset.placeId;
      if (mode === 'multiple') {
        const current = new Set(getAtPath(draft, path) ?? []);
        if (current.has(placeId)) {
          current.delete(placeId);
        } else {
          current.add(placeId);
        }
        setAtPath(draft, path, [...current]);
      } else {
        setAtPath(draft, path, placeId);
      }
      saveDraft(sectionKey);
      renderPage();
    });
  });

  document.querySelectorAll('[data-save-section]').forEach((button) => {
    button.addEventListener('click', async () => {
      const sectionKey = button.dataset.saveSection;
      button.disabled = true;
      setToolbarStatus(sectionKey, 'Saving...');
      try {
        const saved = await saveSection(trip.id, sectionKey, getSectionDraft(sectionKey), trip.versions[sectionKey]?.version);
        trip[sectionKey] = saved.value;
        trip.versions[sectionKey] = { version: saved.version, updatedAt: saved.updatedAt };
        clearDraft(sectionKey);
        setToolbarStatus(sectionKey, 'Saved.');
        renderPage();
      } catch (error) {
        button.disabled = false;
        setToolbarStatus(sectionKey, error.status === 409 ? 'Someone saved newer data. Refresh before editing this section.' : error.message);
      }
    });
  });

  document.querySelectorAll('[data-reset-section]').forEach((button) => {
    button.addEventListener('click', () => {
      clearDraft(button.dataset.resetSection);
      renderPage();
    });
  });

  setupDragAndDrop();
}

function setupDragAndDrop() {
  document.querySelectorAll('[data-reorder-section]').forEach((item) => {
    item.addEventListener('dragstart', () => {
      draggedItem = {
        sectionKey: item.dataset.reorderSection,
        path: item.dataset.reorderPath,
        index: Number(item.dataset.reorderIndex)
      };
      item.classList.add('dragging');
    });
    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      draggedItem = null;
    });
    item.addEventListener('dragover', (event) => {
      if (draggedItem && draggedItem.sectionKey === item.dataset.reorderSection && draggedItem.path === item.dataset.reorderPath) {
        event.preventDefault();
      }
    });
    item.addEventListener('drop', (event) => {
      event.preventDefault();
      if (!draggedItem || draggedItem.sectionKey !== item.dataset.reorderSection || draggedItem.path !== item.dataset.reorderPath) {
        return;
      }
      const sectionKey = item.dataset.reorderSection;
      const draft = getSectionDraft(sectionKey);
      const items = getAtPath(draft, parsePath(item.dataset.reorderPath));
      moveArrayItem(items, draggedItem.index, Number(item.dataset.reorderIndex));
      saveDraft(sectionKey);
      renderPage();
    });
  });
}

function setupAddFlow() {
  document.querySelector('[data-open-add]')?.addEventListener('click', () => {
    if (!session.authenticated) {
      loginView();
      return;
    }
    editMode = true;
    showAddPanel = !showAddPanel;
    renderPage();
  });
  document.querySelectorAll('[data-close-add]').forEach((button) => {
    button.addEventListener('click', () => {
      showAddPanel = false;
      renderPage();
    });
  });
  document.querySelector('[data-add-form]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const sectionKey = addFromForm(event.currentTarget);
    showAddPanel = false;
    setToolbarStatus(sectionKey, 'Draft saved on this device.');
    renderPage();
  });
}

function tripPayloadFromForm(form) {
  return {
    title: form.title.value.trim(),
    destination: form.destination.value.trim(),
    startDate: form.startDate.value,
    endDate: form.endDate.value,
    travelers: form.travelers.value.trim(),
    subtitle: form.subtitle.value.trim(),
    mood: form.mood.value.split(',').map((item) => item.trim()).filter(Boolean),
    coverImage: form.coverImage.value.trim()
  };
}

function setupTripManagement() {
  document.querySelector('[data-new-trip]')?.addEventListener('click', () => {
    showTripForm = true;
    editingTripId = '';
    renderPortfolio();
  });

  document.querySelectorAll('[data-edit-trip]').forEach((button) => {
    button.addEventListener('click', () => {
      editingTripId = button.dataset.editTrip;
      showTripForm = false;
      renderPortfolio();
    });
  });

  document.querySelectorAll('[data-cancel-trip-form]').forEach((button) => {
    button.addEventListener('click', () => {
      showTripForm = false;
      editingTripId = '';
      renderPortfolio();
    });
  });

  document.querySelectorAll('[data-trip-form]').forEach((form) => {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const tripId = form.dataset.tripForm;
      const status = form.querySelector('[data-trip-form-status]');
      status.textContent = tripId ? 'Saving...' : 'Creating...';
      try {
        const payload = tripPayloadFromForm(form);
        if (tripId) {
          await updateTrip(tripId, payload);
          const refreshed = await loadTrips();
          trips = refreshed.trips;
          editingTripId = '';
          renderPortfolio();
        } else {
          const result = await createTrip(payload);
          window.location.href = tripUrl('./trip.html', result.trip.id);
        }
      } catch (error) {
        status.textContent = error.message;
      }
    });
  });

  document.querySelectorAll('[data-delete-trip]').forEach((button) => {
    button.addEventListener('click', async () => {
      const tripId = button.dataset.deleteTrip;
      const title = button.dataset.tripTitle;
      const confirmation = window.prompt(`Type DELETE to remove "${title}" and its trip-scoped notes, favorites, and checklist items.`);
      if (confirmation !== 'DELETE') {
        return;
      }
      button.disabled = true;
      try {
        await removeTrip(tripId);
        trips = trips.filter((summary) => summary.id !== tripId);
        renderPortfolio();
      } catch (error) {
        window.alert(error.message);
        button.disabled = false;
      }
    });
  });
}

function setupBeforeUnload() {
  window.onbeforeunload = dirtyDrafts.size > 0
    ? () => 'There are unsaved trip edits on this device.'
    : null;
}

function renderPage() {
  renderShell();
  const renderers = {
    trip: renderHome,
    itinerary: renderItinerary,
    map: renderMap,
    more: renderMore,
    attractions: renderAttractions,
    stay: renderStay,
    food: renderFood,
    planning: renderPlanning,
    guide: renderGuide
  };
  renderers[page]?.();
  if (workspacePages.has(page)) {
    main.insertAdjacentHTML('beforeend', floatingAdd());
  }
  document.querySelector('[data-print]')?.addEventListener('click', () => window.print());
  setupEditorChrome();
  setupFavorites();
  setupNotes();
  setupChecklist();
  setupInlineEditing();
  setupAddFlow();
  setupBeforeUnload();
}

async function boot() {
  main.innerHTML = '<section class="page-header"><p class="eyebrow">Loading</p><h1>Opening planner...</h1></section>';
  try {
    if (page === 'home') {
      const payload = await loadTrips();
      trips = payload.trips;
      session = { authenticated: payload.authenticated, editor: payload.editor };
      renderPortfolio();
      return;
    }

    if (workspacePages.has(page) && !selectedTripId) {
      session = await getSession();
      renderShell();
      main.innerHTML = `
        ${pageHeader('Trip missing', 'Choose a trip first', 'Trip detail pages need a selected trip id.')}
        <section class="empty-state"><h2>No trip selected</h2><p>Return to the trip portfolio and open one of the planned trips.</p><a class="button primary" href="${portfolioUrl()}">All trips</a></section>
      `;
      return;
    }

    const payload = await loadTrip(selectedTripId);
    trip = payload.trip;
    session = { authenticated: payload.authenticated, editor: payload.editor };
    renderPage();
  } catch (error) {
    if (error.status === 401) {
      session = { authenticated: false, editor: null };
      loginView();
      return;
    }
    if (error.status === 404) {
      session = await getSession().catch(() => ({ authenticated: false, editor: null }));
      renderShell();
      main.innerHTML = `${pageHeader('Trip not found', 'This trip does not exist', error.message)}<section class="empty-state"><a class="button primary" href="${portfolioUrl()}">All trips</a></section>`;
      return;
    }
    main.innerHTML = `${pageHeader('Error', 'Could not load trip data', error.message)}`;
  }
}

await boot();
