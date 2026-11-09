import { User } from './User.js';
import { MoveBooking, generateOtp } from './MoveBooking.js';
import { LuggagePassport } from './LuggagePassport.js';
import { MarketplaceItem } from './MarketplaceItem.js';
import { PooledCorridor } from './PooledCorridor.js';
import { CampusHub } from './CampusHub.js';
import { Conversation } from './Conversation.js';
import { Message } from './Message.js';
import { Notification } from './Notification.js';
import { DamageClaim } from './DamageClaim.js';
import { ServiceRequest } from './ServiceRequest.js';
import { ErrorLog } from './ErrorLog.js';

export {
  generateOtp,
  User,
  MoveBooking,
  LuggagePassport,
  MarketplaceItem,
  PooledCorridor,
  CampusHub,
  Conversation,
  Message,
  Notification,
  DamageClaim,
  ServiceRequest,
  ErrorLog
};

export const SCHEMA_DEFINITIONS = [
  {
    collection: 'users',
    model: 'User',
    description: 'Stores user profiles, roles (student, professional, captain, parent, outgoing), auth credentials, and escrow balances.',
    fields: [
      { name: '_id', type: 'ObjectId', description: 'Unique MongoDB identifier' },
      { name: 'name', type: 'String', required: true, description: 'Full name' },
      { name: 'email', type: 'String', required: true, unique: true, indexed: true, description: 'Email address' },
      { name: 'phone', type: 'String', indexed: true, description: 'Mobile number (used for click-to-call)' },
      { name: 'userType', type: 'String', enum: ['student', 'professional', 'captain', 'parent', 'outgoing', 'customer'], description: 'Active persona' },
      { name: 'college', type: 'String', description: 'Educational institution for student verification' },
      { name: 'society', type: 'String', description: 'Apartment society or gated community' },
      { name: 'escrowWalletBalance', type: 'Number', description: 'Escrow earnings/credits in INR' },
      { name: 'createdAt', type: 'Date', description: 'Timestamp of registration' }
    ]
  },
  {
    collection: 'movebookings',
    model: 'MoveBooking',
    description: 'Core move orders, AI estimates, inventory volume, pooled fleet pricing, OTPs, and transit status.',
    fields: [
      { name: 'bookingId', type: 'String', required: true, unique: true, description: 'Unique relocation identifier (e.g., PKG-MOV-2026-9214)' },
      { name: 'userEmail', type: 'String', required: true, description: 'Associated customer email' },
      { name: 'origin', type: 'String', required: true, description: 'Pickup location' },
      { name: 'destination', type: 'String', required: true, description: 'Dropoff location' },
      { name: 'presetId', type: 'String', description: 'Template preset (studio-pg, 1bhk-flat, hostel-dorm)' },
      { name: 'items', type: 'Array<Item>', description: 'List of inventory items with cu. ft. and fragility' },
      { name: 'totalCuFt', type: 'Number', required: true, description: 'Total volume in cubic feet' },
      { name: 'cartons', type: 'Object', description: 'Recommended packaging boxes (small, medium, large, wardrobe)' },
      { name: 'vehicle', type: 'String', description: 'Recommended pooled freight vehicle' },
      { name: 'soloPrice', type: 'Number', description: 'Standard solo charter truck price in INR' },
      { name: 'pooledPrice', type: 'Number', description: 'Shared corridor pooled price in INR' },
      { name: 'savingsPercent', type: 'Number', description: 'Calculated savings percentage' },
      { name: 'pickupOtp', type: 'String', description: 'Secure 6-digit OTP for origin loading verification' },
      { name: 'deliveryOtp', type: 'String', description: 'Secure 6-digit OTP for destination dropoff verification' },
      { name: 'transitStatus', type: 'String', description: 'Live telemetry and checkpoint progress' },
      { name: 'escrowStatus', type: 'String', enum: ['pending', 'escrow_locked', 'in_transit', 'released_to_captain'], description: 'Deposit and payment escrow status' }
    ]
  },
  {
    collection: 'luggagepassports',
    model: 'LuggagePassport',
    description: 'Digital Box Passports with QR codes, tamper-evident seals, pre-move / post-move audit photos.',
    fields: [
      { name: 'boxId', type: 'String', required: true, unique: true, description: 'Unique box barcode/tag (e.g., PKG-BOX-8921-FRAGILE)' },
      { name: 'bookingId', type: 'String', description: 'Parent move order reference' },
      { name: 'boxNumber', type: 'String', description: 'Box index (e.g., Box 01 of 05)' },
      { name: 'category', type: 'String', description: 'Category (Electronics, Kitchenware, Wardrobe)' },
      { name: 'label', type: 'String', description: 'Human-readable box description' },
      { name: 'fragile', type: 'Boolean', description: 'Fragile handling flag' },
      { name: 'sealStatus', type: 'String', description: 'Tamper-evident RFID seal verification state' },
      { name: 'preMovePhotoUrl', type: 'String', description: 'Photo taken before sealing at origin' },
      { name: 'postMovePhotoUrl', type: 'String', description: 'Photo taken upon delivery audit' },
      { name: 'itemsContained', type: 'Array<String>', description: 'List of packaged contents' },
      { name: 'qrDataString', type: 'String', description: 'Cryptographic payload encoded in the QR badge' }
    ]
  },
  {
    collection: 'marketplaceitems',
    model: 'MarketplaceItem',
    description: 'In-building P2P zero-transit reuse items passed directly between outgoing and incoming tenants.',
    fields: [
      { name: 'itemId', type: 'String', required: true, unique: true, description: 'Unique listing identifier' },
      { name: 'title', type: 'String', required: true, description: 'Listing title' },
      { name: 'society', type: 'String', required: true, description: 'Apartment complex / dorm location' },
      { name: 'category', type: 'String', required: true, description: 'Furniture, Appliances, Study' },
      { name: 'price', type: 'Number', required: true, description: 'Listing price in INR' },
      { name: 'co2SavedKg', type: 'Number', description: 'Calculated carbon emissions saved by avoiding transit' },
      { name: 'status', type: 'String', enum: ['available', 'claimed', 'sold'], description: 'Availability status' }
    ]
  },
  {
    collection: 'pooledcorridors',
    model: 'PooledCorridor',
    description: 'Active shared freight routes with real-time capacity fills, driver telemetry, and GPS checkpoints.',
    fields: [
      { name: 'corridorId', type: 'String', required: true, unique: true, description: 'Route corridor ID' },
      { name: 'city', type: 'String', required: true, description: 'Operating metro (Bengaluru, Delhi-NCR, Mumbai)' },
      { name: 'name', type: 'String', required: true, description: 'Corridor origin-to-destination corridor' },
      { name: 'vehicle', type: 'String', description: 'Vehicle model and specifications' },
      { name: 'driver', type: 'Object', description: 'Move captain profile and credentials' },
      { name: 'totalCapacityCuFt', type: 'Number', description: 'Total cargo volume' },
      { name: 'currentLoads', type: 'Array<Load>', description: 'Consolidated orders currently sharing space' },
      { name: 'stops', type: 'Array<Stop>', description: 'Sequence of pickup and dropoff waypoints' }
    ]
  },
  {
    collection: 'campushubs',
    model: 'CampusHub',
    description: 'University bulk-move consolidation hubs with group discount pooling tiers.',
    fields: [
      { name: 'hubId', type: 'String', required: true, unique: true, description: 'Campus hub code' },
      { name: 'name', type: 'String', required: true, description: 'College or university campus' },
      { name: 'city', type: 'String', required: true, description: 'City location' },
      { name: 'activeStudentsJoining', type: 'Number', description: 'Number of enrolled students in move pool' },
      { name: 'discountTier', type: 'Number', description: 'Current group discount percentage (up to 50%)' },
      { name: 'dates', type: 'String', description: 'Semester-end relocation schedule window' }
    ]
  },
  {
    collection: 'conversations',
    model: 'Conversation',
    description: 'Real-time 1:1 chat threads between customers, Move Captains and marketplace sellers.',
    fields: [
      { name: 'participants', type: 'Array<ObjectId>', required: true, indexed: true, description: 'Users in this thread (ref: users)' },
      { name: 'context', type: 'Object', description: 'What the chat is about (driver corridor or marketplace listing)' },
      { name: 'lastMessage', type: 'Object', description: 'Preview of the latest message for the inbox' },
      { name: 'unread', type: 'Map<String, Number>', description: 'Unread counts keyed by user id' }
    ]
  },
  {
    collection: 'messages',
    model: 'Message',
    description: 'Chat messages and call logs delivered over Socket.IO.',
    fields: [
      { name: 'conversation', type: 'ObjectId', required: true, indexed: true, description: 'Parent conversation' },
      { name: 'sender', type: 'ObjectId', required: true, description: 'Author (ref: users)' },
      { name: 'kind', type: 'String', enum: ['text', 'call'], description: 'Text message or call log entry' },
      { name: 'text', type: 'String', required: true, description: 'Message body' },
      { name: 'readBy', type: 'Array<ObjectId>', description: 'Users who have read the message' }
    ]
  }
];
