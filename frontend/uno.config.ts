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
      primary: '#FF2442', // Red/Brand
      secondary: '#333333', // Dark Gray
      accent: '#FFD700', // Gold/Accent
      success: '#4CD964',
      warning: '#FFCC00',
      error: '#FF3B30',
      info: '#5AC8FA',
      // Backgrounds
      page: '#F6F7F9',
      card: '#FFFFFF',
    },
    boxShadow: {
      'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      'DEFAULT': '0 4px 12px -2px rgba(0, 0, 0, 0.08)',
      'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      'float': '0 8px 30px rgba(0,0,0,0.12)',
      'glow': '0 0 20px rgba(255, 36, 66, 0.3)',
    }
  },
  shortcuts: {
    'flex-center': 'flex justify-center items-center',
    'flex-col': 'flex flex-col',
    'flex-between': 'flex justify-between items-center',
    'text-primary': 'text-primary',
    'bg-primary': 'bg-primary',
    'card-hover': 'transition-all duration-300 hover:shadow-lg hover:-translate-y-1',
    'btn-active': 'active:scale-95 transition-transform duration-100',
    'page-container': 'min-h-screen bg-page pb-safe',
  },
})
