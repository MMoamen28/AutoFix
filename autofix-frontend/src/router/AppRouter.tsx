import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

import HomePage from '../pages/HomePage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';

import CustomersPage from '../pages/admin/CustomersPage';
import CustomerDetailPage from '../pages/admin/CustomerDetailPage';
import MechanicsPage from '../pages/admin/MechanicsPage';
import RepairOrdersPage from '../pages/admin/RepairOrdersPage';
import ServicesPage from '../pages/admin/ServicesPage';
import SparePartsPage from '../pages/admin/SparePartsPage';
import SparePartCategoriesPage from '../pages/admin/SparePartCategoriesPage';

import MechanicDashboard from '../pages/mechanic/MechanicDashboard';
import MyRepairOrdersPageMechanic from '../pages/mechanic/MyRepairOrdersPage';
import SparePartsViewPage from '../pages/mechanic/SparePartsViewPage';
import MyRequestsPage from '../pages/MyRequestsPage';

import CustomerDashboard from '../pages/customer/CustomerDashboard';
import MyCarsPage from '../pages/customer/MyCarsPage';
import MyRepairOrdersPageCustomer from '../pages/customer/MyRepairOrdersPage';

import OwnerDashboard from '../pages/OwnerDashboard';
import PendingRequestsPage from '../pages/PendingRequestsPage';
import ReceiptsPage from '../pages/ReceiptsPage';
import AllDataPage from '../pages/AllDataPage';

const AppRouter: React.FC = () => {
  const { role, token } = useAuth();

  const getHomeElement = () => {
    if (!token) return <HomePage />;
    switch (role) {
      case 'Owner': return <OwnerDashboard />;
      case 'Admin': return <Navigate to="/customers" />;
      case 'Mechanic': return <MechanicDashboard />;
      case 'Customer': return <CustomerDashboard />;
      default: return <HomePage />;
    }
  };

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={getHomeElement()} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

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
      <Route path="/owner/all-data" element={<AllDataPage />} />

      {/* Mechanic Routes */}
      <Route path="/mechanic" element={<Navigate to="/" replace />} />
      <Route path="/mechanic/orders" element={<MyRepairOrdersPageMechanic />} />
      <Route path="/mechanic/spare-parts" element={<SparePartsViewPage />} />
      <Route path="/mechanic/requests" element={<MyRequestsPage />} />

      {/* Customer Routes */}
      <Route path="/customer" element={<Navigate to="/" replace />} />
      <Route path="/customer/cars" element={<MyCarsPage />} />
      <Route path="/customer/orders" element={<MyRepairOrdersPageCustomer />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRouter;
