// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
import React from 'react';
import { useMove } from './context/MoveContext';
import { Navbar } from './components/Navbar';
import { HeroBanner } from './components/HeroBanner';
import { AIEstimator } from './components/AIEstimator';
import { LuggagePassport } from './components/LuggagePassport';
import { PoolingLiveTracking } from './components/PoolingLiveTracking';
import { CircularMarketplace } from './components/CircularMarketplace';
import { ThemedRoomSetup } from './components/ThemedRoomSetup';
import { PostMoveConcierge } from './components/PostMoveConcierge';
import { CampusMoveWeek } from './components/CampusMoveWeek';
import { AuthModal } from './components/AuthModal';
import { InvoiceModal } from './components/InvoiceModal';
import { PaymentModal } from './components/PaymentModal';
import { DepositProtectionCertificate } from './components/DepositProtectionCertificate';
import { DriverConsoleModal } from './components/DriverConsoleModal';
import { ChatbotConcierge } from './components/ChatbotConcierge';
import { DatabaseSchemaModal } from './components/DatabaseSchemaModal';
import { ChatDrawer } from './components/ChatDrawer';
import { CallModal } from './components/CallModal';
import { AdminCaptainsModal } from './components/AdminCaptainsModal';
import { BookingWizard } from './components/BookingWizard';
import { MyMovesModal } from './components/MyMovesModal';
import { LegalModal } from './components/LegalModal';
import { VerifyEmailBanner } from './components/VerifyEmailBanner';
import { AmbientBackground, ScrollProgress, BackToTop, Splash } from './components/Ambient';
import { HowItWorks, FeatureGrid, FAQ, CtaBand, SiteFooter } from './components/LandingSections';
import { useGlobalMotion } from './hooks/useMotion';
import { CommandPalette } from './components/CommandPalette';
import { Toaster } from './components/Toaster';
import {
  ShieldAlert,
  Smartphone,
  Truck,
  CheckCircle,
  AlertCircle,
  X,
  ExternalLink,
  Heart
} from 'lucide-react';

export function App() {
  const {
    activeTab,
    activeRole,
    setActiveRole,
    currentEstimate,
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
    openDbModal,
    user,
    isAdminOpen,
    setIsAdminOpen,
    setLegalDoc
  } = useMove();
  useGlobalMotion();
  const captainPending = user?.userType === 'captain' && user?.captainStatus && user.captainStatus !== 'approved';

  return (
    <>
    <a className="skip-link" href="#main">Skip to content</a>
    <Splash />
    <AmbientBackground />
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
                    : 'Move Captain Mode Active: Geofence Checkpoints & OTP Handover verification enabled.'}
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
                <span>Parent Live View Active: Monitoring Student Move (KA-01-MJ-4921) • Telemetry Safe.</span>
              </>
            )}
            {activeRole === 'outgoing' && (
              <>
                <ShieldAlert size={16} />
                <span>Outgoing Tenant Mode Active: Zero-transit P2P listing & instant buyback enabled.</span>
              </>
            )}
          </div>
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
            Exit Role
          </button>
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
          {activeTab === 'estimator' && <AIEstimator />}
          {activeTab === 'passport' && <LuggagePassport />}
          {activeTab === 'tracking' && <PoolingLiveTracking />}
          {activeTab === 'marketplace' && <CircularMarketplace />}
          {activeTab === 'themes' && <ThemedRoomSetup />}
          {activeTab === 'postmove' && <PostMoveConcierge />}
          {activeTab === 'campus' && <CampusMoveWeek />}
        </div>

        {/* Landing sections — hidden for drivers, who use the app as a tool */}
        {activeRole !== 'captain' && (
          <>
            <HowItWorks />
            <FeatureGrid />
            <FAQ />
            <CtaBand />
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
      <InvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
      />

      {/* UPI / Razorpay Escrow Payment Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onOpenInvoice={(booking) => {
          setIsPaymentModalOpen(false);
          openInvoice(booking);
        }}
      />

      {/* Landlord Security Deposit-Protection Legal Certificate Modal */}
      <DepositProtectionCertificate
        isOpen={isDepositCertOpen}
        onClose={() => setIsDepositCertOpen(false)}
      />

      {/* Move Captain Driver Mobile Console */}
      <DriverConsoleModal
        isOpen={isDriverConsoleOpen}
        onClose={() => setIsDriverConsoleOpen(false)}
      />

      {/* MongoDB Database & Schema Explorer Modal */}
      <DatabaseSchemaModal
        isOpen={isDbModalOpen}
        onClose={() => setIsDbModalOpen(false)}
      />

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
      <AdminCaptainsModal isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} />

      {/* Real bookings */}
      <BookingWizard />
      <MyMovesModal />
      <LegalModal />
    </div>
    </>
  );
}

export default App;
