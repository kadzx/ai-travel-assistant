import { defineStore } from 'pinia';
import { ref } from 'vue';
import http from '@/utils/request';

export interface ItineraryItem {
  id: number | string;
  destination: string;
  days: number;
  budget: number | string;
  interests: string[];
  created_at?: string;
  content?: string;
  [key: string]: any;
}

export const useItineraryStore = defineStore('itinerary', () => {
  const list = ref<ItineraryItem[]>([]);
  const currentItinerary = ref<ItineraryItem | null>(null);
  const loading = ref(false);

  const getList = async () => {
    loading.value = true;
    try {
      const res: any = await http.get('/itinerary/list');
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
      const res: any = await http.post('/itinerary/generate', data);
      
      if (res) {
        currentItinerary.value = res;
        // Optionally prepend to list if it returns the full object
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
      const res: any = await http.get(`/itinerary/${id}`);
      currentItinerary.value = res;
      return res;
    } catch (error) {
      console.error('Fetch itinerary detail error:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  return { 
    list, 
    currentItinerary, 
    loading,
    getList, 
    generate, 
    getDetail 
  };
});
