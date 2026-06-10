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
  ['index.html', 'Home'],
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
const draftPrefix = 'zakynthos:draft:';
let trip;
let session;
let editMode = false;
let dirtyDrafts = new Set();

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
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

function mapLink(location, compact = false) {
  if (!location) {
    return '';
  }

  return `<a class="map-link ${compact ? 'compact' : ''}" href="${mapsUrl(location)}" target="_blank" rel="noreferrer">Open in Google Maps</a>`;
}

function pageHeader(eyebrow, title, description) {
  return `<section class="page-header"><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p class="lead">${description}</p></section>`;
}

function card({ id, title, meta = '', favorite = false, body = '' }) {
  return `
    <article class="card" data-card-id="${id}">
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

function favoriteTargets() {
  return new Set(trip.favorites.map((favorite) => favorite.targetId));
}

function editorBar() {
  const editorText = session.authenticated ? `Signed in as ${escapeHtml(session.editor.displayName)}` : 'Sign in to edit shared trip data';
  return `
    <section class="editor-bar">
      <p>${editorText}</p>
      <div class="editor-actions">
        ${session.authenticated ? `<button class="button secondary" type="button" data-edit-toggle>${editMode ? 'View mode' : 'Edit mode'}</button><button class="button secondary" type="button" data-logout>Log out</button>` : '<button class="button secondary" type="button" data-show-login>Editor login</button>'}
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
  document.querySelector('[data-footer]').textContent = 'Shared trip planner powered by protected Cloudflare D1 storage.';
}

function pageTitle() {
  const titles = {
    home: 'Home',
    itinerary: 'Itinerary',
    attractions: 'Attractions',
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
  const targetLabel = Number.isNaN(target.valueOf())
    ? 'Add trip dates'
    : target.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  main.innerHTML = `
    ${editorBar()}
    <section class="hero">
      <img src="./public/images/zakynthos-hero.png" alt="Turquoise Ionian Sea coastline with limestone cliffs at golden hour">
      <div class="hero-content">
        <p class="eyebrow">${escapeHtml(trip.meta.month)} · ${escapeHtml(trip.meta.destination)}</p>
        <h1>${escapeHtml(trip.meta.title)}</h1>
        <p>${escapeHtml(trip.meta.subtitle)}</p>
        <div class="hero-actions">
          <a class="button primary" href="./itinerary.html">Open itinerary</a>
          <a class="button secondary" href="./guide.html">During trip</a>
        </div>
      </div>
    </section>
    <section class="content-grid two">
      ${card({ id: 'countdown', title: 'Countdown', meta: targetLabel, body: `<p class="countdown" data-countdown-start="${escapeHtml(trip.meta.startDate)}">Calculating...</p><p>${escapeHtml(trip.meta.travelers)}</p>` })}
      ${card({ id: 'quick-links', title: 'Quick links', body: `<div class="quick-link-grid">${trip.quickLinks.map((link) => `<a class="quick-link" href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a>`).join('')}</div>` })}
    </section>
    <section class="section">
      <div class="section-heading"><p class="eyebrow">Highlights</p><h2>What this guide keeps close</h2></div>
      <div class="content-grid two">${trip.highlights.map((highlight, index) => card({ id: `highlight-${index}`, title: highlight, favorite: index < 2, body: '<p>Keep or replace this with your own trip priority in edit mode.</p>' })).join('')}</div>
    </section>
    ${editPanels()}
  `;
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
  const categories = ['Beach', 'Viewpoint', 'Boat trip', 'Village', 'Rainy day'];
  main.innerHTML = `
    ${editorBar()}
    ${pageHeader('Explore', 'Attractions', 'Seed ideas for beaches, viewpoints, boat trips, villages, and rainy-day backups.')}
    ${categories.map((category) => `
      <section class="section">
        <div class="section-heading"><p class="eyebrow">${category}</p><h2>${category} ideas</h2></div>
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
    ${pageHeader('Base camp', 'Hotel and stay', 'Editable placeholders for the stay, check-in, contact details, and practical notes.')}
    <section class="content-grid two">
      ${card({ id: 'stay-main', title: trip.stay.name, meta: trip.stay.address, favorite: true, body: `<dl class="details-list"><div><dt>Check-in</dt><dd>${escapeHtml(trip.stay.checkIn)}</dd></div><div><dt>Check-out</dt><dd>${escapeHtml(trip.stay.checkOut)}</dd></div><div><dt>Contact</dt><dd>${escapeHtml(trip.stay.contact)}</dd></div><div><dt>Booking ref</dt><dd>${escapeHtml(trip.stay.bookingReference)}</dd></div></dl>${mapLink(stayLocation)}` })}
      ${card({ id: 'flight-details', title: 'Flights', meta: 'Editable placeholders', body: `<h3>Outbound</h3><p>${escapeHtml(trip.flights.outbound)}</p><h3>Return</h3><p>${escapeHtml(trip.flights.return)}</p>${list(trip.flights.notes)}` })}
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
    ${pageHeader('No API keys', 'Map-friendly links', 'Google Maps search links generated from editable location data. No embedded map or paid API needed.')}
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
    title: 'Booking checklist',
    body: `
      <ul class="checklist">${items.map((item) => `
        <li data-checklist-row="${escapeHtml(item.id)}">
          <label><input type="checkbox" data-checklist-toggle="${escapeHtml(item.id)}" ${item.done ? 'checked' : ''} ${session.authenticated ? '' : 'disabled'}><span>${escapeHtml(item.text)}</span></label>
          ${statusPill(item.status)}
          ${session.authenticated ? `<button class="icon-button small" type="button" data-checklist-delete="${escapeHtml(item.id)}" aria-label="Delete checklist item">x</button>` : ''}
        </li>
      `).join('')}</ul>
      ${session.authenticated ? `<form class="inline-form" data-checklist-form><input name="text" placeholder="Add checklist item" required><select name="status"><option value="planned">planned</option><option value="wishlist">wishlist</option><option value="placeholder">placeholder</option><option value="confirmed">confirmed</option></select><button class="button compact" type="submit">Add</button><span class="form-status" data-checklist-status></span></form>` : ''}
    `
  });
}

function renderGuide() {
  main.innerHTML = `
    ${editorBar()}
    ${pageHeader('Phone mode', 'During the trip', 'Fast access to emergency placeholders, transport notes, essentials, and shared saved places.')}
    <section class="content-grid two">
      ${card({ id: 'guide-emergency', title: 'Emergency placeholders', body: list(trip.duringTrip.emergency) })}
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
      <div class="section-heading"><p class="eyebrow">Edit mode</p><h2>Page data</h2></div>
      <div class="content-grid">${pageSections[page].map((sectionKey) => sectionEditor(sectionKey)).join('')}</div>
    </section>
  `;
}

function sectionEditor(sectionKey) {
  const draftKey = `${draftPrefix}${sectionKey}`;
  const draft = window.localStorage.getItem(draftKey);
  const value = draft ?? JSON.stringify(trip[sectionKey], null, 2);
  return `
    <article class="card editor-card" data-section-editor="${sectionKey}">
      <div class="card-title-row"><div><p class="card-meta">version ${trip.versions[sectionKey]?.version ?? 1}</p><h2>${sectionKey}</h2></div></div>
      <textarea data-section-json rows="12" spellcheck="false">${escapeHtml(value)}</textarea>
      <div class="mini-actions">
        <button class="button compact" type="button" data-section-save>Save</button>
        <button class="button compact ghost" type="button" data-section-reset>Reset draft</button>
        <span class="form-status" data-section-status>${draft ? 'Unsaved draft restored.' : ''}</span>
      </div>
    </article>
  `;
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
      await saveChecklistItem({ ...item, done: checkbox.checked });
      item.done = checkbox.checked;
    });
  });

  document.querySelectorAll('[data-checklist-delete]').forEach((button) => {
    button.addEventListener('click', async () => {
      await deleteChecklistItem(button.dataset.checklistDelete);
      trip.checklistItems = trip.checklistItems.filter((item) => item.id !== button.dataset.checklistDelete);
      renderPage();
    });
  });

  document.querySelector('[data-checklist-form]')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const status = form.querySelector('[data-checklist-status]');
    status.textContent = 'Saving...';
    try {
      const saved = await saveChecklistItem({
        text: form.text.value,
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
    const textarea = editor.querySelector('[data-section-json]');
    const status = editor.querySelector('[data-section-status]');
    const draftKey = `${draftPrefix}${sectionKey}`;

    textarea.addEventListener('input', () => {
      window.localStorage.setItem(draftKey, textarea.value);
      dirtyDrafts.add(sectionKey);
      status.textContent = 'Draft saved on this device.';
    });

    editor.querySelector('[data-section-reset]').addEventListener('click', () => {
      window.localStorage.removeItem(draftKey);
      dirtyDrafts.delete(sectionKey);
      textarea.value = JSON.stringify(trip[sectionKey], null, 2);
      status.textContent = 'Draft reset.';
    });

    editor.querySelector('[data-section-save]').addEventListener('click', async () => {
      status.textContent = 'Saving...';
      try {
        const parsed = JSON.parse(textarea.value);
        const saved = await saveSection(sectionKey, parsed, trip.versions[sectionKey]?.version);
        trip[sectionKey] = saved.value;
        trip.versions[sectionKey] = { version: saved.version, updatedAt: saved.updatedAt };
        window.localStorage.removeItem(draftKey);
        dirtyDrafts.delete(sectionKey);
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
