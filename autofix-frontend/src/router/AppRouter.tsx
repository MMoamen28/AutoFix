import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/layout/Layout';

import LoginPage from '../pages/LoginPage';

import CustomersPage from '../pages/admin/CustomersPage';
import CustomerDetailPage from '../pages/admin/CustomerDetailPage';
import MechanicsPage from '../pages/admin/MechanicsPage';
import RepairOrdersPage from '../pages/admin/RepairOrdersPage';
import ServicesPage from '../pages/admin/ServicesPage';
import SparePartsPage from '../pages/admin/SparePartsPage';
import SparePartCategoriesPage from '../pages/admin/SparePartCategoriesPage';

import MechanicDashboard from '../pages/mechanic/MechanicDashboard';
import MyRepairOrdersPageMechanic from '../pages/mechanic/MyRepairOrdersPage';
import AssignedOrdersPage from '../pages/mechanic/AssignedOrdersPage';
import SparePartsViewPage from '../pages/mechanic/SparePartsViewPage';
import MyRequestsPage from '../pages/MyRequestsPage';

import CustomerDashboard from '../pages/customer/CustomerDashboard';
import MyCarsPage from '../pages/customer/MyCarsPage';
import MyRepairOrdersPageCustomer from '../pages/customer/MyRepairOrdersPage';
import CartPage from '../pages/customer/CartPage';
import MyOrdersPage from '../pages/customer/MyOrdersPage';

import OwnerDashboard from '../pages/OwnerDashboard';
import PendingRequestsPage from '../pages/PendingRequestsPage';
import ReceiptsPage from '../pages/ReceiptsPage';
import PurchaseOrdersPage from '../pages/owner/PurchaseOrdersPage';
import PurchaseReceiptsPage from '../pages/owner/PurchaseReceiptsPage';
import AllDataPage from '../pages/AllDataPage';

const AppRouter: React.FC = () => {
  const { role, token } = useAuth();

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
        <Route path="/spare-part-categories" element={<SparePartCategoriesPage />} />

        {/* Owner-Specific Routes */}
        <Route path="/owner/requests" element={<PendingRequestsPage />} />
        <Route path="/owner/requests/:id" element={<PendingRequestsPage />} />
        <Route path="/owner/receipts" element={<ReceiptsPage />} />
        <Route path="/owner/purchase-orders" element={<PurchaseOrdersPage />} />
        <Route path="/owner/purchase-receipts" element={<PurchaseReceiptsPage />} />
        <Route path="/owner/all-data" element={<AllDataPage />} />

        {/* Mechanic Routes */}
        <Route path="/mechanic" element={<Navigate to="/" replace />} />
        <Route path="/mechanic/repair-orders" element={<MyRepairOrdersPageMechanic />} />
        <Route path="/mechanic/orders" element={<AssignedOrdersPage />} />
        <Route path="/mechanic/spare-parts" element={<SparePartsViewPage />} />
        <Route path="/mechanic/requests" element={<MyRequestsPage />} />

        {/* Customer Routes */}
        <Route path="/customer" element={<Navigate to="/" replace />} />
        <Route path="/customer/cars" element={<MyCarsPage />} />
        <Route path="/customer/repair-orders" element={<MyRepairOrdersPageCustomer />} />
        <Route path="/customer/cart" element={<CartPage />} />
        <Route path="/customer/orders" element={<MyOrdersPage />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};

export default AppRouter;
