// Pack&Go Comprehensive Realistic Mock Data & Logic Engine

export const ROOM_PRESETS = [
  {
    id: 'studio-pg',
    name: 'PG / Studio Room',
    tag: 'Popular for Students & Interns',
    previewUrl: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80',
    totalCuFt: 115,
    estimatedWeightKg: 190,
    items: [
      { id: 1, name: 'Single Bed & Foam Mattress', category: 'Furniture', cuFt: 35, weightKg: 40, fragile: false, box: [15, 45, 40, 35] },
      { id: 2, name: 'Study Desk (Laminate)', category: 'Furniture', cuFt: 18, weightKg: 22, fragile: false, box: [60, 40, 25, 30] },
      { id: 3, name: 'Ergonomic Mesh Chair', category: 'Furniture', cuFt: 12, weightKg: 14, fragile: false, box: [55, 60, 18, 25] },
      { id: 4, name: '27" Monitor & Stand', category: 'Electronics', cuFt: 6, weightKg: 8, fragile: true, box: [65, 35, 15, 18] },
      { id: 5, name: 'Mini Bar Refrigerator', category: 'Appliances', cuFt: 14, weightKg: 28, fragile: true, box: [82, 50, 16, 28] },
      { id: 6, name: 'Wardrobe Carton (Clothes)', category: 'Cartons', cuFt: 15, weightKg: 35, fragile: false, box: [20, 20, 20, 25] },
      { id: 7, name: '2x Medium Books & Study Boxes', category: 'Cartons', cuFt: 15, weightKg: 43, fragile: false, box: [40, 75, 20, 18] }
    ],
    recommendedCartons: { small: 2, medium: 4, large: 2, wardrobe: 1 },
    labourNeeded: '1 Move Captain + 1 Helper (2.5 hrs)',
    recommendedVehicle: 'Tata Ace Mini-Truck',
    soloPrice: 5800,
    pooledPrice: 3190,
    savingsPercent: 45
  },
  {
    id: '1bhk-flat',
    name: '1 BHK Apartment',
    tag: 'Working Professionals',
    previewUrl: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80',
    totalCuFt: 245,
    estimatedWeightKg: 460,
    items: [
      { id: 1, name: 'Queen Bed with Hydraulic Storage', category: 'Furniture', cuFt: 65, weightKg: 85, fragile: false, box: [10, 40, 45, 45] },
      { id: 2, name: '3-Seater Fabric Sofa', category: 'Furniture', cuFt: 45, weightKg: 55, fragile: false, box: [55, 45, 35, 35] },
      { id: 3, name: 'Top-Load Washing Machine', category: 'Appliances', cuFt: 22, weightKg: 45, fragile: true, box: [85, 30, 14, 30] },
      { id: 4, name: '240L Double Door Fridge', category: 'Appliances', cuFt: 32, weightKg: 65, fragile: true, box: [75, 15, 18, 45] },
      { id: 5, name: '43" Smart TV & Soundbar', category: 'Electronics', cuFt: 12, weightKg: 18, fragile: true, box: [50, 15, 22, 20] },
      { id: 6, name: 'Microwave Oven & Stand', category: 'Appliances', cuFt: 8, weightKg: 20, fragile: true, box: [30, 25, 15, 18] },
      { id: 7, name: '8x Large Moving Cartons', category: 'Cartons', cuFt: 61, weightKg: 172, fragile: false, box: [20, 65, 35, 28] }
    ],
    recommendedCartons: { small: 4, medium: 8, large: 6, wardrobe: 2 },
    labourNeeded: '1 Move Captain + 2 Helpers (4 hrs)',
    recommendedVehicle: 'Ashok Leyland Dost / Mahindra Maxi',
    soloPrice: 9400,
    pooledPrice: 5170,
    savingsPercent: 45
  },
  {
    id: 'hostel-dorm',
    name: 'Hostel / Dorm Transition',
    tag: 'Campus Bulk Move',
    previewUrl: 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=800&q=80',
    totalCuFt: 65,
    estimatedWeightKg: 110,
    items: [
      { id: 1, name: 'Single Mattress & Bedding Roll', category: 'Furniture', cuFt: 18, weightKg: 15, fragile: false, box: [15, 50, 35, 30] },
      { id: 2, name: 'Dorm Study Desk & Chair', category: 'Furniture', cuFt: 15, weightKg: 18, fragile: false, box: [55, 45, 25, 25] },
      { id: 3, name: 'Acoustic Guitar in Hard Case', category: 'Musical', cuFt: 6, weightKg: 8, fragile: true, box: [82, 35, 12, 40] },
      { id: 4, name: '3x Heavy Academic Book Boxes', category: 'Cartons', cuFt: 14, weightKg: 48, fragile: false, box: [35, 65, 25, 20] },
      { id: 5, name: '2x Large Suitcases & Duffel', category: 'Luggage', cuFt: 12, weightKg: 21, fragile: false, box: [15, 25, 20, 25] }
    ],
    recommendedCartons: { small: 3, medium: 3, large: 1, wardrobe: 1 },
    labourNeeded: '1 Move Captain + 1 Helper (1.5 hrs)',
    recommendedVehicle: 'Electric Cargo Trike / Tata Ace Shared',
    soloPrice: 3800,
    pooledPrice: 1900,
    savingsPercent: 50
  }
];

export const VOICE_SAMPLE_TRANSCRIPTS = [
  {
    id: 'v1',
    label: 'Bengaluru Student Room Shift',
    text: 'Moving out of Koramangala 4th Block to Whitefield. I have a queen foam mattress, one study desk with an ergonomic chair, dual 27-inch monitors in bubble wrap, six cartons of clothes, and a microwave oven.',
    detectedItems: ['Queen Foam Mattress', 'Study Desk', 'Ergonomic Chair', 'Dual 27-inch Monitors', '6x Clothes Cartons', 'Microwave Oven'],
    cuFt: 128,
    labour: '2 Men, 3 Hours',
    cartons: { small: 2, medium: 6, large: 2, wardrobe: 1 },
    pooledPrice: 3450,
    soloPrice: 6500
  },
  {
    id: 'v2',
    label: 'Delhi-NCR Campus to Job Relocation',
    text: 'Shifting from DU North Campus to Cyber City Gurgaon. One single bed frame, mattress, acoustic guitar, 4 heavy academic book cartons, one desktop PC, and 2 suitcases.',
    detectedItems: ['Single Bed Frame', 'Single Mattress', 'Acoustic Guitar', '4x Book Cartons', 'Desktop PC', '2x Suitcases'],
    cuFt: 88,
    labour: '2 Men, 2 Hours',
    cartons: { small: 4, medium: 3, large: 1, wardrobe: 0 },
    pooledPrice: 2850,
    soloPrice: 5600
  },
  {
    id: 'v3',
    label: 'Mumbai IIT Powai to BKC Shift',
    text: 'Powai Hostel to BKC apartment. Study table, bookshelf, mini fridge, 5 cartons of books and wardrobe, cycle, and an iron board.',
    detectedItems: ['Study Table', 'Bookshelf', 'Mini Fridge', '5x Cartons', 'Bicycle', 'Iron Board'],
    cuFt: 105,
    labour: '2 Men, 2.5 Hours',
    cartons: { small: 3, medium: 4, large: 2, wardrobe: 1 },
    pooledPrice: 3200,
    soloPrice: 6200
  }
];

export const ACTIVE_POOLED_CORRIDORS = [
  {
    id: 'blr-koramangala-whitefield',
    city: 'Bengaluru',
    name: 'Tech Express: Koramangala ➔ Indiranagar ➔ Marathahalli ➔ Whitefield',
    vehicle: 'Tata Ace 14ft EV Cargo (Shared 350 cu. ft.)',
    driver: {
      name: 'Manjunath Gowda',
      rating: 4.9,
      phone: '+91 98452 11029',
      tripsCompleted: 1420,
      photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80'
    },
    totalCapacityCuFt: 350,
    currentLoads: [
      { user: 'Rahul S. (DU Alum)', cuFt: 110, percentage: 31, color: '#10B981', from: 'Koramangala 4th Block', to: 'Prestige Shantiniketan' },
      { user: 'Priya M. (Flipkart)', cuFt: 95, percentage: 27, color: '#6366F1', from: 'Indiranagar 100ft Rd', to: 'Marathahalli Bridge' },
      { user: 'You (Active Booking)', cuFt: 115, percentage: 33, color: '#06B6D4', from: 'HSR Layout Sector 1', to: 'Hope Farm Whitefield' }
    ],
    remainingCapacityCuFt: 30,
    discountRate: 45,
    estimatedDeparture: 'Today, 02:30 PM',
    liveStatus: 'En-route to Dropoff #1 (Geofence Verified)',
    currentSpeedKmH: 34,
    temperatureCelsius: 24,
    shockAlertCount: 0,
    stops: [
      { id: 1, type: 'pickup', location: 'Koramangala 4th Block', time: '10:15 AM', status: 'Completed', otpVerified: true },
      { id: 2, type: 'pickup', location: 'HSR Layout Sector 1 (Your Origin)', time: '11:30 AM', status: 'Completed', otpVerified: true },
      { id: 3, type: 'dropoff', location: 'Marathahalli Bridge', time: '01:45 PM', status: 'Current Stop', otpVerified: false },
      { id: 4, type: 'dropoff', location: 'Hope Farm Whitefield (Your Destination)', time: '03:15 PM', status: 'Upcoming', otpVerified: false }
    ]
  },
  {
    id: 'del-campus-cybercity',
    city: 'Delhi-NCR',
    name: 'Campus Corridor: DU North Campus ➔ CP ➔ Cyber City Gurgaon',
    vehicle: 'Ashok Leyland Dost CNG (420 cu. ft.)',
    driver: {
      name: 'Harpreet Singh',
      rating: 4.85,
      phone: '+91 98110 44219',
      tripsCompleted: 980,
      photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80'
    },
    totalCapacityCuFt: 420,
    currentLoads: [
      { user: 'Aman V. (SRCC)', cuFt: 130, percentage: 31, color: '#10B981', from: 'Kamla Nagar', to: 'DLF Phase 3' },
      { user: 'Sneha K. (Hindu Col)', cuFt: 140, percentage: 33, color: '#6366F1', from: 'Hudson Lane', to: 'Sector 43 Gurgaon' },
      { user: 'You (Active Booking)', cuFt: 110, percentage: 26, color: '#06B6D4', from: 'Malka Ganj', to: 'Sushant Lok 1' }
    ],
    remainingCapacityCuFt: 40,
    discountRate: 50,
    estimatedDeparture: 'Tomorrow, 09:00 AM',
    liveStatus: 'Consolidation in Progress (85% filled)',
    currentSpeedKmH: 0,
    temperatureCelsius: 22,
    shockAlertCount: 0,
    stops: [
      { id: 1, type: 'pickup', location: 'Kamla Nagar DU', time: '09:00 AM', status: 'Scheduled', otpVerified: false },
      { id: 2, type: 'pickup', location: 'Hudson Lane', time: '10:00 AM', status: 'Scheduled', otpVerified: false },
      { id: 3, type: 'dropoff', location: 'DLF Phase 3 Gurgaon', time: '01:00 PM', status: 'Scheduled', otpVerified: false }
    ]
  }
];

export const DIGITAL_LUGGAGE_PASSPORTS = [
  {
    id: 'PKG-BOX-8921-FRAGILE',
    boxNumber: 'Box 01 of 05',
    category: 'High-Value Electronics',
    label: '4K Monitor, Mechanical Keyboard & Camera Gear',
    fragile: true,
    conditionAtOrigin: 'Mint / Factory Cushioned (Pre-move Audit Certified)',
    conditionAtDropoff: 'Pending Delivery Audit',
    boxSize: 'Medium Sturdy Heavy-Duty (18" x 14" x 12")',
    sealStatus: 'Tamper-Evident RFID Tape Intact (#TX-9941)',
    preMovePhotoUrl: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=600&q=80',
    postMovePhotoUrl: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=600&q=80',
    itemsContained: [
      'LG UltraFine 27" 4K HDR Monitor',
      'Keychron Q1 Pro Mechanical Keyboard',
      'Sony Alpha Mirrorless Lens in Padded Pouch',
      'Anker 100W GaN Charging Station & Cables'
    ],
    depositProtectionNote: 'Photographed & logged to prevent landlord/mover dispute. Valuation ₹64,000.',
    qrDataString: 'PACKANDGO://PASSPORT/BOX-8921?hash=e8b91a&audit=passed'
  },
  {
    id: 'PKG-BOX-8922-WARDROBE',
    boxNumber: 'Box 02 of 05',
    category: 'Wardrobe & Designer Wear',
    label: 'Formal Suits, Winter Jackets & Footwear',
    fragile: false,
    conditionAtOrigin: 'Clean / Vacuum Sealed & Barcoded',
    conditionAtDropoff: 'Delivered / Inspected & Verified',
    boxSize: 'Hanging Wardrobe Carton (24" x 20" x 45")',
    sealStatus: 'Seal #TX-9942 Verified at Geofence',
    preMovePhotoUrl: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=600&q=80',
    postMovePhotoUrl: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=600&q=80',
    itemsContained: [
      '2x Raymond Charcoal Blazers',
      '12x Formal & Casual Shirts',
      'Zara Winter Down Jacket',
      '3x Pairs Formal Shoes (Dust Bagged)'
    ],
    depositProtectionNote: 'Sealed against dust & moisture.',
    qrDataString: 'PACKANDGO://PASSPORT/BOX-8922?hash=c412e0&audit=passed'
  },
  {
    id: 'PKG-BOX-8923-KITCHEN',
    boxNumber: 'Box 03 of 05',
    category: 'Kitchenware & Ceramic',
    label: 'Coffee Machine, Air Fryer & Crockery',
    fragile: true,
    conditionAtOrigin: 'Double-Bubble Wrapped & Inspected',
    conditionAtDropoff: 'Pending Dropoff',
    boxSize: 'Cellular Divider Box (18" x 18" x 16")',
    sealStatus: 'Shockwatch Sensor Activated: Green (No drops)',
    preMovePhotoUrl: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=600&q=80',
    postMovePhotoUrl: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=600&q=80',
    itemsContained: [
      'DeLonghi Espresso Machine',
      'Philips Digital Air Fryer 4.1L',
      'Ceramic Dinnerware Set (6 plates, 6 bowls)',
      'Stainless Steel Induction Cookware'
    ],
    depositProtectionNote: 'Fragile handling protocol in effect.',
    qrDataString: 'PACKANDGO://PASSPORT/BOX-8923?hash=a7702f&audit=passed'
  },
  {
    id: 'PKG-BOX-8924-BOOKS',
    boxNumber: 'Box 04 of 05',
    category: 'Academic & Legal Docs',
    label: 'Degrees, Textbooks & Tech Reference',
    fragile: false,
    conditionAtOrigin: 'Waterproof Poly-Lined / Moisture Absorbers',
    conditionAtDropoff: 'Delivered',
    boxSize: 'Heavy-Load Small Box (14" x 12" x 10")',
    sealStatus: 'Tamper Seal Verified',
    preMovePhotoUrl: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=600&q=80',
    postMovePhotoUrl: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=600&q=80',
    itemsContained: [
      'Original B.Tech Degree & Marksheets (Fireproof pouch)',
      '14x Algorithms & Distributed Systems Books',
      'Personal Journals & Passport File'
    ],
    depositProtectionNote: 'High security document escrow tag #DOC-881.',
    qrDataString: 'PACKANDGO://PASSPORT/BOX-8924?hash=b3387c&audit=passed'
  }
];

export const CIRCULAR_MARKETPLACE_ITEMS = [
  {
    id: 'circ-1',
    title: 'Wakefit Dual-Comfort Queen Orthopedic Mattress',
    society: 'Prestige Falcon City, Tower 3, Bengaluru',
    category: 'Furniture',
    seller: 'Ananya Roy (Moving to London)',
    price: 3200,
    originalPrice: 11500,
    condition: 'Used 8 months • Spotless with protector',
    handoffType: 'Direct In-Building P2P',
    zeroTransitFee: true,
    co2SavedKg: 42,
    imageUrl: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=600&q=80',
    description: 'Outgoing tenant passing directly to incoming resident in Prestige Falcon City. Save truck transit fees entirely!'
  },
  {
    id: 'circ-2',
    title: 'Green Soul Monster Ergonomic Chair (Black & Teal)',
    society: 'Stanza Living Boston House, Koramangala',
    category: 'Furniture',
    seller: 'Tanmay Jain (Graduating)',
    price: 2400,
    originalPrice: 8999,
    condition: 'Excellent • Tilt & Lumbar working perfectly',
    handoffType: 'Direct Campus P2P',
    zeroTransitFee: true,
    co2SavedKg: 28,
    imageUrl: 'https://images.unsplash.com/photo-1580481077194-46327b876404?auto=format&fit=crop&w=600&q=80',
    description: 'Perfect for WFH or college study. Hand off right in the dorm common room.'
  },
  {
    id: 'circ-3',
    title: 'Haier 53L Single Door Direct-Cool Mini Refrigerator',
    society: 'Zolo Amber Coliving, HSR Layout Sector 2',
    category: 'Appliances',
    seller: 'Karthik Nair (Relocating to Gurgaon)',
    price: 4200,
    originalPrice: 10800,
    condition: 'Very Good • Chill tray & icebox working',
    handoffType: 'Pack&Go Instant Buyback / Resale',
    zeroTransitFee: false,
    co2SavedKg: 55,
    imageUrl: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&w=600&q=80',
    description: 'Tested by the seller before listing. Inspect it at handover before you pay.'
  },
  {
    id: 'circ-4',
    title: 'IKEA Linnmon 120x60cm White Study Desk + Cable Net',
    society: 'DLF Phase 3, U Block, Gurgaon',
    category: 'Furniture',
    seller: 'Simran Walia',
    price: 1300,
    originalPrice: 3800,
    condition: 'Like New • Dismantled with Allen key & screws',
    handoffType: 'Direct In-Building P2P',
    zeroTransitFee: true,
    co2SavedKg: 19,
    imageUrl: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=600&q=80',
    description: 'Sturdy IKEA desk. Can be carried up the elevator without a truck.'
  },
  {
    id: 'circ-5',
    title: 'Bajaj 20L Solo Microwave Oven (White)',
    society: 'IIT Powai Campus, Hostel 16',
    category: 'Appliances',
    seller: 'Vikramaditya S.',
    price: 2200,
    originalPrice: 6200,
    condition: 'Good • Microwave glass turntable intact',
    handoffType: 'Direct Campus P2P',
    zeroTransitFee: true,
    co2SavedKg: 31,
    imageUrl: 'https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?auto=format&fit=crop&w=600&q=80',
    description: 'Heats food and noodles instantly. Available for immediate handover at campus hub.'
  }
];

export const BUYBACK_DEVICES = [
  { id: 'mon', name: 'Computer Monitor (24" - 32")', baseQuote: 3500, maxQuote: 7500 },
  { id: 'app', name: 'Mini Refrigerator / Deep Freeze', baseQuote: 3200, maxQuote: 6000 },
  { id: 'mw', name: 'Microwave Oven (20L - 30L)', baseQuote: 1800, maxQuote: 3500 },
  { id: 'wm', name: 'Washing Machine (Semi / Fully Auto)', baseQuote: 3800, maxQuote: 8500 },
  { id: 'ac', name: 'Window / Split AC (1.0 - 1.5 Ton)', baseQuote: 6500, maxQuote: 14000 },
  { id: 'ch', name: 'Ergonomic Office Chair', baseQuote: 1500, maxQuote: 4500 }
];

export const THEMED_ROOMS = [
  {
    id: 'theme-italian',
    name: 'Italian Minimalist Studio',
    tagline: 'Warm terracotta, sleek walnut wood & brushed brass accents',
    rentalPricePerMonth: 1899,
    fullPurchasePrice: 19500,
    previewUrl: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80',
    features: [
      'Low-slung walnut bed frame with upholstered headboard',
      'Slim Italian reading sling chair in cognac faux leather',
      'Curved arc amber floor lamp with warm dimming',
      'Brushed brass valet coat rack & shoe plinth'
    ],
    idealFor: 'Design lovers, young consultants & designers'
  },
  {
    id: 'theme-japandi',
    name: 'Japandi Zen Sanctuary',
    tagline: 'Light oak, bamboo slat dividers & breathable natural linen',
    rentalPricePerMonth: 1699,
    fullPurchasePrice: 17200,
    previewUrl: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80',
    features: [
      'Platform bed with organic cotton linen duvet set',
      'Modular bamboo ladder shelf with ceramic planters',
      'Paper lantern pendant ambient lighting',
      'Low floor tea/study table with dual meditation poufs'
    ],
    idealFor: 'Students seeking peaceful focus & minimal clutter'
  },
  {
    id: 'theme-urban-tech',
    name: 'Urban Tech & Ergonomic',
    tagline: 'Electric standing desk, cable raceways & dual monitor arm',
    rentalPricePerMonth: 2199,
    fullPurchasePrice: 22800,
    previewUrl: 'https://images.unsplash.com/photo-1593062096033-9a26b09da705?auto=format&fit=crop&w=800&q=80',
    features: [
      'Dual-motor 140x70cm motorized height-adjustable standing desk',
      'Breathable Korean mesh ergonomic chair with 4D armrests',
      'Heavy-duty gas spring dual monitor arm with cable channels',
      'Matte acoustic wall hex panels & under-desk magnetic power dock'
    ],
    idealFor: 'Software developers, traders & remote creators'
  }
];

export const ARRIVAL_ESSENTIALS_KIT = [
  {
    id: 'ess-water',
    name: 'Bisleri / Aquaguard 20L Packaged Jar + Tap Stand',
    price: 90,
    tag: 'Arrival Lifesaver',
    timing: 'Delivered at T-0 (Instant Arrival)',
    description: 'Clean certified drinking water waiting on your kitchen counter the moment you unlock the door.'
  },
  {
    id: 'ess-bedding',
    name: 'Pack&Go Fresh Sleep Linen Bundle (Queen / Single)',
    price: 899,
    tag: 'Pre-Washed & Steamed',
    timing: 'Dressed on Bed before you arrive',
    description: '300-thread count cotton bedsheet, 2 plump pillows with covers, and a light microfiber all-season quilt.'
  },
  {
    id: 'ess-grocery',
    name: 'First-Night Emergency Grocery & Snack Hamper',
    price: 420,
    tag: 'Move-in Night Fuel',
    timing: 'Placed in Fridge/Kitchen',
    description: 'Instant noodles, gourmet masala tea & drip coffee bags, milk carton, cookies, bananas, paper towels, and toilet rolls.'
  },
  {
    id: 'ess-tiffin',
    name: '7-Day Chef-Curated Homestyle Tiffin Meal Subscription',
    price: 1299,
    tag: 'Pure Veg / Non-Veg options',
    timing: '1st hot meal lands 45 mins post-arrival',
    description: 'Lunch & dinner prepared by verified neighborhood home chefs with zero chemical additives.'
  }
];

export const POST_MOVE_ACCOMMODATIONS = [
  {
    id: 'acc-1',
    name: 'Stanza Living - Boston House',
    neighborhood: 'Koramangala 4th Block, Bengaluru',
    rent: 14800,
    deposit: 14800,
    type: 'Managed PG / Single & Double',
    mealPolicy: 'Pure Vegetarian Mess On-Site',
    vegScore: 98,
    nearbyVegRestaurants: 24,
    jainFoodAvailable: true,
    roommateMatchPct: 96,
    distanceToTechPark: '1.2 km to Embassy GolfLinks',
    amenities: ['High-speed Wi-Fi', 'Bi-weekly Housekeeping', 'Gym', 'Laundry'],
    imageUrl: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'acc-2',
    name: 'Zolo Amber Coliving Residences',
    neighborhood: 'HSR Layout Sector 2, Bengaluru',
    rent: 12500,
    deposit: 12500,
    type: 'Studio Apartment / Coliving',
    mealPolicy: 'Separated Veg & Non-Veg Kitchen Prep',
    vegScore: 86,
    nearbyVegRestaurants: 16,
    jainFoodAvailable: false,
    roommateMatchPct: 91,
    distanceToTechPark: '2.5 km to EcoSpace Bellandur',
    amenities: ['Smart TV', 'Terrace Cafe', 'Power Backup', 'RFID Entry'],
    imageUrl: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'acc-3',
    name: 'DLF Phase 3 Executive Shared 3BHK',
    neighborhood: 'Cyber City Belt, Gurgaon',
    rent: 16500,
    deposit: 16500,
    type: 'Private Room in Premium Gated 3BHK',
    mealPolicy: 'Strict Vegetarian Kitchen Rule',
    vegScore: 94,
    nearbyVegRestaurants: 19,
    jainFoodAvailable: true,
    roommateMatchPct: 89,
    distanceToTechPark: '0.8 km to Cyber Hub & Rapid Metro',
    amenities: ['Attached Balcony', 'Cook included in maintenance', 'Covered Parking'],
    imageUrl: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=600&q=80'
  }
];

export const UPKEEP_SERVICES = [
  {
    id: 'srv-cook',
    title: 'Verified Home Cook (Monthly or Weekend)',
    rating: 4.9,
    pricing: '₹499 for 2-Day Weekend Trial • ₹3,200/mo',
    duration: 'Breakfast & Dinner',
    description: 'Police-verified cook tailored to your culinary spices, diet (pure veg/Jain/high-protein), and meal schedule.'
  },
  {
    id: 'srv-clean',
    title: 'Deep Room & Bathroom Sanitization',
    rating: 4.85,
    pricing: '₹799 one-time post-move scrub',
    duration: '2.5 Hours',
    description: 'Industrial steam cleaning of tile grout, cupboards, windows, and disinfection before unpacking.'
  },
  {
    id: 'srv-laundry',
    title: 'Express Wash & Iron Subscription',
    rating: 4.8,
    pricing: '₹749 / month (Up to 18 kg)',
    duration: '24-hour turnaround',
    description: 'Doorstep bag collection with eco-detergents, steam press, and hanger delivery.'
  },
  {
    id: 'srv-storage',
    title: 'Smart QR Temporary Gap Storage',
    rating: 4.95,
    pricing: '₹149 / day for up to 10 cartons',
    duration: 'Flexible 1-30 days',
    description: 'When move-out and move-in dates do not align, your boxes stay in our camera-monitored, QR-tracked warehouse with auto-redelivery.'
  }
];

export const CAMPUS_HUBS = [
  {
    id: 'hub-du',
    name: 'Delhi University (North Campus Hub)',
    city: 'New Delhi',
    activeStudentsJoining: 42,
    discountTier: 50,
    nextTierTarget: 50,
    pooledFleetCount: 6,
    pickupHubLocation: 'Vishwavidyalaya Metro Parking / Miranda House Gate',
    dates: 'May 18 - May 26 (Semester End Transits)'
  },
  {
    id: 'hub-iitb',
    name: 'IIT Bombay (Powai Main Hub)',
    city: 'Mumbai',
    activeStudentsJoining: 36,
    discountTier: 45,
    nextTierTarget: 40,
    pooledFleetCount: 4,
    pickupHubLocation: 'Hostel 12-14 Circle / YP Gate',
    dates: 'June 01 - June 08'
  },
  {
    id: 'hub-manipal',
    name: 'Manipal Academy of Higher Education (MAHE)',
    city: 'Manipal, Karnataka',
    activeStudentsJoining: 58,
    discountTier: 50,
    nextTierTarget: 60,
    pooledFleetCount: 8,
    pickupHubLocation: 'MIT Food Court Hub & Student Plaza',
    dates: 'May 22 - May 30'
  },
  {
    id: 'hub-bits',
    name: 'BITS Pilani (Vidya Vihar Campus)',
    city: 'Pilani, Rajasthan',
    activeStudentsJoining: 29,
    discountTier: 40,
    nextTierTarget: 35,
    pooledFleetCount: 3,
    pickupHubLocation: 'Student Activity Centre (SAC)',
    dates: 'May 15 - May 24'
  }
];
