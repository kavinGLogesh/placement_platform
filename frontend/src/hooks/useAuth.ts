import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext.js';
import { AuthContextType } from '../types/auth.types.js';

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
