<template>
  <view class="login-page">
    <!-- 顶部弧形装饰背景 -->
    <view class="top-decoration">
      <view class="arc-bg"></view>
      <view class="top-icon">🧳</view>
      <text class="top-title">{{ currentTab === 0 ? t('login.welcomeBack') : t('login.startJourney') }}</text>
      <text class="top-subtitle">{{ currentTab === 0 ? t('login.loginSubtitle') : t('login.registerSubtitle') }}</text>
    </view>

    <!-- Tab 切换 -->
    <view class="tab-bar">
      <view class="tab-inner">
        <view 
          class="tab-item" 
          :class="{ active: currentTab === 0 }"
          @click="handleTabChange(0)"
        >
          <text>{{ t('login.tabLogin') }}</text>
        </view>
        <view 
          class="tab-item"
          :class="{ active: currentTab === 1 }"
          @click="handleTabChange(1)"
        >
          <text>{{ t('login.tabRegister') }}</text>
        </view>
        <!-- 滑动指示器 -->
        <view class="tab-indicator" :style="{ left: currentTab === 0 ? '4px' : '50%' }"></view>
      </view>
    </view>

    <!-- 表单区 -->
    <view class="form-area">
      <u-form :model="form" ref="uForm" :rules="rules" :errorType="['toast']">
        
        <!-- 昵称（注册） -->
        <view v-if="currentTab === 1" class="input-card animate-field">
          <text class="input-emoji">👤</text>
          <u-form-item prop="username" borderBottom="false" class="form-item-inner">
            <u-input
              v-model="form.username"
              :placeholder="t('login.username')"
              border="none"
              clearable
              fontSize="15px"
              customStyle="padding: 0; background: transparent;"
            ></u-input>
          </u-form-item>
        </view>

        <!-- 邮箱 -->
        <view class="input-card">
          <text class="input-emoji">📧</text>
          <u-form-item prop="email" borderBottom="false" class="form-item-inner">
            <u-input
              v-model="form.email"
              :placeholder="t('login.email')"
              border="none"
              clearable
              fontSize="15px"
              customStyle="padding: 0; background: transparent;"
            ></u-input>
          </u-form-item>
        </view>

        <!-- 密码 -->
        <view class="input-card">
          <text class="input-emoji">🔒</text>
          <u-form-item prop="password" borderBottom="false" class="form-item-inner">
            <u-input
              v-model="form.password"
              type="password"
              :placeholder="t('login.password')"
              border="none"
              clearable
              fontSize="15px"
              customStyle="padding: 0; background: transparent;"
            ></u-input>
          </u-form-item>
        </view>

        <!-- 确认密码（注册） -->
        <view v-if="currentTab === 1" class="input-card animate-field">
          <text class="input-emoji">🔐</text>
          <u-form-item prop="confirmPassword" borderBottom="false" class="form-item-inner">
            <u-input
              v-model="form.confirmPassword"
              type="password"
              :placeholder="t('login.confirmPassword')"
              border="none"
              clearable
              fontSize="15px"
              customStyle="padding: 0; background: transparent;"
            ></u-input>
          </u-form-item>
        </view>
      </u-form>

      <!-- 提交按钮 -->
      <button 
        class="submit-btn"
        :disabled="loading"
        @click="handleSubmit"
      >
        <text v-if="!loading">{{ currentTab === 0 ? t('login.loginBtn') : t('login.registerBtn') }}</text>
        <u-loading-icon v-else color="#ffffff" mode="circle"></u-loading-icon>
      </button>

      <!-- 底部链接 -->
      <view class="footer-link" v-if="currentTab === 0">
        <text class="link-text" @click="uni.showToast({title: '暂未开放', icon: 'none'})">忘记密码?</text>
        <text class="link-primary" @click="handleTabChange(1)">注册账号</text>
      </view>
      <view class="footer-link center" v-else>
        <text class="link-text">已有账号? <text class="link-primary" @click="handleTabChange(0)">去登录</text></text>
      </view>
    </view>

    <!-- 第三方登录 -->
    <view class="social-area">
      <view class="divider-row">
        <view class="divider-line"></view>
        <text class="divider-text">或</text>
        <view class="divider-line"></view>
      </view>
      <view class="social-icons">
        <view class="social-btn" @click="uni.showToast({title: '微信登录暂未开放', icon: 'none'})">
          <text class="social-emoji">📱</text>
        </view>
        <view class="social-btn" @click="uni.showToast({title: '苹果登录暂未开放', icon: 'none'})">
          <text class="social-emoji">🍎</text>
        </view>
      </view>
      <text class="agreement-text">登录即代表同意 <text class="link-primary">用户协议</text> 和 <text class="link-primary">隐私政策</text></text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from "vue";
import { useUserStore } from "@/stores/user";
import { useI18n } from 'vue-i18n';
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
const { t } = useI18n();
const uForm = ref();
const currentTab = ref(0);
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
        await userStore.login({ email: form.email, password: form.password });
        uni.switchTab({ url: "/pages/index/index" });
      } else {
        await userStore.register({ email: form.email, password: form.password, username: form.username });
        uni.showToast({ title: "注册成功，正在登录...", icon: "success" });
        setTimeout(async () => {
          await userStore.login({ email: form.email, password: form.password });
          uni.switchTab({ url: "/pages/index/index" });
        }, 1500);
      }
    } catch (error: any) {
      uni.showToast({ title: error.message || "操作失败", icon: "none" });
    } finally {
      loading.value = false;
    }
  }).catch((errors: any) => {
    console.log("Validation failed", errors);
  });
};
</script>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  background: #FFF8F0;
  position: relative;
}

/* 顶部弧形装饰 */
.top-decoration {
  position: relative;
  padding: 60px 0 50px;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: hidden;
}
.arc-bg {
  position: absolute;
  top: 0; left: -20%; right: -20%;
  height: 110%;
  background: linear-gradient(180deg, #FFF0E6 0%, #FFF8F0 100%);
  border-radius: 0 0 50% 50%;
}
.top-icon {
  position: relative; z-index: 1;
  width: 72px; height: 72px;
  background: linear-gradient(135deg, #E8A87C, #D4A574);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 32px;
  box-shadow: 0 6px 20px rgba(232, 168, 124, 0.3);
  margin-bottom: 16px;
}
.top-title {
  position: relative; z-index: 1;
  font-size: 24px; font-weight: 700;
  color: #3D3D3D;
  margin-bottom: 6px;
}
.top-subtitle {
  position: relative; z-index: 1;
  font-size: 14px; color: #8C8C8C;
}

/* Tab 切换 */
.tab-bar {
  padding: 0 32px;
  margin-bottom: 24px;
}
.tab-inner {
  position: relative;
  display: flex;
  background: #F5F0EB;
  border-radius: 24px;
  padding: 4px;
}
.tab-item {
  flex: 1;
  text-align: center;
  padding: 10px 0;
  font-size: 15px; font-weight: 500;
  color: #8C8C8C;
  position: relative; z-index: 1;
  transition: color 0.3s;
  &.active { color: #3D3D3D; font-weight: 600; }
}
.tab-indicator {
  position: absolute;
  top: 4px; bottom: 4px;
  width: calc(50% - 4px);
  background: #FFFFFF;
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 表单区 */
.form-area {
  padding: 0 32px;
}
.input-card {
  display: flex;
  align-items: center;
  background: #FFFFFF;
  border-radius: 16px;
  padding: 4px 16px;
  margin-bottom: 14px;
  border: 1.5px solid transparent;
  transition: all 0.2s;
  box-shadow: 0 1px 4px rgba(0,0,0,0.03);
  &:focus-within {
    border-color: #E8A87C;
    box-shadow: 0 0 0 3px rgba(232, 168, 124, 0.1);
  }
}
.input-emoji {
  font-size: 20px;
  margin-right: 10px;
  flex-shrink: 0;
}
.form-item-inner {
  flex: 1;
}
.animate-field {
  animation: field-in 0.3s ease-out;
}
@keyframes field-in {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 提交按钮 */
.submit-btn {
  width: 100%;
  height: 50px;
  background: linear-gradient(135deg, #E8A87C, #D4A574);
  color: #fff;
  border: none;
  border-radius: 25px;
  font-size: 17px; font-weight: 600;
  margin-top: 24px;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 6px 20px rgba(232, 168, 124, 0.35);
  transition: all 0.2s;
  &:active { transform: scale(0.97); opacity: 0.9; }
  &[disabled] { background: #E0E0E0; box-shadow: none; }
}

/* 底部链接 */
.footer-link {
  display: flex;
  justify-content: space-between;
  padding: 16px 4px 0;
  &.center { justify-content: center; }
}
.link-text { font-size: 13px; color: #8C8C8C; }
.link-primary { font-size: 13px; color: #E8A87C; font-weight: 600; }

/* 第三方登录 */
.social-area {
  position: absolute;
  bottom: 40px; left: 0; right: 0;
  padding: 0 32px;
}
.divider-row {
  display: flex; align-items: center;
  margin-bottom: 20px;
}
.divider-line { flex: 1; height: 1px; background: rgba(0,0,0,0.06); }
.divider-text { margin: 0 16px; font-size: 12px; color: #BFBFBF; }

.social-icons {
  display: flex; justify-content: center; gap: 24px;
  margin-bottom: 16px;
}
.social-btn {
  width: 48px; height: 48px;
  border-radius: 50%;
  background: #F5F0EB;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
  &:active { transform: scale(0.95); }
}
.social-emoji { font-size: 22px; }

.agreement-text {
  display: block;
  text-align: center;
  font-size: 11px; color: #BFBFBF;
}

/* uview 样式覆盖 */
:deep(.u-form-item__body) { padding: 0 !important; }
:deep(.u-form-item__body__right__message) { margin-left: 0 !important; }
</style>
