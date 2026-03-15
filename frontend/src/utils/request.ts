export const BASE_URL = 'http://localhost:3000/api';

// 4. TypeScript interfaces for API responses
export interface ApiResponse<T = any> {
  code: number;
  data: T;
  message: string;
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  url: string;
  method?: HttpMethod;
  data?: any;
  header?: any;
  params?: any; // Query parameters
}

// Helper to assemble query params
const assembleUrl = (url: string, params?: any): string => {
  if (!params) return url;
  const queryString = Object.keys(params)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
  return url.includes('?') ? `${url}&${queryString}` : `${url}?${queryString}`;
};

export const request = <T = any>(options: RequestOptions): Promise<T> => {
  return new Promise((resolve, reject) => {
    // 1. Base URL config
    let url = options.url.startsWith('http') ? options.url : BASE_URL + options.url;
    
    // Handle query params for GET requests or others if needed
    if (options.params) {
      url = assembleUrl(url, options.params);
    }

    // 2. Request interceptor: Add Authorization header
    let token = '';
    try {
      const userState = uni.getStorageSync('user');
      if (userState) {
        const parsed = JSON.parse(userState);
        token = parsed.token;
      }
    } catch (e) {
      // ignore
    }

    const header = {
      'Content-Type': 'application/json',
      ...options.header,
    };
    
    if (token) {
      header['Authorization'] = `Bearer ${token}`;
    }

    uni.request({
      url,
      method: (options.method || 'GET') as any,
      data: options.data,
      header,
      success: (res) => {
        const statusCode = res.statusCode;
        
        // 3. Response interceptor: Handle global errors
        if (statusCode === 401) {
          uni.showToast({
            title: '登录已过期，请重新登录',
            icon: 'none'
          });
          // Clear token
          uni.removeStorageSync('user');
          // Redirect to login
          setTimeout(() => {
            uni.reLaunch({
              url: '/pages/login/login'
            });
          }, 1500);
          reject(new Error('Unauthorized'));
          return;
        }

        if (statusCode >= 200 && statusCode < 300) {
          // 3. Response interceptor: Unwrap data
          // Assuming the backend returns { code, data, message }
          const result = res.data as ApiResponse<T>;
          
          // You might want to check the custom 'code' here as well, depending on backend contract
          // For now, we assume HTTP 200 means success, and we return the whole object or unwrapped data
          // The requirement says "Unwrap `data` from `{ code, data, message }` structure."
          
          // If the backend strictly follows { code, data, message }
          if (result && typeof result.code !== 'undefined') {
             if (result.code === 200 || result.code === 0) { // Adjust success code as needed
                 resolve(result.data);
             } else {
                 uni.showToast({
                     title: result.message || '请求失败',
                     icon: 'none'
                 });
                 reject(new Error(result.message || 'Error'));
             }
          } else {
            // Fallback for non-standard responses
            resolve(res.data as T);
          }
        } else {
          uni.showToast({
            title: `请求错误: ${statusCode}`,
            icon: 'none'
          });
          reject(new Error(`HTTP Error ${statusCode}`));
        }
      },
      fail: (err) => {
        uni.showToast({
          title: '网络连接失败',
          icon: 'none'
        });
        reject(err);
      }
    });
  });
};

// 5. Export methods: get, post, put, delete
export const http = {
  get: <T = any>(url: string, params?: any, header?: any) => {
    return request<T>({ url, method: 'GET', params, header });
  },
  
  post: <T = any>(url: string, data?: any, header?: any) => {
    return request<T>({ url, method: 'POST', data, header });
  },
  
  put: <T = any>(url: string, data?: any, header?: any) => {
    return request<T>({ url, method: 'PUT', data, header });
  },
  
  delete: <T = any>(url: string, data?: any, header?: any) => {
    return request<T>({ url, method: 'DELETE', data, header });
  }
};

export default http;
