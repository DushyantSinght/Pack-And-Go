// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
import React, { Suspense, lazy, useEffect, useState } from 'react';
import { useMove } from './context/MoveContext';
import { Navbar } from './components/Navbar';
import { HeroBanner } from './components/HeroBanner';
import { AIEstimator } from './components/AIEstimator';
import { AuthModal } from './components/AuthModal';
import { ChatbotConcierge } from './components/ChatbotConcierge';
import { ChatDrawer } from './components/ChatDrawer';
import { CallModal } from './components/CallModal';
import { VerifyEmailBanner } from './components/VerifyEmailBanner';
import { ScrollProgress, BackToTop, Splash } from './components/Ambient';
import { HowItWorks, FeatureGrid, FAQ, CtaBand, SiteFooter } from './components/LandingSections';
import { useGlobalMotion } from './hooks/useMotion';
import { CommandPalette } from './components/CommandPalette';
import { Toaster } from './components/Toaster';
import { SkeletonList } from './components/ui/Skeleton';

// Tabs and dialogs load on demand so the first page load stays small.
const loaders = {
  LuggagePassport: () => import('./components/LuggagePassport'),
  PoolingLiveTracking: () => import('./components/PoolingLiveTracking'),
  CircularMarketplace: () => import('./components/CircularMarketplace'),
  ThemedRoomSetup: () => import('./components/ThemedRoomSetup'),
  PostMoveConcierge: () => import('./components/PostMoveConcierge'),
  CampusMoveWeek: () => import('./components/CampusMoveWeek'),
  InvoiceModal: () => import('./components/InvoiceModal'),
  PaymentModal: () => import('./components/PaymentModal'),
  DepositProtectionCertificate: () => import('./components/DepositProtectionCertificate'),
  DriverConsoleModal: () => import('./components/DriverConsoleModal'),
  DatabaseSchemaModal: () => import('./components/DatabaseSchemaModal'),
  AdminCaptainsModal: () => import('./components/AdminCaptainsModal'),
  FamilyTrackingView: () => import('./components/FamilyTrackingView'),
  BookingWizard: () => import('./components/BookingWizard'),
  MyMovesModal: () => import('./components/MyMovesModal'),
  LegalModal: () => import('./components/LegalModal'),
  CinematicJourney: () => import('./components/CinematicJourney'),
};
const lazyNamed = (name) => lazy(() => loaders[name]().then((m) => ({ default: m[name] })));
const LuggagePassport = lazyNamed('LuggagePassport');
const PoolingLiveTracking = lazyNamed('PoolingLiveTracking');
const CircularMarketplace = lazyNamed('CircularMarketplace');
const ThemedRoomSetup = lazyNamed('ThemedRoomSetup');
const PostMoveConcierge = lazyNamed('PostMoveConcierge');
const CampusMoveWeek = lazyNamed('CampusMoveWeek');
const InvoiceModal = lazyNamed('InvoiceModal');
const PaymentModal = lazyNamed('PaymentModal');
const DepositProtectionCertificate = lazyNamed('DepositProtectionCertificate');
const DriverConsoleModal = lazyNamed('DriverConsoleModal');
const DatabaseSchemaModal = lazyNamed('DatabaseSchemaModal');
const AdminCaptainsModal = lazyNamed('AdminCaptainsModal');
const FamilyTrackingView = lazyNamed('FamilyTrackingView');
const BookingWizard = lazyNamed('BookingWizard');
const MyMovesModal = lazyNamed('MyMovesModal');
const LegalModal = lazyNamed('LegalModal');
const CinematicJourney = lazyNamed('CinematicJourney');

/** Mounts a lazy dialog the first time it's needed, then keeps it mounted (so it keeps its state). */
const OnDemand = ({ when, children }) => {
  const [seen, setSeen] = useState(false);
  if (when && !seen) setSeen(true);
  return seen || when ? <Suspense fallback={null}>{children}</Suspense> : null;
};
import {
  ShieldAlert,
  Smartphone,
  Truck
} from 'lucide-react';

export function App() {
  const {
    activeTab,
    setActiveTab,
    activeRole,
    setActiveRole,
    isAuthModalOpen,
    setIsAuthModalOpen,
    authModalMode,
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
    openInvoice,
    openPayment,
    openDepositCert,
    openDriverConsole,
    user,
    isAdminOpen,
    setIsAdminOpen,
    openBooking,
    isBookingOpen,
    isMyMovesOpen,
    legalDoc
  } = useMove();
  // Once the page is idle, fetch the common dialogs in the background so they open instantly.
  useEffect(() => {
    const warm = () => ['MyMovesModal', 'BookingWizard', 'PaymentModal', 'CircularMarketplace', 'LuggagePassport'].forEach((n) => loaders[n]().catch(() => {}));
    const id = window.requestIdleCallback ? window.requestIdleCallback(warm, { timeout: 4000 }) : setTimeout(warm, 2500);
    return () => (window.cancelIdleCallback ? window.cancelIdleCallback(id) : clearTimeout(id));
  }, []);
  // Family tracking links: /?track=<token>
  const [trackToken, setTrackToken] = useState(() => new URLSearchParams(window.location.search).get('track'));
  const closeTracking = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('track');
    window.history.replaceState({}, '', url.pathname + url.search);
    setTrackToken(null);
  };
  useGlobalMotion();

  // Open a module tab and scroll up to the tab bar
  const goToModule = (tab) => {
    setActiveTab(tab);
    setTimeout(() => document.querySelector('.nav-tabs-wrapper')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };
  const captainPending = user?.userType === 'captain' && user?.captainStatus && user.captainStatus !== 'approved';

  return (
    <>
    <a className="skip-link" href="#main">Skip to content</a>
    <Splash />
    <ScrollProgress />
    <div className="app-container">
      {/* Role-Specific Notification Banner */}
      {activeRole !== 'customer' && (
        <div style={{
          background: activeRole === 'captain'
            ? 'linear-gradient(90deg, #059669, #10B981)'
            : activeRole === 'parent'
            ? 'linear-gradient(90deg, #4F46E5, #6366F1)'
            : 'linear-gradient(90deg, #D97706, #F59E0B)',
          color: '#FFFFFF',
          padding: '8px 20px',
          fontSize: '0.85rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 60
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto' }}>
            {activeRole === 'captain' && (
              <>
                <Truck size={16} />
                <span>
                  {captainPending
                    ? user.captainStatus === 'pending'
                      ? 'Move Captain application under review — you can take jobs once Pack&Go approves your licence & vehicle.'
                      : `Move Captain account ${user.captainStatus}. Contact Pack&Go support.`
                    : user ? 'Move Captain mode: accept jobs, share your location, and confirm pickup and delivery with the customer’s codes.' : 'Preview of the Move Captain view — sign in with an approved driver account to take jobs.'}
                </span>
                <button
                  onClick={openDriverConsole}
                  style={{
                    background: '#FFFFFF',
                    color: '#059669',
                    border: 'none',
                    fontWeight: 700,
                    padding: '2px 10px',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    marginLeft: '8px'
                  }}
                >
                  Open Driver Console
                </button>
              </>
            )}
            {activeRole === 'parent' && (
              <>
                <Smartphone size={16} />
                <span>Parent view: open the family tracking link your student shares from My Moves to follow their truck live.</span>
              </>
            )}
            {activeRole === 'outgoing' && (
              <>
                <ShieldAlert size={16} />
                <span>Outgoing Tenant Mode Active: Zero-transit P2P listing & instant buyback enabled.</span>
              </>
            )}
          </div>
          {!user && (
          <button
            onClick={() => setActiveRole('customer')}
            style={{
              background: 'rgba(0, 0, 0, 0.2)',
              border: 'none',
              color: '#fff',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '0.75rem',
              cursor: 'pointer'
            }}
          >
            Exit preview
          </button>
          )}
        </div>
      )}

      <VerifyEmailBanner />

      {/* Main Sticky Navbar */}
      <Navbar />

      {/* Main Page Content */}
      <main className="main-content" id="main" tabIndex={-1}>
        <HeroBanner />

        {/* Dynamic View Tab Rendering */}
        <div key={activeTab} className="page-enter">
          <Suspense fallback={<div className="glass-panel" style={{ padding: 24 }}><SkeletonList rows={4} /></div>}>
          {activeTab === 'estimator' && <AIEstimator />}
          {activeTab === 'passport' && <LuggagePassport />}
          {activeTab === 'tracking' && <PoolingLiveTracking />}
          {activeTab === 'marketplace' && <CircularMarketplace />}
          {activeTab === 'themes' && <ThemedRoomSetup />}
          {activeTab === 'postmove' && <PostMoveConcierge />}
          {activeTab === 'campus' && <CampusMoveWeek />}
          </Suspense>
        </div>

        {/* Landing sections — hidden for drivers, who use the app as a tool */}
        {activeRole !== 'captain' && (
          <>
            <HowItWorks />
            <FeatureGrid />
            <FAQ />
            <CtaBand />
            {/* Animated journey: truck loads boxes, shares a stop, delivers home */}
            <Suspense fallback={null}>
              <CinematicJourney onNavigate={goToModule} />
            </Suspense>
          </>
        )}
      </main>

      {/* Stacked, swipeable notifications */}
      <Toaster />

      <SiteFooter />
      <BackToTop />
      <CommandPalette />

      {/* Auth Modal (Login / Sign Up) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
      />

      {/* Corporate Relocation GST Tax Invoice Modal */}
      <OnDemand when={isInvoiceModalOpen}>
        <InvoiceModal
          isOpen={isInvoiceModalOpen}
          onClose={() => setIsInvoiceModalOpen(false)}
        />
      </OnDemand>

      {/* Simulated (demo) payment checkout */}
      <OnDemand when={isPaymentModalOpen}>
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          onOpenInvoice={(booking) => {
            setIsPaymentModalOpen(false);
            openInvoice(booking);
          }}
        />
      </OnDemand>

      {/* Landlord Security Deposit-Protection Legal Certificate Modal */}
      <OnDemand when={isDepositCertOpen}>
        <DepositProtectionCertificate
          isOpen={isDepositCertOpen}
          onClose={() => setIsDepositCertOpen(false)}
        />
      </OnDemand>

      {/* Move Captain Driver Mobile Console */}
      <OnDemand when={isDriverConsoleOpen}>
        <DriverConsoleModal
          isOpen={isDriverConsoleOpen}
          onClose={() => setIsDriverConsoleOpen(false)}
        />
      </OnDemand>

      {/* MongoDB Database & Schema Explorer Modal */}
      <OnDemand when={isDbModalOpen}>
        <DatabaseSchemaModal
          isOpen={isDbModalOpen}
          onClose={() => setIsDbModalOpen(false)}
        />
      </OnDemand>

      {/* 24/7 Floating AI Relocation Concierge (PackBot) */}
      <ChatbotConcierge
        onOpenInvoice={openInvoice}
        onOpenPayment={openPayment}
        onOpenCert={openDepositCert}
      />

      {/* Real-time messaging (Socket.IO) and calling */}
      <ChatDrawer />
      <CallModal />

      {/* Staff: Move Captain application review */}
      <OnDemand when={isAdminOpen}>
        <AdminCaptainsModal isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} />
      </OnDemand>
      {trackToken && <Suspense fallback={null}><FamilyTrackingView token={trackToken} onClose={closeTracking} onBook={() => { closeTracking(); openBooking(); }} /></Suspense>}

      {/* Real bookings */}
      <OnDemand when={isBookingOpen}>
        <BookingWizard />
      </OnDemand>
      <OnDemand when={isMyMovesOpen}>
        <MyMovesModal />
      </OnDemand>
      <OnDemand when={!!legalDoc}>
        <LegalModal />
      </OnDemand>
    </div>
    </>
  );
}

export default App;
