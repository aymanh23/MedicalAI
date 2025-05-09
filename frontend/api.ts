import axios from "axios";

// Create axios instance with base URL
const api = axios.create({
  baseURL: "http://localhost:8000", // Change to your backend URL in production
});

// Request interceptor to add authentication token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Authentication endpoints
// (Remove the duplicate/broken login function here)

export const register = async (userData: {
  username: string;
  email: string;
  full_name: string;
  password: string;
  role: string;
}) => {
  const response = await api.post("/register", userData);
  return response.data;
};

// Patient cases endpoints
export const getPatientCases = async () => {
  const response = await api.get("/patient-cases");
  return response.data;
};

export const getPatientCase = async (caseId: string) => {
  const response = await api.get(`/patient-cases/${caseId}`);
  return response.data;
};

export const updatePatientCase = async (
  caseId: string,
  caseData: {
    status?: string;
    severity?: string;
    doctor_notes?: string;
    doctor_recommendation?: string;
  }
) => {
  const response = await api.put(`/patient-cases/${caseId}`, caseData);
  return response.data;
};

export const createPatientCase = async (caseData: {
  name: string;
  age: number;
  gender: string;
  symptoms: string[];
  medical_history?: string;
}) => {
  const response = await api.post("/patient-cases", caseData);
  return response.data;
};

// Chat endpoints
export const getChatMessages = async (patientCaseId: string) => {
  const response = await api.get(`/chats/${patientCaseId}`);
  return response.data;
};

export const createChatMessage = async (messageData: {
  patient_case_id: string;
  sender_type: string;
  content: string;
}) => {
  const response = await api.post("/chats", messageData);
  return response.data;
};

// AI assistant endpoint
export const askAIAssistant = async (data: {
  prompt: string;
  patient_symptoms: string[];
  patient_history?: string;
}) => {
  const response = await api.post("/ai-assistant", data);
  return response.data;
};

export const login = async (username: string, password: string) => {
  const body = `grant_type=&username=${encodeURIComponent(
    username.trim()
  )}&password=${encodeURIComponent(password)}&scope=&client_id=&client_secret=`;

  const response = await fetch("http://localhost:8000/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      accept: "application/json",
    },
    body,
  });

  if (!response.ok) {
    throw new Error("Login failed");
  }
  return response.json();
};

export default api;
