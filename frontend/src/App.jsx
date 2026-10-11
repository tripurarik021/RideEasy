import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store';
import { connectSocket } from './services/socket';
import { useSocket } from './hooks/useSocket';

// Pages
import LoginPage from './components/auth/LoginPage';
import RegisterPage from './components/auth/RegisterPage';
import PassengerDashboard from './components/booking/PassengerDashboard';
import DriverDashboard from './components/driver/DriverDashboard';
import RideHistoryPage from './components/booking/RideHistoryPage';
import RatingPage from './components/rating/RatingPage';

function SocketInitializer() {
  useSocket(); // Wire up global socket event handlers
  return null;
}

function PrivateRoute({ children, role }) {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
}

function RoleRouter() {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  return user.role === 'driver'
    ? <Navigate to="/driver" replace />
    : <Navigate to="/ride" replace />;
}

export default function App() {
  const { user, accessToken } = useAuthStore();

  // Reconnect socket on page reload if token exists
  useEffect(() => {
    if (accessToken) connectSocket(accessToken);
  }, [accessToken]);

  return (
    <BrowserRouter>
      {user && <SocketInitializer />}
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route path="/" element={<RoleRouter />} />

        <Route path="/ride" element={
          <PrivateRoute role="passenger">
            <PassengerDashboard />
          </PrivateRoute>
        } />

        <Route path="/ride/history" element={
          <PrivateRoute role="passenger">
            <RideHistoryPage />
          </PrivateRoute>
        } />

        <Route path="/ride/:id/rate" element={
          <PrivateRoute>
            <RatingPage />
          </PrivateRoute>
        } />

        <Route path="/driver" element={
          <PrivateRoute role="driver">
            <DriverDashboard />
          </PrivateRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
