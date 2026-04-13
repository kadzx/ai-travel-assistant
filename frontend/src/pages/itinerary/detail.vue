<template>
  <view class="page">
    <!-- 顶栏 -->
    <view class="top-bar">
      <view class="top-bar-inner">
        <view class="h-[var(--status-bar-height)]"></view>
        <view class="bar-row">
          <view class="bar-btn" @click="goBack">
            <u-icon name="arrow-left" size="20" color="#5A5A5A"></u-icon>
          </view>
          <text v-if="!editMode" class="bar-title">{{ itineraryTitle }}</text>
          <text v-else class="bar-title">{{ t('itinerary.editRoute') }}</text>
          <view class="bar-right">
            <template v-if="editMode">
              <view class="done-btn" @click="exitEditMode">
                <text class="done-btn-text">{{ t('itinerary.done') }}</text>
              </view>
            </template>
            <template v-else>
              <view class="bar-btn" @click="openCreateNode()">
                <u-icon name="edit-pen" size="19" color="#95B8A3"></u-icon>
              </view>
              <view class="bar-btn delete-bar-btn" @click="confirmDeleteItinerary">
                <text style="font-size: 18px;">🗑</text>
              </view>
            </template>
          </view>
        </view>
      </view>
    </view>

    <!-- Loading -->
    <view v-if="loading" class="loading-wrap">
      <u-loading-icon mode="circle" color="#95B8A3"></u-loading-icon>
    </view>

    <template v-else>
      <!-- 地图区域（独立于 scroll-view，支持缩放拖动） -->
      <view class="map-section" @touchstart.stop @touchmove.stop>
        <map
          :key="mapKey"
          id="itineraryMap"
          class="itinerary-map"
          :latitude="mapCenter.lat"
          :longitude="mapCenter.lng"
          :markers="mapMarkers"
          :polyline="mapPolylines"
          :show-location="true"
          :enable-zoom="true"
          :enable-scroll="true"
          :enable-rotate="true"
          :scale="mapScale"
          :show-compass="true"
          @markertap="onMarkerTap"
        ></map>
      </view>

      <scroll-view scroll-y class="main-scroll" :scroll-into-view="scrollAnchor">

      <!-- Hero 信息 -->
      <view class="hero-card">
        <view class="hero-inner">
          <view class="hero-text">
            <text class="hero-dest">{{ linearContent.destination || itineraryTitle || t('itinerary.noDestination') }}</text>
            <text class="hero-date">{{ dateDisplay }}</text>
          </view>
          <view class="hero-badge">
            <text class="hero-badge-text">{{ dayCount }}{{ t('itinerary.days') }}</text>
          </view>
        </view>
      </view>

      <!-- Day 标签栏 -->
      <view class="day-tabs">
        <scroll-view scroll-x class="day-tabs-scroll">
          <view class="day-tabs-inner">
            <view class="day-tab" :class="{ active: selectedDay === 0 }" @click="selectedDay = 0">
              <text class="day-tab-text">{{ t('itinerary.overview') }}</text>
            </view>
            <view
              v-for="d in dayCount" :key="d"
              class="day-tab" :class="{ active: selectedDay === d }"
              @click="selectedDay = d"
            >
              <text class="day-tab-text">DAY {{ d }}</text>
            </view>
            <view class="day-tab day-tab-add" @click="addNewDay">
              <text class="day-tab-text">+</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 节点列表 -->
      <view class="node-list">
        <template v-for="(group, gi) in filteredDayGroups" :key="group.dayIndex">
          <view v-if="selectedDay === 0" class="day-header">
            <text class="day-header-text">DAY {{ group.dayIndex }}</text>
          </view>

          <view
            v-for="(node, ni) in group.nodes" :key="node.id"
            :id="'node-' + node.id"
            class="node-wrap"
            :style="getDragStyle(String(node.id))"
          >
            <!-- 节点卡片 -->
            <view
              class="node-card"
              :class="{
                'node-card-editing': editMode,
                'node-card-checked': editMode && checkedNodes.has(String(node.id)),
                'node-card-dragging': draggingNodeId === String(node.id),
                'node-card-done': node.status === 'done'
              }"
              @click="onNodeClick(node)"
            >
              <!-- 已打卡标记 -->
              <view v-if="node.status === 'done' && !editMode" class="done-badge">
                <text class="done-badge-text">✅</text>
              </view>

              <!-- 编辑模式勾选框 -->
              <view v-if="editMode" class="node-check" @click.stop="toggleCheck(String(node.id))">
                <view class="check-circle" :class="{ checked: checkedNodes.has(String(node.id)) }">
                  <text v-if="checkedNodes.has(String(node.id))" class="check-icon">✓</text>
                </view>
              </view>

              <!-- 序号 -->
              <view class="node-seq">
                <view class="seq-circle" :class="{ 'seq-done': node.status === 'done' }">
                  <text v-if="node.status === 'done'" class="seq-text">✓</text>
                  <text v-else class="seq-text">{{ ni + 1 }}</text>
                </view>
                <view v-if="ni < group.nodes.length - 1" class="seq-line"></view>
              </view>

              <!-- 内容 -->
              <view class="node-body">
                <text class="node-type">{{ node.transport || t('itinerary.spot') }}</text>
                <text class="node-title" :class="{ 'node-title-done': node.status === 'done' }">{{ ni + 1 }}.{{ node.title }}</text>
                <text v-if="node.notes" class="node-notes">{{ node.notes }}</text>
                <view class="node-meta">
                  <text v-if="node.timeSlot" class="node-time">⏰ {{ node.timeSlot }}</text>
                  <text v-if="node.cost" class="node-cost">💰 ¥{{ node.cost }}</text>
                </view>
              </view>

              <!-- 拖拽手柄（非编辑模式也显示） -->
              <view
                v-if="!editMode"
                class="drag-handle"
                @touchstart.stop.prevent="onDragStart($event, node, ni, group)"
                @touchmove.stop.prevent="onDragMove($event)"
                @touchend.stop.prevent="onDragEnd($event, group)"
              >
                <text class="drag-icon">☰</text>
              </view>

              <!-- 编辑模式排序箭头 -->
              <view v-if="editMode" class="drag-handle">
                <view class="drag-arrows">
                  <text class="arrow-btn" @click.stop="moveNodeUp(group, ni)">▲</text>
                  <text class="arrow-btn" @click.stop="moveNodeDown(group, ni)">▼</text>
                </view>
              </view>
            </view>

            <!-- 节点间交通信息 -->
            <view v-if="ni < group.nodes.length - 1 && hasCoords(node) && hasCoords(group.nodes[ni+1])" class="segment-info">
              <text class="segment-icon">🚶</text>
              <text class="segment-text">{{ getSegmentText(String(node.id), String(group.nodes[ni+1].id)) }}</text>
            </view>
          </view>
        </template>

        <!-- 空状态 -->
        <view v-if="filteredNodes.length === 0" class="empty-state">
          <text class="empty-emoji">🗺️</text>
          <text class="empty-text">{{ t('itinerary.emptyNodes') }}</text>
          <view class="empty-add-btn" @click="openCreateNode()">
            <text class="empty-add-text">+ {{ t('itinerary.addNode') }}</text>
          </view>
        </view>
      </view>

      <view style="height: 200rpx;"></view>
    </scroll-view>
    </template>

    <!-- 编辑路线浮动按钮 -->
    <view v-if="!editMode && !loading && allNodes.length > 0" class="fab-edit" @click="enterEditMode">
      <text class="fab-edit-icon">✏️</text>
      <text class="fab-edit-text">{{ t('itinerary.editRoute') }}</text>
    </view>

    <!-- 编辑模式底部操作栏 -->
    <view v-if="editMode" class="edit-toolbar">
      <view class="edit-action delete-action" :class="{ disabled: checkedNodes.size === 0 }" @click="deleteChecked">
        <text class="edit-action-text">{{ t('common.delete') }}</text>
      </view>
      <view class="edit-action move-action" :class="{ disabled: checkedNodes.size === 0 }" @click="showMovePopup = true">
        <text class="edit-action-text">{{ t('itinerary.moveTo') }}</text>
      </view>
    </view>

    <!-- 移动至弹窗 -->
    <u-popup :show="showMovePopup" mode="bottom" round="20" @close="showMovePopup = false">
      <view class="cream-popup">
        <view class="cream-popup-handle"></view>
        <text class="cream-popup-title">{{ t('itinerary.moveToDay') }}</text>
        <view v-for="d in dayCount" :key="d" class="cream-day-item" @click="moveCheckedToDay(d)">
          <text class="cream-day-text">DAY {{ d }}</text>
        </view>
        <view class="cream-cancel" @click="showMovePopup = false">
          <text class="cream-cancel-text">{{ t('common.cancel') }}</text>
        </view>
      </view>
    </u-popup>

    <!-- 节点编辑弹窗（全部用 textarea 替代 input） -->
    <view v-if="showEditor" class="editor-mask" @click.self="showEditor = false">
      <view class="editor-sheet" @click.stop>
        <view class="sheet-handle"></view>
        <text class="sheet-title">{{ editorMode === 'create' ? t('itinerary.addNode') : t('itinerary.editNode') }}</text>

        <scroll-view scroll-y class="sheet-scroll">
          <view class="ed-card">
            <text class="ed-label">📍 {{ t('itinerary.nodeName') }} *</text>
            <textarea class="ed-input" v-model="editorForm.title" :placeholder="t('itinerary.nodeNamePh')" :maxlength="100" :auto-height="false" />
          </view>

          <view class="ed-card" @click="chooseNodeLocation">
            <text class="ed-label">📌 {{ t('itinerary.nodeLocation') }}</text>
            <view class="ed-loc">
              <text class="ed-loc-text" :class="{ ph: !editorForm.location }">{{ editorForm.location || t('itinerary.nodeLocationPh') }}</text>
              <text class="ed-arrow">›</text>
            </view>
          </view>

          <view class="ed-row">
            <view class="ed-card half" @click="showStartPicker = true">
              <text class="ed-label">⏰ {{ t('itinerary.nodeTime') }}</text>
              <view class="ed-loc">
                <text class="ed-loc-text" :class="{ ph: !editorForm.startTime }">{{ editorForm.startTime || '开始' }}</text>
                <text class="ed-arrow">›</text>
              </view>
            </view>
            <view class="ed-card half" @click="showEndPicker = true">
              <text class="ed-label">⏰ 至</text>
              <view class="ed-loc">
                <text class="ed-loc-text" :class="{ ph: !editorForm.endTime }">{{ editorForm.endTime || '结束' }}</text>
                <text class="ed-arrow">›</text>
              </view>
            </view>
          </view>

          <view class="ed-card">
            <text class="ed-label">🚗 {{ t('itinerary.nodeTransport') }}</text>
            <textarea class="ed-input" v-model="editorForm.transport" :placeholder="t('itinerary.nodeTransportPh')" :maxlength="30" :auto-height="false" />
          </view>

          <view class="ed-row">
            <view class="ed-card half">
              <text class="ed-label">💰 {{ t('itinerary.nodeCost') }}</text>
              <textarea class="ed-input" v-model="editorForm.cost" placeholder="0" :maxlength="10" :auto-height="false" />
            </view>
            <view class="ed-card half">
              <text class="ed-label">⏱ {{ t('itinerary.nodeDuration') }}</text>
              <textarea class="ed-input" v-model="editorForm.durationMin" placeholder="0" :maxlength="10" :auto-height="false" />
            </view>
          </view>

          <view class="ed-card">
            <text class="ed-label">📝 {{ t('itinerary.nodeNotes') }}</text>
            <textarea class="ed-notes" v-model="editorForm.notes" :placeholder="t('itinerary.nodeNotesPh')" :auto-height="true" :maxlength="500" />
          </view>

          <!-- 状态 -->
          <view v-if="editorMode === 'edit'" class="ed-card">
            <text class="ed-label">📋 状态</text>
            <view class="ed-status-row">
              <view class="ed-chip" :class="{ active: editorForm.status === 'planned' }" @click="editorForm.status = 'planned'">
                <text class="ed-chip-text">🗓 {{ t('itinerary.statusPlanned') }}</text>
              </view>
              <view class="ed-chip ed-chip-done" :class="{ active: editorForm.status === 'done' }" @click="editorForm.status = 'done'">
                <text class="ed-chip-text">✅ {{ t('itinerary.markDone') }}</text>
              </view>
            </view>
          </view>
        </scroll-view>

        <view class="sheet-btns">
          <view class="sheet-btn sheet-btn-cancel" @click="showEditor = false">
            <text class="sheet-btn-text">{{ t('common.cancel') }}</text>
          </view>
          <view class="sheet-btn sheet-btn-save" @click="saveNode">
            <text class="sheet-btn-text-w">{{ t('common.save') }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 自定义 TabBar：行程详情页不显示 -->

    <!-- 开始时间选择器 -->
    <view v-if="showStartPicker" class="picker-mask" @click.self="showStartPicker = false">
      <view class="picker-sheet" @click.stop>
        <view class="picker-header">
          <text class="picker-cancel" @click="showStartPicker = false">取消</text>
          <text class="picker-title">选择开始时间</text>
          <text class="picker-confirm" @click="onStartPickerConfirm">确定</text>
        </view>
        <picker-view class="picker-view" :value="startPickerValue" @change="(e: any) => startPickerValue = e.detail.value">
          <picker-view-column>
            <view v-for="h in timeHours" :key="h" class="picker-item"><text>{{ h }}时</text></view>
          </picker-view-column>
          <picker-view-column>
            <view v-for="m in timeMinutes" :key="m" class="picker-item"><text>{{ m }}分</text></view>
          </picker-view-column>
        </picker-view>
      </view>
    </view>

    <!-- 结束时间选择器 -->
    <view v-if="showEndPicker" class="picker-mask" @click.self="showEndPicker = false">
      <view class="picker-sheet" @click.stop>
        <view class="picker-header">
          <text class="picker-cancel" @click="showEndPicker = false">取消</text>
          <text class="picker-title">选择结束时间</text>
          <text class="picker-confirm" @click="onEndPickerConfirm">确定</text>
        </view>
        <picker-view class="picker-view" :value="endPickerValue" @change="(e: any) => endPickerValue = e.detail.value">
          <picker-view-column>
            <view v-for="h in timeHours" :key="h" class="picker-item"><text>{{ h }}时</text></view>
          </picker-view-column>
          <picker-view-column>
            <view v-for="m in timeMinutes" :key="m" class="picker-item"><text>{{ m }}分</text></view>
          </picker-view-column>
        </picker-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { useI18n } from 'vue-i18n';
import { useItineraryStore, type LinearNode } from '@/stores/itinerary';
import { getRouteBatch, type RouteSegment } from '@/api/map';
// @ts-ignore
import UIcon from 'uview-plus/components/u-icon/u-icon.vue';
// @ts-ignore
import UPopup from 'uview-plus/components/u-popup/u-popup.vue';
// @ts-ignore
import ULoadingIcon from 'uview-plus/components/u-loading-icon/u-loading-icon.vue';

const { t } = useI18n();
const itineraryStore = useItineraryStore();

// ===== 基础状态 =====
const loading = ref(true);
const isPreview = ref(false);
const itineraryId = ref<string | number>('');
const itineraryTitle = ref('');
const linearContent = ref<any>({ version: 'v1', destination: '', startDate: '', endDate: '', nodes: [] });
const scrollAnchor = ref('');
const selectedDay = ref(0);

// ===== 编辑模式 =====
const editMode = ref(false);
const checkedNodes = ref(new Set<string>());
const showMovePopup = ref(false);

// ===== 拖拽排序 =====
const draggingNodeId = ref('');
const dragOffsetY = ref(0);
const dragStartY = ref(0);
const dragNodeIndex = ref(-1);
const dragNodeHeight = ref(80);

// ===== 路线段数据 =====
const routeSegments = ref<Map<string, RouteSegment>>(new Map());
const routeLoading = ref(false);

// ===== 工具函数 =====
function hasCoords(node: any): boolean {
  return !!(node && node.latitude && node.longitude);
}
function sortNodes(nodes: LinearNode[]) {
  return [...nodes].sort((a, b) => (a.dayIndex === b.dayIndex ? a.sequence - b.sequence : a.dayIndex - b.dayIndex));
}

// ===== 计算属性 =====
const allNodes = computed<LinearNode[]>(() => sortNodes(linearContent.value?.nodes || []));
const dayCount = computed(() => Math.max(1, ...allNodes.value.map(n => Number(n.dayIndex) || 1)));
const dateDisplay = computed(() => {
  const s = linearContent.value.startDate || '';
  const e = linearContent.value.endDate || '';
  if (s && e) return `${s} — ${e}`;
  return s;
});
const filteredNodes = computed(() => {
  if (selectedDay.value === 0) return allNodes.value;
  return allNodes.value.filter(n => Number(n.dayIndex) === selectedDay.value);
});
const dayGroups = computed(() => {
  const groups: Record<number, LinearNode[]> = {};
  allNodes.value.forEach(node => {
    const day = Number(node.dayIndex) || 1;
    if (!groups[day]) groups[day] = [];
    groups[day].push(node);
  });
  return Object.keys(groups).map(k => Number(k)).sort((a, b) => a - b)
    .map(day => ({ dayIndex: day, nodes: groups[day] }));
});
const filteredDayGroups = computed(() => {
  if (selectedDay.value === 0) return dayGroups.value;
  const found = dayGroups.value.find(g => g.dayIndex === selectedDay.value);
  return found ? [found] : [];
});

// ===== 地图 =====
// mapKey 用于强制重建 map 组件，避免腾讯地图 H5 SDK 动态更新 bug
const mapKey = ref(0);
function refreshMap() { mapKey.value++; }

const nodesWithCoords = computed(() => filteredNodes.value.filter(n => {
  const lat = Number(n.latitude), lng = Number(n.longitude);
  return Number.isFinite(lat) && lat !== 0 && Number.isFinite(lng) && lng !== 0;
}));

const mapMarkers = computed(() => nodesWithCoords.value.map((n, idx) => {
  const isDone = (n as any).status === 'done';
  return {
    id: idx,
    latitude: Number(n.latitude),
    longitude: Number(n.longitude),
    title: '',
    width: 1,
    height: 1,
    iconPath: '/static/transparent.png',
    callout: {
      content: `${isDone ? '✅ ' : ''}${idx + 1}. ${n.title || ''}`,
      display: 'ALWAYS',
      fontSize: 13,
      fontWeight: 'bold',
      borderRadius: 12,
      padding: 10,
      bgColor: isDone ? '#E8F8F0' : '#FFF8F0',
      color: isDone ? '#2D8B5E' : '#3D3028',
      borderWidth: 2,
      borderColor: isDone ? '#4ECDC4' : '#E8A87C',
      textAlign: 'center'
    }
  };
}));

const includePoints = computed(() => nodesWithCoords.value.map(n => ({
  latitude: Number(n.latitude), longitude: Number(n.longitude)
})));

const mapCenter = computed(() => {
  const pts = includePoints.value;
  if (pts.length > 0) {
    const lat = pts.reduce((s, p) => s + p.latitude, 0) / pts.length;
    const lng = pts.reduce((s, p) => s + p.longitude, 0) / pts.length;
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  return { lat: 39.9042, lng: 116.4074 };
});

const mapScale = computed(() => {
  const pts = includePoints.value;
  if (pts.length < 2) return 13;
  // 根据点的分布范围自动计算 scale
  const lats = pts.map(p => p.latitude);
  const lngs = pts.map(p => p.longitude);
  const latSpan = Math.max(...lats) - Math.min(...lats);
  const lngSpan = Math.max(...lngs) - Math.min(...lngs);
  const maxSpan = Math.max(latSpan, lngSpan);
  if (maxSpan > 5) return 5;
  if (maxSpan > 2) return 7;
  if (maxSpan > 0.5) return 9;
  if (maxSpan > 0.1) return 11;
  if (maxSpan > 0.02) return 13;
  return 14;
});

const mapPolylines = computed(() => {
  const nodes = nodesWithCoords.value;
  if (nodes.length < 2) return [];
  const allPts: Array<{ latitude: number; longitude: number }> = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    const seg = routeSegments.value.get(`${nodes[i].id}-${nodes[i + 1].id}`);
    if (seg?.points?.length) {
      const valid = seg.points.filter((p: any) => Number.isFinite(Number(p.latitude)) && Number.isFinite(Number(p.longitude)));
      if (valid.length > 0) { allPts.push(...valid); continue; }
    }
    const lat1 = Number(nodes[i].latitude), lng1 = Number(nodes[i].longitude);
    const lat2 = Number(nodes[i + 1].latitude), lng2 = Number(nodes[i + 1].longitude);
    if (Number.isFinite(lat1) && Number.isFinite(lng1) && Number.isFinite(lat2) && Number.isFinite(lng2)) {
      allPts.push({ latitude: lat1, longitude: lng1 }, { latitude: lat2, longitude: lng2 });
    }
  }
  return allPts.length >= 2 ? [{ points: allPts, color: '#E8A87C', width: 5, arrowLine: true, dottedLine: false }] : [];
});

// ===== 路线规划 =====
async function fetchRouteSegments() {
  const nodes = nodesWithCoords.value;
  if (nodes.length < 2) { routeSegments.value = new Map(); return; }
  routeLoading.value = true;
  try {
    const res: any = await getRouteBatch({ points: nodes.map(n => ({ lat: Number(n.latitude), lng: Number(n.longitude) })), mode: 'walking' });
    const segs: RouteSegment[] = res?.segments || [];
    const m = new Map<string, RouteSegment>();
    for (let i = 0; i < nodes.length - 1 && i < segs.length; i++) m.set(`${nodes[i].id}-${nodes[i + 1].id}`, segs[i]);
    routeSegments.value = m;
  } catch (_) {} finally { routeLoading.value = false; }
}
function getSegmentText(fromId: string, toId: string) {
  const seg = routeSegments.value.get(`${fromId}-${toId}`);
  if (!seg) return routeLoading.value ? t('itinerary.calculating') : '';
  if (!seg.distance && !seg.duration) return '';
  return `${(seg.distance / 1000).toFixed(1)}${t('itinerary.km')} · ${Math.ceil(seg.duration / 60)}${t('itinerary.min')}`;
}
let routeTimer: any = null;
watch([selectedDay, () => JSON.stringify((linearContent.value?.nodes || []).map((n: any) => n.id))], () => {
  clearTimeout(routeTimer);
  routeSegments.value = new Map();
  refreshMap();
  routeTimer = setTimeout(() => fetchRouteSegments(), 300);
}, { immediate: false });

// ===== 拖拽排序 =====
function getDragStyle(nodeId: string) {
  if (draggingNodeId.value === nodeId) {
    return { transform: `translateY(${dragOffsetY.value}px)`, transition: 'none', zIndex: 10, position: 'relative' as const };
  }
  return {};
}
function onDragStart(e: any, node: LinearNode, ni: number, group: any) {
  const touch = e.touches?.[0] || e.changedTouches?.[0];
  if (!touch) return;
  draggingNodeId.value = String(node.id);
  dragStartY.value = touch.clientY;
  dragOffsetY.value = 0;
  dragNodeIndex.value = ni;
  dragNodeHeight.value = 80;
}
function onDragMove(e: any) {
  if (!draggingNodeId.value) return;
  const touch = e.touches?.[0] || e.changedTouches?.[0];
  if (!touch) return;
  dragOffsetY.value = touch.clientY - dragStartY.value;
}
function onDragEnd(e: any, group: any) {
  if (!draggingNodeId.value) return;
  const moved = Math.round(dragOffsetY.value / dragNodeHeight.value);
  const fromIdx = dragNodeIndex.value;
  const toIdx = Math.max(0, Math.min(group.nodes.length - 1, fromIdx + moved));
  draggingNodeId.value = '';
  dragOffsetY.value = 0;
  if (fromIdx !== toIdx) {
    // 在原始 nodes 数组中找到这两个节点并交换 sequence
    const allNodesArr = [...(linearContent.value.nodes || [])];
    const fromNode = group.nodes[fromIdx];
    const toNode = group.nodes[toIdx];
    const fromRealIdx = allNodesArr.findIndex((n: any) => String(n.id) === String(fromNode.id));
    const toRealIdx = allNodesArr.findIndex((n: any) => String(n.id) === String(toNode.id));
    if (fromRealIdx >= 0 && toRealIdx >= 0) {
      // 交换在原数组中的位置
      const [removed] = allNodesArr.splice(fromRealIdx, 1);
      const insertIdx = allNodesArr.findIndex((n: any) => String(n.id) === String(toNode.id));
      allNodesArr.splice(fromIdx < toIdx ? insertIdx + 1 : insertIdx, 0, removed);
      // 重新编号 sequence
      allNodesArr.forEach((n: any, i: number) => { n.sequence = i + 1; });
    }
    // 清空路线缓存，防止蓝屏
    routeSegments.value = new Map();
    linearContent.value = { ...linearContent.value, nodes: allNodesArr };
    refreshMap();
    persistReorder();
  }
}
async function persistReorder() {
  if (!itineraryId.value || isPreview.value) return;
  try {
    const orders = allNodes.value.map((n: any, i: number) => ({ nodeId: String(n.id), dayIndex: Number(n.dayIndex), sequence: i + 1 }));
    // 静默保存，不用返回值覆盖前端数据（前端已经是最新顺序）
    await itineraryStore.reorderNodes(itineraryId.value, orders);
  } catch (_) {}
}

// ===== 节点交互 =====
function onNodeClick(node: LinearNode) {
  if (editMode.value) { toggleCheck(String(node.id)); return; }
  openEditNode(node);
}
function onMarkerTap(e: any) {
  const idx = e?.markerId ?? e?.detail?.markerId;
  if (idx != null && nodesWithCoords.value[idx]) {
    const node = nodesWithCoords.value[idx];
    openEditNode(node);
  }
}

// ===== 编辑模式 =====
function enterEditMode() { editMode.value = true; checkedNodes.value = new Set(); }
function exitEditMode() { editMode.value = false; checkedNodes.value = new Set(); }
function toggleCheck(nodeId: string) {
  const s = new Set(checkedNodes.value);
  if (s.has(nodeId)) s.delete(nodeId); else s.add(nodeId);
  checkedNodes.value = s;
}
async function moveNodeUp(group: any, ni: number) { if (ni > 0) await swapInGroup(group, ni, ni - 1); }
async function moveNodeDown(group: any, ni: number) { if (ni < group.nodes.length - 1) await swapInGroup(group, ni, ni + 1); }
async function swapInGroup(group: any, from: number, to: number) {
  const allNodesArr = [...(linearContent.value.nodes || [])];
  const fromNode = group.nodes[from];
  const toNode = group.nodes[to];
  const fromRealIdx = allNodesArr.findIndex((n: any) => String(n.id) === String(fromNode.id));
  const toRealIdx = allNodesArr.findIndex((n: any) => String(n.id) === String(toNode.id));
  if (fromRealIdx >= 0 && toRealIdx >= 0) {
    // 直接交换位置
    [allNodesArr[fromRealIdx], allNodesArr[toRealIdx]] = [allNodesArr[toRealIdx], allNodesArr[fromRealIdx]];
    allNodesArr.forEach((n: any, i: number) => { n.sequence = i + 1; });
  }
  routeSegments.value = new Map();
  linearContent.value = { ...linearContent.value, nodes: allNodesArr };
  refreshMap();
  await persistReorder();
}
async function deleteChecked() {
  if (checkedNodes.value.size === 0) return;
  for (const id of [...checkedNodes.value]) {
    try {
      if (itineraryId.value && !isPreview.value) { const r: any = await itineraryStore.deleteNode(itineraryId.value, id); hydrateFromResponse(r); }
      else { linearContent.value.nodes = (linearContent.value.nodes || []).filter((n: any) => String(n.id) !== id); }
    } catch (_) {}
  }
  checkedNodes.value = new Set();
  uni.showToast({ title: t('common.success'), icon: 'success' });
}
async function moveCheckedToDay(targetDay: number) {
  if (checkedNodes.value.size === 0) return;
  const ids = [...checkedNodes.value];
  const updated = (linearContent.value.nodes || []).map((n: any) => ids.includes(String(n.id)) ? { ...n, dayIndex: targetDay } : n);
  linearContent.value = { ...linearContent.value, nodes: updated };
  await persistReorder();
  showMovePopup.value = false; checkedNodes.value = new Set();
  uni.showToast({ title: t('common.success'), icon: 'success' });
}
function addNewDay() { selectedDay.value = dayCount.value + 1; openCreateNode(dayCount.value + 1); }

// ===== 节点编辑（弹窗，全部用 textarea 替代 input） =====
const showEditor = ref(false);
const editorMode = ref<'create' | 'edit'>('create');
const showStartPicker = ref(false);
const showEndPicker = ref(false);
const editorForm = ref({
  id: '', dayIndex: 1, title: '', location: '',
  latitude: null as number | null, longitude: null as number | null,
  address: '', startTime: '', endTime: '', transport: '', cost: '',
  durationMin: '', notes: '', status: 'planned'
});

// 时间选择器
const timeHours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const timeMinutes = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];
const startPickerValue = ref([8, 0]);
const endPickerValue = ref([10, 0]);

function onStartPickerConfirm() {
  const idx = startPickerValue.value;
  editorForm.value.startTime = `${timeHours[idx[0]]}:${timeMinutes[idx[1]]}`;
  showStartPicker.value = false;
}
function onEndPickerConfirm() {
  const idx = endPickerValue.value;
  editorForm.value.endTime = `${timeHours[idx[0]]}:${timeMinutes[idx[1]]}`;
  showEndPicker.value = false;
}

function openCreateNode(day?: number) {
  editorMode.value = 'create';
  editorForm.value = {
    id: '', dayIndex: day || selectedDay.value || 1,
    title: '', location: '', latitude: null, longitude: null,
    address: '', startTime: '', endTime: '', transport: '', cost: '',
    durationMin: '', notes: '', status: 'planned'
  };
  startPickerValue.value = [8, 0];
  endPickerValue.value = [10, 0];
  showEditor.value = true;
}
function openEditNode(node: LinearNode) {
  editorMode.value = 'edit';
  // 解析 timeSlot "08:30-09:00" 为 startTime/endTime
  let startTime = '', endTime = '';
  const ts = node.timeSlot || '';
  if (ts.includes('-')) {
    const parts = ts.split('-');
    startTime = parts[0].trim();
    endTime = parts[1].trim();
  } else if (ts) {
    startTime = ts.trim();
  }
  // 设置 picker 默认值
  if (startTime) {
    const [h, m] = startTime.split(':');
    startPickerValue.value = [timeHours.indexOf(h) >= 0 ? timeHours.indexOf(h) : 8, timeMinutes.indexOf(m) >= 0 ? timeMinutes.indexOf(m) : 0];
  } else {
    startPickerValue.value = [8, 0];
  }
  if (endTime) {
    const [h, m] = endTime.split(':');
    endPickerValue.value = [timeHours.indexOf(h) >= 0 ? timeHours.indexOf(h) : 10, timeMinutes.indexOf(m) >= 0 ? timeMinutes.indexOf(m) : 0];
  } else {
    endPickerValue.value = [10, 0];
  }
  editorForm.value = {
    id: String(node.id), dayIndex: Number(node.dayIndex) || 1,
    title: node.title || '', location: node.location || '',
    latitude: node.latitude ?? null, longitude: node.longitude ?? null,
    address: node.address || '', startTime, endTime,
    transport: node.transport || '', cost: node.cost ? String(node.cost) : '',
    durationMin: node.durationMin ? String(node.durationMin) : '',
    notes: node.notes || '', status: node.status || 'planned'
  };
  showEditor.value = true;
}
async function saveNode() {
  const f = editorForm.value;
  if (!f.title.trim()) { uni.showToast({ title: t('itinerary.titleRequired'), icon: 'none' }); return; }
  // 拼回 timeSlot
  let timeSlot = '';
  if (f.startTime && f.endTime) timeSlot = `${f.startTime}-${f.endTime}`;
  else if (f.startTime) timeSlot = f.startTime;
  const nodeData: any = {
    dayIndex: f.dayIndex, title: f.title.trim(), location: f.location,
    latitude: f.latitude, longitude: f.longitude, address: f.address,
    timeSlot, transport: f.transport,
    cost: f.cost ? Number(f.cost) : 0,
    durationMin: f.durationMin ? Number(f.durationMin) : 0,
    notes: f.notes, status: f.status
  };
  try {
    if (editorMode.value === 'create') {
      if (itineraryId.value && !isPreview.value) {
        const res: any = await itineraryStore.addNode(itineraryId.value, nodeData);
        hydrateFromResponse(res);
      } else {
        const newNode = { ...nodeData, id: `n_${Date.now().toString(36)}`, sequence: allNodes.value.length + 1 };
        linearContent.value = { ...linearContent.value, nodes: [...(linearContent.value.nodes || []), newNode] };
      }
    } else {
      if (itineraryId.value && !isPreview.value) {
        const res: any = await itineraryStore.updateNode(itineraryId.value, f.id, nodeData);
        hydrateFromResponse(res);
      } else {
        linearContent.value.nodes = (linearContent.value.nodes || []).map((n: any) =>
          String(n.id) === f.id ? { ...n, ...nodeData } : n
        );
      }
    }
    showEditor.value = false;
    refreshMap();
    uni.showToast({ title: t('common.success'), icon: 'success' });
  } catch (_) { uni.showToast({ title: t('itinerary.saveFail'), icon: 'none' }); }
}
function markNodeDone() { editorForm.value.status = 'done'; saveNode(); }
function markNodeUndone() { editorForm.value.status = 'planned'; saveNode(); }
function chooseNodeLocation() {
  uni.navigateTo({
    url: '/pages/common/chooseLocation',
    events: {
      chooseLocation: (data: any) => {
        editorForm.value.location = data.name || '';
        editorForm.value.latitude = data.latitude;
        editorForm.value.longitude = data.longitude;
        editorForm.value.address = data.address || '';
      }
    }
  });
}
// ===== 数据加载 =====
function normalizeLocalContent(source: any) {
  if (source?.content?.version === 'v1') return source.content;
  if (source?.content?.nodes) return {
    version: 'v1', destination: source.content.destination || source.destination || '',
    startDate: source.content.startDate || source.start_date || '',
    endDate: source.content.endDate || source.end_date || '',
    nodes: source.content.nodes
  };
  if (Array.isArray(source?.content)) return {
    version: 'v1', destination: source.destination || '',
    startDate: source.start_date || '', endDate: source.end_date || '',
    nodes: source.content
  };
  return { version: 'v1', destination: source?.destination || '', startDate: '', endDate: '', nodes: [] };
}
function hydrateFromResponse(res: any) {
  if (!res) return;
  const data = res.data || res;
  if (data.id) itineraryId.value = data.id;
  if (data.title) itineraryTitle.value = data.title;
  if (data.content) linearContent.value = normalizeLocalContent(data);
}
async function loadDetail(id: string) {
  loading.value = true;
  try {
    const res: any = await itineraryStore.getDetail(id);
    itineraryId.value = id;
    hydrateFromResponse(res);
  } catch (_) { uni.showToast({ title: t('itinerary.loadFail'), icon: 'none' }); }
  finally { loading.value = false; nextTick(() => fetchRouteSegments()); }
}
function goBack() { uni.navigateBack(); }
function confirmDeleteItinerary() {
  if (!itineraryId.value) return;
  uni.showModal({
    title: t('itinerary.deleteTitle'), content: t('itinerary.deleteConfirm'), confirmColor: '#FF6B6B',
    success: async (res) => {
      if (res.confirm) {
        try { await itineraryStore.removeItinerary(itineraryId.value); uni.showToast({ title: t('common.success'), icon: 'success' }); setTimeout(() => uni.navigateBack(), 800); }
        catch (_) { uni.showToast({ title: t('itinerary.deleteFail'), icon: 'none' }); }
      }
    }
  });
}
onLoad((options: any) => {
  if (options?.id) { loadDetail(String(options.id)); return; }
  if (options?.preview) {
    isPreview.value = true;
    const source = itineraryStore.currentItinerary;
    if (!source) { uni.showToast({ title: t('itinerary.noData'), icon: 'none' }); setTimeout(() => uni.navigateBack(), 1200); return; }
    itineraryTitle.value = source.title || source.destination || t('itinerary.myTrip');
    linearContent.value = normalizeLocalContent(source);
    loading.value = false;
    nextTick(() => fetchRouteSegments());
    return;
  }
  uni.showToast({ title: t('itinerary.noData'), icon: 'none' });
});
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; background: #FFF8F0; display: flex; flex-direction: column; }
.top-bar { position: sticky; top: 0; z-index: 100; background: rgba(255,248,240,0.92); backdrop-filter: blur(12px); }
.top-bar-inner { padding-bottom: 8rpx; }
.bar-row { display: flex; align-items: center; justify-content: space-between; padding: 10rpx 24rpx 20rpx; }
.bar-btn { width: 72rpx; height: 72rpx; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: rgba(149,184,163,0.1); }
.bar-btn:active { opacity: 0.7; }
.bar-title { font-size: 34rpx; font-weight: 700; color: #2D2D2D; max-width: 400rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bar-right { display: flex; gap: 12rpx; }
.delete-bar-btn { background: rgba(255,107,107,0.08); }
.done-btn { height: 64rpx; padding: 0 28rpx; background: #333; border-radius: 32rpx; display: flex; align-items: center; justify-content: center; }
.done-btn-text { color: #fff; font-size: 28rpx; font-weight: 600; }
.loading-wrap { display: flex; justify-content: center; padding-top: 200rpx; }
/* Map */
.map-section { width: 100%; height: 440rpx; position: relative; z-index: 1; }
.itinerary-map { width: 100%; height: 100%; }
.main-scroll { flex: 1; overflow-y: auto; }

/* Hero */
.hero-card { margin: 20rpx 24rpx 0; background: #fff; border-radius: 24rpx; padding: 28rpx; box-shadow: 0 2rpx 16rpx rgba(0,0,0,0.04); }
.hero-inner { display: flex; align-items: center; justify-content: space-between; }
.hero-text { flex: 1; }
.hero-dest { font-size: 36rpx; font-weight: 700; color: #2D2D2D; display: block; }
.hero-date { font-size: 24rpx; color: #999; margin-top: 6rpx; display: block; }
.hero-badge { background: #4ECDC4; border-radius: 20rpx; padding: 8rpx 20rpx; flex-shrink: 0; margin-left: 16rpx; }
.hero-badge-text { color: #fff; font-size: 24rpx; font-weight: 600; }

/* Day Tabs */
.day-tabs { margin: 20rpx 0 0; border-bottom: 1rpx solid #F0EBE5; }
.day-tabs-scroll { white-space: nowrap; }
.day-tabs-inner { display: inline-flex; padding: 0 24rpx 16rpx; gap: 8rpx; }
.day-tab { padding: 14rpx 28rpx; border-radius: 32rpx; background: transparent; flex-shrink: 0; }
.day-tab.active { background: #2D2D2D; }
.day-tab-text { font-size: 26rpx; color: #666; font-weight: 500; }
.day-tab.active .day-tab-text { color: #fff; }
.day-tab-add { background: rgba(149,184,163,0.12); }
.day-tab-add .day-tab-text { color: #95B8A3; font-size: 30rpx; font-weight: 700; }

/* Node List */
.node-list { padding: 20rpx 24rpx 0; }
.day-header { margin: 24rpx 0 12rpx; }
.day-header-text { font-size: 30rpx; font-weight: 700; color: #2D2D2D; }
.node-wrap { position: relative; transition: transform 0.15s ease; }
.node-card {
  display: flex; align-items: flex-start; padding: 20rpx 0;
  background: #fff; border-radius: 20rpx; margin-bottom: 12rpx;
  padding: 20rpx 16rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.03);
  transition: background 0.2s, transform 0.15s;
}
.node-card-editing { padding-left: 12rpx; }
.node-card-checked { background: rgba(78,205,196,0.08); }
.node-card-dragging { opacity: 0.7; box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.12); }

/* 已打卡状态 */
.node-card-done { background: #F0FFF0; border: 2rpx solid #95B8A3; position: relative; }
.done-badge { position: absolute; top: -8rpx; right: -8rpx; z-index: 2; width: 44rpx; height: 44rpx; background: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.1); }
.done-badge-text { font-size: 22rpx; }

.node-card-done .seq-circle { background: #95B8A3; }
.node-card-done .node-type { color: #95B8A3; }
.node-card-done .node-title { color: #6B8F7B; }
.node-check { width: 56rpx; display: flex; align-items: flex-start; padding-top: 8rpx; flex-shrink: 0; }
.check-circle { width: 44rpx; height: 44rpx; border-radius: 50%; border: 3rpx solid #D0D0D0; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
.check-circle.checked { background: #4ECDC4; border-color: #4ECDC4; }
.check-icon { color: #fff; font-size: 24rpx; font-weight: 700; }
.node-seq { width: 56rpx; display: flex; flex-direction: column; align-items: center; flex-shrink: 0; }
.seq-circle { width: 48rpx; height: 48rpx; border-radius: 50%; background: #4ECDC4; display: flex; align-items: center; justify-content: center; }
.seq-text { color: #fff; font-size: 24rpx; font-weight: 700; }
.seq-done { background: #95B8A3; }
.seq-line { width: 4rpx; flex: 1; min-height: 40rpx; background: #E0E0E0; margin-top: 6rpx; }
.node-body { flex: 1; padding-left: 16rpx; }
.node-type { font-size: 22rpx; color: #4ECDC4; font-weight: 500; display: block; }
.node-title { font-size: 30rpx; font-weight: 600; color: #2D2D2D; margin-top: 4rpx; display: block; }
.node-notes { font-size: 24rpx; color: #888; margin-top: 8rpx; display: block; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.node-meta { display: flex; gap: 16rpx; margin-top: 8rpx; flex-wrap: wrap; }
.node-time { font-size: 22rpx; color: #B0B0B0; }
.node-cost { font-size: 22rpx; color: #E8A87C; }

/* Drag Handle */
.drag-handle { width: 60rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.drag-icon { font-size: 36rpx; color: #C4B5A8; }
.drag-arrows { display: flex; flex-direction: column; gap: 4rpx; }
.arrow-btn { font-size: 28rpx; color: #999; text-align: center; padding: 6rpx 12rpx; border-radius: 8rpx; background: rgba(0,0,0,0.04); }
.arrow-btn:active { background: #4ECDC4; color: #fff; }

/* Segment Info */
.segment-info { display: flex; align-items: center; padding: 8rpx 0 8rpx 72rpx; gap: 8rpx; }
.segment-icon { font-size: 24rpx; }
.segment-text { font-size: 22rpx; color: #999; }

/* Empty */
.empty-state { display: flex; flex-direction: column; align-items: center; padding-top: 120rpx; }
.empty-emoji { font-size: 80rpx; }
.empty-text { font-size: 28rpx; color: #999; margin-top: 16rpx; }
.empty-add-btn { margin-top: 24rpx; padding: 16rpx 40rpx; background: #4ECDC4; border-radius: 32rpx; }
.empty-add-text { color: #fff; font-size: 28rpx; font-weight: 600; }

/* FAB */
.fab-edit {
  position: fixed; bottom: calc(180rpx + env(safe-area-inset-bottom)); right: 32rpx;
  background: #2D2D2D; border-radius: 40rpx; padding: 16rpx 28rpx;
  display: flex; align-items: center; gap: 8rpx;
  box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.15); z-index: 50;
}
.fab-edit:active { opacity: 0.85; }
.fab-edit-icon { font-size: 28rpx; }
.fab-edit-text { color: #fff; font-size: 26rpx; font-weight: 600; }

/* Edit Toolbar */
.edit-toolbar {
  position: fixed; bottom: 0; left: 0; right: 0;
  background: #fff; border-top: 1rpx solid #F0EBE5;
  display: flex; padding: 20rpx 32rpx calc(20rpx + env(safe-area-inset-bottom));
  gap: 20rpx; z-index: 1000;
}
.edit-action { flex: 1; height: 80rpx; border-radius: 40rpx; display: flex; align-items: center; justify-content: center; }
.delete-action { background: #FF6B6B; }
.move-action { background: #2D2D2D; }
.edit-action.disabled { opacity: 0.4; }
.edit-action-text { color: #fff; font-size: 28rpx; font-weight: 600; }

/* ===== 奶油风弹窗（仅移动至弹窗使用） ===== */
.cream-popup {
  padding: 24px 20px;
  padding-bottom: calc(24px + env(safe-area-inset-bottom));
  background: #FFF8F0;
  border-radius: 24px 24px 0 0;
}
.cream-popup-handle { width: 36px; height: 4px; background: #E0D5CA; border-radius: 2px; margin: 0 auto 16px; }
.cream-popup-title { display: block; font-size: 17px; font-weight: 700; color: #3D3028; margin-bottom: 20px; text-align: center; }

/* Move Popup */
.cream-day-item { padding: 14px; border-radius: 14px; margin-bottom: 8px; background: #fff; text-align: center; box-shadow: 0 1px 4px rgba(0,0,0,0.03); }
.cream-day-item:active { background: #4ECDC4; }
.cream-day-item:active .cream-day-text { color: #fff; }
.cream-day-text { font-size: 16px; font-weight: 600; color: #3D3028; }
.cream-cancel { padding: 14px; text-align: center; margin-top: 8px; }
.cream-cancel-text { font-size: 15px; color: #999; }

/* ===== 编辑弹窗（全部 textarea） ===== */
.editor-mask {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.45); z-index: 2000;
  display: flex; align-items: flex-end;
}
.editor-sheet {
  width: 100%; background: #FFF8F0;
  border-radius: 24px 24px 0 0;
  padding: 16px 20px calc(16px + env(safe-area-inset-bottom));
  max-height: 85vh; display: flex; flex-direction: column;
}
.sheet-handle { width: 36px; height: 4px; background: #E0D5CA; border-radius: 2px; margin: 0 auto 14px; }
.sheet-title { display: block; font-size: 17px; font-weight: 700; color: #3D3028; text-align: center; margin-bottom: 16px; }
.sheet-scroll { flex: 1; overflow-y: auto; }

.ed-card {
  background: #fff; border-radius: 14px; padding: 12px 14px;
  margin-bottom: 10px; box-shadow: 0 1px 4px rgba(0,0,0,0.03);
}
.ed-label { display: block; font-size: 13px; color: #8C7B6B; font-weight: 500; margin-bottom: 8px; }
.ed-input {
  width: 100%; background: #F8F4EF; border-radius: 10px; padding: 10px 12px;
  font-size: 15px; color: #3D3028; border: 1px solid #F0EBE5;
  box-sizing: border-box; height: 42px; line-height: 20px; resize: none; overflow: hidden;
}
.ed-notes {
  width: 100%; background: #F8F4EF; border-radius: 10px; padding: 10px 12px;
  font-size: 15px; color: #3D3028; border: 1px solid #F0EBE5;
  box-sizing: border-box; min-height: 80px; line-height: 1.5; resize: none;
}
.ed-loc {
  display: flex; align-items: center; background: #F8F4EF;
  border-radius: 10px; padding: 10px 12px; border: 1px solid #F0EBE5;
}
.ed-loc-text { flex: 1; font-size: 15px; color: #3D3028; }
.ed-loc-text.ph { color: #C4B5A8; }
.ed-arrow { font-size: 18px; color: #C4B5A8; }
.ed-row { display: flex; gap: 10px; }
.ed-row .ed-card.half { flex: 1; }

.ed-status-row { display: flex; gap: 10px; margin-top: 4px; }
.ed-chip {
  flex: 1; padding: 10px; border-radius: 10px; background: #F8F4EF;
  text-align: center; border: 2px solid transparent; transition: all 0.2s;
}
.ed-chip.active { border-color: #E8A87C; background: #FFF3E8; }
.ed-chip-done.active { border-color: #4ECDC4; background: #E8F8F0; }
.ed-chip-text { font-size: 13px; color: #5D4E42; font-weight: 500; }

.sheet-btns { display: flex; gap: 10px; margin-top: 14px; flex-shrink: 0; }
.sheet-btn { flex: 1; height: 44px; border-radius: 22px; display: flex; align-items: center; justify-content: center; }
.sheet-btn-cancel { background: #F0EBE5; }
.sheet-btn-save { background: #E8A87C; }
.sheet-btn-text { font-size: 15px; color: #5D4E42; font-weight: 600; }
.sheet-btn-text-w { font-size: 15px; color: #fff; font-weight: 600; }

/* ===== 时间选择器 ===== */
.picker-mask {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.4); z-index: 3000;
  display: flex; align-items: flex-end;
}
.picker-sheet {
  width: 100%; background: #FFF8F0;
  border-radius: 20px 20px 0 0;
  padding-bottom: env(safe-area-inset-bottom);
}
.picker-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 20px; border-bottom: 1px solid #F0EBE5;
}
.picker-cancel { font-size: 15px; color: #999; }
.picker-title { font-size: 16px; font-weight: 600; color: #3D3028; }
.picker-confirm { font-size: 15px; color: #E8A87C; font-weight: 600; }
.picker-view { width: 100%; height: 220px; }
.picker-item { display: flex; align-items: center; justify-content: center; font-size: 16px; color: #3D3028; }
</style>
