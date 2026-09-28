import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/common/Header';
import { Footer } from './components/common/Footer';
import { RoleModal } from './components/common/RoleModal';
import { CartDrawer } from './components/customer/CartDrawer';
import { CustomerStorePage } from './pages/CustomerStorePage';
import { WorkerPanelPage } from './pages/WorkerPanelPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';

import { ErrorBoundary } from './components/common/ErrorBoundary';

const AppContent: React.FC = () => {
  const { userRole } = useApp();

  return (
    <div className="min-h-screen bg-surface flex flex-col font-sans text-on-surface">
      {/* Header is visible on customer view */}
      {userRole === 'customer' && <Header />}

      {/* Main View Switcher with ErrorBoundary protection */}
      <main className="flex-1">
        <ErrorBoundary fallbackTitle="Error al cargar la sección">
          {userRole === 'customer' && <CustomerStorePage />}
          {userRole === 'worker' && <WorkerPanelPage />}
          {userRole === 'admin' && <AdminDashboardPage />}
        </ErrorBoundary>
      </main>

      {/* Footer is visible on customer view */}
      {userRole === 'customer' && <Footer />}

      {/* Cart Drawer */}
      <CartDrawer />

      {/* Role Switcher Modal */}
      <RoleModal />
    </div>
  );
};

export function App() {
  return (
    <ErrorBoundary fallbackTitle="Error general de la aplicación">
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ErrorBoundary>
  );
}

export default App;
