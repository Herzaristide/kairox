import axios from 'axios';
import { AuthResponse, ApiResponse } from '../types';

const API_BASE_URL =
  process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Don't force reload, let AuthContext handle the redirect
      console.log('Unauthorized - clearing auth data');
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: async (username: string, password: string): Promise<AuthResponse> => {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', {
      username,
      password,
    });
    return response.data.data!;
  },

  register: async (
    username: string,
    email: string,
    password: string
  ): Promise<AuthResponse> => {
    const response = await api.post<ApiResponse<AuthResponse>>(
      '/auth/register',
      {
        username,
        email,
        password,
      }
    );
    return response.data.data!;
  },
};

export const inventoryApi = {
  getMonsters: async () => {
    const response = await api.get('/inventory/monsters');
    return response.data.data;
  },

  getEquipment: async () => {
    const response = await api.get('/inventory/equipment');
    return response.data.data;
  },

  setMonsterFavorite: async (monsterId: number, isFavorite: boolean) => {
    const response = await api.post(
      `/inventory/monsters/${monsterId}/favorite`,
      {
        isFavorite,
      }
    );
    return response.data;
  },

  equipItem: async (equipmentId: number, monsterId: number) => {
    const response = await api.post(
      `/inventory/equipment/${equipmentId}/equip`,
      {
        monsterId,
      }
    );
    return response.data;
  },

  unequipItem: async (equipmentId: number) => {
    const response = await api.post(
      `/inventory/equipment/${equipmentId}/unequip`
    );
    return response.data;
  },

  getMonsterTemplates: async () => {
    const response = await api.get('/inventory/shop/monsters');
    return response.data.data;
  },

  getEquipmentTemplates: async () => {
    const response = await api.get('/inventory/shop/equipment');
    return response.data.data;
  },

  purchaseEquipment: async (templateId: number) => {
    const response = await api.post(
      `/inventory/shop/equipment/${templateId}/buy`
    );
    return response.data;
  },
};

export const monsterApi = {
  upgradeMonster: async (
    monsterId: number,
    upgradeType: 'level' | 'equipment',
    equipmentId?: number
  ) => {
    const response = await api.post('/monsters/upgrade', {
      monsterId,
      upgradeType,
      equipmentId,
    });
    return response.data;
  },

  getMonsterStats: async (monsterId: number) => {
    const response = await api.get(`/monsters/${monsterId}/stats`);
    return response.data.data;
  },

  enhanceEquipment: async (monsterId: number, equipmentId: number) => {
    const response = await api.post(
      `/monsters/${monsterId}/enhance-equipment/${equipmentId}`
    );
    return response.data;
  },
};

export default api;
