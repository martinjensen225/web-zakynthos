const contentFiles = {
  meta: '../content/meta.json',
  highlights: '../content/highlights.json',
  quickLinks: '../content/quick-links.json',
  flights: '../content/flights.json',
  stay: '../content/stay.json',
  locations: '../content/locations.json',
  itinerary: '../content/itinerary.json',
  attractions: '../content/attractions.json',
  restaurants: '../content/restaurants.json',
  planning: '../content/planning.json',
  duringTrip: '../content/during-trip.json'
};

async function readJson(relativePath) {
  const response = await fetch(new URL(relativePath, import.meta.url));

  if (!response.ok) {
    throw new Error(`Failed to load ${relativePath}: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function loadTrip() {
  const [meta, highlights, quickLinks, flights, stay, locations, itinerary, attractions, restaurants, planning, duringTrip] = await Promise.all([
    readJson(contentFiles.meta),
    readJson(contentFiles.highlights),
    readJson(contentFiles.quickLinks),
    readJson(contentFiles.flights),
    readJson(contentFiles.stay),
    readJson(contentFiles.locations),
    readJson(contentFiles.itinerary),
    readJson(contentFiles.attractions),
    readJson(contentFiles.restaurants),
    readJson(contentFiles.planning),
    readJson(contentFiles.duringTrip)
  ]);

  return {
    meta,
    highlights,
    quickLinks,
    flights,
    stay,
    locations,
    itinerary,
    attractions,
    restaurants,
    planning,
    duringTrip
  };
}
