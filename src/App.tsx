
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from "@/components/ui/toaster";

// Pages
import Login from './pages/Login';
import DoctorDashboard from './pages/DoctorDashboard';
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Create a client
const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={
              <ProtectedRoute>
                <DoctorDashboard />
              </ProtectedRoute>
            } />
            <Route path="/login" element={<Login />} />
            <Route 
              path="/doctor-dashboard" 
              element={
                <ProtectedRoute>
                  <DoctorDashboard />
                </ProtectedRoute>
              } 
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
