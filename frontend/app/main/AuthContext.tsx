// AuthContext.tsx
import React, { createContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface AuthContextType {
  authToken: string | null;
  setAuthToken: (token: string | null) => void;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  authToken: null,
  setAuthToken: () => {},
  loading: true,
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadToken = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken'); // Changed from "token" to "userToken"
        if (token) {
          setAuthToken(token);
        }
      } catch (error) {
        console.error("Failed to load token", error);
      } finally {
        setLoading(false);
      }
    };
    loadToken();
  }, []);

  const updateToken = async (newToken: string | null) => {
    try {
      if (newToken) {
        await AsyncStorage.setItem('userToken', newToken);
      } else {
        await AsyncStorage.removeItem('userToken');
      }
      setAuthToken(newToken);
    } catch (error) {
      console.error("Failed to update token", error);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      authToken, 
      setAuthToken: updateToken, 
      loading 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
