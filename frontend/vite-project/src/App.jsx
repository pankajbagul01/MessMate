import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/Common/ProtectedRoute';
import ErrorBoundary  from './components/Common/ErrorBoundary';
import NotFound       from './components/Common/NotFound';
import usePageTitle   from './hooks/usePageTitle';

// Auth
import Login    from './components/Auth/Login';
import Register from './components/Auth/Register';

// Common
import Navbar from './components/Common/Navbar';

// Student
import Dashboard          from './components/student/Dashboard';
import DailyBooking       from './components/student/DailyBooking';
import DefaultPreferences from './components/student/DefaultPreferences';
import MyBookings         from './components/student/MyBookings';
import WeeklyMenu         from './components/student/WeeklyMenu';

// Admin
import AdminDashboard   from './components/Admin/AdminDashboard';
import MealConfigForm   from './components/Admin/MealConfigForm';
import Analytics        from './components/Admin/Analytics';
import WeeklyMenuConfig from './components/Admin/WeeklyMenuConfig';
import FeesManager      from './components/Admin/FeesManager';

import './App.css';

const Safe = ({ children }) => <ErrorBoundary>{children}</ErrorBoundary>;

function AppRoutes() {
  // Updates document.title on every route change
  usePageTitle();
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public */}
      <Route path="/login"    element={<Safe><Login /></Safe>} />
      <Route path="/register" element={<Safe><Register /></Safe>} />

      {/* Student */}
      <Route path="/dashboard" element={
        <ProtectedRoute><Safe><Dashboard /></Safe></ProtectedRoute>
      } />
      <Route path="/daily-booking/:date" element={
        <ProtectedRoute><Safe><DailyBooking /></Safe></ProtectedRoute>
      } />
      <Route path="/default-preferences" element={
        <ProtectedRoute><Safe><DefaultPreferences /></Safe></ProtectedRoute>
      } />
      <Route path="/my-bookings" element={
        <ProtectedRoute><Safe><MyBookings /></Safe></ProtectedRoute>
      } />
      <Route path="/weekly-menu" element={
        <ProtectedRoute><Safe><WeeklyMenu /></Safe></ProtectedRoute>
      } />

      {/* Admin */}
      <Route path="/admin" element={
        <ProtectedRoute adminOnly><Safe><AdminDashboard /></Safe></ProtectedRoute>
      } />
      <Route path="/admin/meal-config" element={
        <ProtectedRoute adminOnly><Safe><MealConfigForm /></Safe></ProtectedRoute>
      } />
      <Route path="/admin/weekly-menu" element={
        <ProtectedRoute adminOnly><Safe><WeeklyMenuConfig /></Safe></ProtectedRoute>
      } />
      <Route path="/admin/analytics" element={
        <ProtectedRoute adminOnly><Safe><Analytics /></Safe></ProtectedRoute>
      } />
      <Route path="/admin/analytics/:date" element={
        <ProtectedRoute adminOnly><Safe><Analytics /></Safe></ProtectedRoute>
      } />
      <Route path="/admin/fees" element={
        <ProtectedRoute adminOnly><Safe><FeesManager /></Safe></ProtectedRoute>
      } />

      {/* Root redirect */}
      <Route path="/" element={
        <Navigate to={user ? (user.role === 'admin' ? '/admin' : '/dashboard') : '/login'} />
      } />

      {/* 404 — catch all unknown routes */}
      <Route path="*" element={<Safe><NotFound /></Safe>} />
    </Routes>
  );
}

function App() {
  return (
    <div className="app">
      <Navbar />
      <div className="main-content">
        <AppRoutes />
      </div>
    </div>
  );
}

export default App;