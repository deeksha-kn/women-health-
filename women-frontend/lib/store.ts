import { create } from 'zustand';

export interface User {
  id: string;
  email: string;
  name: string;
  age?: number;
  createdAt: Date;
}

export interface MedicalReport {
  id: string;
  fileName: string;
  fileUrl: string;
  uploadedAt: Date;
}

export interface HealthData {
  age: number;
  weight: number;
  height: number;
  menstrualCycle: string;
  existingDiagnoses: string[];
  symptoms: string[];
  sleepHours: number;
  stressLevel: number;
  exerciseDaysPerWeek: number;
  notes: string;
  medicalReports?: MedicalReport[];
  faceImageUrl?: string;
  id?: string;
  userId?: string;
  predictions?: PredictionResult[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PredictionResult {
  id: string;
  healthDataId: string;
  disease: string;
  riskScore: number;
  factors: string[];
  recommendations: string[];
  timestamp: Date;
}

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => void;
  signup: (email: string, password: string, name: string) => void;
  logout: () => void;
}

interface HealthStore {
  currentHealthData: HealthData | null;
  setHealthData: (data: HealthData) => void;
  clearHealthData: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  login: (email, password) => {
    // Mock login - in production this would call a real auth service
    const user: User = {
      id: Math.random().toString(36).substr(2, 9),
      email,
      name: email.split('@')[0],
      createdAt: new Date(),
    };
    set({ user, isAuthenticated: true });
    localStorage.setItem('user', JSON.stringify(user));
  },
  signup: (email, password, name) => {
    const user: User = {
      id: Math.random().toString(36).substr(2, 9),
      email,
      name,
      createdAt: new Date(),
    };
    set({ user, isAuthenticated: true });
    localStorage.setItem('user', JSON.stringify(user));
  },
  logout: () => {
    set({ user: null, isAuthenticated: false });
    localStorage.removeItem('user');
  },
}));

export const useHealthStore = create<HealthStore>((set) => ({
  currentHealthData: null,
  setHealthData: (data) => set({ currentHealthData: data }),
  clearHealthData: () => set({ currentHealthData: null }),
}));
