<template>
  <view class="relative w-full h-screen overflow-hidden bg-black">
    <!-- Background Image with Parallax Effect -->
    <image 
      class="absolute inset-0 w-full h-full object-cover opacity-80 animate-ken-burns"
      src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2021&q=80"
      mode="aspectFill"
    />
    
    <!-- Gradient Overlay -->
    <view class="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></view>

    <!-- Content Container -->
    <view class="absolute inset-0 flex flex-col justify-end px-8 pb-16 z-10">
      
      <!-- Logo Mark -->
      <view class="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-8 animate-fade-in-up delay-100 shadow-xl shadow-white/10">
        <text class="text-black font-black text-xl tracking-tighter">A</text>
      </view>

      <!-- Typography -->
      <view class="mb-6">
        <text class="block text-white text-5xl font-extrabold leading-tight tracking-tight mb-2 animate-fade-in-up delay-200">
          Explore <br />
          The World
        </text>
        <text class="block text-gray-400 text-lg font-medium leading-relaxed max-w-[80%] animate-fade-in-up delay-300">
          Discover hidden gems and plan your perfect trip with AI.
        </text>
      </view>

      <!-- Action Button -->
      <button 
        class="w-full bg-white text-black rounded-full py-5 text-lg font-bold shadow-2xl shadow-white/20 active:scale-95 transition-all duration-300 flex items-center justify-between px-8 group animate-fade-in-up delay-500"
        @click="handleStart"
      >
        <text>Get Started</text>
        <view class="w-8 h-8 bg-black rounded-full flex items-center justify-center group-hover:translate-x-1 transition-transform">
          <u-icon name="arrow-right" color="#ffffff" size="14"></u-icon>
        </view>
      </button>

      <!-- Login Link -->
      <view class="mt-6 flex justify-center animate-fade-in-up delay-700">
        <text class="text-gray-500 text-sm">Already have an account? <text class="text-white font-bold underline decoration-white/30 underline-offset-4" @click="handleLogin">Log In</text></text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { useUserStore } from '@/stores/user';
// @ts-ignore
import UIcon from 'uview-plus/components/u-icon/u-icon.vue';

const userStore = useUserStore();

const handleStart = () => {
  // Check if user is logged in
  if (userStore.checkLogin()) {
    uni.switchTab({ url: '/pages/index/index' });
  } else {
    // Or go to register/login choice, here simplified to login
    uni.redirectTo({ url: '/pages/login/login' });
  }
};

const handleLogin = () => {
  uni.redirectTo({ url: '/pages/login/login' });
};
</script>

<style scoped>
/* Custom Animations */
@keyframes ken-burns {
  0% { transform: scale(1); }
  100% { transform: scale(1.1); }
}

.animate-ken-burns {
  animation: ken-burns 20s ease-out infinite alternate;
}

@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in-up {
  animation: fade-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  opacity: 0; /* Start hidden */
}

.delay-100 { animation-delay: 0.1s; }
.delay-200 { animation-delay: 0.2s; }
.delay-300 { animation-delay: 0.3s; }
.delay-500 { animation-delay: 0.5s; }
.delay-700 { animation-delay: 0.7s; }
</style>
