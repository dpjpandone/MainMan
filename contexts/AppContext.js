import { createContext } from 'react';

export const AppContext = createContext({
  loginData: null,
  setLoginData: () => {}, // Placeholder
});
