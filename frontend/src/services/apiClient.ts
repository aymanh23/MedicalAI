import axios from 'axios';
import { auth } from '../integrations/firebase/firebaseConfig'; // Import Firebase auth instance

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Cache token with expiration
let cachedToken: string | null = null;
let tokenExpiration = 0;
const TOKEN_CACHE_DURATION = 55 * 60 * 1000; // 55 minutes (Firebase tokens last 1 hour)

apiClient.interceptors.request.use(
  async (config) => {
    const user = auth.currentUser;
    if (user) {
      const now = Date.now();
      
      // Use cached token if available and not expired
      if (cachedToken && now < tokenExpiration) {
        config.headers.Authorization = `Bearer ${cachedToken}`;
      } else {
        // Get new token and cache it
        const idToken = await user.getIdToken(false);
        cachedToken = idToken;
        tokenExpiration = now + TOKEN_CACHE_DURATION;
        config.headers.Authorization = `Bearer ${idToken}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// API functions
export const api = {
  // Auth
  login: async (username: string, password: string) => {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    const response = await apiClient.post('/token', formData);
    return response.data;
  },
  
  register: async (userData: any) => {
    const response = await apiClient.post('/register', userData);
    return response.data;
  },
  
  // New function to create user profile in backend after Firebase user creation
  createProfile: async (profileData: { username?: string; email: string; role: string; [key: string]: any }) => {
    // The /users/create_profile endpoint expects the Firebase UID to be the document ID,
    // which is handled by the backend using the decoded ID token.
    // The frontend just needs to send the profile data.
    const response = await apiClient.post('/users/create_profile', profileData);
    return response.data;
  },
  
  getCurrentUser: async () => {
    const response = await apiClient.get('/me');
    return response.data;
  },
  
  // Patient Cases
  getPatientCases: async () => {
    const response = await apiClient.get('/patient-cases');
    return response.data;
  },
  
  getPatientCase: async (caseId: string) => {
    const response = await apiClient.get(`/patient-cases/${caseId}`);
    return response.data;
  },
  
  updatePatientCase: async (caseId: string, caseData: any) => {
    const response = await apiClient.put(`/patient-cases/${caseId}`, caseData);
    return response.data;
  },
  
  // Chat
  getChatMessages: async (patientCaseId: string) => {
    const response = await apiClient.get(`/chats/${patientCaseId}`);
    return response.data;
  },
  
  createChatMessage: async (messageData: any) => {
    const response = await apiClient.post('/chats', messageData);
    return response.data;
  },
  
  // AI Assistant
  getAIResponse: async (request: any) => {
    const response = await apiClient.post('/ai-assistant', request);
    return response.data;
  },
  
  // Doctor Profile
  getDoctorProfile: async (userId: string) => {
    const response = await apiClient.get(`/doctor-profile/${userId}`);
    return response.data;
  },
  
  createDoctorProfile: async (profileData: any) => {
    const response = await apiClient.post('/doctor-profile', profileData);
    return response.data;
  },
  
  updateDoctorProfile: async (profileId: string, profileData: any) => {
    const response = await apiClient.put(`/doctor-profile/${profileId}`, profileData);
    return response.data;
  }
};

export default apiClient;
