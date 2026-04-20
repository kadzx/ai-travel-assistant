<script setup lang="ts">
import { onLaunch, onShow, onHide } from "@dcloudio/uni-app";
import { hasChosenLang } from '@/locale';

onLaunch(() => {
  console.log("App Launch");
  // 如果已经选择过语言，跳过语言选择页直接进欢迎页
  if (hasChosenLang()) {
    uni.reLaunch({ url: '/pages/welcome/welcome' });
  }
});
onShow(() => {
  console.log("App Show");
});
onHide(() => {
  console.log("App Hide");
});
</script>
<style lang="scss">
@import "uview-plus/index.scss";

/* ===== 奶油极简风 — 全局 CSS 变量 ===== */
:root {
  --cream-bg: #FFF8F0;
  --cream-dark: #FFF0E6;
  --primary: #E8A87C;
  --caramel: #D4A574;
  --matcha: #95B8A3;
  --fog-blue: #B8C5D6;
  --light-pink: #F5D5C8;
  --light-green: #D4E8DB;
  --light-blue: #DFE8F0;
  --text-main: #3D3D3D;
  --text-sub: #8C8C8C;
  --text-hint: #BFBFBF;
}

/* 全局页面背景 */
page {
  background-color: #FFF8F0;
  color: #3D3D3D;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
}

/* 奶油风通用装饰 blob */
.blob-decoration {
  position: absolute;
  border-radius: 50%;
  opacity: 0.5;
  pointer-events: none;
}

/* 毛玻璃效果（H5 端生效） */
.glass-effect {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

/* 奶油风渐变按钮 */
.cream-gradient-btn {
  background: linear-gradient(135deg, #E8A87C, #D4A574);
  color: #fff;
  border: none;
  border-radius: 24px;
  font-weight: 600;
  transition: all 0.2s ease;
  &:active {
    transform: scale(0.97);
    opacity: 0.9;
  }
}

/* 奶油风卡片 */
.cream-card {
  background: #FFFFFF;
  border-radius: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

/* 安全区域 */
.safe-area-bottom {
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}

/* 隐藏原生 tabBar（自定义 tabBar 模式） */
uni-tabbar, .uni-tabbar {
  display: none !important;
}
</style>
