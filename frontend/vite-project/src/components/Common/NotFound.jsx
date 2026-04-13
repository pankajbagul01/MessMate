import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './NotFound.css';

const NotFound = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="nf-container">
      <div className="nf-card">
        <div className="nf-code">404</div>
        <h1 className="nf-title">Page not found</h1>
        <p className="nf-message">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="nf-actions">
          <button className="nf-btn-secondary" onClick={() => navigate(-1)}>
            ← Go back
          </button>
          <button
            className="nf-btn-primary"
            onClick={() => navigate(user ? (user.role === 'admin' ? '/admin' : '/dashboard') : '/login')}
          >
            {user ? 'Go to Dashboard' : 'Go to Login'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;