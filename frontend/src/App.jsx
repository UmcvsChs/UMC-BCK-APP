import { BrowserRouter, Routes, Route, Navigate, Link, NavLink } from 'react-router-dom'
import { lazy, Suspense, useState, useEffect } from 'react'
import { useAuth } from './lib/useAuth'
import { useProfile } from './lib/useProfile'
import { supabase } from './lib/supabase'
import HubRail from './components/HubRail'
import HausaVoiceNav from './components/HausaVoiceNav'

// Lazy-loaded so each route ships as its own chunk instead of one giant
// bundle everyone downloads on first visit — this was flagged repeatedly
// as worth doing before real production traffic, and is now actually done
// rather than left as a recurring note.
const SignUp = lazy(() => import('./pages/SignUp'))
const SignIn = lazy(() => import('./pages/SignIn'))
const Marketplace = lazy(() => import('./pages/Marketplace'))
const Canteen = lazy(() => import('./pages/Canteen'))
const Phones = lazy(() => import('./pages/Phones'))
const Swap = lazy(() => import('./pages/Swap'))
const Repair = lazy(() => import('./pages/Repair'))
const RepairerRegister = lazy(() => import('./pages/RepairerRegister'))
const Gold = lazy(() => import('./pages/Gold'))
const TradeIn = lazy(() => import('./pages/TradeIn'))
const Automobile = lazy(() => import('./pages/Automobile'))
const Pharma = lazy(() => import('./pages/Pharma'))
const Boutique = lazy(() => import('./pages/Boutique'))
const ThriftWear = lazy(() => import('./pages/ThriftWear'))
const Textile = lazy(() => import('./pages/Textile'))
const GreenEnergy = lazy(() => import('./pages/GreenEnergy'))
const ElectricalEquipment = lazy(() => import('./pages/ElectricalEquipment'))
const InteriorAppliances = lazy(() => import('./pages/InteriorAppliances'))
const PlasticUtensils = lazy(() => import('./pages/PlasticUtensils'))
const OfficeEquipment = lazy(() => import('./pages/OfficeEquipment'))
const PrescriptionRequest = lazy(() => import('./pages/PrescriptionRequest'))
const PharmaResellerRegister = lazy(() => import('./pages/PharmaResellerRegister'))
const ProductDetail = lazy(() => import('./pages/ProductDetail'))
const Cart = lazy(() => import('./pages/Cart'))
const MyOrders = lazy(() => import('./pages/MyOrders'))
const OrderReceipt = lazy(() => import('./pages/OrderReceipt'))
const Settings = lazy(() => import('./pages/Settings'))
const ClaimStore = lazy(() => import('./pages/ClaimStore'))
const Wallet = lazy(() => import('./pages/Wallet'))
const SellerRegister = lazy(() => import('./pages/SellerRegister'))
const SellerDashboard = lazy(() => import('./pages/SellerDashboard'))
const JoinAsAttendant = lazy(() => import('./pages/JoinAsAttendant'))
const DeliveryAgentRegister = lazy(() => import('./pages/DeliveryAgentRegister'))
const DeliveryAgentDashboard = lazy(() => import('./pages/DeliveryAgentDashboard'))
const UsedItems = lazy(() => import('./pages/UsedItems'))
const PriceWatches = lazy(() => import('./pages/PriceWatches'))
const MarketWatch = lazy(() => import('./pages/MarketWatch'))
const AttendantDashboard = lazy(() => import('./pages/AttendantDashboard'))
const DirectorDashboard = lazy(() => import('./pages/DirectorDashboard'))
const CommodityCatalog = lazy(() => import('./pages/CommodityCatalog'))
const DemandSignals = lazy(() => import('./pages/DemandSignals'))
const CanteenCheckout = lazy(() => import('./pages/CanteenCheckout'))
const Bills = lazy(() => import('./pages/Bills'))
const Verify = lazy(() => import('./pages/Verify'))
const Admin = lazy(() => import('./pages/Admin'))

function ProtectedLayout({ children }) {
  const { session, loading } = useAuth()
  const { profile } = useProfile(session)
  const [moreOpen, setMoreOpen] = useState(false)
  const [cartCount, setCartCount] = useState(0)

  useEffect(() => {
    if (!session?.user?.id) return
    let cancelled = false

    async function loadCount() {
      const { data } = await supabase
        .from('cart_items')
        .select('quantity')
        .eq('buyer_id', session.user.id)
      if (!cancelled) setCartCount((data || []).reduce((sum, r) => sum + Number(r.quantity || 0), 0))
    }
    loadCount()

    // Real-time — the badge updates the instant an item is added or
    // removed anywhere in the app, not just after navigating back to Cart.
    const channel = supabase
      .channel('cart-count-badge')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cart_items', filter: `buyer_id=eq.${session.user.id}` }, loadCount)
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [session?.user?.id])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-ink/50">Loading…</div>
  }
  if (!session) {
    return <Navigate to="/sign-in" replace />
  }

  // Real reorganization — matching the original design: buyers see Home,
  // Cart, Orders, Bills as the four things they actually need constantly,
  // fixed at the bottom where a thumb naturally rests. Everything else —
  // Seller tools, Delivery, Used Items, Price Watch, identity Verification,
  // Wallet, Settings, and Admin (admin-only) — lives in one real "More"
  // menu instead of a single undifferentiated row where Admin sat next to
  // Cart with equal visual weight.
  return (
    <div className="min-h-screen pb-16">
      <HubRail />

      <div className="flex justify-end px-3 pt-2 relative">
        <button
          onClick={() => setMoreOpen((v) => !v)}
          className="text-xs font-medium text-ink/60 hover:text-indigo flex items-center gap-1"
        >
          ⋯ More
        </button>
        {moreOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMoreOpen(false)} />
            <div className="absolute right-3 top-8 z-20 bg-surface rounded-lg shadow-lg border border-ink/10 py-2 w-56">
              <Link onClick={() => setMoreOpen(false)} to="/wallet" className="block px-4 py-2 text-sm text-gold-dark hover:bg-paper">
                💰 Wallet
              </Link>
              <Link onClick={() => setMoreOpen(false)} to="/verify" className="block px-4 py-2 text-sm text-ink/70 hover:bg-paper">
                🪪 Verify Identity
              </Link>
              <div className="border-t border-ink/10 my-1" />
              <Link onClick={() => setMoreOpen(false)} to="/seller" className="block px-4 py-2 text-sm text-ink/70 hover:bg-paper">
                🏪 Seller Dashboard
              </Link>
              <Link onClick={() => setMoreOpen(false)} to="/claim-store" className="block px-4 py-2 text-sm text-ink/70 hover:bg-paper">
                🔑 Claim a Store
              </Link>
              <Link onClick={() => setMoreOpen(false)} to="/join-attendant" className="block px-4 py-2 text-sm text-ink/70 hover:bg-paper">
                Join as Attendant
              </Link>
              <Link onClick={() => setMoreOpen(false)} to="/delivery" className="block px-4 py-2 text-sm text-ink/70 hover:bg-paper">
                🏍️ Delivery Agent
              </Link>
              <div className="border-t border-ink/10 my-1" />
              <Link onClick={() => setMoreOpen(false)} to="/used-items" className="block px-4 py-2 text-sm text-ink/70 hover:bg-paper">
                ♻️ Used Items
              </Link>
              {profile?.primary_role === 'admin' && (
                <Link onClick={() => setMoreOpen(false)} to="/admin" className="block px-4 py-2 text-sm text-market-red hover:bg-paper">
                  🛡️ Admin
                </Link>
              )}
              <div className="border-t border-ink/10 my-1" />
              <Link onClick={() => setMoreOpen(false)} to="/settings" className="block px-4 py-2 text-sm text-ink/70 hover:bg-paper">
                ⚙️ Settings
              </Link>
              <button
                onClick={() => supabase.auth.signOut()}
                className="block w-full text-left px-4 py-2 text-sm text-market-red hover:bg-paper"
              >
                Sign out
              </button>
            </div>
          </>
        )}
      </div>

      <HausaVoiceNav />

      {children}

      <nav className="fixed bottom-0 left-0 right-0 bg-indigo border-t-2 border-gold/40 flex z-30">
        {[
          { to: '/marketplace', label: 'Home', icon: '🏠' },
          { to: '/cart', label: 'Cart', icon: '🛒' },
          { to: '/price-watches', label: 'My List', icon: '📋' },
          { to: '/market-watch', label: 'Market Watch', icon: '📊' },
          { to: '/bills', label: 'Bills', icon: '⚡' },
          { to: '/settings', label: 'Profile', icon: '👤' },
        ].map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2 px-0.5 text-[10px] font-medium ${isActive ? 'text-gold' : 'text-paper/70'}`
            }
          >
            <span className="relative">
              <span className="text-lg leading-none mb-0.5 block">{item.icon}</span>
              {item.to === '/cart' && cartCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-gold text-ink text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-ink/50">Loading…</div>}>
        <Routes>
        <Route path="/sign-up" element={<SignUp />} />
        <Route path="/sign-in" element={<SignIn />} />
        <Route path="/verify" element={<Verify />} />

        <Route
          path="/marketplace"
          element={
            <ProtectedLayout>
              <Marketplace />
            </ProtectedLayout>
          }
        />
        <Route
          path="/product/:productId"
          element={
            <ProtectedLayout>
              <ProductDetail />
            </ProtectedLayout>
          }
        />
        <Route
          path="/cart"
          element={
            <ProtectedLayout>
              <Cart />
            </ProtectedLayout>
          }
        />
        <Route
          path="/orders"
          element={
            <ProtectedLayout>
              <MyOrders />
            </ProtectedLayout>
          }
        />
        <Route
          path="/orders/:orderId"
          element={
            <ProtectedLayout>
              <OrderReceipt />
            </ProtectedLayout>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedLayout>
              <Settings />
            </ProtectedLayout>
          }
        />
        <Route
          path="/claim-store"
          element={
            <ProtectedLayout>
              <ClaimStore />
            </ProtectedLayout>
          }
        />
        <Route
          path="/wallet"
          element={
            <ProtectedLayout>
              <Wallet />
            </ProtectedLayout>
          }
        />
        <Route
          path="/seller/register"
          element={
            <ProtectedLayout>
              <SellerRegister />
            </ProtectedLayout>
          }
        />
        <Route
          path="/seller"
          element={
            <ProtectedLayout>
              <SellerDashboard />
            </ProtectedLayout>
          }
        />
        <Route
          path="/join-attendant"
          element={
            <ProtectedLayout>
              <JoinAsAttendant />
            </ProtectedLayout>
          }
        />
        <Route
          path="/delivery/register"
          element={
            <ProtectedLayout>
              <DeliveryAgentRegister />
            </ProtectedLayout>
          }
        />
        <Route
          path="/delivery"
          element={
            <ProtectedLayout>
              <DeliveryAgentDashboard />
            </ProtectedLayout>
          }
        />
        <Route
          path="/used-items"
          element={
            <ProtectedLayout>
              <UsedItems />
            </ProtectedLayout>
          }
        />
        <Route
          path="/price-watches"
          element={
            <ProtectedLayout>
              <PriceWatches />
            </ProtectedLayout>
          }
        />
        <Route
          path="/market-watch"
          element={
            <ProtectedLayout>
              <MarketWatch />
            </ProtectedLayout>
          }
        />
        <Route
          path="/attendant"
          element={
            <ProtectedLayout>
              <AttendantDashboard />
            </ProtectedLayout>
          }
        />
        <Route
          path="/director"
          element={
            <ProtectedLayout>
              <DirectorDashboard />
            </ProtectedLayout>
          }
        />
        <Route
          path="/catalog/:commodityName"
          element={
            <ProtectedLayout>
              <CommodityCatalog />
            </ProtectedLayout>
          }
        />
        <Route
          path="/demand-signals"
          element={
            <ProtectedLayout>
              <DemandSignals />
            </ProtectedLayout>
          }
        />
        <Route
          path="/canteen-checkout"
          element={
            <ProtectedLayout>
              <CanteenCheckout />
            </ProtectedLayout>
          }
        />
        <Route
          path="/bills"
          element={
            <ProtectedLayout>
              <Bills />
            </ProtectedLayout>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedLayout>
              <Admin />
            </ProtectedLayout>
          }
        />
        <Route
          path="/canteen"
          element={
            <ProtectedLayout>
              <Canteen />
            </ProtectedLayout>
          }
        />
        <Route
          path="/phones"
          element={
            <ProtectedLayout>
              <Phones />
            </ProtectedLayout>
          }
        />
        <Route
          path="/phones/swap"
          element={
            <ProtectedLayout>
              <Swap />
            </ProtectedLayout>
          }
        />
        <Route
          path="/phones/repair"
          element={
            <ProtectedLayout>
              <Repair />
            </ProtectedLayout>
          }
        />
        <Route
          path="/phones/repair/register"
          element={
            <ProtectedLayout>
              <RepairerRegister />
            </ProtectedLayout>
          }
        />
        <Route
          path="/gold"
          element={
            <ProtectedLayout>
              <Gold />
            </ProtectedLayout>
          }
        />
        <Route
          path="/gold/trade-in"
          element={
            <ProtectedLayout>
              <TradeIn />
            </ProtectedLayout>
          }
        />
        <Route
          path="/automobile"
          element={
            <ProtectedLayout>
              <Automobile />
            </ProtectedLayout>
          }
        />
        <Route
          path="/pharma"
          element={
            <ProtectedLayout>
              <Pharma />
            </ProtectedLayout>
          }
        />
        <Route
          path="/boutique"
          element={
            <ProtectedLayout>
              <Boutique />
            </ProtectedLayout>
          }
        />
        <Route
          path="/thrift-wear"
          element={
            <ProtectedLayout>
              <ThriftWear />
            </ProtectedLayout>
          }
        />
        <Route
          path="/textile"
          element={
            <ProtectedLayout>
              <Textile />
            </ProtectedLayout>
          }
        />
        <Route
          path="/green-energy"
          element={
            <ProtectedLayout>
              <GreenEnergy />
            </ProtectedLayout>
          }
        />
        <Route
          path="/electrical-equipment"
          element={
            <ProtectedLayout>
              <ElectricalEquipment />
            </ProtectedLayout>
          }
        />
        <Route
          path="/interior-appliances"
          element={
            <ProtectedLayout>
              <InteriorAppliances />
            </ProtectedLayout>
          }
        />
        <Route
          path="/plastic-utensils"
          element={
            <ProtectedLayout>
              <PlasticUtensils />
            </ProtectedLayout>
          }
        />
        <Route
          path="/office-equipment"
          element={
            <ProtectedLayout>
              <OfficeEquipment />
            </ProtectedLayout>
          }
        />
        <Route
          path="/pharma/prescription-request"
          element={
            <ProtectedLayout>
              <PrescriptionRequest />
            </ProtectedLayout>
          }
        />
        <Route
          path="/pharma/reseller-register"
          element={
            <ProtectedLayout>
              <PharmaResellerRegister />
            </ProtectedLayout>
          }
        />

        <Route path="/" element={<Navigate to="/marketplace" replace />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
