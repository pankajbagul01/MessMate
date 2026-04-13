import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './navbar.css';

const STUDENT_NAV = [
  { to: '/dashboard',          label: 'Dashboard'    },
  { to: '/weekly-menu',        label: 'Weekly Menu'  },
  { to: '/my-bookings',        label: 'My Bookings'  },
  { to: '/default-preferences',label: 'Preferences'  },
];

const ADMIN_NAV = [
  { to: '/admin',              label: 'Dashboard'    },
  { to: '/admin/weekly-menu',  label: 'Weekly Menu'  },
  { to: '/admin/meal-config',  label: 'Meal Config'  },
  { to: '/admin/analytics',    label: 'Analytics'    },
  { to: '/admin/fees',         label: 'Fees'         },
];

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();
  const location         = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close mobile menu on route change
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    if (window.confirm('Log out of MessMate?')) {
      logout();
      navigate('/login');
    }
  };

  const isActive = (to) => {
    if (to === '/admin') return location.pathname === '/admin';
    if (to === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(to);
  };

  const navLinks = user?.role === 'admin' ? ADMIN_NAV : STUDENT_NAV;

  return (
    <nav className="navbar" ref={menuRef}>
      <div className="nav-container">

        {/* Logo */}
        <Link to={user ? (user.role === 'admin' ? '/admin' : '/dashboard') : '/'} className="nav-logo">
          🍽️ MessMate
        </Link>

        {/* Desktop links */}
        {user && (
          <div className="nav-links-desktop">
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`nav-link ${isActive(link.to) ? 'active' : ''}`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}

        {/* Public desktop links */}
        {!user && (
          <div className="nav-links-desktop">
            <Link to="/login"    className={`nav-link ${isActive('/login')    ? 'active' : ''}`}>Login</Link>
            <Link to="/register" className={`nav-link ${isActive('/register') ? 'active' : ''}`}>Register</Link>
          </div>
        )}

        {/* Right side */}
        <div className="nav-right">
          {user && (
            <>
              <span className="nav-username">
                <span className="nav-avatar">{user.name.charAt(0).toUpperCase()}</span>
                <span className="nav-name-text">{user.name.split(' ')[0]}</span>
              </span>
              <button className="nav-logout-btn" onClick={handleLogout}>
                Logout
              </button>
            </>
          )}

          {/* Hamburger — mobile only */}
          {user && (
            <button
              className={`nav-hamburger ${menuOpen ? 'open' : ''}`}
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Toggle menu"
            >
              <span /><span /><span />
            </button>
          )}
        </div>
      </div>

      {/* Mobile drawer */}
      {user && (
        <div className={`nav-mobile-drawer ${menuOpen ? 'open' : ''}`}>
          <div className="nav-mobile-user">
            <span className="nav-avatar large">{user.name.charAt(0).toUpperCase()}</span>
            <div>
              <div className="nav-mobile-name">{user.name}</div>
              <div className="nav-mobile-role">{user.role}</div>
            </div>
          </div>
          <div className="nav-mobile-links">
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`nav-mobile-link ${isActive(link.to) ? 'active' : ''}`}
              >
                {link.label}
              </Link>
            ))}
          </div>
          <button className="nav-mobile-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;