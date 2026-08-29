import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { BlackoutBanner } from '../common/BlackoutBanner';
import { BlackoutSimModal } from '../common/BlackoutSimModal';

export const AppLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f8fafc] font-sans text-[#1b1b1d]">
      {/* Full-Height Left Sidebar */}
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      
      {/* Right Column: Navbar on Top + Scrollable Content Below */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <BlackoutBanner />
        
        <main className="flex-1 overflow-y-auto bg-[#f8fafc] p-4 sm:p-6 lg:p-8 min-h-0">
          <div className="max-w-7xl mx-auto space-y-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Global Blackout Challenge Modal */}
      <BlackoutSimModal />
    </div>
  );
};
