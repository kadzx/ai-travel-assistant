<template>
  <view class="choose-location-page">
    <!-- 奶油风顶栏 -->
    <view class="top-bar">
      <view class="top-bar-inner">
        <view class="h-[var(--status-bar-height)]"></view>
        <view class="bar-row">
          <view class="bar-btn" @click="goBack">
            <u-icon name="close" size="20" color="#8B7E74"></u-icon>
          </view>
          <text class="bar-title">选择地点</text>
          <view class="bar-confirm" :class="{ disabled: !selectedPoi }" @click="confirmSelect">
            <text class="bar-confirm-txt">确定</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 地图区域 -->
    <view class="map-wrap">
      <map
        id="locMap"
        class="loc-map"
        :latitude="mapLat"
        :longitude="mapLng"
        :scale="15"
        :show-location="true"
        :markers="centerMarker"
        @regionchange="onRegionChange"
      />
      <!-- 中心标记（固定在地图中央） -->
      <view class="center-pin">
        <text class="pin-icon">📍</text>
      </view>
    </view>

    <!-- 搜索框 + POI 列表 -->
    <view class="bottom-panel">
      <view class="search-bar">
        <u-icon name="search" size="16" color="#C4B5A8"></u-icon>
        <input
          class="search-input"
          v-model="keyword"
          placeholder="搜索地点"
          placeholder-style="color:#C4B5A8"
          confirm-type="search"
          @confirm="doSearch"
          @input="onSearchInput"
        />
        <view v-if="keyword" class="search-clear" @click="clearSearch">
          <u-icon name="close-circle-fill" size="14" color="#C4B5A8"></u-icon>
        </view>
      </view>

      <scroll-view scroll-y class="poi-list" @scrolltolower="loadMore">
        <view v-if="loading && poiList.length === 0" class="poi-loading">
          <u-loading-icon size="20" color="#D4A574"></u-loading-icon>
          <text class="poi-loading-txt">加载中...</text>
        </view>

        <view
          v-for="(poi, idx) in poiList"
          :key="idx"
          class="poi-item"
          :class="{ active: selectedIndex === idx }"
          @click="selectPoi(idx)"
        >
          <view class="poi-info">
            <text class="poi-name">{{ poi.name }}</text>
            <text class="poi-addr">{{ poi.distance ? poi.distance + 'm | ' : '' }}{{ poi.address }}</text>
          </view>
          <view v-if="selectedIndex === idx" class="poi-check">
            <u-icon name="checkmark" size="16" color="#D4A574"></u-icon>
          </view>
        </view>

        <view v-if="!loading && poiList.length === 0" class="poi-empty">
          <text class="poi-empty-txt">暂无附近地点</text>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { onLoad } from '@dcloudio/uni-app';

const mapLat = ref(39.9042);
const mapLng = ref(116.4074);
const keyword = ref('');
const poiList = ref<any[]>([]);
const selectedIndex = ref(-1);
const loading = ref(false);
const pageIndex = ref(1);
const searchTimer = ref<any>(null);

const selectedPoi = computed(() => {
  if (selectedIndex.value >= 0 && selectedIndex.value < poiList.value.length) {
    return poiList.value[selectedIndex.value];
  }
  return null;
});

// 地图中心标记（空数组，用 CSS 固定 pin 代替）
const centerMarker = computed(() => []);

// 获取当前位置
onLoad(() => {
  uni.getLocation({
    type: 'gcj02',
    success: (res) => {
      mapLat.value = res.latitude;
      mapLng.value = res.longitude;
      fetchNearbyPoi(res.latitude, res.longitude);
    },
    fail: () => {
      // 定位失败用默认坐标
      fetchNearbyPoi(mapLat.value, mapLng.value);
    }
  });
});

// 地图拖拽结束后刷新 POI
function onRegionChange(e: any) {
  if (e.type === 'end' || e.detail?.type === 'end') {
    // H5 端获取地图中心点
    const mapCtx = uni.createMapContext('locMap');
    mapCtx.getCenterLocation({
      success: (res: any) => {
        mapLat.value = res.latitude;
        mapLng.value = res.longitude;
        if (!keyword.value) {
          pageIndex.value = 1;
          fetchNearbyPoi(res.latitude, res.longitude);
        }
      }
    });
  }
}

// 获取附近 POI（通过腾讯地图 WebService JSONP）
function fetchNearbyPoi(lat: number, lng: number) {
  loading.value = true;
  const key = (window as any).__uniConfig?.qqMapKey || 'YAJBZ-MJCKB-763UX-J3PR4-RQL36-NHF7X';
  const url = `https://apis.map.qq.com/ws/geocoder/v1/?location=${lat},${lng}&key=${key}&get_poi=1&poi_options=page_size=20;page_index=${pageIndex.value}&output=jsonp&callback=__qqMapCb`;

  // JSONP 请求
  jsonpRequest(url).then((data: any) => {
    if (data.status === 0 && data.result) {
      const pois = (data.result.pois || []).map((p: any) => ({
        name: p.title,
        address: p.address,
        latitude: p.location.lat,
        longitude: p.location.lng,
        distance: p._distance ? Math.round(p._distance) : null
      }));
      if (pageIndex.value === 1) {
        // 第一条插入当前位置
        poiList.value = [
          {
            name: data.result.formatted_addresses?.recommend || data.result.address || '当前位置',
            address: data.result.address || '',
            latitude: lat,
            longitude: lng,
            distance: null
          },
          ...pois
        ];
        selectedIndex.value = 0;
      } else {
        poiList.value.push(...pois);
      }
    }
    loading.value = false;
  }).catch(() => {
    loading.value = false;
  });
}

// 搜索地点
function doSearch() {
  if (!keyword.value.trim()) {
    pageIndex.value = 1;
    fetchNearbyPoi(mapLat.value, mapLng.value);
    return;
  }
  loading.value = true;
  const key = (window as any).__uniConfig?.qqMapKey || 'YAJBZ-MJCKB-763UX-J3PR4-RQL36-NHF7X';
  const url = `https://apis.map.qq.com/ws/place/v1/search?keyword=${encodeURIComponent(keyword.value)}&boundary=nearby(${mapLat.value},${mapLng.value},5000)&key=${key}&page_size=20&page_index=1&output=jsonp&callback=__qqMapCb`;

  jsonpRequest(url).then((data: any) => {
    if (data.status === 0 && data.data) {
      poiList.value = data.data.map((p: any) => ({
        name: p.title,
        address: p.address,
        latitude: p.location.lat,
        longitude: p.location.lng,
        distance: p._distance ? Math.round(p._distance) : null
      }));
      selectedIndex.value = poiList.value.length > 0 ? 0 : -1;
      // 移动地图到第一个结果
      if (poiList.value.length > 0) {
        mapLat.value = poiList.value[0].latitude;
        mapLng.value = poiList.value[0].longitude;
      }
    }
    loading.value = false;
  }).catch(() => {
    loading.value = false;
  });
}

// 搜索输入防抖
function onSearchInput() {
  if (searchTimer.value) clearTimeout(searchTimer.value);
  searchTimer.value = setTimeout(() => {
    if (keyword.value.trim()) {
      doSearch();
    } else {
      pageIndex.value = 1;
      fetchNearbyPoi(mapLat.value, mapLng.value);
    }
  }, 500);
}

function clearSearch() {
  keyword.value = '';
  pageIndex.value = 1;
  fetchNearbyPoi(mapLat.value, mapLng.value);
}

function loadMore() {
  if (loading.value) return;
  pageIndex.value++;
  fetchNearbyPoi(mapLat.value, mapLng.value);
}

function selectPoi(idx: number) {
  selectedIndex.value = idx;
  const poi = poiList.value[idx];
  if (poi) {
    mapLat.value = poi.latitude;
    mapLng.value = poi.longitude;
  }
}

function confirmSelect() {
  if (!selectedPoi.value) return;
  const poi = selectedPoi.value;
  // 通过 eventChannel 传回结果
  const eventChannel = (getCurrentPages().pop() as any)?.getOpenerEventChannel?.();
  if (eventChannel) {
    eventChannel.emit('chooseLocation', {
      name: poi.name,
      address: poi.address,
      latitude: poi.latitude,
      longitude: poi.longitude
    });
  }
  // 同时存到全局，兼容不支持 eventChannel 的情况
  uni.$emit('chooseLocationResult', {
    name: poi.name,
    address: poi.address,
    latitude: poi.latitude,
    longitude: poi.longitude
  });
  uni.navigateBack();
}

function goBack() {
  uni.navigateBack();
}

// JSONP 工具函数
let jsonpId = 0;
function jsonpRequest(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const cbName = `__qqMapCb_${++jsonpId}_${Date.now()}`;
    const finalUrl = url.replace('__qqMapCb', cbName);
    (window as any)[cbName] = (data: any) => {
      resolve(data);
      delete (window as any)[cbName];
      document.head.removeChild(script);
    };
    const script = document.createElement('script');
    script.src = finalUrl;
    script.onerror = () => {
      reject(new Error('JSONP request failed'));
      delete (window as any)[cbName];
      document.head.removeChild(script);
    };
    document.head.appendChild(script);
  });
}
</script>

<style scoped>
.choose-location-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #FFF8F0;
}

/* 顶栏 */
.top-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: rgba(255, 248, 240, 0.92);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}
.top-bar-inner {
  padding: 0 24rpx;
}
.bar-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
}
.bar-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(139, 126, 116, 0.08);
}
.bar-btn:active { opacity: 0.7; }
.bar-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #3D3028;
}
.bar-confirm {
  padding: 12rpx 32rpx;
  border-radius: 40rpx;
  background: linear-gradient(135deg, #E8A87C, #D4A574);
  box-shadow: 0 4rpx 16rpx rgba(212, 165, 116, 0.3);
}
.bar-confirm:active { opacity: 0.85; }
.bar-confirm.disabled {
  opacity: 0.4;
  pointer-events: none;
}
.bar-confirm-txt {
  font-size: 26rpx;
  font-weight: 600;
  color: #fff;
}

/* 地图 */
.map-wrap {
  position: relative;
  margin-top: calc(88rpx + var(--status-bar-height, 0px));
  height: 45vh;
  flex-shrink: 0;
}
.loc-map {
  width: 100%;
  height: 100%;
}
.center-pin {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -100%);
  font-size: 48rpx;
  pointer-events: none;
  filter: drop-shadow(0 4rpx 8rpx rgba(0,0,0,0.15));
  z-index: 10;
}

/* 底部面板 */
.bottom-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #FFF8F0;
  border-radius: 32rpx 32rpx 0 0;
  margin-top: -24rpx;
  position: relative;
  z-index: 20;
  box-shadow: 0 -4rpx 20rpx rgba(0,0,0,0.04);
}

/* 搜索框 */
.search-bar {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin: 24rpx 24rpx 16rpx;
  padding: 0 24rpx;
  height: 80rpx;
  background: #fff;
  border: 1px solid #F5EDE4;
  border-radius: 40rpx;
}
.search-input {
  flex: 1;
  font-size: 28rpx;
  color: #3D3028;
}
.search-clear {
  padding: 8rpx;
}

/* POI 列表 */
.poi-list {
  flex: 1;
  padding: 0 24rpx;
}
.poi-item {
  display: flex;
  align-items: center;
  padding: 24rpx 20rpx;
  border-bottom: 1px solid #F5EDE4;
  border-radius: 16rpx;
  transition: background 0.15s;
}
.poi-item:active {
  background: rgba(212, 165, 116, 0.06);
}
.poi-item.active {
  background: rgba(212, 165, 116, 0.08);
}
.poi-info {
  flex: 1;
  min-width: 0;
}
.poi-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #3D3028;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.poi-addr {
  font-size: 22rpx;
  color: #A89B8C;
  margin-top: 6rpx;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.poi-check {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(212, 165, 116, 0.12);
  flex-shrink: 0;
  margin-left: 16rpx;
}

/* 加载和空状态 */
.poi-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 40rpx 0;
}
.poi-loading-txt {
  font-size: 24rpx;
  color: #A89B8C;
}
.poi-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60rpx 0;
}
.poi-empty-txt {
  font-size: 26rpx;
  color: #C4B5A8;
}
</style>
