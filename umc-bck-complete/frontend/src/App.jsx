import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { useAuth } from './lib/useAuth'
import { useProfile } from './lib/useProfile'
import { supabase } from './lib/supabase'
import HubRail from './components/HubRail'

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
const PrescriptionRequest = lazy(() => import('./pages/PrescriptionRequest'))
const PharmaResellerRegister = lazy(() => import('./pages/PharmaResellerRegister'))
const ProductDetail = lazy(() => import('./pages/ProductDetail'))
const Cart = lazy(() => import('./pages/Cart'))
const MyOrders = lazy(() => import('./pages/MyOrders'))
const OrderReceipt = lazy(() => import('./pages/OrderReceipt'))
const Settings = lazy(() => import('./pages/Settings'))
const Wallet = lazy(() => import('./pages/Wallet'))
const SellerRegister = lazy(() => import('./pages/SellerRegister'))
const SellerDashboard = lazy(() => import('./pages/SellerDashboard'))
const JoinAsAttendant = lazy(() => import('./pages/JoinAsAttendant'))
const DeliveryAgentRegister = lazy(() => import('./pages/DeliveryAgentRegister'))
const DeliveryAgentDashboard = lazy(() => import('./pages/DeliveryAgentDashboard'))
const UsedItems = lazy(() => import('./pages/UsedItems'))
const PriceWatches = lazy(() => import('./pages/PriceWatches'))
const Bills = lazy(() => import('./pages/Bills'))
const Verify = lazy(() => import('./pages/Verify'))
const Admin = lazy(() => import('./pages/Admin'))

function ProtectedLayout({ children }) {
  const { session, loading } = useAuth()
  const { profile } = useProfile(session)

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-ink/50">Loading…</div>
  }
  if (!session) {
    return <Navigate to="/sign-in" replace />
  }

  return (
    <div className="min-h-screen">
      <HubRail />
      <div className="flex justify-end items-center gap-4 px-3 pt-2">
        <Link to="/seller" className="text-xs font-medium text-ink/60 hover:text-indigo">
          Seller
        </Link>
        <Link to="/join-attendant" className="text-xs font-medium text-ink/60 hover:text-indigo">
          Join as Attendant
        </Link>
        <Link to="/delivery" className="text-xs font-medium text-ink/60 hover:text-indigo">
          Delivery
        </Link>
        <Link to="/used-items" className="text-xs font-medium text-ink/60 hover:text-indigo">
          Used Items
        </Link>
        <Link to="/price-watches" className="text-xs font-medium text-ink/60 hover:text-indigo">
          Price Watch
        </Link>
        <Link to="/bills" className="text-xs font-medium text-ink/60 hover:text-indigo">
          Bills
        </Link>
        <Link to="/verify" className="text-xs font-medium text-ink/60 hover:text-indigo">
          Verify
        </Link>
        {profile?.primary_role === 'admin' && (
          <Link to="/admin" className="text-xs font-medium text-ink/60 hover:text-indigo">
            Admin
          </Link>
        )}
        <Link to="/wallet" className="text-xs font-medium text-gold-dark hover:text-gold">
          Wallet
        </Link>
        <Link to="/cart" className="text-xs font-medium text-indigo hover:text-indigo-light">
          Cart
        </Link>
        <Link to="/orders" className="text-xs font-medium text-indigo hover:text-indigo-light">
          Orders
        </Link>
        <Link to="/settings" className="text-xs font-medium text-ink/60 hover:text-indigo">
          Settings
        </Link>
        <button
          onClick={() => supabase.auth.signOut()}
          className="text-xs text-ink/50 hover:text-market-red"
        >
          Sign out
        </button>
      </div>
      {children}
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
