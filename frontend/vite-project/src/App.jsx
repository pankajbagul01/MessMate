import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/Common/ProtectedRoute';

// Auth Components
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';

// Common Components
import Navbar from './components/Common/Navbar';

// Student Components
import Dashboard from './components/student/Dashboard';
import DailyBooking from './components/student/DailyBooking';
import DefaultPreferences from './components/student/DefaultPreferences';
import MyBookings from './components/student/MyBookings';

// Admin Components
import AdminDashboard from './components/Admin/AdminDashboard';
import MealConfigForm from './components/Admin/MealConfigForm';
import Analytics from './components/Admin/Analytics';
import WeeklyMenuConfig from './components/Admin/WeeklyMenuConfig';


import './App.css';

function App() {
  const { user } = useAuth();

  return (
    <div className="app">
      <Navbar />
      <div className="main-content">
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Student Routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />

          <Route path="/daily-booking/:date" element={
            <ProtectedRoute>
              <DailyBooking />
            </ProtectedRoute>
          } />

          <Route path="/default-preferences" element={
            <ProtectedRoute>
              <DefaultPreferences />
            </ProtectedRoute>
          } />

          <Route path="/my-bookings" element={
            <ProtectedRoute>
              <MyBookings />
            </ProtectedRoute>
          } />

          {/* Admin Routes */}
          <Route path="/admin" element={
            <ProtectedRoute adminOnly={true}>
              <AdminDashboard />
            </ProtectedRoute>
          } />

          <Route path="/admin/meal-config" element={
            <ProtectedRoute adminOnly={true}>
              <MealConfigForm />
            </ProtectedRoute>
          } />

          // Add this route
          <Route path="/admin/weekly-menu" element={
            <ProtectedRoute adminOnly={true}>
              <WeeklyMenuConfig />
            </ProtectedRoute>
          } />

          {/* Admin Analytics Route - with optional date */}
          <Route path="/admin/analytics" element={
            <ProtectedRoute adminOnly={true}>
              <Analytics />
            </ProtectedRoute>
          } />
          <Route path="/admin/analytics/:date" element={
            <ProtectedRoute adminOnly={true}>
              <Analytics />
            </ProtectedRoute>
          } />

          {/* Default Redirect */}
          <Route path="/" element={
            <Navigate to={user ? "/dashboard" : "/login"} />
          } />

          <Route path="*" element={
            <Navigate to={user ? "/dashboard" : "/login"} />
          } />
        </Routes>
      </div>
    </div>
  );
}

export default App;