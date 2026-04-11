<template>
  <view v-if="visible" class="route-mask" @click.self="close">
    <view class="route-popup" :class="{ show: animShow }">
      <!-- 顶部拖拽条 + 关闭 -->
      <view class="popup-header">
        <view class="drag-bar"></view>
        <view class="header-row">
          <view class="header-close" @click="close">
            <u-icon name="close" size="18" color="#8B7E74"></u-icon>
          </view>
          <view class="header-info">
            <text class="header-dest">{{ destName }}</text>
            <text v-if="routeInfo" class="header-summary">{{ routeSummary }}</text>
          </view>
          <view style="width:64rpx;"></view>
        </view>
      </view>

      <!-- 地图区域 -->
      <view class="map-area">
        <map
          id="routeMap"
          class="route-map"
          :latitude="mapCenter.lat"
          :longitude="mapCenter.lng"
          :scale="mapScale"
          :polyline="polylineData"
          :markers="markersData"
          :show-location="true"
        />
        <view v-if="loading" class="map-loading">
          <u-loading-icon size="24" color="#D4A574"></u-loading-icon>
        </view>
      </view>

      <!-- 交通方式切换 -->
      <view class="mode-tabs">
        <view
          v-for="m in modes"
          :key="m.value"
          class="mode-tab"
          :class="{ active: currentMode === m.value }"
          @click="switchMode(m.value)"
        >
          <text class="mode-icon">{{ m.icon }}</text>
          <text class="mode-label">{{ m.label }}</text>
        </view>
      </view>

      <!-- 路线信息 -->
      <view v-if="routeInfo && !loading" class="route-detail">
        <view class="route-stats">
          <view class="stat-item">
            <text class="stat-value">{{ formatDistance(routeInfo.distance) }}</text>
            <text class="stat-label">距离</text>
          </view>
          <view class="stat-divider"></view>
          <view class="stat-item">
            <text class="stat-value">{{ formatDuration(routeInfo.duration) }}</text>
            <text class="stat-label">预计时间</text>
          </view>
        </view>
      </view>

      <!-- 错误提示 -->
      <view v-if="errorMsg && !loading" class="route-error">
        <text class="error-text">{{ errorMsg }}</text>
        <view class="retry-btn" @click="fetchRoute">重试</view>
      </view>

      <!-- 底部按钮 -->
      <view class="popup-footer">
        <view class="nav-btn" @click="openExternalNav">
          <view class="nav-btn-text">开始导航</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { planRoute, type RouteResult, type RouteMode, type RoutePoint } from '@/api/map';

const props = defineProps<{
  visible: boolean;
  destName: string;
  destLocation?: string;
  destLat?: number | null;
  destLng?: number | null;
  city?: string;
}>();

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void;
}>();

const MODE_COLORS: Record<string, string> = {
  driving: '#D4A574',
  walking: '#95B8A3',
  transit: '#7EB5D6',
  bicycling: '#E8A87C'
};

const modes = [
  { value: 'driving' as RouteMode, icon: '🚗', label: '驾车' },
  { value: 'transit' as RouteMode, icon: '🚌', label: '公交' },
  { value: 'walking' as RouteMode, icon: '🚶', label: '步行' },
  { value: 'bicycling' as RouteMode, icon: '🚲', label: '骑行' }
];

const currentMode = ref<RouteMode>('driving');
const loading = ref(false);
const errorMsg = ref('');
const routeInfo = ref<RouteResult | null>(null);
const animShow = ref(false);
const fromLat = ref(0);
const fromLng = ref(0);

const modeColor = computed(() => MODE_COLORS[currentMode.value] || '#D4A574');

const mapCenter = computed(() => {
  if (routeInfo.value && routeInfo.value.points.length > 0) {
    const pts = routeInfo.value.points;
    const midIdx = Math.floor(pts.length / 2);
    return { lat: pts[midIdx].latitude, lng: pts[midIdx].longitude };
  }
  if (props.destLat && props.destLng) {
    return { lat: props.destLat, lng: props.destLng };
  }
  return { lat: 39.9042, lng: 116.4074 };
});

const mapScale = computed(() => {
  if (!routeInfo.value) return 14;
  const d = routeInfo.value.distance;
  if (d < 1000) return 16;
  if (d < 5000) return 14;
  if (d < 20000) return 12;
  if (d < 100000) return 10;
  return 8;
});

const polylineData = computed(() => {
  if (!routeInfo.value || routeInfo.value.points.length === 0) return [];
  return [{
    points: routeInfo.value.points,
    color: modeColor.value,
    width: 6,
    arrowLine: true,
    borderColor: '#ffffff',
    borderWidth: 2
  }];
});

const markersData = computed(() => {
  if (!routeInfo.value || routeInfo.value.points.length === 0) return [];
  const pts = routeInfo.value.points;
  const start = pts[0];
  const end = pts[pts.length - 1];
  return [
    {
      id: 1,
      latitude: start.latitude,
      longitude: start.longitude,
      callout: { content: '我的位置', display: 'ALWAYS', fontSize: 11, borderRadius: 6, padding: 4, bgColor: '#fff', color: '#3D3028' },
      width: 20,
      height: 20
    },
    {
      id: 2,
      latitude: end.latitude,
      longitude: end.longitude,
      callout: { content: props.destName, display: 'ALWAYS', fontSize: 11, borderRadius: 6, padding: 4, bgColor: '#fff', color: '#D4A574' },
      width: 20,
      height: 20
    }
  ];
});

const routeSummary = computed(() => {
  if (!routeInfo.value) return '';
  return `${formatDistance(routeInfo.value.distance)} · ${formatDuration(routeInfo.value.duration)}`;
});

function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}分钟`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}小时${m}分` : `${h}小时`;
}

function close() {
  animShow.value = false;
  setTimeout(() => emit('update:visible', false), 250);
}

function switchMode(mode: RouteMode) {
  currentMode.value = mode;
  fetchRoute();
}

async function fetchRoute() {
  if (!fromLat.value || !fromLng.value) return;
  loading.value = true;
  errorMsg.value = '';
  routeInfo.value = null;

  try {
    const params: any = {
      fromLat: fromLat.value,
      fromLng: fromLng.value,
      mode: currentMode.value,
      city: props.city || ''
    };
    if (props.destLat && props.destLng) {
      params.toLat = props.destLat;
      params.toLng = props.destLng;
    } else {
      const keyword = props.destLocation || props.destName;
      params.toKeyword = props.city ? `${props.city} ${keyword}` : keyword;
    }

    const res = await planRoute(params);
    routeInfo.value = (res as any)?.data || res;
  } catch (e: any) {
    const msg = e?.message || e?.data?.message || '';
    if (msg.includes('距离超长')) {
      errorMsg.value = '距离太远啦，建议切换驾车模式试试';
    } else if (msg.includes('公交站')) {
      errorMsg.value = '附近没有公交站，试试其他交通方式';
    } else {
      errorMsg.value = msg || '路线规划失败，请重试';
    }
  } finally {
    loading.value = false;
  }
}

function openExternalNav() {
  const keyword = props.destLocation || props.destName;
  // #ifdef H5
  const url = props.destLat && props.destLng
    ? `https://apis.map.qq.com/uri/v1/routeplan?type=${currentMode.value}&from=我的位置&fromcoord=${fromLat.value},${fromLng.value}&to=${encodeURIComponent(keyword)}&tocoord=${props.destLat},${props.destLng}&referer=AI旅行助手`
    : `https://apis.map.qq.com/uri/v1/search?keyword=${encodeURIComponent(keyword)}&referer=AI旅行助手`;
  window.open(url, '_blank');
  // #endif
  // #ifndef H5
  if (props.destLat && props.destLng) {
    uni.openLocation({
      latitude: Number(props.destLat),
      longitude: Number(props.destLng),
      name: keyword,
      scale: 15
    });
  }
  // #endif
}

// 弹窗打开时获取位置并请求路线
watch(() => props.visible, (val) => {
  if (val) {
    nextTick(() => { animShow.value = true; });
    uni.getLocation({
      type: 'gcj02',
      success: (res) => {
        fromLat.value = res.latitude;
        fromLng.value = res.longitude;
        fetchRoute();
      },
      fail: () => {
        errorMsg.value = '无法获取当前位置，请检查定位权限';
      }
    });
  } else {
    animShow.value = false;
    routeInfo.value = null;
    errorMsg.value = '';
  }
});
</script>

<style scoped>
.route-mask {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.35);
  z-index: 999;
  display: flex;
  align-items: flex-end;
}
.route-popup {
  width: 100%;
  max-height: 88vh;
  background: #FFF8F0;
  border-radius: 32rpx 32rpx 0 0;
  display: flex;
  flex-direction: column;
  transform: translateY(100%);
  transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}
.route-popup.show {
  transform: translateY(0);
}

/* 顶部 */
.popup-header {
  padding: 16rpx 24rpx 0;
}
.drag-bar {
  width: 64rpx;
  height: 8rpx;
  border-radius: 4rpx;
  background: #E8DDD0;
  margin: 0 auto 16rpx;
}
.header-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.header-close {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(139, 126, 116, 0.08);
  flex-shrink: 0;
}
.header-close:active { opacity: 0.7; }
.header-info {
  flex: 1;
  min-width: 0;
}
.header-dest {
  font-size: 30rpx;
  font-weight: 600;
  color: #3D3028;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.header-summary {
  font-size: 22rpx;
  color: #A89B8C;
  margin-top: 4rpx;
  display: block;
}

/* 地图 */
.map-area {
  position: relative;
  margin: 16rpx 24rpx 0;
  border-radius: 24rpx;
  overflow: hidden;
  height: 420rpx;
}
.route-map {
  width: 100%;
  height: 100%;
}
.map-loading {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(255, 248, 240, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 交通方式 */
.mode-tabs {
  display: flex;
  gap: 12rpx;
  padding: 20rpx 24rpx 0;
}
.mode-tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  padding: 16rpx 0;
  border-radius: 20rpx;
  background: #fff;
  border: 2rpx solid #F5EDE4;
  transition: all 0.2s;
}
.mode-tab.active {
  background: linear-gradient(135deg, #E8A87C, #D4A574);
  border-color: transparent;
  box-shadow: 0 4rpx 16rpx rgba(212, 165, 116, 0.3);
}
.mode-tab:active { opacity: 0.85; }
.mode-icon {
  font-size: 28rpx;
}
.mode-label {
  font-size: 22rpx;
  color: #5D4E42;
  font-weight: 500;
}
.mode-tab.active .mode-label {
  color: #fff;
}

/* 路线信息 */
.route-detail {
  padding: 20rpx 24rpx 0;
}
.route-stats {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 20rpx;
  padding: 20rpx 0;
  border: 1rpx solid #F5EDE4;
}
.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
}
.stat-value {
  font-size: 32rpx;
  font-weight: 700;
  color: #3D3028;
}
.stat-label {
  font-size: 22rpx;
  color: #A89B8C;
}
.stat-divider {
  width: 2rpx;
  height: 48rpx;
  background: #F5EDE4;
}

/* 错误 */
.route-error {
  padding: 40rpx 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}
.error-text {
  font-size: 26rpx;
  color: #A89B8C;
}
.retry-btn {
  padding: 12rpx 40rpx;
  border-radius: 32rpx;
  background: rgba(212, 165, 116, 0.1);
  font-size: 26rpx;
  color: #D4A574;
  font-weight: 500;
}
.retry-btn:active { opacity: 0.7; }

/* 底部按钮 */
.popup-footer {
  padding: 20rpx 24rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom, 0px));
}
.nav-btn {
  width: 100%;
  height: 88rpx;
  border-radius: 44rpx;
  background: linear-gradient(135deg, #95B8A3, #7DA88E);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6rpx 20rpx rgba(149, 184, 163, 0.3);
}
.nav-btn:active { opacity: 0.85; }
.nav-btn-text {
  font-size: 30rpx;
  font-weight: 700;
  color: #fff;
}
</style>
