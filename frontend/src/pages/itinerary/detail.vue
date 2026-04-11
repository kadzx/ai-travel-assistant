<template>
  <view class="page">
    <!-- 毛玻璃顶栏 -->
    <view class="top-bar">
      <view class="top-bar-inner">
        <view class="h-[var(--status-bar-height)]"></view>
        <view class="bar-row">
          <view class="bar-btn" @click="goBack">
            <u-icon name="arrow-left" size="20" color="#5A5A5A"></u-icon>
          </view>
          <text class="bar-title">{{ itineraryTitle }}</text>
          <view class="bar-right">
            <view class="bar-btn" @click="openCreateNode">
              <u-icon name="edit-pen" size="19" color="#95B8A3"></u-icon>
            </view>
            <view class="bar-btn delete-bar-btn" @click="confirmDeleteItinerary">
              <text style="font-size: 18px;">🗑</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- Loading -->
    <view v-if="loading" class="loading-wrap">
      <u-loading-icon mode="circle" color="#95B8A3"></u-loading-icon>
    </view>

    <scroll-view v-else scroll-y class="main-scroll">
      <!-- Hero 封面区 -->
      <view class="hero-card">
        <view class="hero-inner">
          <view class="hero-text">
            <text class="hero-dest">{{ linearContent.destination || '未设置目的地' }}</text>
            <text class="hero-date">{{ linearContent.startDate || '' }} {{ linearContent.endDate ? '— ' + linearContent.endDate : '' }}</text>
          </view>
          <view class="hero-badge">
            <text class="hero-badge-text">{{ dayCount }}天</text>
          </view>
        </view>
      </view>

      <!-- 地图概览 -->
      <view v-if="mapMarkers.length > 0" class="map-section">
        <map
          class="itinerary-map"
          :latitude="mapCenter.lat"
          :longitude="mapCenter.lng"
          :markers="mapMarkers"
          :scale="12"
          :show-location="false"
          @markertap="onMarkerTap"
        />
      </view>

      <!-- 统计卡片行 -->
      <view class="stats-row">
        <view class="stat-card">
          <text class="stat-num">{{ dayCount }}</text>
          <text class="stat-label">天数</text>
        </view>
        <view class="stat-card">
          <text class="stat-num">{{ nodeCount }}</text>
          <text class="stat-label">景点数</text>
        </view>
        <view class="stat-card">
          <text class="stat-num">¥{{ totalBudget }}</text>
          <text class="stat-label">预算</text>
        </view>
      </view>

      <!-- Day 切换标签栏 -->
      <scroll-view v-if="dayGroups.length > 0" scroll-x class="day-tabs-scroll">
        <view class="day-tabs">
          <view
            v-for="group in dayGroups"
            :key="group.dayIndex"
            class="day-tab"
            :class="{ active: activeDay === group.dayIndex }"
            @click="activeDay = group.dayIndex"
          >
            <text>Day {{ group.dayIndex }}</text>
          </view>
        </view>
      </scroll-view>

      <!-- 空状态 -->
      <view v-if="dayGroups.length === 0" class="empty-state">
        <text class="empty-icon">📋</text>
        <text class="empty-text">暂无景点，点击下方添加</text>
      </view>

      <!-- 时间线布局 -->
      <view v-for="group in filteredDayGroups" :key="group.dayIndex" class="timeline-section">
        <view
          v-for="(node, index) in group.nodes"
          :key="node.id"
          class="timeline-item"
        >
          <!-- 左侧时间线 -->
          <view class="timeline-left">
            <view class="timeline-dot" :style="{ background: getTimeColor(node.timeSlot) }"></view>
            <view v-if="index < group.nodes.length - 1" class="timeline-line" :style="{ background: getTimeColor(node.timeSlot) }"></view>
          </view>
          <!-- 右侧卡片 -->
          <view class="timeline-card" :class="{ 'is-done': node.status === 'done' }">
            <view class="card-header">
              <view class="time-tag" :style="{ background: getTimeColor(node.timeSlot) + '18', color: getTimeColor(node.timeSlot) }">
                {{ node.timeSlot || '待定' }}
              </view>
              <view v-if="node.status === 'done'" class="done-check">✓</view>
            </view>
            <text class="card-title" :class="{ 'line-through': node.status === 'done' }">{{ node.title }}</text>
            <text class="card-desc">{{ node.location || '未填写地点' }}</text>
            <text v-if="node.notes" class="card-notes">{{ node.notes }}</text>
            <view class="card-footer">
              <view v-if="node.transport" class="transport-tag" :style="getTransportStyle(node.transport)">
                {{ getTransportEmoji(node.transport) }} {{ node.transport }}
              </view>
              <text class="card-budget">💰 ¥{{ node.cost || 0 }}</text>
            </view>
            <!-- 操作按钮 -->
            <view class="card-actions">
              <view class="action-btn navigate" @click="navigateToNode(node)">📍 导航</view>
              <view class="action-btn" @click="openEditNode(node)">编辑</view>
              <view class="action-btn" @click="moveNode(node, -1)">↑</view>
              <view class="action-btn" @click="moveNode(node, 1)">↓</view>
              <view class="action-btn danger" @click="removeNode(node)">删除</view>
            </view>
          </view>
        </view>
      </view>

      <!-- 添加景点按钮 -->
      <view class="add-spot-btn" @click="openCreateNode">
        <text class="add-spot-text">＋ 添加景点</text>
      </view>

      <view class="bottom-spacer"></view>
    </scroll-view>

    <!-- 底部固定按钮 -->
    <view v-if="isPreview" class="bottom-bar">
      <view class="save-btn" :class="{ loading: saving }" @click="handleSavePreview">
        <text class="save-btn-text">{{ saving ? '保存中...' : '保存行程 ✨' }}</text>
      </view>
    </view>

    <!-- 编辑弹窗 -->
    <view v-if="showEditor" class="editor-overlay">
      <view class="editor-mask" @click="closeEditor"></view>
      <view class="editor-sheet">
        <view class="editor-handle"></view>
        <view class="editor-header">
          <text class="editor-title">{{ editingNodeId ? '编辑景点' : '新增景点' }}</text>
          <view class="editor-close" @click="closeEditor">
            <u-icon name="close" size="18" color="#999"></u-icon>
          </view>
        </view>
        <scroll-view scroll-y class="editor-body">
          <view class="form-row">
            <text class="label">景点名称</text>
            <input v-model="editorForm.title" class="input" placeholder="例如：西湖晨游" />
          </view>
          <view class="form-row">
            <text class="label">时间段</text>
            <input v-model="editorForm.timeSlot" class="input" placeholder="09:00-10:30" />
          </view>
          <view class="form-row">
            <text class="label">地点</text>
            <view style="display:flex;gap:8rpx;align-items:center;">
              <input v-model="editorForm.location" class="input" style="flex:1;" placeholder="请输入地点" />
              <view class="locate-btn" @click="chooseNodeLocation">📍</view>
            </view>
          </view>
          <view class="form-row">
            <text class="label">交通方式</text>
            <view class="transport-picker">
              <view
                v-for="t in transportOptions"
                :key="t.value"
                class="transport-opt"
                :class="{ active: editorForm.transport === t.value }"
                :style="editorForm.transport === t.value ? { background: t.bg, borderColor: t.color, color: t.color } : {}"
                @click="editorForm.transport = t.value"
              >
                {{ t.emoji }} {{ t.label }}
              </view>
            </view>
          </view>
          <view class="form-row-inline">
            <view class="form-row flex-1">
              <text class="label">Day</text>
              <input v-model="editorForm.dayIndex" class="input" type="number" />
            </view>
            <view class="form-row flex-1">
              <text class="label">顺序</text>
              <input v-model="editorForm.sequence" class="input" type="number" />
            </view>
            <view class="form-row flex-1">
              <text class="label">预算</text>
              <input v-model="editorForm.cost" class="input" type="number" placeholder="¥" />
            </view>
          </view>
          <view class="form-row">
            <text class="label">状态</text>
            <view class="status-picker-row">
              <view class="status-picker" :class="{ active: editorForm.status === 'planned' }" @click="editorForm.status = 'planned'">📋 计划</view>
              <view class="status-picker" :class="{ active: editorForm.status === 'done' }" @click="editorForm.status = 'done'">✅ 完成</view>
              <view class="status-picker" :class="{ active: editorForm.status === 'skipped' }" @click="editorForm.status = 'skipped'">⏭️ 跳过</view>
            </view>
          </view>
          <view class="form-row">
            <text class="label">备注</text>
            <textarea v-model="editorForm.notes" class="textarea" placeholder="可选备注"></textarea>
          </view>
        </scroll-view>
        <view class="editor-footer">
          <view class="confirm-btn" @click="submitEditor">
            <text class="confirm-btn-text">确认</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 导航弹窗 -->
    <route-popup
      v-model:visible="showRoutePopup"
      :dest-name="routeTarget.name"
      :dest-location="routeTarget.location"
      :dest-lat="routeTarget.lat"
      :dest-lng="routeTarget.lng"
      :city="linearContent.destination || ''"
    />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { getItineraryDetail, saveItinerary } from '@/api/itinerary';
import { useItineraryStore, type LinearNode } from '@/stores/itinerary';
import RoutePopup from '@/components/route-popup/route-popup.vue';

const itineraryStore = useItineraryStore();
const loading = ref(false);
const saving = ref(false);
const isPreview = ref(false);
const itineraryId = ref<string>('');
const itineraryTitle = ref('我的行程');
const linearContent = ref<any>({
  version: 'v1',
  destination: '',
  nodes: []
});
const showEditor = ref(false);
const editingNodeId = ref<string>('');
const editorForm = ref<any>({
  title: '',
  timeSlot: '',
  location: '',
  latitude: null,
  longitude: null,
  address: '',
  transport: '',
  dayIndex: 1,
  sequence: 1,
  status: 'planned',
  notes: '',
  cost: 0
});
const activeDay = ref(1);

const transportOptions = [
  { value: '步行', label: '步行', emoji: '🚶', color: '#16a34a', bg: 'rgba(22,163,74,0.1)' },
  { value: '公交', label: '公交', emoji: '🚌', color: '#2563eb', bg: 'rgba(37,99,235,0.1)' },
  { value: '打车', label: '打车', emoji: '🚗', color: '#E8A87C', bg: 'rgba(232,168,124,0.1)' },
  { value: '地铁', label: '地铁', emoji: '🚇', color: '#9333ea', bg: 'rgba(147,51,234,0.1)' }
];

function normalizeLocalContent(raw: any) {
  if (raw?.content?.nodes) return raw.content;
  if (raw?.nodes) return raw;
  if (Array.isArray(raw?.content)) return { version: 'v1', destination: '', nodes: raw.content };
  if (typeof raw?.content === 'string' && raw.content.trim()) {
    return {
      version: 'v1',
      destination: '',
      nodes: [{ id: 'legacy_1', dayIndex: 1, sequence: 1, title: '旧版行程', notes: raw.content, status: 'planned' }]
    };
  }
  return { version: 'v1', destination: '', nodes: [] };
}

function sortNodes(nodes: LinearNode[]) {
  return [...nodes].sort((a, b) => (a.dayIndex === b.dayIndex ? a.sequence - b.sequence : a.dayIndex - b.dayIndex));
}

const nodes = computed<LinearNode[]>(() => sortNodes(linearContent.value?.nodes || []));
const dayCount = computed(() => Math.max(1, ...nodes.value.map(n => Number(n.dayIndex) || 1), 1));
const nodeCount = computed(() => nodes.value.length);
const totalBudget = computed(() => nodes.value.reduce((sum, n) => sum + (Number((n as any).cost) || 0), 0));
const dayGroups = computed(() => {
  const groups: Record<number, LinearNode[]> = {};
  nodes.value.forEach(node => {
    const day = Number(node.dayIndex) || 1;
    if (!groups[day]) groups[day] = [];
    groups[day].push(node);
  });
  return Object.keys(groups)
    .map(k => Number(k))
    .sort((a, b) => a - b)
    .map(day => ({ dayIndex: day, nodes: groups[day] }));
});

const filteredDayGroups = computed(() => {
  if (dayGroups.value.length === 0) return [];
  const found = dayGroups.value.find(g => g.dayIndex === activeDay.value);
  return found ? [found] : [dayGroups.value[0]];
});

function getTimeColor(timeSlot: string) {
  if (!timeSlot) return '#B8C5D6';
  const hour = parseInt(timeSlot);
  if (isNaN(hour)) return '#B8C5D6';
  if (hour < 12) return '#F0C987';
  if (hour < 18) return '#E8A87C';
  return '#B8C5D6';
}

function getTransportEmoji(transport: string) {
  const map: Record<string, string> = { '步行': '🚶', '公交': '🚌', '打车': '🚗', '地铁': '🚇' };
  return map[transport] || '🚶';
}

function getTransportStyle(transport: string) {
  const styles: Record<string, any> = {
    '步行': { background: 'rgba(22,163,74,0.1)', color: '#16a34a' },
    '公交': { background: 'rgba(37,99,235,0.1)', color: '#2563eb' },
    '打车': { background: 'rgba(232,168,124,0.15)', color: '#E8A87C' },
    '地铁': { background: 'rgba(147,51,234,0.1)', color: '#9333ea' }
  };
  return styles[transport] || { background: 'rgba(0,0,0,0.05)', color: '#666' };
}

function statusText(status: string) {
  if (status === 'done') return '已完成';
  if (status === 'skipped') return '已跳过';
  return '计划中';
}

function hydrateFromResponse(res: any) {
  itineraryId.value = String(res?.id || '');
  itineraryTitle.value = res?.title || res?.content?.destination || '我的行程';
  linearContent.value = normalizeLocalContent(res);
}

async function loadDetail(id: string) {
  loading.value = true;
  try {
    const res: any = await getItineraryDetail(id);
    hydrateFromResponse(res);
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

function buildOrders(nextNodes: LinearNode[]) {
  return sortNodes(nextNodes).map(node => ({
    nodeId: String(node.id),
    dayIndex: Number(node.dayIndex) || 1,
    sequence: Number(node.sequence) || 1
  }));
}

async function moveNode(node: LinearNode, delta: number) {
  const all = sortNodes(nodes.value);
  const index = all.findIndex(n => String(n.id) === String(node.id));
  const target = index + delta;
  if (index < 0 || target < 0 || target >= all.length) return;
  const next = [...all];
  const temp = next[index];
  next[index] = next[target];
  next[target] = temp;
  next.forEach((item, idx) => {
    item.dayIndex = Math.max(1, Number(item.dayIndex) || 1);
    item.sequence = idx + 1;
  });
  if (!itineraryId.value || isPreview.value) {
    linearContent.value.nodes = next;
    return;
  }
  try {
    const res: any = await itineraryStore.reorderNodes(itineraryId.value, buildOrders(next));
    hydrateFromResponse(res);
  } catch (_) {
    uni.showToast({ title: '移动失败', icon: 'none' });
  }
}

function openCreateNode() {
  editingNodeId.value = '';
  editorForm.value = {
    title: '',
    timeSlot: '',
    location: '',
    latitude: null,
    longitude: null,
    address: '',
    transport: '',
    dayIndex: dayCount.value,
    sequence: nodeCount.value + 1,
    status: 'planned',
    notes: '',
    cost: 0
  };
  showEditor.value = true;
}

function openEditNode(node: LinearNode) {
  editingNodeId.value = String(node.id);
  editorForm.value = {
    title: node.title || '',
    timeSlot: node.timeSlot || '',
    location: node.location || '',
    latitude: node.latitude ?? null,
    longitude: node.longitude ?? null,
    address: (node as any).address || '',
    transport: node.transport || '',
    dayIndex: node.dayIndex || 1,
    sequence: node.sequence || 1,
    status: node.status || 'planned',
    notes: node.notes || '',
    cost: (node as any).cost || 0
  };
  showEditor.value = true;
}

function closeEditor() {
  showEditor.value = false;
}

async function submitEditor() {
  const payload = {
    ...editorForm.value,
    dayIndex: Math.max(1, Number(editorForm.value.dayIndex) || 1),
    sequence: Math.max(1, Number(editorForm.value.sequence) || 1)
  };
  if (!payload.title?.trim()) {
    uni.showToast({ title: '请填写节点标题', icon: 'none' });
    return;
  }

  if (!itineraryId.value || isPreview.value) {
    if (editingNodeId.value) {
      linearContent.value.nodes = nodes.value.map(node =>
        String(node.id) === editingNodeId.value ? { ...node, ...payload } : node
      );
    } else {
      linearContent.value.nodes = [
        ...nodes.value,
        { id: `local_${Date.now()}`, ...payload }
      ];
    }
    showEditor.value = false;
    return;
  }

  try {
    let res: any;
    if (editingNodeId.value) {
      res = await itineraryStore.updateNode(itineraryId.value, editingNodeId.value, payload);
    } else {
      res = await itineraryStore.addNode(itineraryId.value, payload);
    }
    hydrateFromResponse(res);
    showEditor.value = false;
  } catch (_) {
    uni.showToast({ title: '保存节点失败', icon: 'none' });
  }
}

async function removeNode(node: LinearNode) {
  console.log('[removeNode] itineraryId:', itineraryId.value, 'isPreview:', isPreview.value, 'node.id:', node.id);
  if (!itineraryId.value || isPreview.value) {
    linearContent.value.nodes = nodes.value.filter(n => String(n.id) !== String(node.id));
    uni.showToast({ title: '已删除(本地)', icon: 'success' });
    return;
  }
  try {
    const res: any = await itineraryStore.deleteNode(itineraryId.value, String(node.id));
    hydrateFromResponse(res);
    uni.showToast({ title: '已删除', icon: 'success' });
  } catch (e: any) {
    console.error('[removeNode] error:', e);
    uni.showToast({ title: '删除失败', icon: 'none' });
  }
}

async function handleSavePreview() {
  saving.value = true;
  try {
    const res: any = await saveItinerary({
      title: itineraryTitle.value,
      content: linearContent.value,
      start_date: linearContent.value.startDate || null,
      end_date: linearContent.value.endDate || null
    });
    hydrateFromResponse(res);
    isPreview.value = false;
    uni.showToast({ title: '保存成功', icon: 'success' });
  } catch (_) {
    uni.showToast({ title: '保存失败', icon: 'none' });
  } finally {
    saving.value = false;
  }
}

function goBack() {
  uni.navigateBack();
}

function confirmDeleteItinerary() {
  const id = itineraryId.value;
  if (!id) return;
  uni.showModal({
    title: '删除行程',
    content: `确定要删除「${itineraryTitle.value}」吗？此操作不可撤销。`,
    confirmColor: '#FF6B6B',
    success: async (res) => {
      if (res.confirm) {
        try {
          await itineraryStore.removeItinerary(id);
          uni.showToast({ title: '已删除', icon: 'success' });
          setTimeout(() => uni.navigateBack(), 800);
        } catch (e) {
          uni.showToast({ title: '删除失败', icon: 'none' });
        }
      }
    }
  });
}

// ===== 地图相关 =====
const mapMarkers = computed(() => {
  return nodes.value
    .filter(n => n.latitude && n.longitude)
    .map((n, idx) => ({
      id: idx,
      latitude: Number(n.latitude),
      longitude: Number(n.longitude),
      title: n.title,
      callout: {
        content: n.title,
        display: 'ALWAYS',
        fontSize: 12,
        borderRadius: 8,
        padding: 6,
        bgColor: '#fff',
        color: '#3D3028'
      },
      width: 24,
      height: 32
    }));
});

const mapCenter = computed(() => {
  const markers = mapMarkers.value;
  if (markers.length === 0) return { lat: 39.9042, lng: 116.4074 };
  const avgLat = markers.reduce((sum, m) => sum + m.latitude, 0) / markers.length;
  const avgLng = markers.reduce((sum, m) => sum + m.longitude, 0) / markers.length;
  return { lat: avgLat, lng: avgLng };
});

const onMarkerTap = (e: any) => {
  const marker = mapMarkers.value[e.markerId];
  if (marker) {
    uni.openLocation({
      latitude: marker.latitude,
      longitude: marker.longitude,
      name: marker.title,
      scale: 15
    });
  }
};

// ===== 导航弹窗 =====
const showRoutePopup = ref(false);
const routeTarget = ref({ name: '', location: '', lat: null as number | null, lng: null as number | null });

const navigateToNode = (node: LinearNode) => {
  const keyword = node.location || node.title || '';
  if (!keyword) {
    uni.showToast({ title: '暂无地点信息', icon: 'none' });
    return;
  }
  routeTarget.value = {
    name: node.title || '',
    location: node.location || '',
    lat: node.latitude ?? null,
    lng: node.longitude ?? null
  };
  showRoutePopup.value = true;
};

const chooseNodeLocation = () => {
  uni.chooseLocation({
    success: (res) => {
      editorForm.value.location = res.name || '';
      editorForm.value.latitude = res.latitude;
      editorForm.value.longitude = res.longitude;
      editorForm.value.address = res.address || '';
    },
    fail: () => {
      // 静默失败，用户可以手动输入
    }
  });
};

onLoad((options: any) => {
  if (options?.id) {
    loadDetail(String(options.id));
    return;
  }
  if (options?.preview) {
    isPreview.value = true;
    const source = itineraryStore.currentItinerary;
    if (!source) {
      uni.showToast({ title: '无预览数据', icon: 'none' });
      setTimeout(() => uni.navigateBack(), 1200);
      return;
    }
    itineraryTitle.value = source.title || source.destination || '我的行程';
    linearContent.value = normalizeLocalContent(source);
    return;
  }
  uni.showToast({ title: '缺少行程参数', icon: 'none' });
});
</script>

<style lang="scss" scoped>
/* ===== 奶油极简风格 ===== */
.page {
  min-height: 100vh;
  background: #FFF8F0;
  display: flex;
  flex-direction: column;
}

/* 毛玻璃顶栏 */
.top-bar {
  position: sticky;
  top: 0;
  z-index: 20;
  background: rgba(255, 248, 240, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
}
.bar-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10rpx 24rpx 20rpx;
}
.bar-btn {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(149, 184, 163, 0.1);
}
.bar-btn:active { opacity: 0.7; }
.bar-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #2D2D2D;
  max-width: 400rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bar-right {
  display: flex;
  gap: 12rpx;
}

/* Loading */
.loading-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 主滚动区 */
.main-scroll {
  flex: 1;
  box-sizing: border-box;
}

/* Hero 封面 */
.hero-card {
  margin: 20rpx 24rpx 0;
  border-radius: 0 0 48rpx 48rpx;
  background: linear-gradient(135deg, #95B8A3 0%, #B8C5D6 100%);
  overflow: hidden;
}
.hero-inner {
  padding: 48rpx 36rpx 40rpx;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
}
.hero-text {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.hero-dest {
  font-size: 44rpx;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 2rpx 8rpx rgba(0,0,0,0.1);
}
.hero-date {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.85);
}
.hero-badge {
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(8px);
  border-radius: 999rpx;
  padding: 10rpx 24rpx;
}
.hero-badge-text {
  font-size: 24rpx;
  font-weight: 600;
  color: #fff;
}

/* 统计卡片行 */
.stats-row {
  display: flex;
  gap: 16rpx;
  padding: 24rpx 24rpx 0;
}
.stat-card {
  flex: 1;
  background: #fff;
  border-radius: 32rpx;
  padding: 24rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}
.stat-num {
  font-size: 36rpx;
  font-weight: 700;
  color: #2D2D2D;
}
.stat-label {
  font-size: 22rpx;
  color: #999;
  margin-top: 4rpx;
}

/* Day 标签栏 */
.day-tabs-scroll {
  margin-top: 24rpx;
  padding: 0 24rpx;
  white-space: nowrap;
}
.day-tabs {
  display: inline-flex;
  gap: 16rpx;
  padding: 4rpx 0 16rpx;
}
.day-tab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 14rpx 32rpx;
  border-radius: 999rpx;
  font-size: 26rpx;
  font-weight: 600;
  color: #888;
  background: #fff;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
  transition: all 0.25s;
}
.day-tab.active {
  background: #95B8A3;
  color: #fff;
  box-shadow: 0 4rpx 16rpx rgba(149, 184, 163, 0.35);
}

/* 空状态 */
.empty-state {
  margin: 60rpx 24rpx;
  padding: 80rpx 0;
  background: #fff;
  border-radius: 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}
.empty-icon { font-size: 56rpx; }
.empty-text { font-size: 26rpx; color: #bbb; }

/* 时间线 */
.timeline-section {
  padding: 0 24rpx;
  margin-top: 8rpx;
}
.timeline-item {
  display: flex;
  gap: 20rpx;
  min-height: 100rpx;
}
.timeline-left {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 20rpx;
  padding-top: 28rpx;
}
.timeline-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  flex-shrink: 0;
}
.timeline-line {
  width: 4rpx;
  flex: 1;
  margin-top: 8rpx;
  border-radius: 4rpx;
  opacity: 0.4;
}

/* 景点卡片 */
.timeline-card {
  flex: 1;
  background: #fff;
  border-radius: 28rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.04);
  transition: all 0.2s;
}
.timeline-card.is-done {
  opacity: 0.7;
}
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}
.time-tag {
  font-size: 22rpx;
  font-weight: 600;
  padding: 6rpx 18rpx;
  border-radius: 999rpx;
}
.done-check {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: rgba(22, 163, 74, 0.12);
  color: #16a34a;
  font-size: 24rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}
.card-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #2D2D2D;
  display: block;
}
.card-title.line-through {
  text-decoration: line-through;
  color: #aaa;
}
.card-desc {
  font-size: 24rpx;
  color: #888;
  margin-top: 6rpx;
  display: block;
}
.card-notes {
  font-size: 22rpx;
  color: #aaa;
  margin-top: 8rpx;
  display: block;
  line-height: 1.5;
}
.card-footer {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-top: 16rpx;
  flex-wrap: wrap;
}
.transport-tag {
  font-size: 22rpx;
  font-weight: 600;
  padding: 6rpx 18rpx;
  border-radius: 999rpx;
}
.card-budget {
  font-size: 22rpx;
  color: #D4A574;
  font-weight: 600;
}

/* 操作按钮 */
.card-actions {
  display: flex;
  gap: 12rpx;
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1px solid rgba(0, 0, 0, 0.04);
}
.action-btn {
  font-size: 22rpx;
  color: #999;
  padding: 8rpx 20rpx;
  border-radius: 999rpx;
  background: rgba(0, 0, 0, 0.03);
}
.action-btn:active { opacity: 0.6; }
.action-btn.danger {
  color: #E8A87C;
  background: rgba(232, 168, 124, 0.1);
}

/* 添加景点 */
.add-spot-btn {
  margin: 16rpx 24rpx 0;
  padding: 28rpx 0;
  border: 2rpx dashed rgba(149, 184, 163, 0.5);
  border-radius: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.add-spot-btn:active { background: rgba(149, 184, 163, 0.06); }
.add-spot-text {
  font-size: 28rpx;
  color: #95B8A3;
  font-weight: 600;
}

.bottom-spacer { height: 40rpx; }

/* 地图概览 */
.map-section {
  margin: 20rpx 24rpx 0;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
}
.itinerary-map {
  width: 100%;
  height: 400rpx;
}

/* 导航按钮 */
.action-btn.navigate {
  color: #95B8A3;
  background: rgba(149, 184, 163, 0.1);
}

/* 定位按钮 */
.locate-btn {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 20rpx;
  background: rgba(149, 184, 163, 0.1);
  font-size: 32rpx;
  flex-shrink: 0;
}
.locate-btn:active { opacity: 0.7; }

/* 底部保存按钮 */
.bottom-bar {
  background: rgba(255, 248, 240, 0.9);
  backdrop-filter: blur(16px);
  border-top: 1px solid rgba(0, 0, 0, 0.04);
  padding: 20rpx 32rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
}
.save-btn {
  background: linear-gradient(135deg, #95B8A3 0%, #B8C5D6 100%);
  border-radius: 999rpx;
  padding: 26rpx 0;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(149, 184, 163, 0.35);
}
.save-btn:active { opacity: 0.85; transform: scale(0.98); }
.save-btn.loading { opacity: 0.6; }
.save-btn-text {
  font-size: 30rpx;
  font-weight: 700;
  color: #fff;
}

/* 编辑弹窗 */
.editor-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 50;
  display: flex;
  align-items: flex-end;
}
.editor-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
}
.editor-sheet {
  position: relative;
  width: 100%;
  background: #fff;
  border-radius: 48rpx 48rpx 0 0;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
}
.editor-handle {
  width: 64rpx;
  height: 8rpx;
  border-radius: 8rpx;
  background: #e0e0e0;
  margin: 16rpx auto 0;
}
.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx 16rpx;
}
.editor-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #2D2D2D;
}
.editor-close {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
}
.editor-body {
  flex: 1;
  padding: 0 32rpx;
  overflow-y: auto;
}
.editor-footer {
  padding: 20rpx 32rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
}

/* 表单 */
.form-row {
  margin-top: 20rpx;
}
.form-row-inline {
  display: flex;
  gap: 16rpx;
}
.flex-1 { flex: 1; }
.label {
  display: block;
  font-size: 24rpx;
  color: #888;
  margin-bottom: 10rpx;
  font-weight: 500;
}
.input {
  width: 100%;
  height: 80rpx;
  border: 2rpx solid rgba(0, 0, 0, 0.06);
  border-radius: 20rpx;
  background: #FAFAF8;
  padding: 0 24rpx;
  box-sizing: border-box;
  font-size: 28rpx;
  color: #333;
}
.input:focus {
  border-color: rgba(149, 184, 163, 0.5);
  background: #fff;
}
.textarea {
  width: 100%;
  min-height: 160rpx;
  border: 2rpx solid rgba(0, 0, 0, 0.06);
  border-radius: 20rpx;
  padding: 20rpx 24rpx;
  box-sizing: border-box;
  background: #FAFAF8;
  font-size: 28rpx;
  color: #333;
}

/* 交通选择器 */
.transport-picker {
  display: flex;
  gap: 12rpx;
  flex-wrap: wrap;
}
.transport-opt {
  padding: 12rpx 24rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  font-weight: 500;
  color: #888;
  border: 2rpx solid rgba(0, 0, 0, 0.06);
  background: #FAFAF8;
}
.transport-opt.active {
  border-width: 2rpx;
  border-style: solid;
}

/* 状态选择器 */
.status-picker-row {
  display: flex;
  gap: 12rpx;
}
.status-picker {
  flex: 1;
  text-align: center;
  font-size: 24rpx;
  color: #888;
  border-radius: 999rpx;
  border: 2rpx solid rgba(0, 0, 0, 0.06);
  padding: 16rpx 0;
  background: #FAFAF8;
  font-weight: 500;
}
.status-picker.active {
  color: #95B8A3;
  border-color: rgba(149, 184, 163, 0.4);
  background: rgba(149, 184, 163, 0.08);
}

/* 确认按钮 */
.confirm-btn {
  background: linear-gradient(135deg, #95B8A3 0%, #D4A574 100%);
  border-radius: 999rpx;
  padding: 26rpx 0;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6rpx 20rpx rgba(149, 184, 163, 0.3);
}
.confirm-btn:active { opacity: 0.85; }
.confirm-btn-text {
  font-size: 30rpx;
  font-weight: 700;
  color: #fff;
}
</style>
