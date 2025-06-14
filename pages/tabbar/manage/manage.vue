<!-- 设备管理主页面 - 智能家居控制中心 -->
<template>
  <div class="device-management-page">
	<PullPanel />
	  
    <!-- 噪点纹理背景 -->
    <div class="noise-overlay" :class="{ 'noise-overlay--visible': showNoiseOverlay }" />


    <!-- 主要内容区域 -->
    <main class="main-content">
      <!-- 加载状态 -->
      <div v-if="isLoading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>正在加载设备数据...</p>
      </div>

      <!-- 错误状态 -->
      <div v-else-if="error" class="error-state">
        <p class="error-message">{{ error }}</p>
        <button @click="retryLoading" class="retry-button">重试</button>
      </div>

      <!-- 正常状态 -->
      <template v-else>
        <SceneSection />
        <RoomSelector />
        <DeviceList />
      </template>
    </main>
  </div>
</template>

<script setup>
/**
 * 设备管理页面
 * 功能：智能家居设备的统一管理和控制
 * - 场景控制
 * - 房间切换
 * - 设备状态管理
 */

// Vue 组合式 API
import { ref, onMounted, onUnmounted } from 'vue'

// 导入悬浮球组件
import PullPanel from '../../../components/PullPanel.vue'

// 导入子组件
import SceneSection from './SceneSection.vue'
import RoomSelector from './RoomSelector.vue'
import DeviceList from './DeviceList.vue'

// 导入工具函数
import { provideDeviceStore } from '../../../stores/devices.js'


// 响应式状态
const showNoiseOverlay = ref(true)
const isLoading = ref(true)
const error = ref(null)

/**
 * 初始化设备存储
 * 提供全局的设备状态管理
 */
const deviceStore = provideDeviceStore()

/**
 * 重试加载
 */
const retryLoading = async () => {
  error.value = null
  isLoading.value = true
  try {
    await deviceStore.initialize?.()
    isLoading.value = false
  } catch (err) {
    console.error('初始化设备数据失败:', err)
    error.value = '连接服务器超时，请检查网络连接后重试'
    isLoading.value = false
  }
}

/**
 * 组件挂载时的初始化操作
 */
onMounted(async () => {
  try {
    // 延迟显示噪点效果，优化初始加载性能
    setTimeout(() => {
      showNoiseOverlay.value = true
    }, 100)

    // 初始化设备数据
    await deviceStore.initialize?.()
    isLoading.value = false
  } catch (err) {
    console.error('初始化设备数据失败:', err)
    error.value = '连接服务器超时，请检查网络连接后重试'
    isLoading.value = false
  }
})

/**
 * 组件卸载时的清理操作
 */
onUnmounted(() => {
  // 清理定时器、事件监听器等
  // 例如：clearInterval、removeEventListener
})
</script>

<style scoped>
/**
 * 组件样式
 * 使用 CSS 自定义属性和现代 CSS 特性
 * 遵循 BEM 命名规范
 */

/* 主容器 */
.device-management-page {
  min-height: 100vh;
  background: linear-gradient(to bottom, #e2e8f0 0%, #f1f5f9 50%, #f8fafc 100%);
  color: #1e293b;
  display: flex;
  flex-direction: column;
  position: relative;
}

/* 噪点纹理覆盖层 */
.noise-overlay {
  position: absolute;
  inset: 0;
  background-image: url('https://grainy-gradients.vercel.app/noise.svg');
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
  z-index: 1;
}

.noise-overlay--visible {
  opacity: 0.02;
}

/* 主要内容区域 */
.main-content {
  flex: 1;
  width: 100%;
  max-width: 28rem;
  /* max-w-md */
  margin: 0 auto;
  padding: 0 1rem 2rem;
  position: relative;
  z-index: 2;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .main-content {
    padding: 0 0.75rem 1.5rem;
  }
}

@media (max-width: 480px) {
  .main-content {
    padding: 0 0.5rem 1rem;
  }
}

/* 加载状态样式 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  color: #475569;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #cbd5e1;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* 错误状态样式 */
.error-state {
  text-align: center;
  padding: 2rem;
}

.error-message {
  color: #dc2626;
  margin-bottom: 1rem;
  font-weight: 500;
}

.retry-button {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  padding: 0.5rem 1rem;
  border-radius: 8px;
  color: #374151;
  cursor: pointer;
  transition: all var(--transition-normal) var(--ease-out);
  font-weight: 500;
}

.retry-button:hover {
  background: rgba(255, 255, 255, 1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

<style>
/**
 * 全局样式
 * 定义设计系统的基础变量和通用样式
 */

/* 导入字体 */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

/* CSS 自定义属性 - 设计令牌 */
:root {
  /* 颜色系统 */
  --color-black: #000000;
  --color-white: #ffffff;
  --color-gray-100: #f3f4f6;
  --color-gray-900: #111827;
  --color-gray-950: #030712;

  /* 应用主题色 - 浅色主题 */
  --app-bg: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 25%, #cbd5e1 50%, #94a3b8 75%, #64748b 100%);
  --text-primary: #1e293b;

  /* 卡片样式 - 增强对比度 */
  --card-bg: rgba(255, 255, 255, 0.95);
  --card-border: rgba(255, 255, 255, 0.8);
  --card-shadow: 0 8px 32px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.05);
  --card-radius: 20px;

  /* 毛玻璃效果 */
  --backdrop-blur: blur(16px);

  /* 动画时长 */
  --transition-fast: 0.15s;
  --transition-normal: 0.3s;
  --transition-slow: 0.5s;

  /* 缓动函数 */
  --ease-out: cubic-bezier(0.25, 0.46, 0.45, 0.94);
  --ease-in-out: cubic-bezier(0.645, 0.045, 0.355, 1);
}

/* 基础样式重置 */
* {
  box-sizing: border-box;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  font-weight: 400;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background: var(--app-bg);
  color: var(--text-primary);
  margin: 0;
  padding: 0;
}

/* iOS 风格卡片组件 */
.ios-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  box-shadow: var(--card-shadow);
  backdrop-filter: var(--backdrop-blur);
  -webkit-backdrop-filter: var(--backdrop-blur);
  border-radius: var(--card-radius);
  transition: all var(--transition-normal) var(--ease-out);
}

.ios-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15), 0 4px 16px rgba(0, 0, 0, 0.1);
}

.ios-card:active {
  transform: scale(0.98);
  transition-duration: var(--transition-fast);
}

/* 过渡动画类 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--transition-normal) var(--ease-in-out);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all var(--transition-normal) var(--ease-in-out);
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateY(10px);
  opacity: 0;
}

.scale-enter-active,
.scale-leave-active {
  transition: all var(--transition-normal) var(--ease-in-out);
}

.scale-enter-from,
.scale-leave-to {
  transform: scale(0.95);
  opacity: 0;
}

/* 辅助工具类 */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* 聚焦样式 */
.focus-visible {
  outline: 2px solid rgba(59, 130, 246, 0.5);
  outline-offset: 2px;
}

/* 禁用状态 */
.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}
</style>