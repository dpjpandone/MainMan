import React, { createContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AppContext = createContext({
  loginData: null,
  setLoginData: () => {},
  loading: true,
});

export const AppProvider = ({ children }) => {
  const [loginData, setLoginData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLoginData = async () => {
      try {
        const stored = await AsyncStorage.getItem('loginData');
        if (stored) {
          const parsed = JSON.parse(stored);
          setLoginData(parsed);
          console.log('✅ Loaded loginData from storage:', parsed);
        }
      } catch (e) {
        console.error('Error loading loginData:', e);
      } finally {
        setLoading(false);
      }
    };

    loadLoginData();
  }, []);

  return (
    <AppContext.Provider value={{ loginData, setLoginData, loading }}>
      {children}
    </AppContext.Provider>
  );
};
