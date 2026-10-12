import React from 'react';
import { createBrowserRouter, RouterProvider, Route, createRoutesFromElements, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/layout/Layout';
import { LayoutDashboard } from 'lucide-react';

import LoginPage from '../pages/LoginPage';

import AdminDashboardPage from '../pages/admin/AdminDashboardPage';
import WorkOrdersPage from '../pages/admin/WorkOrdersPage';
import InspectionsListPage from '../pages/admin/InspectionsListPage';
import InspectionEditorPage from '../pages/admin/InspectionEditorPage';
import InspectionPrintView from '../pages/admin/InspectionPrintView';
import InspectionBlankFormPage from '../pages/admin/InspectionBlankFormPage';

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
import CustomerDashboardPage from '../pages/customer/CustomerDashboardPage';
import MyCarsPage from '../pages/customer/MyCarsPage';
import MyRepairOrdersPageCustomer from '../pages/customer/MyRepairOrdersPage';
import CartPage from '../pages/customer/CartPage';

import OwnerDashboard from '../pages/OwnerDashboard';
import ReceiptsPage from '../pages/ReceiptsPage';
import AllDataPage from '../pages/AllDataPage';
import BackupRestorePage from '../pages/admin/BackupRestorePage';

const HomeRoute: React.FC = () => {
  const { role, token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  switch (role) {
    case 'Owner': return <AdminDashboardPage />;
    case 'Admin': return <AdminDashboardPage />;
    case 'Mechanic': return <MechanicDashboard />;
    case 'Customer': return <CustomerDashboardPage />;
    default: return <Navigate to="/login" replace />;
  }
};

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<Layout />}>
      {/* Public Routes */}
      <Route path="/" element={<HomeRoute />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Admin/Owner Shared Routes */}
      <Route path="/admin-dashboard" element={<AdminDashboardPage />} />
      <Route path="/customers" element={<CustomersPage />} />
      <Route path="/customers/new" element={<CustomersPage openModal={true} />} />
      <Route path="/customers/:id" element={<CustomerDetailPage />} />
      <Route path="/work-orders" element={<WorkOrdersPage />} />
      <Route path="/inspections" element={<InspectionsListPage />} />
      <Route path="/inspections/new" element={<InspectionEditorPage />} />
      <Route path="/inspections/:id/edit" element={<InspectionEditorPage />} />
      <Route path="/inspections/:id/print" element={<InspectionPrintView />} />
      <Route path="/inspections/blank-form" element={<InspectionBlankFormPage />} />
      <Route path="/mechanics" element={<MechanicsPage />} />
      <Route path="/repair-orders" element={<RepairOrdersPage />} />
      <Route path="/services" element={<ServicesPage />} />
      <Route path="/spare-parts" element={<SparePartsPage />} />

      {/* Owner-Specific Routes */}
      <Route path="/owner/legacy-dashboard" element={<OwnerDashboard />} />
      <Route path="/owner/receipts" element={<ReceiptsPage />} />
      <Route path="/owner/all-data" element={<AllDataPage />} />
      <Route path="/backup-restore" element={<BackupRestorePage />} />

      {/* Mechanic Routes */}
      <Route path="/mechanic" element={<Navigate to="/" replace />} />
      <Route path="/mechanic/repair-orders" element={<MyRepairOrdersPageMechanic />} />
      <Route path="/mechanic/available-orders" element={<AvailableRepairOrdersPage />} />
      <Route path="/mechanic/spare-parts" element={<SparePartsViewPage />} />

      {/* Customer Routes */}
      <Route path="/customer" element={<Navigate to="/" replace />} />
      <Route path="/customer/dashboard" element={<CustomerDashboardPage />} />
      <Route path="/marketplace" element={<MarketplacePage />} />
      <Route path="/customer/cars" element={<MyCarsPage />} />
      <Route path="/customer/repair-orders" element={<MyRepairOrdersPageCustomer />} />
      <Route path="/cart" element={<CartPage />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Route>
  )
);

const AppRouter: React.FC = () => {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-main)' }}>
        <LayoutDashboard className="animate-spin text-accent" size={48} />
      </div>
    );
  }

  return <RouterProvider router={router} />;
};

export default AppRouter;
