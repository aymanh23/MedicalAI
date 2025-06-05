import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { api } from '../services/apiClient';

export function usePatientCases() {
  const [patientCases, setPatientCases] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const fetchPatientCases = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getPatientCases();
      setPatientCases(data);
    } catch (err: any) {
      setError(err);
      toast({
        title: "Error",
        description: "Failed to fetch patient cases",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePatientCase = async (id: string, caseData: any) => {
    try {
      await api.updatePatientCase(id, caseData);
      toast({
        title: "Success",
        description: "Patient case updated successfully",
      });
      fetchPatientCases(); // Refresh the list
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update patient case",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchPatientCases();
  }, []);

  return {
    patientCases,
    isLoading,
    error,
    refetch: fetchPatientCases,
    updatePatientCase: handleUpdatePatientCase
  };
}

const API_URL = 'http://localhost:8000';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Check if there's a token in localStorage
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
      // In a real app, you would validate the token here
      fetch(`${API_URL}/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(res => res.json())
      .then(data => {
        setUser(data);
      })
      .catch(() => {
        localStorage.removeItem('token');
        setIsAuthenticated(false);
      });
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const body = `grant_type=&username=${encodeURIComponent(
        username.trim()
      )}&password=${encodeURIComponent(password)}&scope=&client_id=&client_secret=`;

      const response = await fetch(`${API_URL}/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'accept': 'application/json',
        },
        body,
      });

      if (!response.ok) {
        throw new Error('Invalid username or password');
      }

      const data = await response.json();
      localStorage.setItem('token', data.access_token);
      setIsAuthenticated(true);

      // Fetch user data
      const userResponse = await fetch(`${API_URL}/me`, {
        headers: {
          'Authorization': `Bearer ${data.access_token}`
        }
      });
      
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUser(userData);
      }

      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setUser(null);
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout
  };
}
