import { defineStore } from 'pinia';
import { ref } from 'vue';
import http from '@/utils/request';

export interface ItineraryItem {
  id: number | string;
  title: string;
  content?: any;
  start_date?: string;
  end_date?: string;
  created_at?: string;
  [key: string]: any;
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

  return { 
    list, 
    currentItinerary, 
    loading,
    getList, 
    generate, 
    getDetail 
  };
});
