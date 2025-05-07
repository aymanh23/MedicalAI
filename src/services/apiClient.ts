
import axios from 'axios';

const API_URL = 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add authorization token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
