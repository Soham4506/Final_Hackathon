import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useCivic } from '../../context/CivicContext';
import { UserRole } from '../../types';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { isAuthenticated, userRole } = useCivic();
  const navigate = useNavigate();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    if (userRole === 'citizen') {
      return <Navigate to="/citizen-portal" replace />;
    }

    return (
      <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-3xl max-w-xl mx-auto my-12 space-y-4 text-slate-100">
        <div className="w-14 h-14 rounded-2xl bg-red-950/80 border border-red-800 text-red-400 flex items-center justify-center mx-auto">
          <ShieldAlert size={28} />
        </div>
        <h2 className="text-xl font-bold text-white">Access Restricted: Council Admin Only</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          Your current role (<strong className="capitalize text-emerald-400">{userRole}</strong>) does not have administrative authorization to modify priority formula parameters or alter council system settings.
        </p>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Return to Previous View</span>
        </button>
      </div>
    );
  }

  return <Outlet />;
};
