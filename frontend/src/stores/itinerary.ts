import { defineStore } from 'pinia';
import { ref } from 'vue';
import { request } from '@/utils/request';

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
      const res: any = await request({ 
        url: '/itinerary/list', 
        method: 'GET' 
      });
      list.value = res.data || [];
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
      const res: any = await request({ 
        url: '/itinerary/generate', 
        method: 'POST', 
        data 
      });
      
      if (res.data) {
        currentItinerary.value = res.data;
        // Optionally prepend to list if it returns the full object
        list.value.unshift(res.data);
      }
      return res.data;
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
      const res: any = await request({ 
        url: `/itinerary/${id}`, 
        method: 'GET' 
      });
      currentItinerary.value = res.data;
      return res.data;
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
