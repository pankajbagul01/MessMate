import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auto-logout on 401 (expired / invalid token)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const register = (userData) => api.post('/auth/register', userData);
export const login = (userData) => api.post('/auth/login', userData);

// Meal Config APIs
export const createMealConfig  = (data)       => api.post('/mealconfig', data);
export const updateMealConfig  = (date, data) => api.put(`/mealconfig/${date}`, data);
export const deleteMealConfig  = (date)       => api.delete(`/mealconfig/${date}`);
export const getMealConfigByDate = (date)     => api.get(`/mealconfig/${date}`);
export const getAllMealConfigs = ()            => api.get('/mealconfig');

// Booking APIs
export const createBooking = (bookingData) => api.post('/booking', bookingData);
export const getMyBookings = () => api.get('/booking/my');
export const getBookingByDate = (date) => api.get(`/booking/my/${date}`);
export const cancelBooking = (id) => api.delete(`/booking/${id}`);
export const getAnalytics = (date) => api.get(`/booking/analytics/${date}`);
export const getSmartBooking = (date) => api.get(`/booking/smart/${date}`);
export const getMonthlyReport = (year, month) => api.get(`/booking/monthly-report/${year}/${month}`);
export const getCookingSummary = (date) => api.get(`/booking/cooking-summary/${date}`);

// Default Preferences APIs
export const setDefaultPreferences = (preferences) => api.post('/default', preferences);
export const getDefaultPreferences = () => api.get('/default');

// Mess Closure APIs
export const addClosureDate = (data) => api.post('/mess-closure', data);
export const getClosures = () => api.get('/mess-closure');
export const removeClosureDate = (date) => api.delete(`/mess-closure/${date}`);
export const checkClosure = (date) => api.get(`/mess-closure/check/${date}`);

// Add these to your existing api.js file

// Weekly Menu APIs
export const getWeeklyMenu = () => api.get('/weekly-menu');
export const getWeeklyMenuByDay = (day) => api.get(`/weekly-menu/${day}`);
export const createWeeklyMenu = (data) => api.post('/weekly-menu', data);
export const updateWeeklyMenu = (day, data) => api.put(`/weekly-menu/${day}`, data);
export const deleteWeeklyMenu = (day) => api.delete(`/weekly-menu/${day}`);

export default api;
// Upcoming closures (student-accessible)
export const getUpcomingClosures = () => api.get('/mess-closure/upcoming');
export const getMenuForDate = (date) => api.get(`/booking/menu/${date}`);