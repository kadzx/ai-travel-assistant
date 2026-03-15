<template>
  <view class="container">
    <view class="card">
      <view class="header-title">定制您的专属行程</view>
      <view class="form-item">
        <text class="label">目的地</text>
        <input v-model="form.destination" class="input" placeholder="请输入目的地" />
      </view>

      <view class="form-item">
        <text class="label">天数</text>
        <input v-model="form.days" class="input" type="number" placeholder="请输入游玩天数" />
      </view>

      <view class="form-item">
        <text class="label">预算</text>
        <input v-model="form.budget" class="input" type="number" placeholder="请输入预算（元）" />
      </view>

      <view class="form-item">
        <text class="label">偏好</text>
        <textarea
          v-model="form.interests"
          class="textarea"
          placeholder="例如：喜欢自然风光、想打卡网红店、对历史文化感兴趣..."
        />
      </view>

      <view class="submit-btn" :class="{ disabled: loading }" @click="submit">
        <text class="submit-text">{{ loading ? '生成中...' : '生成智能行程' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useItineraryStore } from '@/stores/itinerary';

const itineraryStore = useItineraryStore();
const loading = ref(false);

const form = reactive({
  destination: '',
  days: '',
  budget: '',
  interests: ''
});

const validateForm = () => {
  if (!form.destination.trim()) return '请输入目的地';
  const dayNum = Number(form.days);
  if (!form.days || !Number.isFinite(dayNum) || dayNum <= 0) return '天数必须大于 0';
  const budgetNum = Number(form.budget);
  if (!form.budget || !Number.isFinite(budgetNum) || budgetNum < 0) return '请输入有效预算';
  return '';
};

const submit = async () => {
  if (loading.value) return;
  const errMsg = validateForm();
  if (errMsg) {
    uni.showToast({ title: errMsg, icon: 'none' });
    return;
  }

  loading.value = true;
  try {
    const payload = {
      ...form,
      days: Number(form.days),
      budget: Number(form.budget),
      interests: form.interests ? [form.interests] : []
    };

    await itineraryStore.generate(payload);
    uni.showToast({ title: '行程生成成功', icon: 'success' });

    setTimeout(() => {
      uni.navigateTo({ url: '/pages/itinerary/detail?preview=true' });
    }, 800);
  } catch (e: any) {
    uni.showToast({ title: e.message || '生成失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
};
</script>

<style lang="scss" scoped>
.container {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: 100vh;
}

.card {
  background-color: #fff;
  border-radius: 16px;
  padding: 24px 20px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.05);
}

.header-title {
  font-size: 20px;
  font-weight: bold;
  color: #333;
  margin-bottom: 24px;
  text-align: center;
}

.form-item {
  margin-bottom: 14px;
}

.label {
  display: block;
  font-size: 13px;
  color: #666;
  margin-bottom: 6px;
}

.input {
  width: 100%;
  height: 42px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  padding: 0 12px;
  box-sizing: border-box;
  background: #fff;
}

.textarea {
  width: 100%;
  min-height: 90px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  padding: 10px 12px;
  box-sizing: border-box;
  background: #fff;
}

.submit-btn {
  margin-top: 20px;
  height: 44px;
  border-radius: 999px;
  background: linear-gradient(135deg, #FF2442 0%, #FF6B6B 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.submit-btn.disabled {
  opacity: 0.7;
}

.submit-text {
  color: #fff;
  font-size: 16px;
  font-weight: 700;
}
</style>
