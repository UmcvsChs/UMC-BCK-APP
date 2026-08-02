import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom'
import { useAuth } from './lib/useAuth'
import { useProfile } from './lib/useProfile'
import { supabase } from './lib/supabase'
import HubRail from './components/HubRail'
import SignUp from './pages/SignUp'
import SignIn from './pages/SignIn'
import Marketplace from './pages/Marketplace'
import Canteen from './pages/Canteen'
import Phones from './pages/Phones'
import Swap from './pages/Swap'
import Repair from './pages/Repair'
import RepairerRegister from './pages/RepairerRegister'
import Gold from './pages/Gold'
import TradeIn from './pages/TradeIn'
import Automobile from './pages/Automobile'
import Pharma from './pages/Pharma'
import PrescriptionRequest from './pages/PrescriptionRequest'
import ProductDetail from './pages/ProductDetail'
import Cart from './pages/Cart'
import Wallet from './pages/Wallet'
import SellerRegister from './pages/SellerRegister'
import SellerDashboard from './pages/SellerDashboard'
import DeliveryAgentRegister from './pages/DeliveryAgentRegister'
import DeliveryAgentDashboard from './pages/DeliveryAgentDashboard'
import Admin from './pages/Admin'

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
        <Link to="/delivery" className="text-xs font-medium text-ink/60 hover:text-indigo">
          Delivery
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
      <Routes>
        <Route path="/sign-up" element={<SignUp />} />
        <Route path="/sign-in" element={<SignIn />} />

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

        <Route path="/" element={<Navigate to="/marketplace" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
