const BASE_URL = 'http://localhost:3000/api';

interface RequestOptions extends UniApp.RequestOptions {
  // Add custom options if needed
}

export const request = <T>(options: RequestOptions): Promise<T> => {
  return new Promise((resolve, reject) => {
    // Request Interceptor
    const token = uni.getStorageSync('token');
    
    uni.request({
      ...options,
      url: options.url.startsWith('http') ? options.url : BASE_URL + options.url,
      header: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        ...options.header,
      },
      success: (res) => {
        // Response Interceptor
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data as T);
        } else if (res.statusCode === 401) {
          // Stub for login redirect
          console.warn('Unauthorized - redirecting to login');
          // uni.reLaunch({ url: '/pages/login/login' });
          reject(res);
        } else {
          uni.showToast({
            title: (res.data as any)?.msg || 'Request failed',
            icon: 'none'
          });
          reject(res);
        }
      },
      fail: (err) => {
        uni.showToast({
          title: 'Network error',
          icon: 'none'
        });
        reject(err);
      },
    });
  });
};
