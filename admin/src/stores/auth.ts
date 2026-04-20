import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('admin_token') || '')
  const user = ref<any>(null)

  function setLogin(t: string, u: any) {
    token.value = t
    user.value = u
    localStorage.setItem('admin_token', t)
  }

  function logout() {
    token.value = ''
    user.value = null
    localStorage.removeItem('admin_token')
  }

  const isLoggedIn = () => !!token.value

  return { token, user, setLogin, logout, isLoggedIn }
})
