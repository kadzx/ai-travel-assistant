<template>
  <view class="page-container">
    <!-- 顶栏 -->
    <view class="topbar">
      <view class="status-bar"></view>
      <view class="topbar-inner">
        <view class="back-btn" @click="uni.navigateBack()">
          <text class="back-icon">‹</text>
        </view>
        <text class="topbar-title">创建新行程</text>
        <view class="placeholder-right"></view>
      </view>
    </view>

    <!-- 顶部插图区 -->
    <view class="illustration-area">
      <text class="illustration-emoji">🗺️</text>
      <text class="illustration-emoji-sub">🧭</text>
    </view>

    <!-- 表单区 -->
    <view class="form-area">
      <!-- 目的地 -->
      <view class="form-card">
        <view class="form-card-header">
          <text class="form-emoji">📍</text>
          <text class="form-label">目的地</text>
        </view>
        <input
          v-model="form.destination"
          class="form-input form-input-lg"
          placeholder="你想去哪里？"
          placeholder-class="placeholder-style"
        />
      </view>

      <!-- 天数选择 -->
      <view class="form-card">
        <view class="form-card-header">
          <text class="form-emoji">📅</text>
          <text class="form-label">天数</text>
        </view>
        <view class="stepper">
          <view class="stepper-btn" @click="changeDays(-1)">
            <text class="stepper-btn-text">−</text>
          </view>
          <text class="stepper-value">{{ form.days || 1 }}</text>
          <view class="stepper-btn" @click="changeDays(1)">
            <text class="stepper-btn-text">+</text>
          </view>
        </view>
      </view>

      <!-- 预算范围 -->
      <view class="form-card">
        <view class="form-card-header">
          <text class="form-emoji">💰</text>
          <text class="form-label">预算</text>
        </view>
        <view class="budget-section">
          <view class="budget-bubble">
            <text class="budget-bubble-text">¥{{ form.budget || 0 }}</text>
          </view>
          <slider
            :value="Number(form.budget) || 0"
            :min="0"
            :max="50000"
            :step="500"
            activeColor="#E8A87C"
            backgroundColor="#F0EBE5"
            block-size="20"
            @change="onBudgetChange"
          />
          <view class="budget-range">
            <text class="budget-range-text">¥0</text>
            <text class="budget-range-text">¥50000</text>
          </view>
        </view>
      </view>

      <!-- 旅行偏好 -->
      <view class="form-card">
        <view class="form-card-header">
          <text class="form-emoji">🎯</text>
          <text class="form-label">旅行偏好</text>
        </view>
        <view class="tags-cloud">
          <view
            v-for="tag in preferenceTags"
            :key="tag.value"
            class="tag-item"
            :class="{ 'tag-active': selectedTags.includes(tag.value) }"
            @click="toggleTag(tag.value)"
          >
            <text class="tag-text" :class="{ 'tag-text-active': selectedTags.includes(tag.value) }">{{ tag.label }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部按钮 -->
    <view class="bottom-action">
      <view class="submit-btn" :class="{ disabled: loading }" @click="submit">
        <text class="submit-text">{{ loading ? '生成中...' : '✨ 生成智能行程' }}</text>
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
  days: '3',
  budget: '5000',
  interests: ''
});

const preferenceTags = [
  { label: '🍜 美食', value: '美食' },
  { label: '🏛 文化', value: '文化' },
  { label: '🌿 自然', value: '自然' },
  { label: '🛍 购物', value: '购物' },
  { label: '🧗 冒险', value: '冒险' },
  { label: '🧘 休闲', value: '休闲' },
];

const selectedTags = ref<string[]>([]);

const toggleTag = (value: string) => {
  const idx = selectedTags.value.indexOf(value);
  if (idx >= 0) {
    selectedTags.value.splice(idx, 1);
  } else {
    selectedTags.value.push(value);
  }
  form.interests = selectedTags.value.join(',');
};

const changeDays = (delta: number) => {
  let current = Number(form.days) || 1;
  current += delta;
  if (current < 1) current = 1;
  if (current > 30) current = 30;
  form.days = String(current);
};

const onBudgetChange = (e: any) => {
  form.budget = String(e.detail.value);
};

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
.page-container {
  min-height: 100vh;
  background-color: #FFF8F0;
  padding-bottom: calc(100px + env(safe-area-inset-bottom));
}

/* ===== 顶栏 ===== */
.topbar {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(255, 248, 240, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(232, 168, 124, 0.12);
}
.status-bar {
  height: var(--status-bar-height);
}
.topbar-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
}
.back-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.04);
}
.back-icon {
  font-size: 22px;
  color: #333;
  line-height: 1;
  margin-top: -2px;
}
.topbar-title {
  font-size: 17px;
  font-weight: 700;
  color: #333;
}
.placeholder-right {
  width: 36px;
  height: 36px;
}

/* ===== 插图区 ===== */
.illustration-area {
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: linear-gradient(180deg, rgba(255, 240, 227, 0.6) 0%, rgba(255, 248, 240, 0) 100%);
}
.illustration-emoji {
  font-size: 52px;
  animation: floatA 3s ease-in-out infinite;
}
.illustration-emoji-sub {
  font-size: 36px;
  animation: floatB 3s ease-in-out infinite 0.5s;
}
@keyframes floatA {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-6px) rotate(-5deg); }
}
@keyframes floatB {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-8px) rotate(5deg); }
}

/* ===== 表单区 ===== */
.form-area {
  padding: 0 16px;
}
.form-card {
  background: #fff;
  border-radius: 20px;
  padding: 20px;
  margin-bottom: 14px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.03);
}
.form-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}
.form-emoji {
  font-size: 20px;
}
.form-label {
  font-size: 15px;
  font-weight: 600;
  color: #333;
}
.form-input {
  width: 100%;
  height: 44px;
  border: 1.5px solid #F0EBE5;
  border-radius: 14px;
  padding: 0 14px;
  box-sizing: border-box;
  font-size: 15px;
  color: #333;
  background: #FDFAF6;
  transition: border-color 0.2s;
}
.form-input:focus {
  border-color: #E8A87C;
}
.form-input-lg {
  font-size: 18px;
  height: 50px;
  font-weight: 500;
}
.placeholder-style {
  color: #ccc;
}

/* ===== 步进器 ===== */
.stepper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 28px;
}
.stepper-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #95B8A3;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(149, 184, 163, 0.3);
}
.stepper-btn:active {
  opacity: 0.8;
  transform: scale(0.95);
}
.stepper-btn-text {
  font-size: 22px;
  color: #fff;
  font-weight: 700;
  line-height: 1;
}
.stepper-value {
  font-size: 28px;
  font-weight: 700;
  color: #333;
  min-width: 40px;
  text-align: center;
}

/* ===== 预算滑块 ===== */
.budget-section {
  padding: 0 4px;
}
.budget-bubble {
  display: flex;
  justify-content: center;
  margin-bottom: 8px;
}
.budget-bubble-text {
  display: inline-block;
  padding: 4px 16px;
  border-radius: 999px;
  background: linear-gradient(135deg, #E8A87C, #D4A574);
  color: #fff;
  font-size: 16px;
  font-weight: 700;
}
.budget-range {
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
}
.budget-range-text {
  font-size: 11px;
  color: #ccc;
}

/* ===== 标签云 ===== */
.tags-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.tag-item {
  padding: 8px 18px;
  border-radius: 999px;
  background: #F5F0EB;
  transition: all 0.2s;
}
.tag-item:active {
  transform: scale(0.95);
}
.tag-active {
  background: linear-gradient(135deg, #E8A87C, #D4A574);
  box-shadow: 0 2px 8px rgba(232, 168, 124, 0.3);
}
.tag-text {
  font-size: 14px;
  color: #888;
  font-weight: 500;
}
.tag-text-active {
  color: #fff;
}

/* ===== 底部按钮 ===== */
.bottom-action {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 16px 20px calc(16px + env(safe-area-inset-bottom));
  background: rgba(255, 248, 240, 0.9);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}
.submit-btn {
  height: 52px;
  border-radius: 999px;
  background: linear-gradient(135deg, #E8A87C 0%, #D4A574 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(232, 168, 124, 0.35);
}
.submit-btn:active {
  transform: scale(0.98);
  opacity: 0.9;
}
.submit-btn.disabled {
  opacity: 0.6;
}
.submit-text {
  color: #fff;
  font-size: 17px;
  font-weight: 700;
}
</style>
