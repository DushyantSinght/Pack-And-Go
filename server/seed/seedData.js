// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB } from '../config/db.js';
import {
  User,
  MoveBooking,
  LuggagePassport,
  MarketplaceItem,
  PooledCorridor,
  CampusHub
} from '../models/index.js';
import { ensureDemoAccounts } from './demoAccounts.js';

export const seedDatabase = async (force = false) => {
  try {
    const userCount = await User.countDocuments();
    if (!force && userCount > 0) {
      console.log(`ℹ️ Database already populated (${userCount} users found). Skipping seed.`);
      return { seeded: false, message: 'Database already populated' };
    }

    console.log('🌱 Starting MongoDB database seeding...');

    if (force) {
      await User.deleteMany({});
      await MoveBooking.deleteMany({});
      await LuggagePassport.deleteMany({});
      await MarketplaceItem.deleteMany({});
      await PooledCorridor.deleteMany({});
      await CampusHub.deleteMany({});
      await mongoose.connection.collection('conversations').deleteMany({}).catch(() => {});
      await mongoose.connection.collection('messages').deleteMany({}).catch(() => {});
      console.log('🧹 Cleared existing collections.');
    }

    // 1. Seed Users
    const users = await User.insertMany([
      {
        name: 'Dushyant Singh',
        email: 'dushyant@packandgo.in',
        phone: '9876543210',
        userType: 'student',
        college: 'BITS Pilani',
        society: 'Prestige Falcon City, Bengaluru',
        escrowWalletBalance: 5000,
        tripsCompleted: 3
      },
      {
        name: 'Aman Verma',
        email: 'aman.du@gmail.com',
        phone: '9811044219',
        userType: 'student',
        college: 'Delhi University (SRCC)',
        society: 'Kamla Nagar Hostel Hub',
        escrowWalletBalance: 1200,
        tripsCompleted: 1
      },
      {
        name: 'Priya Mehta',
        email: 'priya.m@techcorp.in',
        phone: '9845211029',
        userType: 'professional',
        company: 'Flipkart',
        society: 'Indiranagar 100ft Rd',
        escrowWalletBalance: 3400,
        tripsCompleted: 2
      },
      {
        name: 'Manjunath Gowda',
        email: 'captain.manju@packandgo.in',
        phone: '+91 98452 11029',
        userType: 'captain',
        tripsCompleted: 1420,
        rating: 4.9,
        escrowWalletBalance: 18450
      },
      {
        name: 'Rajesh Verma',
        email: 'rajesh.v@outlook.com',
        phone: '9920144012',
        userType: 'parent'
      }
    ]);
    console.log(`✅ Seeded ${users.length} users.`);

    // 2. Seed Initial Move Booking
    const moveBooking = await MoveBooking.create({
      bookingId: 'PKG-MOV-2026-9214',
      userEmail: 'dushyant@packandgo.in',
      userName: 'Dushyant Singh',
      userPhone: '9876543210',
      origin: 'HSR Layout Sector 1, Bengaluru',
      destination: 'Hope Farm, Whitefield, Bengaluru',
      presetId: 'studio-pg',
      items: [
        { id: 1, name: 'Single Bed & Foam Mattress', category: 'Furniture', cuFt: 35, weightKg: 40, fragile: false, box: [15, 45, 40, 35] },
        { id: 2, name: 'Study Desk (Laminate)', category: 'Furniture', cuFt: 18, weightKg: 22, fragile: false, box: [60, 40, 25, 30] },
        { id: 3, name: 'Ergonomic Mesh Chair', category: 'Furniture', cuFt: 12, weightKg: 14, fragile: false, box: [55, 60, 18, 25] },
        { id: 4, name: '27" Monitor & Stand', category: 'Electronics', cuFt: 6, weightKg: 8, fragile: true, box: [65, 35, 15, 18] },
        { id: 5, name: 'Mini Bar Refrigerator', category: 'Appliances', cuFt: 14, weightKg: 28, fragile: true, box: [82, 50, 16, 28] },
        { id: 6, name: 'Wardrobe Carton (Clothes)', category: 'Cartons', cuFt: 15, weightKg: 35, fragile: false, box: [20, 20, 20, 25] },
        { id: 7, name: '2x Medium Books & Study Boxes', category: 'Cartons', cuFt: 15, weightKg: 43, fragile: false, box: [40, 75, 20, 18] }
      ],
      totalCuFt: 115,
      estimatedWeightKg: 190,
      cartons: { small: 2, medium: 4, large: 2, wardrobe: 1 },
      labour: '1 Move Captain + 1 Helper (2.5 hrs)',
      vehicle: 'Tata Ace Mini-Truck',
      soloPrice: 5800,
      pooledPrice: 3190,
      savingsPercent: 45,
      isPriceLocked: true,
      transitStatus: 'In Transit • 34 km/h • Geofence Validated',
      selectedTheme: 'theme-urban-tech',
      selectedEssentials: ['ess-water', 'ess-bedding', 'ess-grocery'],
      escrowStatus: 'escrow_locked'
    });
    console.log(`✅ Seeded active move booking: ${moveBooking.bookingId}`);

    // 3. Seed Luggage Passports
    const passports = await LuggagePassport.insertMany([
      {
        boxId: 'PKG-BOX-8921-FRAGILE',
        bookingId: 'PKG-MOV-2026-9214',
        userEmail: 'dushyant@packandgo.in',
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
        qrDataString: 'PACKANDGO://PASSPORT/BOX-8921?hash=e8b91a&audit=passed',
        status: 'in_transit'
      },
      {
        boxId: 'PKG-BOX-8922-WARDROBE',
        bookingId: 'PKG-MOV-2026-9214',
        userEmail: 'dushyant@packandgo.in',
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
        qrDataString: 'PACKANDGO://PASSPORT/BOX-8922?hash=c412e0&audit=passed',
        status: 'delivered'
      },
      {
        boxId: 'PKG-BOX-8923-KITCHEN',
        bookingId: 'PKG-MOV-2026-9214',
        userEmail: 'dushyant@packandgo.in',
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
        qrDataString: 'PACKANDGO://PASSPORT/BOX-8923?hash=a7702f&audit=passed',
        status: 'in_transit'
      },
      {
        boxId: 'PKG-BOX-8924-BOOKS',
        bookingId: 'PKG-MOV-2026-9214',
        userEmail: 'dushyant@packandgo.in',
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
        qrDataString: 'PACKANDGO://PASSPORT/BOX-8924?hash=b3387c&audit=passed',
        status: 'delivered'
      }
    ]);
    console.log(`✅ Seeded ${passports.length} luggage passports.`);

    // 4. Seed Circular Marketplace Items
    const marketplaceItems = await MarketplaceItem.insertMany([
      {
        itemId: 'circ-1',
        title: 'Wakefit Dual-Comfort Queen Orthopedic Mattress',
        society: 'Prestige Falcon City, Tower 3, Bengaluru',
        category: 'Furniture',
        seller: { name: 'Ananya Roy (Moving to London)', phone: '+91 98765 11029', userType: 'outgoing' },
        price: 3200,
        originalPrice: 11500,
        condition: 'Used 8 months • Spotless with protector',
        handoffType: 'Direct In-Building P2P',
        zeroTransitFee: true,
        co2SavedKg: 42,
        imageUrl: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=600&q=80',
        description: 'Outgoing tenant passing directly to incoming resident in Prestige Falcon City. Save truck transit fees entirely!',
        status: 'available'
      },
      {
        itemId: 'circ-2',
        title: 'Green Soul Monster Ergonomic Chair (Black & Teal)',
        society: 'Stanza Living Boston House, Koramangala',
        category: 'Furniture',
        seller: { name: 'Tanmay Jain (Graduating)', phone: '+91 98110 44219', userType: 'outgoing' },
        price: 2400,
        originalPrice: 8999,
        condition: 'Excellent • Tilt & Lumbar working perfectly',
        handoffType: 'Direct Campus P2P',
        zeroTransitFee: true,
        co2SavedKg: 28,
        imageUrl: 'https://images.unsplash.com/photo-1580481077194-46327b876404?auto=format&fit=crop&w=600&q=80',
        description: 'Perfect for WFH or college study. Hand off right in the dorm common room.',
        status: 'available'
      },
      {
        itemId: 'circ-3',
        title: 'Haier 53L Single Door Direct-Cool Mini Refrigerator',
        society: 'Zolo Amber Coliving, HSR Layout Sector 2',
        category: 'Appliances',
        seller: { name: 'Karthik Nair (Relocating to Gurgaon)', phone: '+91 99201 44012', userType: 'outgoing' },
        price: 4200,
        originalPrice: 10800,
        condition: 'Very Good • Chill tray & icebox working',
        handoffType: 'Pack&Go Instant Buyback / Resale',
        zeroTransitFee: false,
        co2SavedKg: 55,
        imageUrl: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&w=600&q=80',
        description: 'Tested and certified by Pack&Go technician. 6 months operational guarantee.',
        status: 'available'
      },
      {
        itemId: 'circ-4',
        title: 'IKEA Linnmon 120x60cm White Study Desk + Cable Net',
        society: 'DLF Phase 3, U Block, Gurgaon',
        category: 'Furniture',
        seller: { name: 'Simran Walia', phone: '+91 98450 99881', userType: 'outgoing' },
        price: 1300,
        originalPrice: 3800,
        condition: 'Like New • Dismantled with Allen key & screws',
        handoffType: 'Direct In-Building P2P',
        zeroTransitFee: true,
        co2SavedKg: 19,
        imageUrl: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=600&q=80',
        description: 'Sturdy IKEA desk. Can be carried up the elevator without a truck.',
        status: 'available'
      },
      {
        itemId: 'circ-5',
        title: 'Bajaj 20L Solo Microwave Oven (White)',
        society: 'IIT Powai Campus, Hostel 16',
        category: 'Appliances',
        seller: { name: 'Vikramaditya S.', phone: '+91 98200 12345', userType: 'outgoing' },
        price: 2200,
        originalPrice: 6200,
        condition: 'Good • Microwave glass turntable intact',
        handoffType: 'Direct Campus P2P',
        zeroTransitFee: true,
        co2SavedKg: 31,
        imageUrl: 'https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?auto=format&fit=crop&w=600&q=80',
        description: 'Heats food and noodles instantly. Available for immediate handover at campus hub.',
        status: 'available'
      }
    ]);
    console.log(`✅ Seeded ${marketplaceItems.length} circular marketplace listings.`);

    // 5. Seed Corridors
    const corridors = await PooledCorridor.insertMany([
      {
        corridorId: 'blr-koramangala-whitefield',
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
        corridorId: 'del-campus-cybercity',
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
    ]);
    console.log(`✅ Seeded ${corridors.length} corridors.`);

    // 6. Seed Campus Hubs
    const hubs = await CampusHub.insertMany([
      {
        hubId: 'hub-du',
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
        hubId: 'hub-iitb',
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
        hubId: 'hub-manipal',
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
        hubId: 'hub-bits',
        name: 'BITS Pilani (Vidya Vihar Campus)',
        city: 'Pilani, Rajasthan',
        activeStudentsJoining: 29,
        discountTier: 40,
        nextTierTarget: 35,
        pooledFleetCount: 3,
        pickupHubLocation: 'Student Activity Centre (SAC)',
        dates: 'May 15 - May 24'
      }
    ]);
    console.log(`✅ Seeded ${hubs.length} campus hubs.`);

    await ensureDemoAccounts();
    console.log('🔑 All seeded accounts can sign in with password "demo1234".');
    console.log('🎉 MongoDB database successfully seeded!');
    return { seeded: true, users: users.length, passports: passports.length, marketplace: marketplaceItems.length };
  } catch (err) {
    console.error('❌ Error seeding database:', err);
    throw err;
  }
};

// If run directly from CLI
if (process.argv[1]?.endsWith('seedData.js')) {
  (async () => {
    await connectDB();
    const force = process.argv.includes('--force');
    await seedDatabase(force);
    await mongoose.disconnect();
    process.exit(0);
  })();
}
