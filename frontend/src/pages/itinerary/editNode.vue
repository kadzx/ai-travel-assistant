<template>
  <view class="cream-page">
    <!-- 顶栏 -->
    <view class="cream-topbar">
      <view class="h-[var(--status-bar-height)]"></view>
      <view class="cream-topbar-row">
        <view class="cream-topbar-btn" @click="goBack">
          <text class="cream-topbar-icon">‹</text>
        </view>
        <text class="cream-topbar-title">{{ isCreate ? t('itinerary.addNode') : t('itinerary.editNode') }}</text>
        <view class="cream-topbar-btn" style="opacity:0;"><text>‹</text></view>
      </view>
    </view>

    <scroll-view scroll-y class="cream-scroll">
      <!-- 名称 -->
      <view class="cream-card">
        <text class="cream-label">📍 {{ t('itinerary.nodeName') }} *</text>
        <input class="cream-input" v-model="form.title" :placeholder="t('itinerary.nodeNamePh')" />
      </view>

      <!-- 地点 -->
      <view class="cream-card" @click="chooseLocation">
        <text class="cream-label">📌 {{ t('itinerary.nodeLocation') }}</text>
        <view class="cream-loc-row">
          <text class="cream-loc-text" :class="{ ph: !form.location }">{{ form.location || t('itinerary.nodeLocationPh') }}</text>
          <text class="cream-loc-arrow">›</text>
        </view>
      </view>

      <!-- 时间 + 交通 -->
      <view class="cream-row">
        <view class="cream-card half">
          <text class="cream-label">⏰ {{ t('itinerary.nodeTime') }}</text>
          <input class="cream-input" v-model="form.timeSlot" placeholder="09:00-11:00" />
        </view>
        <view class="cream-card half">
          <text class="cream-label">🚗 {{ t('itinerary.nodeTransport') }}</text>
          <input class="cream-input" v-model="form.transport" :placeholder="t('itinerary.nodeTransportPh')" />
        </view>
      </view>

      <!-- 费用 + 时长 -->
      <view class="cream-row">
        <view class="cream-card half">
          <text class="cream-label">💰 {{ t('itinerary.nodeCost') }}</text>
          <input class="cream-input" v-model="form.cost" type="text" inputmode="decimal" placeholder="0" />
        </view>
        <view class="cream-card half">
          <text class="cream-label">⏱ {{ t('itinerary.nodeDuration') }}</text>
          <input class="cream-input" v-model="form.durationMin" type="text" inputmode="numeric" placeholder="0" />
        </view>
      </view>

      <!-- 备注 -->
      <view class="cream-card">
        <text class="cream-label">📝 {{ t('itinerary.nodeNotes') }}</text>
        <textarea class="cream-textarea" v-model="form.notes" :placeholder="t('itinerary.nodeNotesPh')" :auto-height="true" :maxlength="500" />
      </view>

      <!-- 状态标记 -->
      <view v-if="!isCreate" class="cream-card status-card">
        <text class="cream-label">📋 状态</text>
        <view class="status-row">
          <view class="status-chip" :class="{ active: form.status === 'planned' }" @click="form.status = 'planned'">
            <text class="status-chip-text">🗓 {{ t('itinerary.statusPlanned') }}</text>
          </view>
          <view class="status-chip done-chip" :class="{ active: form.status === 'done' }" @click="form.status = 'done'">
            <text class="status-chip-text">✅ {{ t('itinerary.markDone') }}</text>
          </view>
        </view>
      </view>

      <view style="height: 120px;"></view>
    </scroll-view>

    <!-- 底部按钮 -->
    <view class="cream-bottom">
      <view class="cream-bottom-inner">
        <view class="cream-btn cancel" @click="goBack">
          <text class="cream-btn-text">{{ t('common.cancel') }}</text>
        </view>
        <view class="cream-btn save" @click="handleSave">
          <text class="cream-btn-text-w">{{ t('common.save') }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { useI18n } from 'vue-i18n';
import { useItineraryStore } from '@/stores/itinerary';

const { t } = useI18n();
const store = useItineraryStore();

const isCreate = ref(true);
const itineraryId = ref('');
const nodeId = ref('');
const form = reactive({
  dayIndex: 1,
  title: '',
  location: '',
  latitude: null as number | null,
  longitude: null as number | null,
  address: '',
  timeSlot: '',
  transport: '',
  cost: '',
  durationMin: '',
  notes: '',
  status: 'planned'
});

function goBack() { uni.navigateBack(); }

function chooseLocation() {
  uni.navigateTo({
    url: '/pages/common/chooseLocation',
    events: {
      chooseLocation: (data: any) => {
        form.location = data.name || '';
        form.latitude = data.latitude;
        form.longitude = data.longitude;
        form.address = data.address || '';
      }
    }
  });
}

async function handleSave() {
  if (!form.title.trim()) {
    uni.showToast({ title: t('itinerary.titleRequired'), icon: 'none' });
    return;
  }
  const nodeData: any = {
    dayIndex: form.dayIndex,
    title: form.title.trim(),
    location: form.location,
    latitude: form.latitude,
    longitude: form.longitude,
    address: form.address,
    timeSlot: form.timeSlot,
    transport: form.transport,
    cost: form.cost ? Number(form.cost) : 0,
    durationMin: form.durationMin ? Number(form.durationMin) : 0,
    notes: form.notes,
    status: form.status
  };

  try {
    if (isCreate.value) {
      await store.addNode(itineraryId.value, nodeData);
    } else {
      await store.updateNode(itineraryId.value, nodeId.value, nodeData);
    }
    uni.showToast({ title: t('common.success'), icon: 'success' });
    setTimeout(() => uni.navigateBack(), 600);
  } catch (e) {
    uni.showToast({ title: t('itinerary.saveFail'), icon: 'none' });
  }
}

onLoad((options: any) => {
  itineraryId.value = options?.itineraryId || '';

  if (options?.nodeId) {
    // 编辑模式：从 store 的 currentItinerary 中找到节点
    isCreate.value = false;
    nodeId.value = options.nodeId;
    const source = store.currentItinerary;
    const nodes = source?.nodes || source?.content?.nodes || [];
    const node = nodes.find((n: any) => String(n.id) === String(options.nodeId));
    if (node) {
      form.dayIndex = Number(node.dayIndex) || 1;
      form.title = node.title || '';
      form.location = node.location || '';
      form.latitude = node.latitude ?? null;
      form.longitude = node.longitude ?? null;
      form.address = node.address || '';
      form.timeSlot = node.timeSlot || '';
      form.transport = node.transport || '';
      form.cost = node.cost ? String(node.cost) : '';
      form.durationMin = node.durationMin ? String(node.durationMin) : '';
      form.notes = node.notes || '';
      form.status = node.status || 'planned';
    }
  } else {
    // 新建模式
    isCreate.value = true;
    form.dayIndex = Number(options?.dayIndex) || 1;
  }
});
</script>

<style lang="scss" scoped>
.cream-page {
  min-height: 100vh; background: #FFF8F0;
  display: flex; flex-direction: column;
}

/* 顶栏 */
.cream-topbar { background: #FFF8F0; position: sticky; top: 0; z-index: 10; }
.cream-topbar-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px;
}
.cream-topbar-btn {
  width: 36px; height: 36px; border-radius: 50%;
  background: rgba(149,184,163,0.12);
  display: flex; align-items: center; justify-content: center;
}
.cream-topbar-icon { font-size: 24px; color: #5D4E42; font-weight: bold; }
.cream-topbar-title { font-size: 17px; font-weight: 700; color: #3D3028; }

/* 滚动区 */
.cream-scroll { flex: 1; padding: 0 16px; }

/* 卡片 */
.cream-card {
  background: #fff; border-radius: 16px; padding: 14px 16px;
  margin-bottom: 12px; box-shadow: 0 1px 6px rgba(0,0,0,0.03);
}
.cream-label {
  display: block; font-size: 13px; color: #8C7B6B;
  font-weight: 500; margin-bottom: 10px;
}

/* 输入框 */
.cream-input {
  display: block; width: 100%; background: #F8F4EF;
  border-radius: 12px; padding: 12px 14px;
  font-size: 15px; color: #3D3028;
  border: 1px solid #F0EBE5; box-sizing: border-box;
  outline: none;
}
.cream-input:focus { border-color: #E8A87C; }

.cream-textarea {
  display: block; width: 100%; background: #F8F4EF;
  border-radius: 12px; padding: 12px 14px;
  font-size: 15px; color: #3D3028; min-height: 80px;
  border: 1px solid #F0EBE5; box-sizing: border-box;
  outline: none; line-height: 1.5; resize: none;
}
.cream-textarea:focus { border-color: #E8A87C; }

/* 地点选择 */
.cream-loc-row {
  display: flex; align-items: center; background: #F8F4EF;
  border-radius: 12px; padding: 12px 14px; border: 1px solid #F0EBE5;
}
.cream-loc-text { flex: 1; font-size: 15px; color: #3D3028; }
.cream-loc-text.ph { color: #C4B5A8; }
.cream-loc-arrow { font-size: 20px; color: #C4B5A8; margin-left: 8px; }

/* 行 */
.cream-row { display: flex; gap: 12px; }
.cream-row .cream-card.half { flex: 1; }

/* 状态选择 */
.status-card { }
.status-row { display: flex; gap: 10px; }
.status-chip {
  flex: 1; padding: 12px; border-radius: 12px;
  background: #F8F4EF; text-align: center;
  border: 2px solid transparent; transition: all 0.2s;
}
.status-chip.active { border-color: #E8A87C; background: #FFF3E8; }
.done-chip.active { border-color: #4ECDC4; background: #E8F8F0; }
.status-chip-text { font-size: 14px; color: #5D4E42; font-weight: 500; }

/* 底部按钮 */
.cream-bottom {
  position: fixed; bottom: 0; left: 0; right: 0;
  background: #FFF8F0; border-top: 1px solid #F0EBE5;
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
  z-index: 10;
}
.cream-bottom-inner { display: flex; gap: 12px; }
.cream-btn {
  flex: 1; height: 48px; border-radius: 24px;
  display: flex; align-items: center; justify-content: center;
}
.cream-btn.cancel { background: #F0EBE5; }
.cream-btn.save { background: #E8A87C; }
.cream-btn-text { font-size: 15px; color: #5D4E42; font-weight: 600; }
.cream-btn-text-w { font-size: 15px; color: #fff; font-weight: 600; }
</style>
