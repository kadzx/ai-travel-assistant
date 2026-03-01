<template>
  <view class="container">
    <view class="card">
      <view class="header-title">定制您的专属行程</view>
      <u-form :model="form" ref="uForm" :rules="rules" labelWidth="80">
        <u-form-item label="目的地" prop="destination" borderBottom>
          <u-input v-model="form.destination" placeholder="请输入目的地" border="none" clearable></u-input>
        </u-form-item>
        
        <u-form-item label="天数" prop="days" borderBottom>
          <u-input 
            v-model="form.days" 
            type="number" 
            placeholder="请输入游玩天数" 
            border="none"
          ></u-input>
        </u-form-item>
        
        <u-form-item label="预算" prop="budget" borderBottom>
          <u-input 
            v-model="form.budget" 
            type="number" 
            placeholder="请输入预算(元)" 
            border="none"
          ></u-input>
        </u-form-item>
        
        <u-form-item label="偏好" prop="interests" borderBottom>
          <u-textarea 
            v-model="form.interests" 
            placeholder="例如：喜欢自然风光、想要打卡网红店、对历史文化感兴趣..." 
            border="none"
            autoHeight
          ></u-textarea>
        </u-form-item>
      </u-form>
      
      <u-button 
        type="primary" 
        text="生成智能行程" 
        customStyle="margin-top: 30px; background: linear-gradient(to right, #4facfe 0%, #00f2fe 100%); border: none;"
        :loading="loading"
        @click="submit"
      ></u-button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useItineraryStore } from '@/stores/itinerary';

const itineraryStore = useItineraryStore();
const loading = ref(false);
const uForm = ref();

const form = reactive({
  destination: '',
  days: '',
  budget: '',
  interests: ''
});

const rules = {
  destination: [
    { required: true, message: '请输入目的地', trigger: ['blur', 'change'] }
  ],
  days: [
    { required: true, message: '请输入游玩天数', trigger: ['blur', 'change'] },
    { 
      validator: (rule: any, value: string, callback: any) => {
        return parseInt(value) > 0;
      },
      message: '天数必须大于0',
      trigger: ['blur', 'change']
    }
  ],
  budget: [
    { required: true, message: '请输入预算', trigger: ['blur', 'change'] }
  ]
};

const submit = () => {
  uForm.value.validate().then(async () => {
    loading.value = true;
    try {
      // Split interests by comma or space if needed, or send as string
      const payload = {
        ...form,
        interests: form.interests ? [form.interests] : []
      };
      
      await itineraryStore.generate(payload);
      uni.showToast({ title: '行程生成成功', icon: 'success' });
      
      setTimeout(() => {
        uni.switchTab({ url: '/pages/itinerary/list' });
      }, 1500);
    } catch (e: any) {
      uni.showToast({ title: e.message || '生成失败', icon: 'none' });
    } finally {
      loading.value = false;
    }
  }).catch((errors: any) => {
    console.log('Validation failed', errors);
  });
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
</style>
