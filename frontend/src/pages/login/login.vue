<template>
  <view class="login-container relative min-h-100vh bg-white px-8 pt-20 box-border">
    <!-- Header Area -->
    <view class="mb-12 flex flex-col items-center">
      <image src="/static/logo.png" mode="aspectFit" class="w-20 h-20 mb-4 rounded-xl shadow-sm" />
      <text class="text-2xl font-bold text-gray-900 tracking-wide">欢迎来到 AI Travel</text>
      <text class="mt-2 text-sm text-gray-400">探索世界，记录美好</text>
    </view>

    <!-- Tab Switcher (Custom) -->
    <view class="flex justify-center mb-10">
      <view 
        class="relative px-4 py-2 text-lg font-medium transition-colors duration-300"
        :class="currentTab === 0 ? 'text-gray-900 scale-105' : 'text-gray-400'"
        @click="handleTabChange(0)"
      >
        登录
        <view v-if="currentTab === 0" class="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-4 h-1 bg-primary rounded-full transition-all duration-300"></view>
      </view>
      <view class="mx-4 text-gray-300 self-center">|</view>
      <view 
        class="relative px-4 py-2 text-lg font-medium transition-colors duration-300"
        :class="currentTab === 1 ? 'text-gray-900 scale-105' : 'text-gray-400'"
        @click="handleTabChange(1)"
      >
        注册
        <view v-if="currentTab === 1" class="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-4 h-1 bg-primary rounded-full transition-all duration-300"></view>
      </view>
    </view>

    <!-- Form Area -->
    <view class="w-full">
      <u-form :model="form" ref="uForm" :rules="rules" :errorType="['toast']">
        
        <!-- Username (Register only) -->
        <view v-if="currentTab === 1" class="mb-6 animate-fade-in-down">
          <view class="bg-gray-50 rounded-full px-5 py-3 flex items-center transition-all focus-within:ring-2 focus-within:ring-primary/20">
            <u-icon name="account" color="#909399" size="20"></u-icon>
            <u-form-item prop="username" borderBottom="false" class="flex-1 ml-2 !mb-0 !pb-0">
              <u-input
                v-model="form.username"
                placeholder="请输入昵称"
                border="none"
                clearable
                fontSize="15px"
                customStyle="padding: 0; background: transparent;"
              ></u-input>
            </u-form-item>
          </view>
        </view>

        <!-- Email -->
        <view class="mb-6">
          <view class="bg-gray-50 rounded-full px-5 py-3 flex items-center transition-all focus-within:ring-2 focus-within:ring-primary/20">
            <u-icon name="email" color="#909399" size="20"></u-icon>
            <u-form-item prop="email" borderBottom="false" class="flex-1 ml-2 !mb-0 !pb-0">
              <u-input
                v-model="form.email"
                placeholder="请输入邮箱"
                border="none"
                clearable
                fontSize="15px"
                customStyle="padding: 0; background: transparent;"
              ></u-input>
            </u-form-item>
          </view>
        </view>

        <!-- Password -->
        <view class="mb-6">
          <view class="bg-gray-50 rounded-full px-5 py-3 flex items-center transition-all focus-within:ring-2 focus-within:ring-primary/20">
            <u-icon name="lock" color="#909399" size="20"></u-icon>
            <u-form-item prop="password" borderBottom="false" class="flex-1 ml-2 !mb-0 !pb-0">
              <u-input
                v-model="form.password"
                type="password"
                placeholder="请输入密码"
                border="none"
                clearable
                fontSize="15px"
                customStyle="padding: 0; background: transparent;"
              ></u-input>
            </u-form-item>
          </view>
        </view>

        <!-- Confirm Password (Register only) -->
        <view v-if="currentTab === 1" class="mb-6 animate-fade-in-up">
          <view class="bg-gray-50 rounded-full px-5 py-3 flex items-center transition-all focus-within:ring-2 focus-within:ring-primary/20">
            <u-icon name="lock-fill" color="#909399" size="20"></u-icon>
            <u-form-item prop="confirmPassword" borderBottom="false" class="flex-1 ml-2 !mb-0 !pb-0">
              <u-input
                v-model="form.confirmPassword"
                type="password"
                placeholder="请确认密码"
                border="none"
                clearable
                fontSize="15px"
                customStyle="padding: 0; background: transparent;"
              ></u-input>
            </u-form-item>
          </view>
        </view>

      </u-form>

      <!-- Action Button -->
      <view class="mt-10">
        <button 
          class="w-full bg-primary text-white rounded-full py-3 text-lg font-medium shadow-lg shadow-primary/30 active:scale-98 transition-transform flex items-center justify-center border-none"
          :disabled="loading"
          @click="handleSubmit"
        >
          <text v-if="!loading">{{ currentTab === 0 ? '登录' : '立即注册' }}</text>
          <u-loading-icon v-else color="#ffffff" mode="circle"></u-loading-icon>
        </button>
      </view>

      <!-- Footer Actions -->
      <view class="mt-6 flex justify-between text-sm text-gray-500 px-2" v-if="currentTab === 0">
        <text @click="uni.showToast({title: '暂未开放', icon: 'none'})">忘记密码?</text>
        <text class="text-primary font-medium" @click="handleTabChange(1)">注册账号</text>
      </view>
       <view class="mt-6 flex justify-center text-sm text-gray-500 px-2" v-else>
        <text>已有账号? <text class="text-primary font-medium ml-1" @click="handleTabChange(0)">去登录</text></text>
      </view>

      <!-- Social Login (Mock) -->
      <view class="absolute bottom-10 left-0 w-full px-8 box-border">
        <view class="flex items-center justify-center mb-6">
          <view class="h-[1px] bg-gray-200 flex-1"></view>
          <text class="mx-4 text-xs text-gray-400">其他登录方式</text>
          <view class="h-[1px] bg-gray-200 flex-1"></view>
        </view>
        <view class="flex justify-center gap-8">
          <view class="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center border border-green-100" @click="uni.showToast({title: '微信登录暂未开放', icon: 'none'})">
            <u-icon name="weixin-fill" color="#07C160" size="24"></u-icon>
          </view>
           <view class="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100" @click="uni.showToast({title: '苹果登录暂未开放', icon: 'none'})">
            <u-icon name="apple-fill" color="#333" size="24"></u-icon>
          </view>
        </view>
        
        <!-- Agreement -->
        <view class="mt-6 flex justify-center items-center text-xs text-gray-400">
           <text>登录即代表同意 <text class="text-primary">用户协议</text> 和 <text class="text-primary">隐私政策</text></text>
        </view>
      </view>

    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from "vue";
import { useUserStore } from "@/stores/user";
// Explicitly import components to ensure they work in uni-app
// @ts-ignore
import UForm from "uview-plus/components/u-form/u-form.vue";
// @ts-ignore
import UFormItem from "uview-plus/components/u-form-item/u-form-item.vue";
// @ts-ignore
import UInput from "uview-plus/components/u-input/u-input.vue";
// @ts-ignore
import UIcon from "uview-plus/components/u-icon/u-icon.vue";
// @ts-ignore
import ULoadingIcon from "uview-plus/components/u-loading-icon/u-loading-icon.vue";

const userStore = useUserStore();
const uForm = ref();
const currentTab = ref(0); // 0: Login, 1: Register
const loading = ref(false);

const form = reactive({
  email: "",
  password: "",
  confirmPassword: "",
  username: "",
});

const rules = computed(() => {
  const baseRules = {
    email: [
      { required: true, message: "请输入邮箱", trigger: ["blur", "change"] },
      { type: "email", message: "邮箱格式不正确", trigger: ["blur", "change"] },
    ],
    password: [
      { required: true, message: "请输入密码", trigger: ["blur", "change"] },
      { min: 6, message: "密码长度不能少于6位", trigger: ["blur", "change"] },
    ],
  };

  if (currentTab.value === 1) {
    return {
      ...baseRules,
      confirmPassword: [
        { required: true, message: "请确认密码", trigger: ["blur", "change"] },
        {
          validator: (rule: any, value: string, callback: any) => {
            return value === form.password;
          },
          message: "两次密码输入不一致",
          trigger: ["blur", "change"],
        },
      ],
      username: [
        { required: true, message: "请输入昵称", trigger: ["blur", "change"] },
      ],
    };
  }

  return baseRules;
});

const handleTabChange = (index: number) => {
  currentTab.value = index;
  if (uForm.value) {
    uForm.value.clearValidate();
  }
};

const handleSubmit = () => {
  if (!uForm.value) return;
  
  uForm.value.validate().then(async () => {
    loading.value = true;
    try {
      if (currentTab.value === 0) {
        // Login
        await userStore.login({
          email: form.email,
          password: form.password,
        });
        uni.switchTab({ url: "/pages/index/index" });
      } else {
        // Register
        await userStore.register({
          email: form.email,
          password: form.password,
          username: form.username,
        });
        uni.showToast({ title: "注册成功，正在登录...", icon: "success" });
        
        // Auto login after register
        setTimeout(async () => {
           await userStore.login({
            email: form.email,
            password: form.password,
          });
          uni.switchTab({ url: "/pages/index/index" });
        }, 1500);
      }
    } catch (error: any) {
      uni.showToast({
        title: error.message || "操作失败",
        icon: "none",
      });
    } finally {
      loading.value = false;
    }
  }).catch((errors: any) => {
    console.log("Validation failed", errors);
  });
};
</script>

<style lang="scss" scoped>
/* Scoped styles for fine-tuning */
.login-container {
  /* Ensure full height coverage */
  min-height: 100vh;
}

/* Custom Input Styles override */
:deep(.u-form-item__body) {
  padding: 0 !important;
}

:deep(.u-form-item__body__right__message) {
  margin-left: 0 !important;
}
</style>
