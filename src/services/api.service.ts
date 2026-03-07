import apiClient from '@/lib/axios';
import { User, BaseResponse } from '@/types';

export const userService = {
  getProfile: async () => {
    const response = await apiClient.get<BaseResponse<User>>('/auth/profile');
    return response.data;
  },
  
  updateProfile: async (data: Partial<User>) => {
    const response = await apiClient.patch<BaseResponse<User>>('/auth/profile', data);
    return response.data;
  },
};
