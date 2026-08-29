import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CivicProvider } from './context/CivicContext';
import { AppLayout } from './components/layout/AppLayout';
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
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="issues" element={<IssuesQueuePage />} />
            <Route path="priority-engine" element={<PriorityEnginePage />} />
            <Route path="resources" element={<ResourcesPage />} />
            <Route path="map" element={<CivicMapPage />} />
            <Route path="citizen-portal" element={<CitizenPortalPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </CivicProvider>
  );
};

export default App;
