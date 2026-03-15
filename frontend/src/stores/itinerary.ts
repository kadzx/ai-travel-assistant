import { defineStore } from 'pinia';
import { ref } from 'vue';
import http from '@/utils/request';
import {
  updateItineraryNode,
  addItineraryNode,
  deleteItineraryNode,
  reorderItineraryNodes
} from '@/api/itinerary';

export interface ItineraryItem {
  id: number | string;
  title: string;
  content?: any;
  start_date?: string;
  end_date?: string;
  created_at?: string;
  [key: string]: any;
}

export interface LinearNode {
  id: string;
  dayIndex: number;
  sequence: number;
  timeSlot?: string;
  title: string;
  location?: string;
  transport?: string;
  cost?: number;
  durationMin?: number;
  notes?: string;
  status: 'planned' | 'done' | 'skipped';
}

export const useItineraryStore = defineStore('itinerary', () => {
  const list = ref<ItineraryItem[]>([]);
  const currentItinerary = ref<ItineraryItem | null>(null);
  const loading = ref(false);

  const getList = async () => {
    loading.value = true;
    try {
      const res: any = await http.get('/itineraries');
      list.value = res || [];
      return list.value;
    } catch (error) {
      console.error('Fetch itinerary list error:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  const generate = async (data: any) => {
    loading.value = true;
    try {
      const res: any = await http.post('/itineraries/generate', data);
      
      if (res) {
        currentItinerary.value = res;
        list.value.unshift(res);
      }
      return res;
    } catch (error) {
      console.error('Generate itinerary error:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  const getDetail = async (id: string | number) => {
    loading.value = true;
    try {
      const res: any = await http.get(`/itineraries/${id}`);
      currentItinerary.value = res;
      return res;
    } catch (error) {
      console.error('Fetch itinerary detail error:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  const updateNode = async (itineraryId: string | number, nodeId: string, patch: Partial<LinearNode>) => {
    const res: any = await updateItineraryNode(itineraryId, nodeId, patch);
    currentItinerary.value = res;
    const idx = list.value.findIndex(item => String(item.id) === String(itineraryId));
    if (idx >= 0) list.value[idx] = res;
    return res;
  };

  const addNode = async (itineraryId: string | number, node: Partial<LinearNode>) => {
    const res: any = await addItineraryNode(itineraryId, node);
    currentItinerary.value = res;
    const idx = list.value.findIndex(item => String(item.id) === String(itineraryId));
    if (idx >= 0) list.value[idx] = res;
    return res;
  };

  const deleteNode = async (itineraryId: string | number, nodeId: string) => {
    const res: any = await deleteItineraryNode(itineraryId, nodeId);
    currentItinerary.value = res;
    const idx = list.value.findIndex(item => String(item.id) === String(itineraryId));
    if (idx >= 0) list.value[idx] = res;
    return res;
  };

  const reorderNodes = async (
    itineraryId: string | number,
    orders: Array<{ nodeId: string; dayIndex: number; sequence: number }>
  ) => {
    const res: any = await reorderItineraryNodes(itineraryId, orders);
    currentItinerary.value = res;
    const idx = list.value.findIndex(item => String(item.id) === String(itineraryId));
    if (idx >= 0) list.value[idx] = res;
    return res;
  };

  return { 
    list, 
    currentItinerary, 
    loading,
    getList, 
    generate, 
    getDetail,
    updateNode,
    addNode,
    deleteNode,
    reorderNodes
  };
});
