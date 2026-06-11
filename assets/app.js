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
const draftPrefix = 'zakynthos:draft:';
let trip;
let session;
let editMode = false;
let dirtyDrafts = new Set();
let sectionDrafts = new Map();
let draggedItem = null;

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

function card({ id, title, meta = '', favorite = false, body = '', tone = '', image = '', editAttrs = '' }) {
  return `
    <article class="card ${tone}" data-card-id="${escapeHtml(id)}" ${editAttrs}>
      ${image ? `<img class="card-media" src="${escapeHtml(image)}" alt="">` : ''}
      <div class="card-title-row">
        <div>${meta ? `<p class="card-meta">${escapeHtml(meta)}</p>` : ''}<h2>${escapeHtml(title)}</h2></div>
        ${favorite && !editMode ? `<button class="icon-button favorite-button" type="button" data-favorite-id="${escapeHtml(id)}" aria-pressed="${favoriteTargets().has(id)}" aria-label="Save ${escapeHtml(title)} as favorite"><span aria-hidden="true">*</span></button>` : ''}
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

function editField(sectionKey, path, label, value, options = {}) {
  const type = options.type ?? 'text';
  const pathJson = pathAttr(path);
  if (type === 'checkbox') {
    return `<label class="edit-field checkbox-field"><input type="checkbox" data-inline-section="${sectionKey}" data-inline-path="${pathJson}" data-inline-type="boolean" ${value ? 'checked' : ''}><span>${escapeHtml(label)}</span></label>`;
  }
  if (type === 'textarea') {
    return `<label class="edit-field"><span>${escapeHtml(label)}</span><textarea data-inline-section="${sectionKey}" data-inline-path="${pathJson}" rows="${options.rows ?? 3}" ${options.required ? 'required' : ''}>${escapeHtml(value)}</textarea></label>`;
  }
  if (type === 'csv') {
    return `<label class="edit-field"><span>${escapeHtml(label)}</span><input data-inline-section="${sectionKey}" data-inline-path="${pathJson}" data-inline-type="csv" value="${escapeHtml((value ?? []).join(', '))}"></label>`;
  }
  return `<label class="edit-field"><span>${escapeHtml(label)}</span><input type="${type}" data-inline-section="${sectionKey}" data-inline-path="${pathJson}" value="${escapeHtml(value)}" ${options.required ? 'required' : ''}></label>`;
}

function editSelect(sectionKey, path, label, value, choices) {
  return `
    <label class="edit-field">
      <span>${escapeHtml(label)}</span>
      <select data-inline-section="${sectionKey}" data-inline-path="${pathAttr(path)}">
        ${choices.map((choice) => `<option value="${escapeHtml(choice)}" ${choice === value ? 'selected' : ''}>${escapeHtml(choice)}</option>`).join('')}
      </select>
    </label>
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

function sectionToolbar(sectionKey, label, addKind = '') {
  if (!editMode || !session.authenticated) {
    return '';
  }
  const restored = window.localStorage.getItem(draftKey(sectionKey)) ? 'Unsaved draft on this device.' : '';
  return `
    <div class="edit-toolbar" data-section-toolbar="${sectionKey}">
      <p><strong>${escapeHtml(label)}</strong><span data-section-status>${restored}</span></p>
      <div class="editor-actions">
        ${addKind ? `<button class="button compact secondary" type="button" data-add-section="${sectionKey}" data-add-kind="${addKind}">Add</button>` : ''}
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
  const meta = sectionValue('meta');
  const highlights = sectionValue('highlights');
  const quickLinks = sectionValue('quickLinks');
  const firstDay = trip.itinerary[0];
  const targetLabel = formatDate(meta.startDate);

  main.innerHTML = `
    ${editorBar()}
    <section class="hero">
      <img src="./public/images/zakynthos-hero.png" alt="Turquoise Ionian Sea coastline with limestone cliffs at golden hour">
      <div class="hero-content">
        ${editMode && session.authenticated ? `
          ${sectionToolbar('meta', 'Trip summary')}
          <div class="inline-edit-form hero-editor">
            ${editField('meta', ['month'], 'Month', meta.month)}
            ${editField('meta', ['destination'], 'Destination', meta.destination)}
            ${editField('meta', ['title'], 'Title', meta.title)}
            ${editField('meta', ['subtitle'], 'Description', meta.subtitle, { type: 'textarea', rows: 2 })}
            ${editField('meta', ['startDate'], 'Start date', meta.startDate, { type: 'date' })}
            ${editField('meta', ['endDate'], 'End date', meta.endDate, { type: 'date' })}
            ${editField('meta', ['travelers'], 'Travelers', meta.travelers)}
          </div>
        ` : `
          <p class="eyebrow">${escapeHtml(meta.month)} · ${escapeHtml(meta.destination)}</p>
          <h1>${escapeHtml(meta.title)}</h1>
          <p>${escapeHtml(meta.subtitle)}</p>
          <div class="hero-actions">
            <a class="button primary" href="./planning.html">Open planning board</a>
            <a class="button secondary" href="./guide.html">Phone guide</a>
          </div>
        `}
      </div>
    </section>
    <section class="dashboard-strip" aria-label="Trip snapshot">
      ${statCard('Start', targetLabel)}
      ${statCard('Length', tripLength(meta))}
      ${statCard('Travelers', meta.travelers)}
      ${statCard('Saved', `${trip.favorites.length} places`)}
    </section>
    <section class="content-grid two">
      ${card({ id: 'countdown', title: 'Countdown', meta: targetLabel, tone: 'accent-card', body: `<p class="countdown" data-countdown-start="${escapeHtml(meta.startDate)}">Calculating...</p><p>${escapeHtml(meta.travelers)}</p>` })}
      ${card({ id: 'today-plan', title: firstDay ? `${firstDay.label}: ${firstDay.focus}` : 'First plan', meta: firstDay?.date ?? 'Add itinerary', body: firstDay ? `<p>${escapeHtml(firstDay.morning.plan)}</p><a class="text-link" href="./itinerary.html">See itinerary</a>` : '<p>Add the first day in edit mode.</p>' })}
    </section>
    <section class="section">
      <div class="section-heading"><p class="eyebrow">Quick access</p><h2>Most useful while planning</h2></div>
      ${sectionToolbar('quickLinks', 'Quick links', 'quickLink')}
      <div class="quick-link-grid editable-list">${quickLinks.map((link, index) => editMode && session.authenticated ? editableQuickLink(link, index, quickLinks.length) : `<a class="quick-link" href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a>`).join('')}</div>
    </section>
    <section class="section">
      <div class="section-heading"><p class="eyebrow">Highlights</p><h2>What this trip is about</h2></div>
      ${sectionToolbar('highlights', 'Highlights', 'highlight')}
      <div class="content-grid two editable-list">${highlights.map((highlight, index) => editMode && session.authenticated ? editableHighlight(highlight, index, highlights.length) : card({ id: `highlight-${index}`, title: highlight, favorite: index < 2, body: '<p>Use edit mode to tune the trip priorities as plans firm up.</p>' })).join('')}</div>
    </section>
  `;
}

function statCard(label, value) {
  return `<article class="stat-card"><p>${escapeHtml(label)}</p><strong>${escapeHtml(value)}</strong></article>`;
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
      ${editField('quickLinks', [index, 'label'], 'Label', link.label)}
      ${editField('quickLinks', [index, 'href'], 'Link', link.href)}
      ${editActions('quickLinks', [], index, total)}
    </article>
  `;
}

function renderItinerary() {
  const itinerary = sectionValue('itinerary');
  main.innerHTML = `
    ${editorBar()}
    ${pageHeader('Daily rhythm', 'Itinerary', 'Morning, afternoon, and evening plans with printable days and editable placeholders.')}
    <div class="toolbar print-hidden"><button class="button secondary" type="button" data-print>Print itinerary</button></div>
    ${sectionToolbar('itinerary', 'Itinerary days', 'day')}
    <section class="timeline editable-list">
      ${itinerary.map((day, index) => editMode && session.authenticated ? editableDay(day, index, itinerary.length) : itineraryCard(day)).join('')}
    </section>
  `;
}

function itineraryCard(day) {
  return card({
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
  });
}

function editableDay(day, index, total) {
  return card({
    id: day.id,
    title: day.label,
    meta: day.date,
    body: `
      <div class="inline-edit-form">
        ${editField('itinerary', [index, 'label'], 'Label', day.label)}
        ${editField('itinerary', [index, 'date'], 'Date', day.date)}
        ${editField('itinerary', [index, 'focus'], 'Focus', day.focus, { type: 'textarea', rows: 2 })}
        <div class="day-grid">${['morning', 'afternoon', 'evening'].map((period) => {
          const block = day[period];
          return `<section class="time-block editable-block"><h3>${period}</h3>${editField('itinerary', [index, period, 'title'], 'Title', block.title)}${editField('itinerary', [index, period, 'plan'], 'Plan', block.plan, { type: 'textarea' })}${editField('itinerary', [index, period, 'notes'], 'Notes', block.notes ?? '', { type: 'textarea', rows: 2 })}${editField('itinerary', [index, period, 'locationIds'], 'Location ids', block.locationIds ?? [], { type: 'csv' })}</section>`;
        }).join('')}</div>
        ${editActions('itinerary', [], index, total)}
      </div>
    `,
    editAttrs: editableItemAttrs('itinerary', [], index)
  });
}

function renderAttractions() {
  const attractions = sectionValue('attractions');
  const categories = [...new Set(attractions.map((attraction) => attraction.category))];
  main.innerHTML = `
    ${editorBar()}
    ${pageHeader('Explore', 'Attractions', 'Beaches, viewpoints, boat trips, villages, and rainy-day backups.')}
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
    meta: attraction.area,
    favorite: true,
    image: attraction.image,
    body: `<p>${escapeHtml(attraction.summary)}</p><p class="muted"><strong>Best for:</strong> ${escapeHtml(attraction.bestFor)}</p>${attraction.mustDo ? '<span class="status-pill status-confirmed">must do</span>' : ''}${mapLink(locationById(attraction.locationId))}`
  });
}

function editableAttraction(attraction, index, total) {
  return card({
    id: attraction.id,
    title: attraction.name,
    meta: attraction.area,
    image: attraction.image,
    body: `
      <div class="inline-edit-form">
        ${editField('attractions', [index, 'name'], 'Title', attraction.name)}
        ${editField('attractions', [index, 'area'], 'Area', attraction.area)}
        ${editField('attractions', [index, 'category'], 'Category', attraction.category)}
        ${editField('attractions', [index, 'summary'], 'Description', attraction.summary, { type: 'textarea' })}
        ${editField('attractions', [index, 'bestFor'], 'Best for', attraction.bestFor, { type: 'textarea', rows: 2 })}
        ${editField('attractions', [index, 'locationId'], 'Map place id', attraction.locationId ?? '')}
        ${editField('attractions', [index, 'image'], 'Image URL or path', attraction.image ?? '')}
        ${editField('attractions', [index, 'mustDo'], 'Must do', attraction.mustDo ?? false, { type: 'checkbox' })}
        ${editActions('attractions', [], index, total)}
      </div>
    `,
    editAttrs: editableItemAttrs('attractions', [], index)
  });
}

function renderStay() {
  const stay = sectionValue('stay');
  const flights = sectionValue('flights');
  const stayLocation = locationById(stay.locationId);
  main.innerHTML = `
    ${editorBar()}
    ${pageHeader('Base camp', 'Hotel and stay', 'Keep booking details, flight notes, and arrival logistics in one protected place.')}
    <section class="content-grid two">
      ${editMode && session.authenticated ? editableStay(stay) : card({ id: 'stay-main', title: stay.name, meta: stay.address, favorite: true, tone: 'accent-card', image: stay.image, body: `<dl class="details-list"><div><dt>Check-in</dt><dd>${escapeHtml(stay.checkIn)}</dd></div><div><dt>Check-out</dt><dd>${escapeHtml(stay.checkOut)}</dd></div><div><dt>Contact</dt><dd>${escapeHtml(stay.contact)}</dd></div><div><dt>Booking ref</dt><dd>${escapeHtml(stay.bookingReference)}</dd></div></dl>${mapLink(stayLocation)}` })}
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
      <div class="inline-edit-form">
        ${editField('stay', ['name'], 'Name', stay.name)}
        ${editField('stay', ['address'], 'Address', stay.address)}
        ${editField('stay', ['checkIn'], 'Check-in', stay.checkIn)}
        ${editField('stay', ['checkOut'], 'Check-out', stay.checkOut)}
        ${editField('stay', ['contact'], 'Contact', stay.contact, { type: 'textarea', rows: 2 })}
        ${editField('stay', ['bookingReference'], 'Booking reference', stay.bookingReference)}
        ${editField('stay', ['locationId'], 'Map place id', stay.locationId)}
        ${editField('stay', ['image'], 'Image URL or path', stay.image ?? '')}
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

function renderFood() {
  const restaurants = sectionValue('restaurants');
  main.innerHTML = `
    ${editorBar()}
    ${pageHeader('Food', 'Restaurants and wishlist', 'Track booked places, romantic dinner ideas, and easy fallback meals.')}
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
    body: `${statusPill(restaurant.status)}<p>${escapeHtml(restaurant.notes)}</p>${mapLink(locationById(restaurant.locationId))}${noteBox(`note-${restaurant.id}`, 'Food notes')}`
  });
}

function editableRestaurant(restaurant, index, total) {
  return card({
    id: restaurant.id,
    title: restaurant.name,
    meta: restaurant.area,
    image: restaurant.image,
    body: `
      <div class="inline-edit-form">
        ${editField('restaurants', [index, 'name'], 'Title', restaurant.name)}
        ${editField('restaurants', [index, 'area'], 'Area', restaurant.area)}
        ${editSelect('restaurants', [index, 'status'], 'Status', restaurant.status, ['placeholder', 'wishlist', 'planned', 'booked', 'confirmed'])}
        ${editField('restaurants', [index, 'cuisine'], 'Cuisine', restaurant.cuisine)}
        ${editField('restaurants', [index, 'notes'], 'Description', restaurant.notes, { type: 'textarea' })}
        ${editField('restaurants', [index, 'locationId'], 'Map place id', restaurant.locationId ?? '')}
        ${editField('restaurants', [index, 'image'], 'Image URL or path', restaurant.image ?? '')}
        ${editActions('restaurants', [], index, total)}
      </div>
    `,
    editAttrs: editableItemAttrs('restaurants', [], index)
  });
}

function renderMap() {
  const locations = sectionValue('locations');
  main.innerHTML = `
    ${editorBar()}
    ${pageHeader('Map links', 'Saved places', 'Google Maps search links generated from editable location data. No embedded map or paid API key needed.')}
    ${sectionToolbar('locations', 'Map places', 'location')}
    <section class="content-grid two editable-list">
      ${locations.map((location, index) => editMode && session.authenticated ? editableLocation(location, index, locations.length) : locationCard(location)).join('')}
    </section>
  `;
}

function locationCard(location) {
  return card({
    id: `map-${location.id}`,
    title: location.name,
    meta: `${location.category} · ${location.area}`,
    favorite: true,
    image: location.image,
    body: `${location.notes ? `<p>${escapeHtml(location.notes)}</p>` : ''}<p class="muted">Search query: ${escapeHtml(location.mapQuery)}</p>${mapLink(location)}`
  });
}

function editableLocation(location, index, total) {
  return card({
    id: `map-${location.id}`,
    title: location.name,
    meta: location.area,
    image: location.image,
    body: `
      <div class="inline-edit-form">
        ${editField('locations', [index, 'id'], 'Place id', location.id)}
        ${editField('locations', [index, 'name'], 'Title', location.name)}
        ${editField('locations', [index, 'area'], 'Area', location.area)}
        ${editField('locations', [index, 'category'], 'Category', location.category)}
        ${editField('locations', [index, 'mapQuery'], 'Google Maps search', location.mapQuery)}
        ${editField('locations', [index, 'notes'], 'Description', location.notes ?? '', { type: 'textarea' })}
        ${editField('locations', [index, 'image'], 'Image URL or path', location.image ?? '')}
        ${editActions('locations', [], index, total)}
      </div>
    `,
    editAttrs: editableItemAttrs('locations', [], index)
  });
}

function renderPlanning() {
  const planning = sectionValue('planning');
  main.innerHTML = `
    ${editorBar()}
    ${pageHeader('Before the trip', 'Planning board', 'Checklist, packing, budget notes, booking status, and open questions.')}
    <section class="content-grid two">
      ${sharedChecklistCard()}
      ${editMode && session.authenticated ? editablePlanningList('packing', 'Packing list', planning.packing) : card({ id: 'packing-list', title: 'Packing list', body: list(planning.packing) })}
      ${editMode && session.authenticated ? editablePlanningList('budgetNotes', 'Budget notes', planning.budgetNotes) : card({ id: 'budget-notes', title: 'Budget notes', body: `${list(planning.budgetNotes)}${noteBox('note-budget')}` })}
      ${editMode && session.authenticated ? editablePlanningList('openQuestions', 'Open questions', planning.openQuestions) : card({ id: 'open-questions', title: 'Open questions', body: `${list(planning.openQuestions)}${noteBox('note-open-questions')}` })}
    </section>
  `;
}

function editablePlanningList(key, title, items) {
  return card({
    id: key,
    title,
    body: `${sectionToolbar('planning', title)}<div class="inline-edit-form">${simpleListEditor('planning', [key], items, title)}</div>`
  });
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
  const duringTrip = sectionValue('duringTrip');
  main.innerHTML = `
    ${editorBar()}
    ${pageHeader('Phone mode', 'During the trip', 'Fast access to emergency placeholders, transport notes, essentials, and shared saved places.')}
    <section class="content-grid two">
      ${editMode && session.authenticated ? editableGuideList('emergency', 'Emergency and contacts', duringTrip.emergency, 'accent-card') : card({ id: 'guide-emergency', title: 'Emergency and contacts', tone: 'accent-card', body: list(duringTrip.emergency) })}
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

function defaultItem(kind, currentItems) {
  if (kind === 'highlight') {
    return 'New trip highlight';
  }
  if (kind === 'quickLink') {
    return { label: 'New link', href: './planning.html' };
  }
  if (kind === 'day') {
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
  if (kind === 'attraction') {
    const id = uniqueId('att', currentItems);
    return { id, name: 'New idea', category: 'Beach', area: 'Zakynthos', summary: 'Add a short description.', bestFor: 'Add what this is best for.', locationId: trip.locations[0]?.id ?? '', image: '', mustDo: false };
  }
  if (kind === 'restaurant') {
    const id = uniqueId('food', currentItems);
    return { id, name: 'New restaurant', area: 'Zakynthos', status: 'wishlist', cuisine: 'Greek', notes: 'Add booking or menu notes.', locationId: trip.locations[0]?.id ?? '', image: '' };
  }
  if (kind === 'location') {
    const id = uniqueId('place', currentItems);
    return { id, name: 'New place', area: 'Zakynthos', category: 'Place', mapQuery: 'Zakynthos Greece', notes: '', image: '' };
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

  document.querySelectorAll('[data-save-section]').forEach((button) => {
    button.addEventListener('click', async () => {
      const sectionKey = button.dataset.saveSection;
      button.disabled = true;
      setToolbarStatus(sectionKey, 'Saving...');
      try {
        const saved = await saveSection(sectionKey, getSectionDraft(sectionKey), trip.versions[sectionKey]?.version);
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
  setupInlineEditing();
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
