import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CivicProvider } from './context/CivicContext';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { IssuesQueuePage } from './pages/IssuesQueuePage';
import { PriorityEnginePage } from './pages/PriorityEnginePage';
import { ResourcesPage } from './pages/ResourcesPage';
import { CivicMapPage } from './pages/CivicMapPage';
import { CitizenPortalPage } from './pages/CitizenPortalPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';

export const App: React.FC = () => {
  return (
    <CivicProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          {/* Public Login Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Application Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<AppLayout />}>
              {/* Officer & Admin Staff Routes */}
              <Route element={<ProtectedRoute allowedRoles={['officer', 'admin']} />}>
                <Route index element={<DashboardPage />} />
                <Route path="priority-engine" element={<PriorityEnginePage />} />
                <Route path="resources" element={<ResourcesPage />} />
                <Route path="analytics" element={<AnalyticsPage />} />
              </Route>

              {/* Admin Only Route */}
              <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                <Route path="settings" element={<SettingsPage />} />
              </Route>

              {/* Shared Routes (Citizen, Officer, Admin) */}
              <Route path="issues" element={<IssuesQueuePage />} />
              <Route path="map" element={<CivicMapPage />} />
              <Route path="citizen-portal" element={<CitizenPortalPage />} />
              <Route path="notifications" element={<NotificationsPage />} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </CivicProvider>
  );
};

export default App;
