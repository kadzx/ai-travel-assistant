import { defineStore } from 'pinia';
import { ref } from 'vue';
import { request } from '@/utils/request';

export interface UserInfo {
  id: number;
  username: string;
  email: string;
  avatar?: string;
  [key: string]: any;
}

export const useUserStore = defineStore('user', () => {
  const token = ref<string>(uni.getStorageSync('token') || '');
  const userInfo = ref<UserInfo | null>(uni.getStorageSync('userInfo') || null);

  const setUserInfo = (user: UserInfo) => {
    userInfo.value = user;
    uni.setStorageSync('userInfo', user);
  };

  const setToken = (newToken: string) => {
    token.value = newToken;
    uni.setStorageSync('token', newToken);
  };

  const login = async (data: any) => {
    try {
      const res: any = await request({
        url: '/auth/login',
        method: 'POST',
        data
      });
      
      if (res.data && res.data.token) {
        setToken(res.data.token);
        setUserInfo(res.data.user);
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
      return await request({
        url: '/auth/register',
        method: 'POST',
        data
      });
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  };

  const logout = () => {
    token.value = '';
    userInfo.value = null;
    uni.removeStorageSync('token');
    uni.removeStorageSync('userInfo');
    uni.reLaunch({ url: '/pages/login/login' });
  };

  const checkLogin = () => {
      if (!token.value) {
          uni.redirectTo({ url: '/pages/login/login' });
          return false;
      }
      return true;
  }

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
});
