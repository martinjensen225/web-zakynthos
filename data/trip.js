export const trip = {
  meta: {
    title: 'Zakynthos September Guide',
    destination: 'Zakynthos, Greece',
    month: 'September',
    startDate: '2026-09-01',
    endDate: '2026-09-08',
    travelers: 'Martin and girlfriend',
    subtitle: 'A romantic, practical phone guide for planning and slow island days.'
  },
  highlights: [
    'Sea caves, white cliffs, and turquoise swimming stops',
    'Sunset viewpoints and relaxed village dinners',
    'A quick-guide mode for transport, emergency notes, and saved places',
    'Editable planning lists for packing, bookings, budget, and open questions'
  ],
  quickLinks: [
    { label: 'Today plan', href: './itinerary.html' },
    { label: 'Map links', href: './map.html' },
    { label: 'Stay details', href: './stay.html' },
    { label: 'During trip', href: './guide.html' }
  ],
  flights: {
    outbound: 'Add outbound airport, date, airline, flight number, and time.',
    return: 'Add return airport, date, airline, flight number, and time.',
    notes: ['Add baggage allowance and check-in deadline.', 'Add airport transfer plan after booking.']
  },
  stay: {
    name: 'Hotel or apartment name placeholder',
    checkIn: 'Add check-in date and time',
    checkOut: 'Add check-out date and time',
    address: 'Add full address after booking',
    contact: 'Add phone, email, and booking link',
    bookingReference: 'Add booking reference',
    notes: ['Add parking or transfer details.', 'Add breakfast, pool, beach access, and late arrival notes.'],
    locationId: 'hotel'
  },
  locations: [
    {
      id: 'hotel',
      name: 'Hotel placeholder',
      area: 'Add area',
      category: 'Stay',
      mapQuery: 'Zakynthos Greece hotel',
      notes: 'Replace with the exact hotel name or address after booking.'
    },
    { id: 'navagio-viewpoint', name: 'Navagio viewpoint area', area: 'Northwest Zakynthos', category: 'Viewpoint', mapQuery: 'Navagio Viewpoint Zakynthos Greece' },
    { id: 'blue-caves', name: 'Blue Caves', area: 'North Zakynthos', category: 'Boat trip', mapQuery: 'Blue Caves Zakynthos Greece' },
    { id: 'porto-limnionas', name: 'Porto Limnionas', area: 'West coast', category: 'Beach', mapQuery: 'Porto Limnionas Zakynthos Greece' },
    { id: 'gerakas', name: 'Gerakas Beach', area: 'Vasilikos', category: 'Beach', mapQuery: 'Gerakas Beach Zakynthos Greece' },
    { id: 'bochali', name: 'Bochali', area: 'Above Zakynthos Town', category: 'Village', mapQuery: 'Bochali Zakynthos Greece' },
    { id: 'zakynthos-town', name: 'Zakynthos Town', area: 'East coast', category: 'Town', mapQuery: 'Zakynthos Town Greece' },
    { id: 'anafonitria', name: 'Anafonitria', area: 'Northwest inland', category: 'Village', mapQuery: 'Anafonitria Zakynthos Greece' }
  ],
  itinerary: [
    {
      id: 'day-1',
      label: 'Day 1',
      date: 'Arrival day',
      focus: 'Land, settle in, and keep the evening easy.',
      morning: { title: 'Travel', plan: 'Add outbound flight and airport plan.', notes: 'Keep essentials in hand luggage: passports, cards, charger, swimwear.' },
      afternoon: { title: 'Check in', plan: 'Pick up transfer or rental car, check in, and unpack.', locationIds: ['hotel'] },
      evening: { title: 'First sunset', plan: 'Choose an easy nearby dinner and a short walk.', notes: 'Add restaurant once the stay area is confirmed.' }
    },
    {
      id: 'day-2',
      label: 'Day 2',
      date: 'Editable date',
      focus: 'Beach day and low-pressure exploring.',
      morning: { title: 'Beach swim', plan: 'Start with a calm beach after breakfast.', locationIds: ['gerakas'] },
      afternoon: { title: 'Coffee and shade', plan: 'Slow lunch, beach time, and a rest back at the stay.' },
      evening: { title: 'Town or village dinner', plan: 'Dinner in Zakynthos Town or Bochali depending on energy.', locationIds: ['bochali', 'zakynthos-town'] }
    },
    {
      id: 'day-3',
      label: 'Day 3',
      date: 'Editable date',
      focus: 'Boat-day candidate.',
      morning: { title: 'Boat trip', plan: 'Use this day for Blue Caves or another sea-cave route if weather is good.', locationIds: ['blue-caves'] },
      afternoon: { title: 'Swim stops', plan: 'Add operator, meeting point, and route after booking.' },
      evening: { title: 'Simple dinner', plan: 'Plan an easy dinner near the hotel after a long sun day.' }
    },
    {
      id: 'day-4',
      label: 'Day 4',
      date: 'Editable date',
      focus: 'West coast cliffs and sunset.',
      morning: { title: 'Slow start', plan: 'Sleep in, breakfast, and pack water shoes if needed.' },
      afternoon: { title: 'Rocky cove swim', plan: 'Explore Porto Limnionas or another west coast swimming spot.', locationIds: ['porto-limnionas'] },
      evening: { title: 'Sunset viewpoint', plan: 'Pick a viewpoint or terrace dinner on the west side.', locationIds: ['navagio-viewpoint'] }
    },
    {
      id: 'day-5',
      label: 'Day 5',
      date: 'Editable date',
      focus: 'Flexible favorites day.',
      morning: { title: 'Repeat favorite', plan: 'Return to the place we liked most, or keep this as a rest morning.' },
      afternoon: { title: 'Village drive', plan: 'Add villages, shops, or olive-oil stops after research.', locationIds: ['anafonitria'] },
      evening: { title: 'Booked dinner', plan: 'Use this slot for a reservation once chosen.' }
    },
    {
      id: 'day-6',
      label: 'Day 6',
      date: 'Departure day',
      focus: 'Pack calmly and travel home.',
      morning: { title: 'Pack and check out', plan: 'Pack, settle hotel bill, and leave time for airport transfer.', locationIds: ['hotel'] },
      afternoon: { title: 'Airport', plan: 'Add airport timing and return flight details.' },
      evening: { title: 'Home', plan: 'Add arrival notes and transport home.' }
    }
  ],
  attractions: [
    { id: 'att-blue-caves', name: 'Blue Caves', category: 'Boat trip', area: 'North coast', summary: 'Classic September sea-cave outing when wind and water conditions are good.', bestFor: 'Clear-water photos, swimming stops, and a special half-day.', locationId: 'blue-caves', mustDo: true },
    { id: 'att-porto-limnionas', name: 'Porto Limnionas', category: 'Beach', area: 'West coast', summary: 'Rocky cove with deep blue water and a more dramatic coastline feel.', bestFor: 'Swimming, water shoes, lunch nearby, sunset-side exploring.', locationId: 'porto-limnionas', mustDo: true },
    { id: 'att-gerakas', name: 'Gerakas Beach', category: 'Beach', area: 'Vasilikos', summary: 'Long sandy beach area often associated with turtle nesting protection.', bestFor: 'A softer beach day and a quieter morning start.', locationId: 'gerakas' },
    { id: 'att-navagio-viewpoint', name: 'Navagio viewpoint area', category: 'Viewpoint', area: 'Northwest', summary: 'Cliff-view candidate for a photo stop; confirm access and safety before going.', bestFor: 'Views, not swimming. Check current local access rules before relying on it.', locationId: 'navagio-viewpoint' },
    { id: 'att-bochali', name: 'Bochali', category: 'Village', area: 'Above Zakynthos Town', summary: 'Hillside area with views over town, useful for a relaxed evening.', bestFor: 'Sunset drinks, town views, and a gentle dinner plan.', locationId: 'bochali' },
    { id: 'att-town', name: 'Zakynthos Town', category: 'Rainy day', area: 'East coast', summary: 'Good fallback for cafes, harbor walks, small museums, shops, and dinner.', bestFor: 'Rainy weather, arrival evening, or an easier no-driving plan.', locationId: 'zakynthos-town' }
  ],
  restaurants: [
    { id: 'food-stay-area', name: 'First-night place near hotel', area: 'Add stay area', status: 'placeholder', cuisine: 'Greek / easy dinner', notes: 'Pick after hotel is confirmed. Prioritize walkable, simple, and open late.', locationId: 'hotel' },
    { id: 'food-sunset-dinner', name: 'Sunset dinner wishlist', area: 'West coast or Bochali', status: 'wishlist', cuisine: 'Greek seafood or mezze', notes: 'Find one romantic reservation candidate with a view.', locationId: 'bochali' },
    { id: 'food-town', name: 'Zakynthos Town dinner option', area: 'Zakynthos Town', status: 'wishlist', cuisine: 'Flexible', notes: 'Good backup for shopping, cafes, and a harbor walk.', locationId: 'zakynthos-town' }
  ],
  planning: {
    checklist: [
      { id: 'book-flights', text: 'Book flights and add numbers/times', status: 'placeholder' },
      { id: 'book-stay', text: 'Book hotel or apartment and add check-in details', status: 'placeholder' },
      { id: 'transport', text: 'Decide rental car, taxi, or transfer plan', status: 'planned' },
      { id: 'boat-trip', text: 'Choose boat-trip day after checking weather window', status: 'wishlist' },
      { id: 'restaurants', text: 'Pick one romantic dinner reservation', status: 'wishlist' },
      { id: 'insurance', text: 'Add travel insurance and emergency contacts', status: 'placeholder' }
    ],
    packing: ['Passports and travel documents', 'European health card / insurance info', 'Swimwear and beach towel', 'Water shoes for rocky coves', 'Light evening clothes', 'Sun protection and sunglasses', 'Chargers and power bank', 'Small day bag', 'Medication and basic first aid'],
    budgetNotes: ['Add flight total after booking.', 'Add stay total after booking.', 'Add daily food estimate.', 'Add boat trip and transport estimates.', 'Keep cash/card notes here.'],
    openQuestions: ['Which area should we stay in?', 'Do we want a rental car for all days or only selected days?', 'Which day should be the boat trip weather window?', 'Which dinner should be booked in advance?']
  },
  duringTrip: {
    emergency: ['Emergency number: add local emergency details before departure.', 'Hotel contact: add phone and address after booking.', 'Insurance contact: add policy and phone number.', 'Nearest pharmacy/medical option: add based on stay area.'],
    transport: ['Airport transfer: add pickup point and driver/contact.', 'Rental car: add provider, pickup/dropoff time, fuel policy, and parking notes.', 'Taxi backup: add reliable taxi number once known.'],
    dailyEssentials: ['Water, sunscreen, sunglasses, charger, cash/card, room key.', 'Water shoes and towel for rocky swimming spots.', 'Check wind/sea conditions before boat or west-coast swim days.'],
    savedPlaces: ['Use favorites on attraction, restaurant, and map cards to build the day list.', 'Add quick notes from the phone while traveling.']
  }
};
