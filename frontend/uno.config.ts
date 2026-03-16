import { defineConfig } from 'unocss'
import presetWeapp from 'unocss-preset-weapp'
import { transformerAttributify, transformerClass } from 'unocss-preset-weapp/transformer'

export default defineConfig({
  presets: [
    presetWeapp(),
  ],
  transformers: [
    transformerAttributify(),
    transformerClass(),
  ],
  theme: {
    colors: {
      // Cream Minimal palette
      primary: '#E8A87C',    // 暖杏色 — 主强调
      caramel: '#D4A574',    // 焦糖奶茶 — 次强调
      matcha: '#95B8A3',     // 抹茶绿 — 行程/成功
      fogblue: '#B8C5D6',    // 雾蓝 — 信息/聊天
      cream: '#FFF8F0',      // 奶油白 — 全局背景
      'cream-dark': '#FFF0E6', // 深奶油 — 渐变终点
      'light-pink': '#F5D5C8', // 浅粉点缀
      'light-green': '#D4E8DB', // 浅绿点缀
      'light-blue': '#DFE8F0',  // 浅蓝点缀
      secondary: '#3D3D3D',  // 主文字
      'text-sub': '#8C8C8C', // 副文字
      'text-hint': '#BFBFBF', // 占位文字
      success: '#95B8A3',
      warning: '#F0C987',
      error: '#FF6B6B',
      info: '#B8C5D6',
      // Backgrounds
      page: '#FFF8F0',
      card: '#FFFFFF',
    },
    boxShadow: {
      'sm': '0 1px 4px 0 rgba(0, 0, 0, 0.03)',
      'DEFAULT': '0 2px 10px rgba(0, 0, 0, 0.04)',
      'md': '0 4px 12px rgba(0, 0, 0, 0.06)',
      'lg': '0 8px 24px rgba(0, 0, 0, 0.08)',
      'xl': '0 12px 32px rgba(0, 0, 0, 0.1)',
      'float': '0 8px 30px rgba(0,0,0,0.08)',
      'glow': '0 0 20px rgba(232, 168, 124, 0.3)',
      'card': '0 2px 12px rgba(0, 0, 0, 0.06)',
    }
  },
  shortcuts: {
    'flex-center': 'flex justify-center items-center',
    'flex-col': 'flex flex-col',
    'flex-between': 'flex justify-between items-center',
    'text-primary': 'text-primary',
    'bg-primary': 'bg-primary',
    'card-hover': 'transition-all duration-300 hover:shadow-lg hover:-translate-y-1',
    'btn-active': 'active:scale-97 transition-transform duration-150',
    'page-container': 'min-h-screen bg-page pb-safe',
    'cream-card': 'bg-white rounded-[20px] shadow-card',
    'cream-btn': 'rounded-[24px] h-[48px] text-white font-semibold',
    'glass-effect': 'bg-white/80 backdrop-blur-[20px]',
  },
})
