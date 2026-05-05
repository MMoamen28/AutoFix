import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/layout/Layout';
import { LayoutDashboard } from 'lucide-react';

import LoginPage from '../pages/LoginPage';

import CustomersPage from '../pages/admin/CustomersPage';
import CustomerDetailPage from '../pages/admin/CustomerDetailPage';
import MechanicsPage from '../pages/admin/MechanicsPage';
import RepairOrdersPage from '../pages/admin/RepairOrdersPage';
import ServicesPage from '../pages/admin/ServicesPage';
import SparePartsPage from '../pages/admin/SparePartsPage';

import MechanicDashboard from '../pages/mechanic/MechanicDashboard';
import MyRepairOrdersPageMechanic from '../pages/mechanic/MyRepairOrdersPage';
import SparePartsViewPage from '../pages/mechanic/SparePartsViewPage';
import AvailableRepairOrdersPage from '../pages/mechanic/AvailableRepairOrdersPage';

import MarketplacePage from '../pages/MarketplacePage';
import CustomerDashboard from '../pages/customer/CustomerDashboard';
import MyCarsPage from '../pages/customer/MyCarsPage';
import MyRepairOrdersPageCustomer from '../pages/customer/MyRepairOrdersPage';
import CartPage from '../pages/customer/CartPage';

import OwnerDashboard from '../pages/OwnerDashboard';
import ReceiptsPage from '../pages/ReceiptsPage';
import AllDataPage from '../pages/AllDataPage';

const AppRouter: React.FC = () => {
  const { role, token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-main)' }}>
        <LayoutDashboard className="animate-spin text-accent" size={48} />
      </div>
    );
  }

  const getHomeElement = () => {
    if (!token) return <Navigate to="/login" replace />;
    switch (role) {
      case 'Owner': return <OwnerDashboard />;
      case 'Admin': return <Navigate to="/customers" />;
      case 'Mechanic': return <MechanicDashboard />;
      case 'Customer': return <CustomerDashboard />;
      default: return <Navigate to="/login" replace />;
    }
  };

  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Public Routes */}
        <Route path="/" element={getHomeElement()} />
        <Route path="/login" element={<LoginPage />} />

        {/* Admin/Owner Shared Routes */}
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/customers/new" element={<CustomersPage openModal={true} />} />
        <Route path="/customers/:id" element={<CustomerDetailPage />} />
        <Route path="/mechanics" element={<MechanicsPage />} />
        <Route path="/repair-orders" element={<RepairOrdersPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/spare-parts" element={<SparePartsPage />} />

        {/* Owner-Specific Routes */}
        <Route path="/owner/receipts" element={<ReceiptsPage />} />
        <Route path="/owner/all-data" element={<AllDataPage />} />

        {/* Mechanic Routes */}
        <Route path="/mechanic" element={<Navigate to="/" replace />} />
        <Route path="/mechanic/repair-orders" element={<MyRepairOrdersPageMechanic />} />
        <Route path="/mechanic/available-orders" element={<AvailableRepairOrdersPage />} />
        <Route path="/mechanic/spare-parts" element={<SparePartsViewPage />} />

        {/* Customer Routes */}
        <Route path="/customer" element={<Navigate to="/" replace />} />
        <Route path="/marketplace" element={<MarketplacePage />} />
        <Route path="/customer/cars" element={<MyCarsPage />} />
        <Route path="/customer/repair-orders" element={<MyRepairOrdersPageCustomer />} />
        <Route path="/cart" element={<CartPage />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};

export default AppRouter;
