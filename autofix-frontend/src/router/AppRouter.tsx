import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import HomePage from '../pages/HomePage';
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
import SparePartsViewPage from '../pages/mechanic/SparePartsViewPage';
import CustomerDashboard from '../pages/customer/CustomerDashboard';
import MyCarsPage from '../pages/customer/MyCarsPage';
import MyRepairOrdersPageCustomer from '../pages/customer/MyRepairOrdersPage';

const AppRouter: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Admin Routes */}
      <Route path="/customers" element={<CustomersPage />} />
      <Route path="/customers/new" element={<CustomersPage openModal={true} />} />
      <Route path="/customers/:id" element={<CustomerDetailPage />} />
      <Route path="/mechanics" element={<MechanicsPage />} />
      <Route path="/repair-orders" element={<RepairOrdersPage />} />
      <Route path="/services" element={<ServicesPage />} />
      <Route path="/spare-parts" element={<SparePartsPage />} />
      <Route path="/spare-part-categories" element={<SparePartCategoriesPage />} />

      {/* Mechanic Routes */}
      <Route path="/mechanic" element={<MechanicDashboard />} />
      <Route path="/mechanic/orders" element={<MyRepairOrdersPageMechanic />} />
      <Route path="/mechanic/spare-parts" element={<SparePartsViewPage />} />

      {/* Customer Routes */}
      <Route path="/customer" element={<CustomerDashboard />} />
      <Route path="/customer/cars" element={<MyCarsPage />} />
      <Route path="/customer/orders" element={<MyRepairOrdersPageCustomer />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRouter;
