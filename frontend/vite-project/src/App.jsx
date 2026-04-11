import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/Common/ProtectedRoute';
import ErrorBoundary from './components/Common/ErrorBoundary';

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
import AdminDashboard  from './components/Admin/AdminDashboard';
import MealConfigForm  from './components/Admin/MealConfigForm';
import Analytics       from './components/Admin/Analytics';
import WeeklyMenuConfig from './components/Admin/WeeklyMenuConfig';

import './App.css';

// Wrap a component in its own error boundary so one broken page
// doesn't take down the whole app.
const Safe = ({ children }) => <ErrorBoundary>{children}</ErrorBoundary>;

function App() {
  const { user } = useAuth();

  return (
    <div className="app">
      <Navbar />
      <div className="main-content">
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

          {/* Fallbacks */}
          <Route path="/"  element={<Navigate to={user ? "/dashboard" : "/login"} />} />
          <Route path="*"  element={<Navigate to={user ? "/dashboard" : "/login"} />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;