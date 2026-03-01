<template>
  <view class="container">
    <view class="header">
      <image src="/static/logo.png" mode="aspectFit" class="logo"></image>
      <text class="title">智游助手</text>
    </view>

    <view class="auth-card">
      <u-tabs
        :list="tabs"
        :current="currentTab"
        @change="handleTabChange"
        lineColor="#3c9cff"
        :activeStyle="{ color: '#3c9cff', fontWeight: 'bold' }"
        itemStyle="height: 44px; flex: 1;"
      ></u-tabs>

      <view class="form-content">
        <u-form :model="form" ref="uForm" :rules="rules" labelWidth="80">
          <u-form-item label="邮箱" prop="email" borderBottom>
            <u-input
              v-model="form.email"
              placeholder="请输入邮箱"
              border="none"
            ></u-input>
          </u-form-item>

          <u-form-item label="密码" prop="password" borderBottom>
            <u-input
              v-model="form.password"
              type="password"
              placeholder="请输入密码"
              border="none"
            ></u-input>
          </u-form-item>

          <template v-if="currentTab === 1">
            <u-form-item label="确认密码" prop="confirmPassword" borderBottom>
              <u-input
                v-model="form.confirmPassword"
                type="password"
                placeholder="请再次输入密码"
                border="none"
              ></u-input>
            </u-form-item>
            <u-form-item label="昵称" prop="username" borderBottom>
              <u-input
                v-model="form.username"
                placeholder="请输入昵称"
                border="none"
              ></u-input>
            </u-form-item>
          </template>
        </u-form>

        <u-button
          type="primary"
          :text="currentTab === 0 ? '立即登录' : '注册账号'"
          customStyle="margin-top: 30px; border-radius: 25px;"
          :loading="loading"
          @click="handleSubmit"
        ></u-button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from "vue";
import { useUserStore } from "@/stores/user";
// Explicitly import components to debug uView Plus issues
// @ts-ignore
import UTabs from "uview-plus/components/u-tabs/u-tabs.vue";
// @ts-ignore
import UForm from "uview-plus/components/u-form/u-form.vue";
// @ts-ignore
import UFormItem from "uview-plus/components/u-form-item/u-form-item.vue";
// @ts-ignore
import UInput from "uview-plus/components/u-input/u-input.vue";
// @ts-ignore
import UButton from "uview-plus/components/u-button/u-button.vue";

const userStore = useUserStore();
const uForm = ref();
const currentTab = ref(0);
const loading = ref(false);

const tabs = [{ name: "登录" }, { name: "注册" }];

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

const handleTabChange = (item: any) => {
  currentTab.value = item.index;
  // Reset form but keep email if desired, or full reset
  // form.password = '';
  // form.confirmPassword = '';
  // form.username = '';
  // Clear validation
  if (uForm.value) {
    uForm.value.clearValidate();
  }
};

const handleSubmit = () => {
  uForm.value
    .validate()
    .then(async () => {
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
          uni.showToast({ title: "注册成功，请登录", icon: "success" });
          currentTab.value = 0;
        }
      } catch (error: any) {
        uni.showToast({
          title: error.message || "操作失败",
          icon: "none",
        });
      } finally {
        loading.value = false;
      }
    })
    .catch((errors: any) => {
      console.log("Validation failed", errors);
    });
};
</script>

<style lang="scss" scoped>
.container {
  min-height: 100vh;
  background-color: #f5f7fa;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 60px;
}

.header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 40px;

  .logo {
    width: 80px;
    height: 80px;
    margin-bottom: 16px;
    border-radius: 16px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .title {
    font-size: 24px;
    font-weight: 600;
    color: #333;
  }
}

.auth-card {
  width: 90%;
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.05);

  .form-content {
    padding: 30px 20px;
  }
}
</style>
