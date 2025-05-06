
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

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Check if there's a token in localStorage
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
      // In a real app, you would validate the token here
    }
    setIsLoading(false);
  }, []);

  const handleLogin = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await api.login(username, password);
      localStorage.setItem('token', response.access_token);
      setIsAuthenticated(true);
      return true;
    } catch (error) {
      toast({
        title: "Login Failed",
        description: "Invalid username or password",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    login: handleLogin,
    logout
  };
}
