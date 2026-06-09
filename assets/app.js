import { trip } from '../data/trip.js';

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

const stateKeys = {
  favorites: 'zakynthos:favorites',
  notes: 'zakynthos:notes',
  checks: 'zakynthos:checks'
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function readJson(key, fallback) {
  const value = window.localStorage.getItem(key);
  return value ? JSON.parse(value) : fallback;
}

function writeJson(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value));
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
        <div>${meta ? `<p class="card-meta">${meta}</p>` : ''}<h2>${title}</h2></div>
        ${favorite ? `<button class="icon-button favorite-button" type="button" data-favorite-id="${id}" aria-pressed="false" aria-label="Save ${escapeHtml(title)} as favorite"><span aria-hidden="true">★</span></button>` : ''}
      </div>
      ${body}
    </article>
  `;
}

function noteBox(id, label = 'Notes') {
  return `<label class="note-box"><span>${label}</span><textarea data-note-id="${id}" rows="4" placeholder="Add a private note on this phone"></textarea></label>`;
}

function statusPill(status) {
  return `<span class="status-pill status-${status}">${status}</span>`;
}

function list(items, className = 'plain-list') {
  return `<ul class="${className}">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function renderShell() {
  document.title = page === 'home' ? trip.meta.title : `${pageTitle()} · ${trip.meta.title}`;
  document.querySelector('meta[name="description"]')?.setAttribute('content', trip.meta.subtitle);
  document.querySelector('[data-brand]').textContent = 'Zakynthos';
  document.querySelector('[data-nav]').innerHTML = nav.map(([href, label]) => {
    const current = (page === 'home' && href === 'index.html') || href.startsWith(`${page}.`);
    return `<a href="./${href}" ${current ? 'aria-current="page"' : ''}>${label}</a>`;
  }).join('');
  document.querySelector('[data-footer]').innerHTML = 'Static trip guide. Edit content in <code>data/trip.js</code>.';
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
    <section class="hero">
      <img src="./public/images/zakynthos-hero.png" alt="Turquoise Ionian Sea coastline with limestone cliffs at golden hour">
      <div class="hero-content">
        <p class="eyebrow">${trip.meta.month} · ${trip.meta.destination}</p>
        <h1>${trip.meta.title}</h1>
        <p>${trip.meta.subtitle}</p>
        <div class="hero-actions">
          <a class="button primary" href="./itinerary.html">Open itinerary</a>
          <a class="button secondary" href="./guide.html">During trip</a>
        </div>
      </div>
    </section>
    <section class="content-grid two">
      ${card({ id: 'countdown', title: 'Countdown', meta: targetLabel, body: `<p class="countdown" data-countdown-start="${trip.meta.startDate}">Calculating...</p><p>${trip.meta.travelers}</p>` })}
      ${card({ id: 'quick-links', title: 'Quick links', body: `<div class="quick-link-grid">${trip.quickLinks.map((link) => `<a class="quick-link" href="${link.href}">${link.label}</a>`).join('')}</div>` })}
    </section>
    <section class="section">
      <div class="section-heading"><p class="eyebrow">Highlights</p><h2>What this guide keeps close</h2></div>
      <div class="content-grid two">${trip.highlights.map((highlight, index) => card({ id: `highlight-${index}`, title: highlight, favorite: index < 2, body: '<p>Keep or replace this with your own trip priority in <code>data/trip.js</code>.</p>' })).join('')}</div>
    </section>
  `;
}

function renderItinerary() {
  main.innerHTML = `
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
            return `<section class="time-block"><p class="card-meta">${period}</p><h3>${block.title}</h3><p>${block.plan}</p>${block.notes ? `<p class="muted">${block.notes}</p>` : ''}<div class="inline-links">${(block.locationIds ?? []).map((id) => mapLink(locationById(id), true)).join('')}</div></section>`;
          }).join('')}</div>
          ${noteBox(`note-${day.id}`, 'Day notes')}
        `
      })).join('')}
    </section>
  `;
}

function renderAttractions() {
  const categories = ['Beach', 'Viewpoint', 'Boat trip', 'Village', 'Rainy day'];
  main.innerHTML = `
    ${pageHeader('Explore', 'Attractions', 'Seed ideas for beaches, viewpoints, boat trips, villages, and rainy-day backups.')}
    ${categories.map((category) => `
      <section class="section">
        <div class="section-heading"><p class="eyebrow">${category}</p><h2>${category} ideas</h2></div>
        <div class="content-grid two">${trip.attractions.filter((attraction) => attraction.category === category).map((attraction) => card({
          id: attraction.id,
          title: attraction.name,
          meta: attraction.area,
          favorite: true,
          body: `<p>${attraction.summary}</p><p class="muted"><strong>Best for:</strong> ${attraction.bestFor}</p>${attraction.mustDo ? '<span class="status-pill status-confirmed">must do</span>' : ''}${mapLink(locationById(attraction.locationId))}`
        })).join('')}</div>
      </section>
    `).join('')}
  `;
}

function renderStay() {
  const stayLocation = locationById(trip.stay.locationId);
  main.innerHTML = `
    ${pageHeader('Base camp', 'Hotel and stay', 'Editable placeholders for the stay, check-in, contact details, and practical notes.')}
    <section class="content-grid two">
      ${card({ id: 'stay-main', title: trip.stay.name, meta: trip.stay.address, favorite: true, body: `<dl class="details-list"><div><dt>Check-in</dt><dd>${trip.stay.checkIn}</dd></div><div><dt>Check-out</dt><dd>${trip.stay.checkOut}</dd></div><div><dt>Contact</dt><dd>${trip.stay.contact}</dd></div><div><dt>Booking ref</dt><dd>${trip.stay.bookingReference}</dd></div></dl>${mapLink(stayLocation)}` })}
      ${card({ id: 'flight-details', title: 'Flights', meta: 'Editable placeholders', body: `<h3>Outbound</h3><p>${trip.flights.outbound}</p><h3>Return</h3><p>${trip.flights.return}</p>${list(trip.flights.notes)}` })}
    </section>
    <section class="section">${card({ id: 'stay-notes', title: 'Stay notes', body: `${list(trip.stay.notes)}${noteBox('note-stay')}` })}</section>
  `;
}

function renderFood() {
  main.innerHTML = `
    ${pageHeader('Food', 'Restaurants and wishlist', 'Track booked places, romantic dinner ideas, and easy fallback meals.')}
    <section class="content-grid two">
      ${trip.restaurants.map((restaurant) => card({
        id: restaurant.id,
        title: restaurant.name,
        meta: `${restaurant.area} · ${restaurant.cuisine}`,
        favorite: true,
        body: `${statusPill(restaurant.status)}<p>${restaurant.notes}</p>${mapLink(locationById(restaurant.locationId))}${noteBox(`note-${restaurant.id}`, 'Food notes')}`
      })).join('')}
    </section>
  `;
}

function renderMap() {
  main.innerHTML = `
    ${pageHeader('No API keys', 'Map-friendly links', 'Google Maps search links generated from editable location data. No embedded map or paid API needed.')}
    <section class="content-grid two">
      ${trip.locations.map((location) => card({
        id: `map-${location.id}`,
        title: location.name,
        meta: `${location.category} · ${location.area}`,
        favorite: true,
        body: `${location.notes ? `<p>${location.notes}</p>` : ''}<p class="muted">Search query: ${location.mapQuery}</p>${mapLink(location)}`
      })).join('')}
    </section>
  `;
}

function renderPlanning() {
  main.innerHTML = `
    ${pageHeader('Before the trip', 'Planning board', 'Checklist, packing, budget notes, booking status, and open questions.')}
    <section class="content-grid two">
      ${card({ id: 'planning-checklist', title: 'Booking checklist', body: `<ul class="checklist">${trip.planning.checklist.map((item) => `<li><label><input type="checkbox" data-check-id="${item.id}"><span>${item.text}</span></label>${statusPill(item.status)}</li>`).join('')}</ul>` })}
      ${card({ id: 'packing-list', title: 'Packing list', body: list(trip.planning.packing) })}
      ${card({ id: 'budget-notes', title: 'Budget notes', body: `${list(trip.planning.budgetNotes)}${noteBox('note-budget')}` })}
      ${card({ id: 'open-questions', title: 'Open questions', body: `${list(trip.planning.openQuestions)}${noteBox('note-open-questions')}` })}
    </section>
  `;
}

function renderGuide() {
  main.innerHTML = `
    ${pageHeader('Phone mode', 'During the trip', 'Fast access to emergency placeholders, transport notes, essentials, and locally saved favorites.')}
    <section class="content-grid two">
      ${card({ id: 'guide-emergency', title: 'Emergency placeholders', body: list(trip.duringTrip.emergency) })}
      ${card({ id: 'guide-transport', title: 'Transport notes', body: list(trip.duringTrip.transport) })}
      ${card({ id: 'guide-essentials', title: 'Daily essentials', body: list(trip.duringTrip.dailyEssentials) })}
      ${card({ id: 'guide-saved', title: 'Saved places', body: '<p class="muted">Favorites are stored only in this browser.</p><ul class="saved-list" data-saved-list></ul>' + list(trip.duringTrip.savedPlaces) + noteBox('note-during-trip', 'Quick trip notes') })}
    </section>
  `;
}

function setupFavorites() {
  const buttons = document.querySelectorAll('[data-favorite-id]');
  const favorites = readJson(stateKeys.favorites, []);
  buttons.forEach((button) => {
    const favoriteId = button.dataset.favoriteId;
    button.setAttribute('aria-pressed', String(favorites.includes(favoriteId)));
    button.addEventListener('click', () => {
      const current = readJson(stateKeys.favorites, []);
      const next = current.includes(favoriteId) ? current.filter((id) => id !== favoriteId) : [...current, favoriteId];
      writeJson(stateKeys.favorites, next);
      button.setAttribute('aria-pressed', String(next.includes(favoriteId)));
      updateSavedList(next);
    });
  });
  updateSavedList(favorites);
}

function updateSavedList(favorites) {
  const savedList = document.querySelector('[data-saved-list]');
  if (!savedList) {
    return;
  }
  savedList.innerHTML = favorites.length
    ? favorites.map((id) => `<li>${document.querySelector(`[data-card-id="${id}"] h2`)?.textContent ?? id}</li>`).join('')
    : '<li>No favorites saved on this phone yet.</li>';
}

function setupNotes() {
  const notes = readJson(stateKeys.notes, {});
  document.querySelectorAll('[data-note-id]').forEach((field) => {
    const noteId = field.dataset.noteId;
    field.value = notes[noteId] ?? '';
    field.addEventListener('input', () => {
      const current = readJson(stateKeys.notes, {});
      current[noteId] = field.value;
      writeJson(stateKeys.notes, current);
    });
  });
}

function setupChecks() {
  const checks = readJson(stateKeys.checks, {});
  document.querySelectorAll('[data-check-id]').forEach((checkbox) => {
    const checkId = checkbox.dataset.checkId;
    checkbox.checked = checks[checkId] ?? false;
    checkbox.addEventListener('change', () => {
      const current = readJson(stateKeys.checks, {});
      current[checkId] = checkbox.checked;
      writeJson(stateKeys.checks, current);
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
    countdown.textContent = 'Add valid trip dates in data/trip.js.';
    return;
  }
  const days = Math.ceil((targetDate.valueOf() - Date.now()) / 86400000);
  countdown.textContent = days > 1 ? `${days} days to go` : days === 1 ? 'Tomorrow' : days === 0 ? 'Trip starts today' : 'Trip dates are in the past. Update the dates for the next version.';
}

function renderPage() {
  renderShell();
  const renderers = { home: renderHome, itinerary: renderItinerary, attractions: renderAttractions, stay: renderStay, food: renderFood, map: renderMap, planning: renderPlanning, guide: renderGuide };
  renderers[page]?.();
  document.querySelector('[data-print]')?.addEventListener('click', () => window.print());
  setupFavorites();
  setupNotes();
  setupChecks();
  setupCountdown();
}

renderPage();
