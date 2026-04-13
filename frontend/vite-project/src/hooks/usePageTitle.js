import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const TITLES = {
  '/login':               'Login — MessMate',
  '/register':            'Register — MessMate',
  '/dashboard':           'Dashboard — MessMate',
  '/weekly-menu':         'Weekly Menu — MessMate',
  '/my-bookings':         'My Bookings — MessMate',
  '/default-preferences': 'Preferences — MessMate',
  '/admin':               'Admin Dashboard — MessMate',
  '/admin/weekly-menu':   'Weekly Menu Config — MessMate',
  '/admin/meal-config':   'Meal Config — MessMate',
  '/admin/analytics':     'Analytics — MessMate',
  '/admin/fees':          'Fees Manager — MessMate',
};

const usePageTitle = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    const title =
      TITLES[pathname] ||
      Object.entries(TITLES).find(([key]) => pathname.startsWith(key) && key !== '/')?.[1] ||
      'MessMate';
    document.title = title;
  }, [pathname]);
};

export default usePageTitle;