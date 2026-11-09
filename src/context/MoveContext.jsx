// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  ROOM_PRESETS,
  ACTIVE_POOLED_CORRIDORS,
  DIGITAL_LUGGAGE_PASSPORTS,
  CIRCULAR_MARKETPLACE_ITEMS,
  THEMED_ROOMS,
  ARRIVAL_ESSENTIALS_KIT
} from '../data/mockData';
import { api, tokenStorage } from '../services/api';

const MoveContext = createContext();

export const MoveProvider = ({ children }) => {
  // Navigation & Role
  const [activeTab, setActiveTab] = useState('estimator');
  const [activeRole, setActiveRole] = useState('customer'); // customer | captain | outgoing | parent
  const [themeMode, setThemeMode] = useState('dark');

  // Active Move State
  const [currentEstimate, setCurrentEstimate] = useState({
    bookingId: 'PKG-MOV-2026-9214',
    origin: 'HSR Layout Sector 1, Bengaluru',
    destination: 'Hope Farm, Whitefield, Bengaluru',
    presetId: 'studio-pg',
    items: ROOM_PRESETS[0].items,
    totalCuFt: ROOM_PRESETS[0].totalCuFt,
    estimatedWeightKg: ROOM_PRESETS[0].estimatedWeightKg,
    cartons: ROOM_PRESETS[0].recommendedCartons,
    labour: ROOM_PRESETS[0].labourNeeded,
    vehicle: ROOM_PRESETS[0].recommendedVehicle,
    soloPrice: ROOM_PRESETS[0].soloPrice,
    pooledPrice: ROOM_PRESETS[0].pooledPrice,
    savingsPercent: ROOM_PRESETS[0].savingsPercent,
    isPriceLocked: true,
    // Real codes come from the server for the signed-in owner only.
    pickupOtp: null,
    deliveryOtp: null,
    transitStatus: 'In Transit • 34 km/h • Geofence Validated',
    selectedTheme: 'theme-urban-tech',
    selectedEssentials: ['ess-water', 'ess-bedding', 'ess-grocery']
  });

  // Digital Luggage Passports
  const [passports, setPassports] = useState(DIGITAL_LUGGAGE_PASSPORTS);
  const [scannedBox, setScannedBox] = useState(null);

  // Circular Marketplace
  const [marketplaceItems, setMarketplaceItems] = useState(CIRCULAR_MARKETPLACE_ITEMS);
  const [carbonSavedTotalKg, setCarbonSavedTotalKg] = useState(142);

  // Active Corridors
  const [corridors, setCorridors] = useState(ACTIVE_POOLED_CORRIDORS);
  const [selectedCorridorId, setSelectedCorridorId] = useState('blr-koramangala-whitefield');

  // MongoDB Status State
  const [dbStatus, setDbStatus] = useState({ isConnected: false, dbName: 'packandgo', host: '127.0.0.1' });
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);

  // User Authentication — restore from token if present on page load
  const [user, setUser] = useState(() => {
    const token = tokenStorage.get();
    if (!token) return null;
    try {
      // Decode payload (middle segment of JWT) without verifying signature
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp * 1000 < Date.now()) { tokenStorage.clear(); return null; }
      return { _id: payload._id, email: payload.email, userType: payload.userType, isAuthenticated: true };
    } catch {
      tokenStorage.clear();
      return null;
    }
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login');

  // Notification Toast State
  const [toast, setToast] = useState(null);

  // Modals
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isDepositCertOpen, setIsDepositCertOpen] = useState(false);
  const [isDriverConsoleOpen, setIsDriverConsoleOpen] = useState(false);

  // ── Real bookings ────────────────────────────────────────────────
  const [myMoves, setMyMoves] = useState([]);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isMyMovesOpen, setIsMyMovesOpen] = useState(false);
  const [selectedMoveId, setSelectedMoveId] = useState(null);
  const [payingBooking, setPayingBooking] = useState(null);
  const [invoiceBooking, setInvoiceBooking] = useState(null);
  const [legalDoc, setLegalDoc] = useState(null); // 'terms' | 'privacy' | 'refunds' | null
  const [resetToken, setResetToken] = useState(null);

  const refreshMyMoves = async () => {
    if (!tokenStorage.get()) return [];
    try {
      const res = await api.getMyMoves();
      setMyMoves(res.moves || []);
      return res.moves || [];
    } catch {
      return [];
    }
  };
  const upsertMove = (move) => {
    setMyMoves((prev) => {
      const rest = prev.filter((m) => m.bookingId !== move.bookingId);
      return [move, ...rest].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    });
    setCurrentEstimate((prev) => (prev.bookingId === move.bookingId ? { ...prev, ...move } : prev));
  };

  const requireSignIn = (what) => {
    if (tokenStorage.get()) return true;
    showToast(`Please sign in to ${what}.`, 'info');
    setAuthModalMode('login');
    setIsAuthModalOpen(true);
    return false;
  };
  const openBooking = () => requireSignIn('book a move') && setIsBookingOpen(true);
  const openMyMoves = (bookingId = null) => {
    if (!requireSignIn('see your moves')) return;
    setSelectedMoveId(bookingId);
    setIsMyMovesOpen(true);
    refreshMyMoves();
  };

  const openInvoice = (booking = null) => {
    const b = booking && booking.bookingId ? booking : myMoves.find((m) => m.paymentDetails?.status === 'paid');
    if (!b) {
      showToast('Receipts are available once a booking is paid.', 'info');
      return;
    }
    setInvoiceBooking(b);
    setIsInvoiceModalOpen(true);
  };
  /** Pay for a specific booking; with none given, use the first booking awaiting payment. */
  const openPayment = (booking = null) => {
    if (!requireSignIn('pay')) return;
    const b = booking && booking.bookingId ? booking : myMoves.find((m) => m.status === 'pending_payment');
    if (!b) {
      showToast('Nothing to pay yet — book a move first.', 'info');
      setIsBookingOpen(true);
      return;
    }
    setPayingBooking(b);
    setIsPaymentModalOpen(true);
  };
  const openDepositCert = () => setIsDepositCertOpen(true);
  const openDriverConsole = () => setIsDriverConsoleOpen(true);
  const openDbModal = () => setIsDbModalOpen(true);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  /** Merge fresh profile data (e.g. captain approved) into the signed-in user. */
  const updateUser = (patch) => setUser((prev) => (prev ? { ...prev, ...patch, isAuthenticated: true } : prev));

  // Initial Sync from Real MongoDB Database
  useEffect(() => {
    const syncFromMongoDB = async () => {
      try {
        const statusRes = await api.getDBStatus();
        if (statusRes?.status) {
          setDbStatus(statusRes.status);
        }

        // Fetch Passports from MongoDB
        const passRes = await api.getPassports().catch(() => null);
        if (passRes?.passports && passRes.passports.length > 0) {
          setPassports(passRes.passports);
        }

        // Fetch Marketplace Items from MongoDB
        const marketRes = await api.getMarketplaceItems().catch(() => null);
        if (marketRes?.items && marketRes.items.length > 0) {
          setMarketplaceItems(marketRes.items);
          if (marketRes.totalCarbonSavedKg) {
            setCarbonSavedTotalKg(marketRes.totalCarbonSavedKg);
          }
        }

        // Fetch Corridors from MongoDB
        const corrRes = await api.getCorridors().catch(() => null);
        if (corrRes?.corridors && corrRes.corridors.length > 0) {
          setCorridors(corrRes.corridors.map((c) => ({ ...c, id: c.id || c.corridorId })));
        }

        // Fetch Move Booking from MongoDB
        const moveRes = await api.getCurrentMove().catch(() => null);
        if (moveRes?.move) {
          setCurrentEstimate((prev) => ({
            ...prev,
            ...moveRes.move
          }));
        }
      } catch (err) {
        console.warn('Initial MongoDB sync notice (using cached defaults):', err.message);
      }
    };

    syncFromMongoDB();
    if (user?._id) refreshMyMoves();
    else setMyMoves([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]);

  // Links from emails: ?verify=<token> and ?reset=<token>
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verify = params.get('verify');
    const reset = params.get('reset');
    if (!verify && !reset) return;
    window.history.replaceState({}, '', window.location.pathname);
    if (verify) {
      api.verifyEmail(verify)
        .then((res) => {
          showToast('✅ Email verified — you can book moves now.', 'success');
          setUser((prev) => (prev && res.user?._id === prev._id ? { ...prev, ...res.user, isAuthenticated: true } : prev));
        })
        .catch((e) => showToast(e.message, 'error'));
    }
    if (reset) {
      setResetToken(reset);
      setAuthModalMode('reset');
      setIsAuthModalOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A JWT restored from localStorage only carries id/email — load the full profile.
  useEffect(() => {
    if (!user?._id || user.name) return;
    api.getMe()
      .then((res) => {
        if (!res?.user) return;
        setUser((prev) => ({ ...prev, ...res.user, isAuthenticated: true }));
        if (res.user.userType === 'captain') setActiveRole('captain');
        if (res.user.userType === 'parent') setActiveRole('parent');
      })
      .catch(() => {
        tokenStorage.clear();
        setUser(null);
      });
  }, [user?._id, user?.name]);

  const login = async (credentials) => {
    // api.login stores the JWT and returns { user, token }
    const res = await api.login(credentials);
    const userData = { ...res.user, isAuthenticated: true };
    setUser(userData);
    if (userData.userType === 'captain') setActiveRole('captain');
    if (userData.userType === 'parent') setActiveRole('parent');
    return res;
  };

  const signup = async (userData) => {
    const res = await api.signup(userData);
    const newUser = { ...res.user, isAuthenticated: true, devVerifyLink: res.devVerifyLink };
    setUser(newUser);
    if (newUser.userType === 'captain') setActiveRole('captain');
    if (newUser.userType === 'parent') setActiveRole('parent');
    return res;
  };

  const logout = () => {
    api.logout(); // Clears JWT from localStorage
    setUser(null);
    setCurrentEstimate((prev) => ({ ...prev, pickupOtp: null, deliveryOtp: null }));
    setMyMoves([]);
    setIsMyMovesOpen(false);
    setActiveRole('customer');
    showToast('Logged out of Pack&Go.', 'info');
  };

  const openAuth = (mode = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Sync theme attribute to document root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeMode);
  }, [themeMode]);

  const toggleTheme = () => {
    setThemeMode((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Switch preset in AI estimator & sync with MongoDB
  const applyPreset = async (presetId) => {
    const preset = ROOM_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const updated = {
      presetId,
      items: preset.items,
      totalCuFt: preset.totalCuFt,
      estimatedWeightKg: preset.estimatedWeightKg,
      cartons: preset.recommendedCartons,
      labour: preset.labourNeeded,
      vehicle: preset.recommendedVehicle,
      soloPrice: preset.soloPrice,
      pooledPrice: preset.pooledPrice,
      savingsPercent: preset.savingsPercent,
      isPriceLocked: true
    };
    setCurrentEstimate((prev) => ({ ...prev, ...updated }));
    showToast(`Loaded the "${preset.name}" example — edit the items to match your home.`, 'info');

    try {
      await api.saveMoveEstimate({
        bookingId: currentEstimate.bookingId,
        userEmail: user?.email || 'dushyant@packandgo.in',
        ...updated
      });
    } catch (e) {
      console.warn('MongoDB move estimate sync notice:', e.message);
    }
  };

  // Apply voice transcript items
  const applyVoiceEstimate = async (transcriptObj) => {
    const updated = {
      totalCuFt: transcriptObj.cuFt,
      labour: transcriptObj.labour,
      cartons: transcriptObj.cartons,
      soloPrice: transcriptObj.soloPrice,
      pooledPrice: transcriptObj.pooledPrice,
      savingsPercent: Math.round(((transcriptObj.soloPrice - transcriptObj.pooledPrice) / transcriptObj.soloPrice) * 100)
    };
    setCurrentEstimate((prev) => ({ ...prev, ...updated }));
    showToast(`Voice Walkthrough parsed ${transcriptObj.detectedItems.length} items successfully!`, 'success');

    try {
      await api.saveMoveEstimate({
        bookingId: currentEstimate.bookingId,
        userEmail: user?.email || 'dushyant@packandgo.in',
        ...updated
      });
    } catch (e) {
      console.warn('MongoDB voice estimate sync notice:', e.message);
    }
  };

  /** Replace or extend the estimate's item list (AI scan, voice, manual edits) and derive totals. */
  const applyItems = (items, { append = false, label } = {}) => {
    setCurrentEstimate((prev) => {
      const base = append ? prev.items || [] : [];
      const all = [...base, ...items];
      // Simple shelf layout so the bounding-box overlay and truck visualiser can draw each item.
      let x = 2, y = 2, rowH = 0;
      const laidOut = all.map((it) => {
        const side = Math.max(8, Math.min(40, Math.sqrt(it.cuFt || 1) * 5));
        if (x + side > 98) { x = 2; y += rowH + 2; rowH = 0; }
        const boxPos = [x, Math.min(y, 90), side, Math.min(side, 98 - Math.min(y, 90))];
        x += side + 2;
        rowH = Math.max(rowH, side);
        return { ...it, box: it.box || boxPos };
      });
      const cuFt = Math.round(all.reduce((n, it) => n + (Number(it.cuFt) || 0), 0));
      const kg = Math.round(all.reduce((n, it) => n + (Number(it.weightKg) || 0), 0));
      const next = {
        ...prev,
        presetId: 'custom',
        items: laidOut,
        totalCuFt: cuFt,
        estimatedWeightKg: kg,
        cartons: { small: Math.ceil(cuFt / 60), medium: Math.ceil(cuFt / 30), large: Math.ceil(cuFt / 80), wardrobe: cuFt > 80 ? 1 : 0 },
        vehicle: cuFt <= 150 ? 'Tata Ace / 7ft mini-truck' : cuFt <= 400 ? '14ft truck' : '17ft+ truck',
        labour: cuFt <= 120 ? '1 Captain + 1 helper (~2 hrs)' : cuFt <= 350 ? '1 Captain + 2 helpers (~3 hrs)' : '1 Captain + 3 helpers (~5 hrs)'
      };
      api.saveMoveEstimate({ bookingId: prev.bookingId, items: next.items, totalCuFt: next.totalCuFt, estimatedWeightKg: next.estimatedWeightKg, cartons: next.cartons, vehicle: next.vehicle, labour: next.labour, presetId: 'custom' }).catch(() => {});
      return next;
    });
    if (label) showToast(label, 'success');
  };

  // Add box to passports & persist to MongoDB
  const addNewBoxPassport = async (boxData) => {
    const newBox = {
      boxId: `PKG-BOX-${Math.floor(1000 + Math.random() * 9000)}-CUSTOM`,
      boxNumber: `Box 0${passports.length + 1} of 0${passports.length + 1}`,
      category: boxData.category || 'General Household',
      label: boxData.label || 'Custom Packed Goods',
      fragile: !!boxData.fragile,
      conditionAtOrigin: 'Pre-Move Photographed & Sealed in MongoDB',
      conditionAtDropoff: 'Pending Delivery Audit',
      boxSize: boxData.boxSize || 'Medium Sturdy (18" x 14" x 12")',
      sealStatus: 'Tamper-Evident RFID Tape #TX-' + Math.floor(1000 + Math.random() * 9000),
      preMovePhotoUrl: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=600&q=80',
      postMovePhotoUrl: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=600&q=80',
      itemsContained: boxData.items || ['Packed essentials', 'Accessories'],
      depositProtectionNote: 'Protected under Pack&Go Deposit Escrow.',
      qrDataString: `PACKANDGO://PASSPORT/BOX-NEW?t=${Date.now()}&db=mongo`
    };

    setPassports((prev) => [newBox, ...prev]);
    showToast(`Box ${newBox.boxId} QR Passport saved to MongoDB!`, 'success');

    try {
      const res = await api.createPassport(boxData);
      if (res?.box) {
        setPassports((prev) => prev.map((b) => (b.boxId === newBox.boxId ? res.box : b)));
      }
    } catch (e) {
      console.warn('MongoDB passport save notice:', e.message);
    }
  };

  // Add Circular Marketplace item (outgoing tenant) & persist to MongoDB
  const addMarketplaceItem = async (item) => {
    const newItem = {
      itemId: `circ-${Date.now()}`,
      title: item.title,
      society: item.society || 'Stanza Living, Koramangala',
      category: item.category || 'Furniture',
      seller: item.seller || { name: 'You (Outgoing Resident)', phone: user?.phone || '+91 98765 43210' },
      price: Number(item.price),
      originalPrice: Number(item.originalPrice) || Number(item.price) * 2.5,
      condition: item.condition || 'Very Good',
      handoffType: 'Direct In-Building P2P',
      zeroTransitFee: true,
      co2SavedKg: Math.round(Number(item.price) / 100) + 15,
      imageUrl: item.imageUrl || 'https://images.unsplash.com/photo-1580481077194-46327b876404?auto=format&fit=crop&w=600&q=80',
      description: item.description || 'Outgoing tenant handoff. Zero transit emissions.',
      status: 'available'
    };

    setMarketplaceItems((prev) => [newItem, ...prev]);
    setCarbonSavedTotalKg((prev) => prev + newItem.co2SavedKg);
    showToast(`"${newItem.title}" listed in MongoDB Circular Marketplace!`, 'success');

    try {
      await api.createMarketplaceItem(newItem);
    } catch (e) {
      console.warn('MongoDB marketplace item save notice:', e.message);
    }
  };

  // Claim or Buy item & update MongoDB
  const claimMarketplaceItem = async (itemId) => {
    const item = marketplaceItems.find((i) => (i.itemId === itemId || i.id === itemId));
    if (!item) return;
    setMarketplaceItems((prev) => prev.filter((i) => (i.itemId !== itemId && i.id !== itemId)));
    setCarbonSavedTotalKg((prev) => prev + item.co2SavedKg);
    showToast(`Claimed "${item.title}"! Saved ${item.co2SavedKg} kg CO2 with zero-transit handoff.`, 'success');

    try {
      await api.claimMarketplaceItem(itemId);
    } catch (e) {
      console.warn('MongoDB claim notice:', e.message);
    }
  };

  // Toggle essentials add-on
  const toggleEssential = async (essentialId) => {
    const exists = currentEstimate.selectedEssentials.includes(essentialId);
    const updatedEssentials = exists
      ? currentEstimate.selectedEssentials.filter((id) => id !== essentialId)
      : [...currentEstimate.selectedEssentials, essentialId];

    setCurrentEstimate((prev) => ({ ...prev, selectedEssentials: updatedEssentials }));

    try {
      await api.saveMoveEstimate({
        bookingId: currentEstimate.bookingId,
        selectedEssentials: updatedEssentials
      });
    } catch (e) {
      console.warn('MongoDB essential update notice:', e.message);
    }
  };

  // Select theme
  const selectTheme = async (themeId) => {
    setCurrentEstimate((prev) => ({ ...prev, selectedTheme: themeId }));
    const themeObj = THEMED_ROOMS.find((t) => t.id === themeId);
    showToast(`Room setup theme set to "${themeObj?.name}"!`, 'info');

    try {
      await api.saveMoveEstimate({
        bookingId: currentEstimate.bookingId,
        selectedTheme: themeId
      });
    } catch (e) {
      console.warn('MongoDB theme update notice:', e.message);
    }
  };

  return (
    <MoveContext.Provider
      value={{
        activeTab,
        setActiveTab,
        activeRole,
        setActiveRole,
        themeMode,
        toggleTheme,
        currentEstimate,
        setCurrentEstimate,
        applyPreset,
        applyVoiceEstimate,
        passports,
        setPassports,
        scannedBox,
        setScannedBox,
        addNewBoxPassport,
        marketplaceItems,
        addMarketplaceItem,
        claimMarketplaceItem,
        carbonSavedTotalKg,
        corridors,
        selectedCorridorId,
        setSelectedCorridorId,
        toggleEssential,
        selectTheme,
        user,
        login,
        signup,
        logout,
        openAuth,
        isAuthModalOpen,
        setIsAuthModalOpen,
        authModalMode,
        toast,
        showToast,
        isInvoiceModalOpen,
        setIsInvoiceModalOpen,
        isPaymentModalOpen,
        setIsPaymentModalOpen,
        isDepositCertOpen,
        setIsDepositCertOpen,
        isDriverConsoleOpen,
        setIsDriverConsoleOpen,
        isDbModalOpen,
        setIsDbModalOpen,
        dbStatus,
        openInvoice,
        openPayment,
        openDepositCert,
        openDriverConsole,
        openDbModal,
        isAdminOpen,
        setIsAdminOpen,
        updateUser,
        applyItems,
        myMoves,
        refreshMyMoves,
        upsertMove,
        isBookingOpen,
        setIsBookingOpen,
        openBooking,
        isMyMovesOpen,
        setIsMyMovesOpen,
        selectedMoveId,
        setSelectedMoveId,
        openMyMoves,
        payingBooking,
        invoiceBooking,
        legalDoc,
        setLegalDoc,
        resetToken,
        setResetToken
      }}
    >
      {children}
    </MoveContext.Provider>
  );
};

export const useMove = () => {
  const context = useContext(MoveContext);
  if (!context) throw new Error('useMove must be used within a MoveProvider');
  return context;
};
