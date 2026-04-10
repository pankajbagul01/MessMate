import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAnalytics, getCookingSummary, getMonthlyReport } from '../../services/api';
import './Analytics.css';

const Analytics = () => {
  const { date } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [cookingSummary, setCookingSummary] = useState(null);
  const [monthlyReport, setMonthlyReport] = useState(null);
  const [selectedDate, setSelectedDate] = useState(date || new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState('daily'); // 'daily' or 'monthly'

  useEffect(() => {
    if (date) {
      setSelectedDate(date);
      fetchDailyAnalytics(date);
    } else if (activeTab === 'daily') {
      fetchDailyAnalytics(selectedDate);
    }
  }, [date, selectedDate, activeTab]);

  const fetchDailyAnalytics = async (targetDate) => {
    setLoading(true);
    try {
      const [analyticsRes, cookingRes] = await Promise.all([
        getAnalytics(targetDate),
        getCookingSummary(targetDate)
      ]);
      setAnalytics(analyticsRes.data);
      setCookingSummary(cookingRes.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlyReport = async () => {
    setLoading(true);
    try {
      const response = await getMonthlyReport(selectedYear, selectedMonth);
      setMonthlyReport(response.data);
    } catch (error) {
      console.error('Error fetching monthly report:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'monthly') {
      fetchMonthlyReport();
    }
  }, [selectedMonth, selectedYear, activeTab]);

  const handleDateChange = (e) => {
    const newDate = e.target.value;
    setSelectedDate(newDate);
    fetchDailyAnalytics(newDate);
    navigate(`/admin/analytics/${newDate}`, { replace: true });
  };

  const handleMonthChange = (e) => {
    setSelectedMonth(parseInt(e.target.value));
  };

  const handleYearChange = (e) => {
    setSelectedYear(parseInt(e.target.value));
  };

  const getTotalItems = (mealData) => {
    if (!mealData) return 0;
    return Object.values(mealData).reduce((sum, count) => sum + count, 0);
  };

  const getTotalStudents = () => {
    return cookingSummary?.totalStudents || 0;
  };

  const getTotalBookings = () => {
    return cookingSummary?.totalBookings || 0;
  };

  // Generate year options (current year and next year)
  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear, currentYear + 1];

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <h1>📊 Analytics & Reports</h1>
        
        {/* Tab Buttons */}
        <div className="tab-buttons">
          <button 
            className={`tab-btn ${activeTab === 'daily' ? 'active' : ''}`}
            onClick={() => setActiveTab('daily')}
          >
            Daily Analytics
          </button>
          <button 
            className={`tab-btn ${activeTab === 'monthly' ? 'active' : ''}`}
            onClick={() => setActiveTab('monthly')}
          >
            Monthly Report
          </button>
        </div>
      </div>

      {/* Daily Analytics Tab */}
      {activeTab === 'daily' && (
        <>
          <div className="date-selector-card">
            <label>Select Date:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              max={new Date().toISOString().split('T')[0]}
            />
            <div className="date-nav">
              <button 
                className="btn-small"
                onClick={() => {
                  const prevDate = new Date(selectedDate);
                  prevDate.setDate(prevDate.getDate() - 1);
                  handleDateChange({ target: { value: prevDate.toISOString().split('T')[0] } });
                }}
              >
                ← Previous Day
              </button>
              <button 
                className="btn-small"
                onClick={() => {
                  const today = new Date().toISOString().split('T')[0];
                  handleDateChange({ target: { value: today } });
                }}
              >
                Today
              </button>
              <button 
                className="btn-small"
                onClick={() => {
                  const nextDate = new Date(selectedDate);
                  nextDate.setDate(nextDate.getDate() + 1);
                  if (nextDate <= new Date()) {
                    handleDateChange({ target: { value: nextDate.toISOString().split('T')[0] } });
                  }
                }}
              >
                Next Day →
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="summary-cards">
            <div className="summary-card">
              <div className="card-icon">👥</div>
              <div className="card-info">
                <h3>Total Students</h3>
                <p className="card-number">{getTotalStudents()}</p>
              </div>
            </div>
            <div className="summary-card">
              <div className="card-icon">📅</div>
              <div className="card-info">
                <h3>Total Bookings</h3>
                <p className="card-number">{getTotalBookings()}</p>
              </div>
            </div>
          </div>

          {/* Cooking Summary - What to Cook */}
          {cookingSummary && (
            <div className="cooking-summary-section">
              <h2>🍳 What to Cook - {selectedDate}</h2>
              <div className="meal-summary-grid">
                {['breakfast', 'lunch', 'dinner'].map((meal) => (
                  <div key={meal} className="meal-summary-card">
                    <h3 className={`meal-title ${meal}`}>
                      {meal === 'breakfast' && '🥐 Breakfast'}
                      {meal === 'lunch' && '🍛 Lunch'}
                      {meal === 'dinner' && '🍽️ Dinner'}
                    </h3>
                    {cookingSummary[meal] && Object.keys(cookingSummary[meal]).length > 0 ? (
                      <div className="item-list">
                        {Object.entries(cookingSummary[meal]).map(([itemName, quantity]) => (
                          <div key={itemName} className="item-row">
                            <span className="item-name">{itemName}</span>
                            <span className="item-quantity">{quantity} units</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="no-data">No bookings for this meal</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Analytics */}
          {analytics && (
            <div className="detailed-analytics">
              <h2>📈 Detailed Breakdown</h2>
              <div className="meal-analytics-grid">
                {['breakfast', 'lunch', 'dinner'].map((meal) => (
                  <div key={meal} className="meal-analytics-card">
                    <div className="meal-header">
                      <h3>
                        {meal === 'breakfast' && '🥐 Breakfast'}
                        {meal === 'lunch' && '🍛 Lunch'}
                        {meal === 'dinner' && '🍽️ Dinner'}
                      </h3>
                      <span className="total-items">
                        Total: {getTotalItems(analytics[meal])} items
                      </span>
                    </div>
                    
                    {analytics[meal] && Object.keys(analytics[meal]).length > 0 ? (
                      <div className="items-breakdown">
                        <table className="analytics-table">
                          <thead>
                            <tr>
                              <th>Item Name</th>
                              <th>Quantity</th>
                              <th>% of Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(analytics[meal])
                              .sort((a, b) => b[1] - a[1])
                              .map(([itemName, quantity]) => {
                                const percentage = ((quantity / getTotalItems(analytics[meal])) * 100).toFixed(1);
                                return (
                                  <tr key={itemName}>
                                    <td>{itemName}</td>
                                    <td>{quantity}</td>
                                    <td>
                                      <div className="percentage-bar">
                                        <div 
                                          className="percentage-fill" 
                                          style={{ width: `${percentage}%` }}
                                        ></div>
                                        <span className="percentage-text">{percentage}%</span>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="no-data">No data available for this meal</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Monthly Report Tab */}
      {activeTab === 'monthly' && monthlyReport && (
        <div className="monthly-report">
          <div className="month-selector">
            <div className="selector-group">
              <label>Year:</label>
              <select value={selectedYear} onChange={handleYearChange}>
                {yearOptions.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <div className="selector-group">
              <label>Month:</label>
              <select value={selectedMonth} onChange={handleMonthChange}>
                <option value={1}>January</option>
                <option value={2}>February</option>
                <option value={3}>March</option>
                <option value={4}>April</option>
                <option value={5}>May</option>
                <option value={6}>June</option>
                <option value={7}>July</option>
                <option value={8}>August</option>
                <option value={9}>September</option>
                <option value={10}>October</option>
                <option value={11}>November</option>
                <option value={12}>December</option>
              </select>
            </div>
            <button className="btn-refresh" onClick={fetchMonthlyReport}>
              Refresh
            </button>
          </div>

          <div className="monthly-summary-cards">
            <div className="summary-card">
              <div className="card-icon">👥</div>
              <div className="card-info">
                <h3>Total Students</h3>
                <p className="card-number">{monthlyReport.totalStudents}</p>
              </div>
            </div>
            <div className="summary-card">
              <div className="card-icon">📅</div>
              <div className="card-info">
                <h3>Total Bookings</h3>
                <p className="card-number">{monthlyReport.totalBookings}</p>
              </div>
            </div>
          </div>

          <div className="student-report-table">
            <h3>Student-wise Consumption Report</h3>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Email</th>
                    <th>Breakfast</th>
                    <th>Lunch</th>
                    <th>Dinner</th>
                    <th>Total Meals</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyReport.report.map((student, index) => (
                    <tr key={index}>
                      <td>{student.name}</td>
                      <td>{student.email}</td>
                      <td>{student.breakfast}</td>
                      <td>{student.lunch}</td>
                      <td>{student.dinner}</td>
                      <td><strong>{student.totalMeals}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {monthlyReport.report.length === 0 && (
              <p className="no-data">No bookings found for this month</p>
            )}
          </div>

          {/* Export Button */}
          <div className="export-section">
            <button 
              className="btn-export"
              onClick={() => {
                const csv = monthlyReport.report.map(student => 
                  `${student.name},${student.email},${student.breakfast},${student.lunch},${student.dinner},${student.totalMeals}`
                ).join('\n');
                const blob = new Blob([`Name,Email,Breakfast,Lunch,Dinner,Total Meals\n${csv}`], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `monthly_report_${selectedYear}_${selectedMonth}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              📥 Export to CSV
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;