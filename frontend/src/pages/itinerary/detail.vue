<template>
  <view class="page min-h-screen bg-[#F6F7F9] flex flex-col">
    <view class="sticky top-0 z-20 bg-[#F6F7F9]/95 border-b border-black/5">
      <view class="h-[var(--status-bar-height)]"></view>
      <view class="px-4 py-3 flex items-center justify-between">
        <view class="w-10 h-10 flex items-center justify-center active:opacity-70" @click="goBack">
          <u-icon name="arrow-left" size="22" color="#333"></u-icon>
        </view>
        <text class="text-[17px] font-bold text-[#1A1A1A]">线性行程</text>
        <view class="w-10 h-10 flex items-center justify-center" @click="openCreateNode">
          <u-icon name="plus" size="22" color="#FF2442"></u-icon>
        </view>
      </view>
    </view>

    <view v-if="loading" class="flex-1 flex items-center justify-center">
      <u-loading-icon mode="circle"></u-loading-icon>
    </view>

    <scroll-view v-else scroll-y class="flex-1 px-3 py-3 box-border">
      <view class="rounded-2xl bg-white p-4 border border-black/5 mb-3">
        <text class="text-[18px] font-bold text-[#1A1A1A]">{{ itineraryTitle }}</text>
        <view class="mt-2 flex items-center gap-2 text-[12px] text-[#666]">
          <text>{{ linearContent.destination || '未设置目的地' }}</text>
          <text>·</text>
          <text>{{ dayCount }} 天</text>
          <text>·</text>
          <text>{{ nodeCount }} 个节点</text>
        </view>
      </view>

      <view v-if="dayGroups.length === 0" class="rounded-2xl bg-white p-6 text-center border border-black/5">
        <text class="text-[#999] text-[14px]">暂无节点，点击右上角加号添加</text>
      </view>

      <view v-for="group in dayGroups" :key="group.dayIndex" class="mb-4">
        <view class="mb-2 px-1 flex items-center justify-between">
          <text class="text-[15px] font-bold text-[#1A1A1A]">Day {{ group.dayIndex }}</text>
          <view class="px-2 py-1 rounded-full bg-[#FF2442]/10">
            <text class="text-[11px] text-[#FF2442]">{{ group.nodes.length }} 节点</text>
          </view>
        </view>

        <view
          v-for="(node, index) in group.nodes"
          :key="node.id"
          class="bg-white rounded-2xl p-3 border border-black/5 mb-2 shadow-sm"
        >
          <view class="flex items-start justify-between">
            <view class="pr-2">
              <view class="flex items-center gap-2">
                <text class="text-[12px] text-[#666]">{{ node.timeSlot || '待定时间' }}</text>
                <view class="status-badge" :class="`status-${node.status}`">
                  <text>{{ statusText(node.status) }}</text>
                </view>
              </view>
              <text class="mt-1 block text-[16px] font-semibold text-[#1A1A1A]">{{ node.title }}</text>
              <text class="mt-1 block text-[13px] text-[#666]">{{ node.location || '未填写地点' }}</text>
              <text class="mt-1 block text-[12px] text-[#999]">
                交通 {{ node.transport || '待定' }} · 预算 ¥{{ node.cost || 0 }}
              </text>
              <text v-if="node.notes" class="mt-1 block text-[12px] text-[#666]">{{ node.notes }}</text>
            </view>
            <view class="flex flex-col gap-1 shrink-0">
              <view class="op-btn" @click="openEditNode(node)">编辑</view>
              <view class="op-btn" @click="moveNode(node, -1)">上移</view>
              <view class="op-btn" @click="moveNode(node, 1)">下移</view>
              <view class="op-btn danger" @click="removeNode(node)">删除</view>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <view v-if="isPreview" class="bg-white border-t border-black/5 p-4 pb-safe">
      <u-button
        type="primary"
        text="保存行程"
        customStyle="border-radius: 999px; background: #FF2442; border: none;"
        :loading="saving"
        @click="handleSavePreview"
      ></u-button>
    </view>

    <view v-if="showEditor" class="fixed inset-0 z-50 flex items-end">
      <view class="absolute inset-0 bg-black/35" @click="closeEditor"></view>
      <view class="relative w-full bg-white rounded-t-3xl p-4 pb-safe">
        <view class="flex items-center justify-between mb-3">
          <text class="text-[16px] font-bold text-[#1A1A1A]">{{ editingNodeId ? '编辑节点' : '新增节点' }}</text>
          <text class="text-[#999] text-[13px]" @click="closeEditor">关闭</text>
        </view>
        <view class="form-row">
          <text class="label">标题</text>
          <input v-model="editorForm.title" class="input" placeholder="例如：西湖晨游" />
        </view>
        <view class="form-row">
          <text class="label">时间段</text>
          <input v-model="editorForm.timeSlot" class="input" placeholder="09:00-10:30" />
        </view>
        <view class="form-row">
          <text class="label">地点</text>
          <input v-model="editorForm.location" class="input" placeholder="请输入地点" />
        </view>
        <view class="form-row">
          <text class="label">交通</text>
          <input v-model="editorForm.transport" class="input" placeholder="步行/打车/地铁" />
        </view>
        <view class="flex gap-2">
          <view class="form-row flex-1">
            <text class="label">Day</text>
            <input v-model="editorForm.dayIndex" class="input" type="number" />
          </view>
          <view class="form-row flex-1">
            <text class="label">顺序</text>
            <input v-model="editorForm.sequence" class="input" type="number" />
          </view>
        </view>
        <view class="flex gap-2 mt-3">
          <view class="status-picker" :class="{ active: editorForm.status === 'planned' }" @click="editorForm.status = 'planned'">计划</view>
          <view class="status-picker" :class="{ active: editorForm.status === 'done' }" @click="editorForm.status = 'done'">完成</view>
          <view class="status-picker" :class="{ active: editorForm.status === 'skipped' }" @click="editorForm.status = 'skipped'">跳过</view>
        </view>
        <view class="form-row mt-3">
          <text class="label">备注</text>
          <textarea v-model="editorForm.notes" class="textarea" placeholder="可选备注"></textarea>
        </view>
        <u-button
          type="primary"
          text="确认"
          customStyle="margin-top: 14px; border-radius: 999px; background: #FF2442; border: none;"
          @click="submitEditor"
        ></u-button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { getItineraryDetail, saveItinerary } from '@/api/itinerary';
import { useItineraryStore, type LinearNode } from '@/stores/itinerary';

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
  transport: '',
  dayIndex: 1,
  sequence: 1,
  status: 'planned',
  notes: ''
});

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
    transport: '',
    dayIndex: dayCount.value,
    sequence: nodeCount.value + 1,
    status: 'planned',
    notes: ''
  };
  showEditor.value = true;
}

function openEditNode(node: LinearNode) {
  editingNodeId.value = String(node.id);
  editorForm.value = {
    title: node.title || '',
    timeSlot: node.timeSlot || '',
    location: node.location || '',
    transport: node.transport || '',
    dayIndex: node.dayIndex || 1,
    sequence: node.sequence || 1,
    status: node.status || 'planned',
    notes: node.notes || ''
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
  if (!itineraryId.value || isPreview.value) {
    linearContent.value.nodes = nodes.value.filter(n => String(n.id) !== String(node.id));
    return;
  }
  try {
    const res: any = await itineraryStore.deleteNode(itineraryId.value, String(node.id));
    hydrateFromResponse(res);
  } catch (_) {
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
.pb-safe {
  padding-bottom: calc(1rem + env(safe-area-inset-bottom));
}

.status-badge {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 600;
}

.status-planned {
  background: rgba(255, 36, 66, 0.12);
  color: #ff2442;
}

.status-done {
  background: rgba(22, 163, 74, 0.12);
  color: #16a34a;
}

.status-skipped {
  background: rgba(156, 163, 175, 0.16);
  color: #6b7280;
}

.op-btn {
  min-width: 52px;
  text-align: center;
  font-size: 11px;
  color: #666;
  padding: 5px 8px;
  border-radius: 999px;
  background: #f6f7f9;
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.op-btn.danger {
  color: #ff2442;
  border-color: rgba(255, 36, 66, 0.3);
  background: rgba(255, 36, 66, 0.06);
}

.form-row {
  margin-top: 8px;
}

.label {
  display: block;
  font-size: 12px;
  color: #666;
  margin-bottom: 6px;
}

.input {
  width: 100%;
  height: 40px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  background: #fff;
  padding: 0 12px;
  box-sizing: border-box;
}

.textarea {
  width: 100%;
  min-height: 80px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  padding: 10px 12px;
  box-sizing: border-box;
}

.status-picker {
  flex: 1;
  text-align: center;
  font-size: 12px;
  color: #666;
  border-radius: 999px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  padding: 8px 0;
}

.status-picker.active {
  color: #ff2442;
  border-color: rgba(255, 36, 66, 0.35);
  background: rgba(255, 36, 66, 0.08);
}
</style>
