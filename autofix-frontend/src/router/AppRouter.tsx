import React from 'react';
import { createBrowserRouter, RouterProvider, Route, createRoutesFromElements, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/layout/Layout';
import { LayoutDashboard } from 'lucide-react';

import LoginPage from '../pages/LoginPage';

import AdminDashboardPage from '../pages/admin/AdminDashboardPage';
import CustomersAndWorkOrdersPage from '../pages/admin/CustomersAndWorkOrdersPage';
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
import InvoicesPage from '../pages/admin/InvoicesPage';
import CreditNotesPage from '../pages/admin/CreditNotesPage';
import ExpensesPage from '../pages/admin/ExpensesPage';

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
  return <AdminDashboardPage />;
};

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<Layout />}>
      {/* The THREE Main Pages */}
      <Route path="/" element={<HomeRoute />} />
      <Route path="/spare-parts" element={<SparePartsPage />} />
      <Route path="/backup-restore" element={<BackupRestorePage />} />

      {/* Legacy / Hidden Routes: Preserved in code, redirected to Home Dashboard */}
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/admin-dashboard" element={<Navigate to="/" replace />} />
      <Route path="/workshop-orders" element={<Navigate to="/" replace />} />
      <Route path="/customers" element={<Navigate to="/" replace />} />
      <Route path="/customers/:id" element={<Navigate to="/" replace />} />
      <Route path="/work-orders" element={<Navigate to="/" replace />} />
      <Route path="/invoices" element={<Navigate to="/" replace />} />
      <Route path="/credit-notes" element={<Navigate to="/" replace />} />
      <Route path="/expenses" element={<Navigate to="/" replace />} />
      <Route path="/inspections" element={<Navigate to="/" replace />} />
      <Route path="/inspections/*" element={<Navigate to="/" replace />} />
      <Route path="/mechanics" element={<Navigate to="/" replace />} />
      <Route path="/repair-orders" element={<Navigate to="/" replace />} />
      <Route path="/services" element={<Navigate to="/" replace />} />
      <Route path="/workmanship-prices" element={<Navigate to="/" replace />} />
      <Route path="/owner/*" element={<Navigate to="/" replace />} />
      <Route path="/mechanic/*" element={<Navigate to="/" replace />} />
      <Route path="/customer/*" element={<Navigate to="/" replace />} />
      <Route path="/marketplace" element={<Navigate to="/" replace />} />
      <Route path="/cart" element={<Navigate to="/" replace />} />

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
