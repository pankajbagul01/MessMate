import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) {
    return (
      <nav className="navbar">
        <div className="nav-container">
          <Link to="/" className="nav-logo">
            🍽️ Mess Mate
          </Link>
          <div className="nav-links">
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/dashboard" className="nav-logo">
          🍽️ Mess Mate
        </Link>
        
        <div className="nav-links">
          {user.role === 'admin' ? (
            // Admin Links
            <>
              <Link to="/admin">Dashboard</Link>
              <Link to="/admin/weekly-menu">Weekly Menu</Link>
              <Link to="/admin/analytics">Analytics</Link>
            </>
          ) : (
            // Student Links
            <>
              <Link to="/dashboard">Dashboard</Link>
              <Link to="/weekly-menu">Weekly Menu</Link>
              <Link to="/my-bookings">My Bookings</Link>
              <Link to="/default-preferences">Preferences</Link>
            </>
          )}
          
          <span className="user-name">👤 {user.name}</span>
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;