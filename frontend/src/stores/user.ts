import { defineStore } from 'pinia';
import { ref } from 'vue';
import http from '@/utils/request';

export interface UserInfo {
  id: number;
  username: string;
  email: string;
  avatar?: string;
  [key: string]: any;
}

export const useUserStore = defineStore('user', () => {
  const token = ref<string>('');
  const userInfo = ref<UserInfo | null>(null);

  const setUserInfo = (user: UserInfo) => {
    userInfo.value = user;
  };

  const setToken = (newToken: string) => {
    token.value = newToken;
  };

  const login = async (data: any) => {
    try {
      const res: any = await http.post('/auth/login', data);
      
      if (res && res.token) {
        setToken(res.token);
        setUserInfo(res.user);
        return res;
      } else {
        throw new Error('Login failed: No token received');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (data: any) => {
    try {
      return await http.post('/auth/register', data);
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  };

  const logout = () => {
    token.value = '';
    userInfo.value = null;
    uni.reLaunch({ url: '/pages/login/login' });
  };

  const checkLogin = () => {
    if (!token.value) {
      uni.redirectTo({ url: '/pages/login/login' });
      return false;
    }
    return true;
  };

  return { 
    token, 
    userInfo, 
    login, 
    register, 
    logout,
    checkLogin,
    setUserInfo,
    setToken
  };
}, {
  persist: true
});
