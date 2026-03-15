import { createSSRApp } from "vue";
import App from "./App.vue";
import pinia from './stores';
import uviewPlus from 'uview-plus';
import 'virtual:uno.css';
// uview-plus 内部 UPopup 等组件会使用 up-icon，统一用 u-icon 兜底
import UIcon from 'uview-plus/components/u-icon/u-icon.vue';

export function createApp() {
  const app = createSSRApp(App);

  app.use(pinia);
  app.use(uviewPlus);
  app.component('up-icon', UIcon);

  return {
    app,
    pinia
  };
}
