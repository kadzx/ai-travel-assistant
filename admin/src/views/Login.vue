<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <span class="login-icon">🧳</span>
        <h1>AI 旅行助手</h1>
        <p>管理后台</p>
      </div>
      <el-form :model="form" :rules="rules" ref="formRef" @submit.prevent="handleLogin">
        <el-form-item prop="email">
          <el-input v-model="form.email" placeholder="管理员邮箱" prefix-icon="User" size="large" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="form.password" type="password" placeholder="密码" prefix-icon="Lock" size="large" show-password @keyup.enter="handleLogin" />
        </el-form-item>
        <el-button type="primary" size="large" :loading="loading" class="login-btn" @click="handleLogin">
          登 录
        </el-button>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance } from 'element-plus'
import { authHttp } from '@/utils/request'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const formRef = ref<FormInstance>()
const loading = ref(false)

const form = reactive({ email: '', password: '' })
const rules = {
  email: [{ required: true, message: '请输入邮箱', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

const handleLogin = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  loading.value = true
  try {
    const res = await authHttp.post('/auth/login', { email: form.email, password: form.password })
    const data = res.data?.data
    if (!data?.token) throw new Error('登录失败')
    if (data.user?.role !== 'admin') {
      ElMessage.error('该账号不是管理员')
      return
    }
    authStore.setLogin(data.token, data.user)
    ElMessage.success('登录成功')
    router.push('/dashboard')
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #FFF8F0 0%, #FFF0E6 50%, #F5EDE4 100%);
}
.login-card {
  width: 400px;
  padding: 48px 40px;
  background: #fff;
  border-radius: 24px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.06);
}
.login-header {
  text-align: center;
  margin-bottom: 36px;
}
.login-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 12px;
}
.login-header h1 {
  font-size: 24px;
  color: #3D3028;
  margin-bottom: 4px;
}
.login-header p {
  font-size: 14px;
  color: #BFBFBF;
}
.login-btn {
  width: 100%;
  height: 48px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  background: linear-gradient(135deg, #E8A87C, #D4A574);
  border: none;
  margin-top: 8px;
}
.login-btn:hover {
  background: linear-gradient(135deg, #D4A574, #C49464);
}
:deep(.el-input__wrapper) {
  border-radius: 12px;
  box-shadow: 0 0 0 1px #F5EDE4;
}
:deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #E8A87C;
}
:deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #E8A87C;
}
</style>
