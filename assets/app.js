import {
  deleteChecklistItem,
  deleteNote,
  loadTrip,
  login,
  logout,
  saveChecklistItem,
  saveNote,
  saveSection,
  setFavorite
} from '../data/trip.js';

const page = document.body.dataset.page;
const main = document.querySelector('#content');
const nav = [
  ['index.html', 'Overview'],
  ['itinerary.html', 'Itinerary'],
  ['attractions.html', 'Explore'],
  ['stay.html', 'Stay'],
  ['food.html', 'Food'],
  ['map.html', 'Map'],
  ['planning.html', 'Plan'],
  ['guide.html', 'Guide']
];
const pageSections = {
  home: ['meta', 'highlights', 'quickLinks'],
  itinerary: ['itinerary'],
  attractions: ['attractions', 'locations'],
  stay: ['stay', 'flights', 'locations'],
  food: ['restaurants', 'locations'],
  map: ['locations'],
  planning: ['planning'],
  guide: ['duringTrip']
};
const sectionLabels = {
  meta: 'Trip summary',
  highlights: 'Trip highlights',
  quickLinks: 'Quick links',
  flights: 'Flights',
  stay: 'Stay details',
  locations: 'Map places',
  itinerary: 'Daily itinerary',
  attractions: 'Explore ideas',
  restaurants: 'Restaurants',
  planning: 'Planning lists',
  duringTrip: 'During-trip guide'
};
const draftPrefix = 'zakynthos:draft:';
let trip;
let session;
let editMode = false;
let dirtyDrafts = new Set();
let sectionDrafts = new Map();

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
    .slice(0, 40) || 'new-item';
}

function uniqueId(prefix, items) {
  const existing = new Set(items.map((item) => item.id).filter(Boolean));
  let index = items.length + 1;
  let id = `${prefix}-${index}`;
  while (existing.has(id)) {
    index += 1;
    id = `${prefix}-${index}`;
  }
  return id;
}

function draftKey(sectionKey) {
  return `${draftPrefix}${sectionKey}`;
}

function getSectionDraft(sectionKey) {
  if (sectionDrafts.has(sectionKey)) {
    return sectionDrafts.get(sectionKey);
  }

  const saved = window.localStorage.getItem(draftKey(sectionKey));
  const draft = saved ? JSON.parse(saved) : clone(trip[sectionKey]);
  sectionDrafts.set(sectionKey, draft);
  return draft;
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

function noteByTarget(targetId) {
  return trip.notes.find((note) => note.targetId === targetId);
}

function locationById(id) {
  return trip.locations.find((location) => location.id === id);
}

function mapsUrl(location) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.mapQuery)}`;
}

function formatDate(value) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.valueOf())
    ? value
    : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function tripLength() {
  const start = new Date(`${trip.meta.startDate}T00:00:00`);
  const end = new Date(`${trip.meta.endDate}T00:00:00`);
  if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf())) {
    return 'Dates pending';
  }
  const nights = Math.max(0, Math.round((end - start) / 86400000));
  return `${nights} nights`;
}

function mapLink(location, compact = false) {
  if (!location) {
    return '';
  }

  return `<a class="map-link ${compact ? 'compact' : ''}" href="${mapsUrl(location)}" target="_blank" rel="noreferrer">Open in Maps</a>`;
}

function pageHeader(eyebrow, title, description) {
  return `<section class="page-header"><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p class="lead">${description}</p></section>`;
}

function favoriteTargets() {
  return new Set(trip.favorites.map((favorite) => favorite.targetId));
}

function card({ id, title, meta = '', favorite = false, body = '', tone = '' }) {
  return `
    <article class="card ${tone}" data-card-id="${escapeHtml(id)}">
      <div class="card-title-row">
        <div>${meta ? `<p class="card-meta">${escapeHtml(meta)}</p>` : ''}<h2>${escapeHtml(title)}</h2></div>
        ${favorite ? `<button class="icon-button favorite-button" type="button" data-favorite-id="${escapeHtml(id)}" aria-pressed="${favoriteTargets().has(id)}" aria-label="Save ${escapeHtml(title)} as favorite"><span aria-hidden="true">*</span></button>` : ''}
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

function statusPill(status) {
  return `<span class="status-pill status-${escapeHtml(status)}">${escapeHtml(status)}</span>`;
}

function list(items, className = 'plain-list') {
  return `<ul class="${className}">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
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
  document.title = page === 'home' ? trip.meta.title : `${pageTitle()} · ${trip.meta.title}`;
  document.querySelector('meta[name="description"]')?.setAttribute('content', trip.meta.subtitle);
  document.querySelector('[data-brand]').textContent = 'Zakynthos';
  document.querySelector('[data-nav]').innerHTML = nav.map(([href, label]) => {
    const current = (page === 'home' && href === 'index.html') || href.startsWith(`${page}.`);
    return `<a href="./${href}" ${current ? 'aria-current="page"' : ''}>${label}</a>`;
  }).join('');
  document.querySelector('[data-footer]').textContent = 'Shared Zakynthos planner with protected Cloudflare D1 storage.';
}

function pageTitle() {
  const titles = {
    home: 'Overview',
    itinerary: 'Itinerary',
    attractions: 'Explore',
    stay: 'Stay',
    food: 'Food',
    map: 'Map',
    planning: 'Planning',
    guide: 'During the trip'
  };
  return titles[page] ?? 'Guide';
}

function renderHome() {
  const target = new Date(`${trip.meta.startDate}T00:00:00`);
  const targetLabel = Number.isNaN(target.valueOf()) ? 'Dates pending' : formatDate(trip.meta.startDate);
  const firstDay = trip.itinerary[0];
  const favoriteCount = trip.favorites.length;

  main.innerHTML = `
    ${editorBar()}
    <section class="hero">
      <img src="./public/images/zakynthos-hero.png" alt="Turquoise Ionian Sea coastline with limestone cliffs at golden hour">
      <div class="hero-content">
        <p class="eyebrow">${escapeHtml(trip.meta.month)} · ${escapeHtml(trip.meta.destination)}</p>
        <h1>${escapeHtml(trip.meta.title)}</h1>
        <p>${escapeHtml(trip.meta.subtitle)}</p>
        <div class="hero-actions">
          <a class="button primary" href="./planning.html">Open planning board</a>
          <a class="button secondary" href="./guide.html">Phone guide</a>
        </div>
      </div>
    </section>
    <section class="dashboard-strip" aria-label="Trip snapshot">
      ${statCard('Start', targetLabel)}
      ${statCard('Length', tripLength())}
      ${statCard('Travelers', trip.meta.travelers)}
      ${statCard('Saved', `${favoriteCount} places`)}
    </section>
    <section class="content-grid two">
      ${card({ id: 'countdown', title: 'Countdown', meta: targetLabel, tone: 'accent-card', body: `<p class="countdown" data-countdown-start="${escapeHtml(trip.meta.startDate)}">Calculating...</p><p>${escapeHtml(trip.meta.travelers)}</p>` })}
      ${card({ id: 'today-plan', title: firstDay ? `${firstDay.label}: ${firstDay.focus}` : 'First plan', meta: firstDay?.date ?? 'Add itinerary', body: firstDay ? `<p>${escapeHtml(firstDay.morning.plan)}</p><a class="text-link" href="./itinerary.html">See itinerary</a>` : '<p>Add the first day in edit mode.</p>' })}
    </section>
    <section class="section">
      <div class="section-heading"><p class="eyebrow">Quick access</p><h2>Most useful while planning</h2></div>
      <div class="quick-link-grid">${trip.quickLinks.map((link) => `<a class="quick-link" href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a>`).join('')}</div>
    </section>
    <section class="section">
      <div class="section-heading"><p class="eyebrow">Highlights</p><h2>What this trip is about</h2></div>
      <div class="content-grid two">${trip.highlights.map((highlight, index) => card({ id: `highlight-${index}`, title: highlight, favorite: index < 2, body: '<p>Use edit mode to tune the trip priorities as plans firm up.</p>' })).join('')}</div>
    </section>
    ${editPanels()}
  `;
}

function statCard(label, value) {
  return `<article class="stat-card"><p>${escapeHtml(label)}</p><strong>${escapeHtml(value)}</strong></article>`;
}

function renderItinerary() {
  main.innerHTML = `
    ${editorBar()}
    ${pageHeader('Daily rhythm', 'Itinerary', 'Morning, afternoon, and evening plans with printable days and editable placeholders.')}
    <div class="toolbar print-hidden"><button class="button secondary" type="button" data-print>Print itinerary</button></div>
    <section class="timeline">
      ${trip.itinerary.map((day) => card({
        id: day.id,
        title: `${day.label}: ${day.focus}`,
        meta: day.date,
        favorite: true,
        body: `
          <div class="day-grid">${['morning', 'afternoon', 'evening'].map((period) => {
            const block = day[period];
            return `<section class="time-block"><p class="card-meta">${period}</p><h3>${escapeHtml(block.title)}</h3><p>${escapeHtml(block.plan)}</p>${block.notes ? `<p class="muted">${escapeHtml(block.notes)}</p>` : ''}<div class="inline-links">${(block.locationIds ?? []).map((id) => mapLink(locationById(id), true)).join('')}</div></section>`;
          }).join('')}</div>
          ${noteBox(`note-${day.id}`, 'Day notes')}
        `
      })).join('')}
    </section>
    ${editPanels()}
  `;
}

function renderAttractions() {
  const categories = [...new Set(trip.attractions.map((attraction) => attraction.category))];
  main.innerHTML = `
    ${editorBar()}
    ${pageHeader('Explore', 'Attractions', 'Beaches, viewpoints, boat trips, villages, and rainy-day backups.')}
    ${categories.map((category) => `
      <section class="section">
        <div class="section-heading"><p class="eyebrow">${escapeHtml(category)}</p><h2>${escapeHtml(category)} ideas</h2></div>
        <div class="content-grid two">${trip.attractions.filter((attraction) => attraction.category === category).map((attraction) => card({
          id: attraction.id,
          title: attraction.name,
          meta: attraction.area,
          favorite: true,
          body: `<p>${escapeHtml(attraction.summary)}</p><p class="muted"><strong>Best for:</strong> ${escapeHtml(attraction.bestFor)}</p>${attraction.mustDo ? '<span class="status-pill status-confirmed">must do</span>' : ''}${mapLink(locationById(attraction.locationId))}`
        })).join('')}</div>
      </section>
    `).join('')}
    ${editPanels()}
  `;
}

function renderStay() {
  const stayLocation = locationById(trip.stay.locationId);
  main.innerHTML = `
    ${editorBar()}
    ${pageHeader('Base camp', 'Hotel and stay', 'Keep booking details, flight notes, and arrival logistics in one protected place.')}
    <section class="content-grid two">
      ${card({ id: 'stay-main', title: trip.stay.name, meta: trip.stay.address, favorite: true, tone: 'accent-card', body: `<dl class="details-list"><div><dt>Check-in</dt><dd>${escapeHtml(trip.stay.checkIn)}</dd></div><div><dt>Check-out</dt><dd>${escapeHtml(trip.stay.checkOut)}</dd></div><div><dt>Contact</dt><dd>${escapeHtml(trip.stay.contact)}</dd></div><div><dt>Booking ref</dt><dd>${escapeHtml(trip.stay.bookingReference)}</dd></div></dl>${mapLink(stayLocation)}` })}
      ${card({ id: 'flight-details', title: 'Flights', meta: 'Travel details', body: `<h3>Outbound</h3><p>${escapeHtml(trip.flights.outbound)}</p><h3>Return</h3><p>${escapeHtml(trip.flights.return)}</p>${list(trip.flights.notes)}` })}
    </section>
    <section class="section">${card({ id: 'stay-notes', title: 'Stay notes', body: `${list(trip.stay.notes)}${noteBox('note-stay')}` })}</section>
    ${editPanels()}
  `;
}

function renderFood() {
  main.innerHTML = `
    ${editorBar()}
    ${pageHeader('Food', 'Restaurants and wishlist', 'Track booked places, romantic dinner ideas, and easy fallback meals.')}
    <section class="content-grid two">
      ${trip.restaurants.map((restaurant) => card({
        id: restaurant.id,
        title: restaurant.name,
        meta: `${restaurant.area} · ${restaurant.cuisine}`,
        favorite: true,
        body: `${statusPill(restaurant.status)}<p>${escapeHtml(restaurant.notes)}</p>${mapLink(locationById(restaurant.locationId))}${noteBox(`note-${restaurant.id}`, 'Food notes')}`
      })).join('')}
    </section>
    ${editPanels()}
  `;
}

function renderMap() {
  main.innerHTML = `
    ${editorBar()}
    ${pageHeader('Map links', 'Saved places', 'Google Maps search links generated from editable location data. No embedded map or paid API key needed.')}
    <section class="content-grid two">
      ${trip.locations.map((location) => card({
        id: `map-${location.id}`,
        title: location.name,
        meta: `${location.category} · ${location.area}`,
        favorite: true,
        body: `${location.notes ? `<p>${escapeHtml(location.notes)}</p>` : ''}<p class="muted">Search query: ${escapeHtml(location.mapQuery)}</p>${mapLink(location)}`
      })).join('')}
    </section>
    ${editPanels()}
  `;
}

function renderPlanning() {
  main.innerHTML = `
    ${editorBar()}
    ${pageHeader('Before the trip', 'Planning board', 'Checklist, packing, budget notes, booking status, and open questions.')}
    <section class="content-grid two">
      ${sharedChecklistCard()}
      ${card({ id: 'packing-list', title: 'Packing list', body: list(trip.planning.packing) })}
      ${card({ id: 'budget-notes', title: 'Budget notes', body: `${list(trip.planning.budgetNotes)}${noteBox('note-budget')}` })}
      ${card({ id: 'open-questions', title: 'Open questions', body: `${list(trip.planning.openQuestions)}${noteBox('note-open-questions')}` })}
    </section>
    ${editPanels()}
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
      ${session.authenticated ? `<form class="inline-form" data-checklist-form><input name="text" placeholder="Add checklist item" required maxlength="160"><select name="status"><option value="planned">planned</option><option value="wishlist">wishlist</option><option value="placeholder">placeholder</option><option value="confirmed">confirmed</option></select><button class="button compact" type="submit">Add</button><span class="form-status" data-checklist-status></span></form>` : ''}
    `
  });
}

function renderGuide() {
  main.innerHTML = `
    ${editorBar()}
    ${pageHeader('Phone mode', 'During the trip', 'Fast access to emergency placeholders, transport notes, essentials, and shared saved places.')}
    <section class="content-grid two">
      ${card({ id: 'guide-emergency', title: 'Emergency and contacts', tone: 'accent-card', body: list(trip.duringTrip.emergency) })}
      ${card({ id: 'guide-transport', title: 'Transport notes', body: list(trip.duringTrip.transport) })}
      ${card({ id: 'guide-essentials', title: 'Daily essentials', body: list(trip.duringTrip.dailyEssentials) })}
      ${card({ id: 'guide-saved', title: 'Saved places', body: '<ul class="saved-list" data-saved-list></ul>' + list(trip.duringTrip.savedPlaces) + noteBox('note-during-trip', 'Quick trip notes') })}
    </section>
    ${editPanels()}
  `;
}

function editPanels() {
  if (!session.authenticated || !editMode) {
    return '';
  }

  return `
    <section class="section edit-section">
      <div class="section-heading"><p class="eyebrow">Edit mode</p><h2>Update this page</h2></div>
      <div class="editor-grid">${pageSections[page].map((sectionKey) => sectionEditor(sectionKey)).join('')}</div>
    </section>
  `;
}

function sectionEditor(sectionKey) {
  const draft = getSectionDraft(sectionKey);
  const restored = window.localStorage.getItem(draftKey(sectionKey)) ? 'Unsaved draft restored on this device.' : '';
  return `
    <article class="card editor-card" data-section-editor="${sectionKey}">
      <div class="card-title-row">
        <div><p class="card-meta">version ${trip.versions[sectionKey]?.version ?? 1}</p><h2>${sectionLabels[sectionKey] ?? sectionKey}</h2></div>
      </div>
      <div class="structured-editor">${renderStructuredFields(sectionKey, draft, [])}</div>
      <details class="json-fallback">
        <summary>Advanced JSON</summary>
        <textarea data-section-json rows="10" spellcheck="false">${escapeHtml(JSON.stringify(draft, null, 2))}</textarea>
      </details>
      <div class="mini-actions">
        <button class="button compact" type="button" data-section-save>Save changes</button>
        <button class="button compact ghost" type="button" data-section-reset>Reset draft</button>
        <span class="form-status" data-section-status>${restored}</span>
      </div>
    </article>
  `;
}

function renderStructuredFields(sectionKey, value, path) {
  if (Array.isArray(value)) {
    return renderArrayEditor(sectionKey, value, path);
  }
  if (value && typeof value === 'object') {
    return renderObjectEditor(sectionKey, value, path);
  }
  return renderScalarEditor(value, path);
}

function renderObjectEditor(sectionKey, value, path) {
  return Object.entries(value).map(([key, fieldValue]) => {
    const nextPath = [...path, key];
    const label = labelFor(key);
    if (Array.isArray(fieldValue)) {
      return `<section class="editor-group"><h3>${escapeHtml(label)}</h3>${renderArrayEditor(sectionKey, fieldValue, nextPath)}</section>`;
    }
    if (fieldValue && typeof fieldValue === 'object') {
      return `<section class="editor-group nested"><h3>${escapeHtml(label)}</h3>${renderObjectEditor(sectionKey, fieldValue, nextPath)}</section>`;
    }
    return renderField(label, fieldValue, nextPath);
  }).join('');
}

function renderArrayEditor(sectionKey, value, path) {
  const simple = value.every((item) => typeof item !== 'object' || item === null);
  const itemClass = simple ? 'simple-list-editor' : 'object-list-editor';
  return `
    <div class="${itemClass}">
      ${value.map((item, index) => {
        const itemPath = [...path, index];
        if (simple) {
          return `
            <div class="editor-row">
              ${renderField(`Item ${index + 1}`, item, itemPath)}
              <button class="icon-button small danger" type="button" data-remove-path="${pathAttr(itemPath)}" aria-label="Remove item">x</button>
            </div>
          `;
        }
        return `
          <details class="object-editor-item" open>
            <summary><span>${escapeHtml(itemTitle(sectionKey, item, index))}</span><button class="icon-button small danger" type="button" data-remove-path="${pathAttr(itemPath)}" aria-label="Remove item">x</button></summary>
            ${renderObjectEditor(sectionKey, item, itemPath)}
          </details>
        `;
      }).join('')}
      <button class="button compact secondary" type="button" data-add-path="${pathAttr(path)}" data-add-section="${escapeHtml(sectionKey)}">Add item</button>
    </div>
  `;
}

function renderField(label, value, path) {
  const pathJson = pathAttr(path);
  const key = String(path.at(-1));
  if (typeof value === 'boolean') {
    return `<label class="editor-field checkbox-field"><input type="checkbox" data-edit-path="${pathJson}" data-edit-type="boolean" ${value ? 'checked' : ''}><span>${escapeHtml(label)}</span></label>`;
  }
  if (Array.isArray(value)) {
    return `<label class="editor-field"><span>${escapeHtml(label)}</span><input data-edit-path="${pathJson}" data-edit-type="csv" value="${escapeHtml(value.join(', '))}"></label>`;
  }
  const inputType = key.toLowerCase().includes('date') && /^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? 'date' : 'text';
  const longText = String(value ?? '').length > 70 || ['summary', 'notes', 'plan', 'subtitle', 'bestFor', 'contact', 'bookingReference', 'outbound', 'return'].includes(key);
  if (longText) {
    return `<label class="editor-field"><span>${escapeHtml(label)}</span><textarea data-edit-path="${pathJson}" rows="3">${escapeHtml(value)}</textarea></label>`;
  }
  return `<label class="editor-field"><span>${escapeHtml(label)}</span><input type="${inputType}" data-edit-path="${pathJson}" value="${escapeHtml(value)}"></label>`;
}

function renderScalarEditor(value, path) {
  return renderField('Value', value, path);
}

function labelFor(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (character) => character.toUpperCase());
}

function itemTitle(sectionKey, item, index) {
  return item.name || item.label || item.title || item.text || item.id || `${sectionLabels[sectionKey] ?? 'Item'} ${index + 1}`;
}

function defaultItem(sectionKey, path, currentItems) {
  const pathName = path.join('.');
  if (pathName.endsWith('locationIds')) {
    return trip.locations[0]?.id ?? '';
  }
  if (sectionKey === 'highlights') {
    return 'New trip highlight';
  }
  if (sectionKey === 'quickLinks') {
    return { label: 'New link', href: './planning.html' };
  }
  if (sectionKey === 'locations') {
    const id = uniqueId('place', currentItems);
    return { id, name: 'New place', area: 'Zakynthos', category: 'Place', mapQuery: 'Zakynthos Greece', notes: '' };
  }
  if (sectionKey === 'attractions') {
    const id = uniqueId('att', currentItems);
    return { id, name: 'New idea', category: 'Beach', area: 'Zakynthos', summary: 'Add a short description.', bestFor: 'Add what this is best for.', locationId: trip.locations[0]?.id ?? '', mustDo: false };
  }
  if (sectionKey === 'restaurants') {
    const id = uniqueId('food', currentItems);
    return { id, name: 'New restaurant', area: 'Zakynthos', status: 'wishlist', cuisine: 'Greek', notes: 'Add booking or menu notes.', locationId: trip.locations[0]?.id ?? '' };
  }
  if (sectionKey === 'itinerary') {
    const id = uniqueId('day', currentItems);
    return {
      id,
      label: `Day ${currentItems.length + 1}`,
      date: 'Editable date',
      focus: 'Add the day focus.',
      morning: { title: 'Morning', plan: 'Add the morning plan.', notes: '', locationIds: [] },
      afternoon: { title: 'Afternoon', plan: 'Add the afternoon plan.', notes: '', locationIds: [] },
      evening: { title: 'Evening', plan: 'Add the evening plan.', notes: '', locationIds: [] }
    };
  }
  if (pathName.endsWith('checklist')) {
    const id = slug(`task-${currentItems.length + 1}`);
    return { id, text: 'New checklist item', status: 'planned' };
  }
  return 'New item';
}

function setupEditorChrome() {
  document.querySelector('[data-edit-toggle]')?.addEventListener('click', () => {
    editMode = !editMode;
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
        await setFavorite(favoriteId, next);
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
    titles.set(cardElement.dataset.cardId, cardElement.querySelector('h2')?.textContent ?? cardElement.dataset.cardId);
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
        const saved = await saveNote({ id: box.dataset.noteId || undefined, targetId: box.dataset.noteBox, body: textarea.value });
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
        await deleteNote(box.dataset.noteId);
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
        await saveChecklistItem({ ...item, done: checkbox.checked });
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
        await deleteChecklistItem(button.dataset.checklistDelete);
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
      const saved = await saveChecklistItem({
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

function setupSectionEditors() {
  document.querySelectorAll('[data-section-editor]').forEach((editor) => {
    const sectionKey = editor.dataset.sectionEditor;
    const status = editor.querySelector('[data-section-status]');
    const jsonTextarea = editor.querySelector('[data-section-json]');

    editor.querySelectorAll('[data-edit-path]').forEach((input) => {
      input.addEventListener('input', () => {
        const draft = getSectionDraft(sectionKey);
        const path = parsePath(input.dataset.editPath);
        let value = input.type === 'checkbox' ? input.checked : input.value;
        if (input.dataset.editType === 'csv') {
          value = input.value.split(',').map((item) => item.trim()).filter(Boolean);
        }
        setAtPath(draft, path, value);
        saveDraft(sectionKey);
        if (jsonTextarea) {
          jsonTextarea.value = JSON.stringify(draft, null, 2);
        }
        status.textContent = 'Draft saved on this device.';
      });
    });

    editor.querySelectorAll('[data-add-path]').forEach((button) => {
      button.addEventListener('click', () => {
        const draft = getSectionDraft(sectionKey);
        const path = parsePath(button.dataset.addPath);
        const target = getAtPath(draft, path);
        if (!Array.isArray(target)) {
          status.textContent = 'Cannot add to this field.';
          return;
        }
        target.push(defaultItem(sectionKey, path, target));
        saveDraft(sectionKey);
        renderPage();
      });
    });

    editor.querySelectorAll('[data-remove-path]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const draft = getSectionDraft(sectionKey);
        removeAtPath(draft, parsePath(button.dataset.removePath));
        saveDraft(sectionKey);
        renderPage();
      });
    });

    jsonTextarea?.addEventListener('input', (event) => {
      try {
        sectionDrafts.set(sectionKey, JSON.parse(event.currentTarget.value));
        saveDraft(sectionKey);
        status.textContent = 'Advanced JSON draft saved on this device.';
      } catch {
        status.textContent = 'JSON draft has a syntax error.';
      }
    });

    editor.querySelector('[data-section-reset]').addEventListener('click', () => {
      clearDraft(sectionKey);
      status.textContent = 'Draft reset.';
      renderPage();
    });

    editor.querySelector('[data-section-save]').addEventListener('click', async () => {
      status.textContent = 'Saving...';
      try {
        const saved = await saveSection(sectionKey, getSectionDraft(sectionKey), trip.versions[sectionKey]?.version);
        trip[sectionKey] = saved.value;
        trip.versions[sectionKey] = { version: saved.version, updatedAt: saved.updatedAt };
        clearDraft(sectionKey);
        status.textContent = 'Saved.';
        renderPage();
      } catch (error) {
        status.textContent = error.status === 409 ? 'Someone saved newer data. Refresh before editing this section.' : error.message;
      }
    });
  });
}

function setupCountdown() {
  const countdown = document.querySelector('[data-countdown-start]');
  if (!countdown) {
    return;
  }
  const targetDate = new Date(`${countdown.dataset.countdownStart}T00:00:00`);
  if (Number.isNaN(targetDate.valueOf())) {
    countdown.textContent = 'Add valid trip dates in edit mode.';
    return;
  }
  const days = Math.ceil((targetDate.valueOf() - Date.now()) / 86400000);
  countdown.textContent = days > 1 ? `${days} days to go` : days === 1 ? 'Tomorrow' : days === 0 ? 'Trip starts today' : 'Trip dates are in the past. Update the dates for the next version.';
}

function setupBeforeUnload() {
  window.onbeforeunload = dirtyDrafts.size > 0
    ? () => 'There are unsaved trip edits on this device.'
    : null;
}

function renderPage() {
  renderShell();
  const renderers = { home: renderHome, itinerary: renderItinerary, attractions: renderAttractions, stay: renderStay, food: renderFood, map: renderMap, planning: renderPlanning, guide: renderGuide };
  renderers[page]?.();
  document.querySelector('[data-print]')?.addEventListener('click', () => window.print());
  setupEditorChrome();
  setupFavorites();
  setupNotes();
  setupChecklist();
  setupSectionEditors();
  setupCountdown();
  setupBeforeUnload();
}

async function boot() {
  main.innerHTML = '<section class="page-header"><p class="eyebrow">Loading</p><h1>Opening shared planner...</h1></section>';
  try {
    const payload = await loadTrip();
    trip = payload.trip;
    session = { authenticated: payload.authenticated, editor: payload.editor };
    renderPage();
  } catch (error) {
    if (error.status === 401) {
      session = { authenticated: false, editor: null };
      loginView();
      return;
    }
    main.innerHTML = `${pageHeader('Error', 'Could not load trip data', error.message)}`;
  }
}

await boot();
