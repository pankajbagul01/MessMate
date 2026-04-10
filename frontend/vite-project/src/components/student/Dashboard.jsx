import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getSmartBooking, cancelBooking, getWeeklyMenu, getUpcomingClosures } from '../../services/api';
import './Dashboard.css';

const MEAL_ICONS  = { breakfast: '🥐', lunch: '🍛', dinner: '🍽️' };
const MEAL_TIMES  = { breakfast: '7–9 AM', lunch: '12–2 PM', dinner: '7–9 PM' };
const MEALS       = ['breakfast', 'lunch', 'dinner'];
const DAY_NAMES   = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
const DAY_SHORT   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading]               = useState(true);
  const [todayData, setTodayData]           = useState(null);
  const [tomorrowData, setTomorrowData]     = useState(null);
  const [weeklyMenu, setWeeklyMenu]         = useState([]);
  const [upcomingClosures, setUpcomingClosures] = useState([]);
  const [cancellingId, setCancellingId]     = useState(null);
  const [successMsg, setSuccessMsg]         = useState('');
  const [errorMsg, setErrorMsg]             = useState('');

  const todayDate    = new Date().toISOString().split('T')[0];
  const tomorrowDate = (() => { const t = new Date(); t.setDate(t.getDate()+1); return t.toISOString().split('T')[0]; })();

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [todayRes, tomorrowRes, menuRes, closuresRes] = await Promise.allSettled([
        getSmartBooking(todayDate),
        getSmartBooking(tomorrowDate),
        getWeeklyMenu(),
        getUpcomingClosures().catch(() => ({ data: [] })),
      ]);
      if (todayRes.status    === 'fulfilled') setTodayData(todayRes.value.data);
      if (tomorrowRes.status === 'fulfilled') setTomorrowData(tomorrowRes.value.data);
      if (menuRes.status     === 'fulfilled') setWeeklyMenu(menuRes.value.data || []);
      if (closuresRes.status === 'fulfilled') {
        const today = new Date().toISOString().split('T')[0];
        setUpcomingClosures((closuresRes.value.data || []).filter(c => c.date >= today).slice(0, 3));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // ---- helpers ----
  const getBookings = (smartData) => {
    if (!smartData || !smartData.data) return [];
    if (smartData.source === 'booking') return smartData.data;
    if (smartData.source === 'default') return smartData.data;
    return [];
  };

  const getBookingForMeal = (smartData, mealType) => {
    const list = getBookings(smartData);
    return list.find(b => b.mealType === mealType) || null;
  };

  const isClosedForMeal = (smartData, mealType) => {
    return smartData?.closures?.affectedMeals?.includes(mealType);
  };

  const canCancelBooking = (date) => {
    const bookingDate = new Date(date + 'T00:00:00');
    const now = new Date();
    const deadline = new Date(bookingDate);
    deadline.setDate(deadline.getDate() - 1);
    deadline.setHours(23, 59, 59, 999);
    return bookingDate >= new Date(todayDate + 'T00:00:00') && now <= deadline;
  };

  const handleCancel = async (bookingId, mealType) => {
    if (!window.confirm(`Cancel ${mealType} booking for tomorrow?`)) return;
    setCancellingId(bookingId);
    try {
      await cancelBooking(bookingId);
      setSuccessMsg(`${mealType.charAt(0).toUpperCase()+mealType.slice(1)} booking cancelled.`);
      setTimeout(() => setSuccessMsg(''), 3000);
      const res = await getSmartBooking(tomorrowDate);
      setTomorrowData(res.data);
    } catch (e) {
      setErrorMsg(e.response?.data?.message || 'Failed to cancel.');
      setTimeout(() => setErrorMsg(''), 3000);
    } finally {
      setCancellingId(null);
    }
  };

  // ---- weekly menu helpers ----
  const getMenuForDay = (dayIndex) => weeklyMenu.find(m => m.dayOfWeek === DAY_NAMES[dayIndex]);
  const getWeekDays = () => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      return d;
    });
  };

  const formatGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) return (
    <div className="loading-container">
      <div className="spinner"></div>
      <p>Loading dashboard...</p>
    </div>
  );

  const tomorrowBookings = getBookings(tomorrowData);
  const bookedMealCount  = MEALS.filter(m => getBookingForMeal(tomorrowData, m) && !isClosedForMeal(tomorrowData, m)).length;
  const weekDays         = getWeekDays();

  return (
    <div className="dashboard">

      {/* ── Alerts ── */}
      {successMsg && <div className="dash-alert success">{successMsg}</div>}
      {errorMsg   && <div className="dash-alert error">{errorMsg}</div>}

      {/* ── Closure banner ── */}
      {upcomingClosures.length > 0 && (
        <div className="closure-banner">
          ⚠️ Upcoming closure: <strong>{upcomingClosures[0].date}</strong> — {upcomingClosures[0].reason}
          {upcomingClosures.length > 1 && <span> (+{upcomingClosures.length - 1} more)</span>}
        </div>
      )}

      {/* ── Header ── */}
      <div className="dash-header">
        <div>
          <h1>{formatGreeting()}, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="dash-date">{new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</p>
        </div>
        <button className="btn-book-now" onClick={() => navigate('/daily-booking/' + tomorrowDate)}>
          + Book Tomorrow
        </button>
      </div>

      {/* ── TODAY section ── */}
      <section className="dash-section">
        <div className="section-title">
          <span className="section-icon">📅</span>
          <h2>Today's Meals</h2>
          <span className="section-note">View only — bookings closed for today</span>
        </div>

        <div className="meals-grid">
          {MEALS.map(meal => {
            const booking = getBookingForMeal(todayData, meal);
            const closed  = isClosedForMeal(todayData, meal);
            const status  = closed ? 'closed' : booking ? 'booked' : 'not-booked';
            return (
              <div key={meal} className={`meal-card status-${status}`}>
                <div className="meal-card-top">
                  <span className="meal-emoji">{MEAL_ICONS[meal]}</span>
                  <div className="meal-card-info">
                    <span className="meal-card-name">{meal.charAt(0).toUpperCase()+meal.slice(1)}</span>
                    <span className="meal-card-time">{MEAL_TIMES[meal]}</span>
                  </div>
                  <span className={`status-pill pill-${status}`}>
                    {closed ? 'Closed' : booking ? '✓ Booked' : 'Skipped'}
                  </span>
                </div>
                {booking && booking.items?.length > 0 && (
                  <div className="meal-items-list">
                    {booking.items.map((item, i) => (
                      <span key={i} className="item-chip">
                        {item.name}{item.quantity ? ` ×${item.quantity}` : ''}
                      </span>
                    ))}
                  </div>
                )}
                {!booking && !closed && (
                  <p className="meal-empty-note">No booking for this meal</p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── TOMORROW section ── */}
      <section className="dash-section">
        <div className="section-title">
          <span className="section-icon">🗓️</span>
          <h2>Tomorrow's Bookings</h2>
          <span className="section-note">{bookedMealCount}/3 meals booked</span>
        </div>

        <div className="meals-grid">
          {MEALS.map(meal => {
            const booking = getBookingForMeal(tomorrowData, meal);
            const closed  = isClosedForMeal(tomorrowData, meal);
            const isDefault = tomorrowData?.source === 'default';
            const status  = closed ? 'closed' : booking ? (isDefault ? 'default' : 'booked') : 'not-booked';

            return (
              <div key={meal} className={`meal-card status-${status}`}>
                <div className="meal-card-top">
                  <span className="meal-emoji">{MEAL_ICONS[meal]}</span>
                  <div className="meal-card-info">
                    <span className="meal-card-name">{meal.charAt(0).toUpperCase()+meal.slice(1)}</span>
                    <span className="meal-card-time">{MEAL_TIMES[meal]}</span>
                  </div>
                  <span className={`status-pill pill-${status}`}>
                    {closed ? 'Closed' : booking ? (isDefault ? '⚙ Default' : '✓ Booked') : 'Not booked'}
                  </span>
                </div>

                {booking && booking.items?.length > 0 && (
                  <div className="meal-items-list">
                    {booking.items.map((item, i) => (
                      <span key={i} className="item-chip">
                        {item.name}{item.quantity ? ` ×${item.quantity}` : ''}
                      </span>
                    ))}
                  </div>
                )}

                {!closed && (
                  <div className="meal-card-actions">
                    {booking && !isDefault && canCancelBooking(tomorrowDate) && (
                      <button
                        className="btn-cancel-meal"
                        disabled={cancellingId === booking._id}
                        onClick={() => handleCancel(booking._id, meal)}
                      >
                        {cancellingId === booking._id ? 'Cancelling...' : 'Cancel'}
                      </button>
                    )}
                    <button
                      className="btn-edit-meal"
                      onClick={() => navigate('/daily-booking/' + tomorrowDate)}
                    >
                      {booking ? 'Edit' : 'Book'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── WEEKLY MENU section ── */}
      <section className="dash-section">
        <div className="section-title">
          <span className="section-icon">🍽️</span>
          <h2>This Week's Menu</h2>
          <span className="section-note">Based on weekly schedule</span>
        </div>

        {weeklyMenu.length === 0 ? (
          <div className="empty-menu-note">No weekly menu configured yet.</div>
        ) : (
          <div className="weekly-menu-grid">
            {weekDays.map((date, i) => {
              const menu   = getMenuForDay(date.getDay());
              const isToday = i === 0;
              const isTomorrow = i === 1;
              const dateStr = date.toISOString().split('T')[0];
              const closure = upcomingClosures.find(c => c.date === dateStr);

              return (
                <div key={i} className={`week-day-card ${isToday ? 'is-today' : ''} ${isTomorrow ? 'is-tomorrow' : ''}`}>
                  <div className="week-day-header">
                    <span className="week-day-name">{DAY_SHORT[date.getDay()]}</span>
                    <span className="week-day-date">{date.getDate()}</span>
                    {isToday    && <span className="week-badge today">Today</span>}
                    {isTomorrow && <span className="week-badge tomorrow">Tomorrow</span>}
                    {closure    && <span className="week-badge closed-day">Closed</span>}
                  </div>

                  {closure ? (
                    <p className="week-closure-note">{closure.reason}</p>
                  ) : menu ? (
                    <div className="week-meals">
                      {MEALS.map(mealType => {
                        const items = menu.meals?.[mealType];
                        if (!items || items.length === 0) return null;
                        return (
                          <div key={mealType} className="week-meal-row">
                            <span className="week-meal-icon">{MEAL_ICONS[mealType]}</span>
                            <span className="week-meal-items">
                              {items.map(it => it.name).join(', ')}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="week-no-menu">No menu set</p>
                  )}

                  {(isTomorrow && !closure) && (
                    <button className="week-book-btn" onClick={() => navigate('/daily-booking/' + dateStr)}>
                      Book
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

    </div>
  );
};

export default Dashboard;