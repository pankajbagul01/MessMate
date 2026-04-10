import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyBookings, cancelBooking } from '../../services/api';
import './MyBookings.css';

const MEAL_ICONS = { breakfast: '🥐', lunch: '🍛', dinner: '🍽️' };

const MyBookings = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancellingId, setCancellingId] = useState(null);
  const [filter, setFilter] = useState('upcoming');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await getMyBookings();
      setBookings(res.data);
    } catch (err) {
      setError('Failed to load bookings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  const canCancel = (date) => {
    const bookingDate = new Date(date + 'T00:00:00');
    const now = new Date();
    const deadline = new Date(bookingDate);
    deadline.setDate(deadline.getDate() - 1);
    deadline.setHours(23, 59, 59, 999);
    return bookingDate >= new Date(today + 'T00:00:00') && now <= deadline;
  };

  const handleCancel = async (bookingId, date, mealType) => {
    if (!window.confirm(`Cancel ${mealType} on ${formatDate(date)}?`)) return;
    setCancellingId(bookingId);
    try {
      await cancelBooking(bookingId);
      setBookings(prev => prev.filter(b => b._id !== bookingId));
      setSuccessMsg('Booking cancelled successfully.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel booking.');
      setTimeout(() => setError(''), 3000);
    } finally {
      setCancellingId(null);
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  };

  const isUpcoming = (dateStr) => dateStr >= today;

  const filteredBookings = bookings.filter(b => {
    if (filter === 'upcoming') return isUpcoming(b.date);
    if (filter === 'past') return !isUpcoming(b.date);
    return true;
  });

  const groupedByDate = filteredBookings.reduce((acc, booking) => {
    if (!acc[booking.date]) acc[booking.date] = [];
    acc[booking.date].push(booking);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedByDate).sort((a, b) =>
    filter === 'past' ? b.localeCompare(a) : a.localeCompare(b)
  );

  const upcomingCount = bookings.filter(b => isUpcoming(b.date)).length;
  const pastCount = bookings.filter(b => !isUpcoming(b.date)).length;

  const getTomorrow = () => {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    return t.toISOString().split('T')[0];
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading your bookings...</p>
      </div>
    );
  }

  return (
    <div className="my-bookings-page">
      <div className="bookings-header">
        <div className="header-text">
          <h1>📋 My Bookings</h1>
          <p>View and manage all your meal bookings</p>
        </div>
        <button className="action-btn primary" onClick={() => navigate('/daily-booking/' + getTomorrow())}>
          + Book Tomorrow
        </button>
      </div>

      {successMsg && <div className="alert alert-success">{successMsg}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="booking-stats">
        <div className={`stat-card ${filter === 'upcoming' ? 'active' : ''}`} onClick={() => setFilter('upcoming')}>
          <span className="stat-number upcoming">{upcomingCount}</span>
          <span className="stat-label">Upcoming</span>
        </div>
        <div className={`stat-card ${filter === 'past' ? 'active' : ''}`} onClick={() => setFilter('past')}>
          <span className="stat-number past">{pastCount}</span>
          <span className="stat-label">Past</span>
        </div>
        <div className={`stat-card ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
          <span className="stat-number total">{bookings.length}</span>
          <span className="stat-label">Total</span>
        </div>
      </div>

      <div className="filter-tabs">
        {['upcoming', 'past', 'all'].map(f => (
          <button
            key={f}
            className={`filter-tab ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            <span className="tab-count">
              {f === 'upcoming' ? upcomingCount : f === 'past' ? pastCount : bookings.length}
            </span>
          </button>
        ))}
      </div>

      {sortedDates.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🍽️</div>
          <h3>No {filter !== 'all' ? filter : ''} bookings found</h3>
          <p>
            {filter === 'upcoming'
              ? "You haven't booked any upcoming meals yet."
              : filter === 'past'
              ? "No past bookings to show."
              : "You haven't made any bookings yet."}
          </p>
          <button className="action-btn primary" onClick={() => navigate('/dashboard')}>
            Go to Dashboard
          </button>
        </div>
      ) : (
        <div className="bookings-list">
          {sortedDates.map(date => (
            <div key={date} className="date-group">
              <div className="date-label-row">
                <span className="date-text">{formatDate(date)}</span>
                {date === today && <span className="day-badge today-badge">Today</span>}
                {date > today && <span className="day-badge upcoming-badge">Upcoming</span>}
                {date < today && <span className="day-badge past-badge">Past</span>}
              </div>
              <div className="meals-row">
                {[...groupedByDate[date]]
                  .sort((a, b) =>
                    ['breakfast', 'lunch', 'dinner'].indexOf(a.mealType) -
                    ['breakfast', 'lunch', 'dinner'].indexOf(b.mealType)
                  )
                  .map(booking => (
                    <div key={booking._id} className={`booking-card ${isUpcoming(date) ? 'upcoming' : 'past'}`}>
                      <div className="booking-card-header">
                        <span className="meal-icon-sm">{MEAL_ICONS[booking.mealType]}</span>
                        <span className="meal-name">
                          {booking.mealType.charAt(0).toUpperCase() + booking.mealType.slice(1)}
                        </span>
                        <span className={`meal-badge ${isUpcoming(date) ? 'booked' : 'completed'}`}>
                          {isUpcoming(date) ? '✓ Booked' : '✓ Done'}
                        </span>
                      </div>

                      {booking.items && booking.items.length > 0 && (
                        <div className="booking-items">
                          {booking.items.map((item, idx) => (
                            <div key={idx} className="booking-item">
                              <span>{item.name}</span>
                              {item.quantity && <span className="item-qty">×{item.quantity}</span>}
                            </div>
                          ))}
                        </div>
                      )}

                      {canCancel(date) && (
                        <button
                          className="cancel-btn"
                          onClick={() => handleCancel(booking._id, date, booking.mealType)}
                          disabled={cancellingId === booking._id}
                        >
                          {cancellingId === booking._id ? 'Cancelling...' : 'Cancel Booking'}
                        </button>
                      )}

                      {isUpcoming(date) && !canCancel(date) && (
                        <p className="deadline-passed">Cancellation deadline passed</p>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {filter !== 'past' && upcomingCount > 0 && (
        <div className="cancellation-note">
          💡 Cancel bookings before 11:59 PM of the previous day.
        </div>
      )}
    </div>
  );
};

export default MyBookings;