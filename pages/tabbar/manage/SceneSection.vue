<template>
  <section class="my-6">
    <!-- 标题区域 - 紧凑单行布局 -->
    <div class="section-header">
      <SparklesIcon class="section-icon" />
      <h2 class="section-title">常用场景</h2>
      <span class="section-subtitle">点击场景卡片快速启动智能家居场景</span>
    </div>

    <!-- 场景网格 - 响应式布局 -->
    <div class="scene-grid">
      <div v-for="scene in scenes" :key="scene.id" class="scene-card group" :class="{
        'scene-card--active': scene.active,
        'scene-card--loading': loading && activeSceneId === scene.id
      }" @click="handleSceneClick(scene.id)">

        <!-- 背景渐变层 -->
        <div class="scene-card__background" :style="{ background: scene.gradient }"></div>

        <!-- 装饰性光效 -->
        <div class="scene-card__glow" :style="{ background: scene.gradient }"></div>

        <!-- 主要内容 -->
        <div class="scene-card__content">
          <!-- 图标容器 -->
          <div class="scene-card__icon-wrapper">
            <component :is="sceneIcons[scene.id]" class="scene-card__icon" :class="`text-${scene.color}-400`" />
          </div>

          <!-- 文字信息 -->
          <div class="scene-card__text">
            <h3 class="scene-card__title">{{ scene.name }}</h3>
            <p class="scene-card__subtitle">{{ scene.affectedDevices.length }} 个设备</p>
          </div>
        </div>

        <!-- 激活状态指示器 -->
        <div v-if="scene.active" class="scene-card__indicator">
          <div class="scene-card__indicator-dot"></div>
        </div>

        <!-- 加载状态遮罩 -->
        <div v-if="loading && activeSceneId === scene.id" class="scene-card__loading">
          <div class="scene-card__spinner"></div>
        </div>

        <!-- 点击波纹效果 -->
        <div class="scene-card__ripple"></div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { SparklesIcon, sceneIcons } from '../../../components/icons/icons'
import { useDeviceStore } from '../../../stores/devices'

// 获取设备存储
const deviceStore = useDeviceStore()
const { scenes, loading, activateScene } = deviceStore

// 当前正在激活的场景ID
const activeSceneId = ref(null)

// 处理场景点击
const handleSceneClick = async (sceneId) => {
  // 如果正在加载，忽略点击
  if (loading.value) return

  // 添加触感反馈（如果浏览器支持）
  if (window.navigator && window.navigator.vibrate) {
    window.navigator.vibrate(10)
  }

  // 设置当前激活的场景ID
  activeSceneId.value = sceneId

  try {
    // 激活场景
    await activateScene(sceneId)
  } finally {
    // 清除激活状态
    activeSceneId.value = null
  }
}
</script>

<style scoped>
/* ===== 统一标题样式 ===== */
.section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.section-icon {
  width: 1.25rem;
  height: 1.25rem;
  color: #f59e0b;
  flex-shrink: 0;
}

.section-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
  flex-shrink: 0;
}

.section-subtitle {
  font-size: 0.75rem;
  color: #64748b;
  margin-left: auto;
  text-align: right;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 60%;
  flex-shrink: 1;
  min-width: 0;
}

@media (max-width: 400px) {
  .section-subtitle {
    display: none;
    /* 在很小的屏幕上隐藏操作提示以节省空间 */
  }
}

@media (max-width: 480px) {
  .section-header {
    gap: 0.375rem;
  }

  .section-title {
    font-size: 1rem;
  }
}

/* ===== 响应式网格布局 ===== */
.scene-grid {
  display: grid;
  gap: 12px;
  margin-bottom: 1rem;
  grid-template-columns: repeat(4, 1fr);
}

@media (max-width: 768px) {
  .scene-grid {
    gap: 10px;
  }
}

@media (max-width: 480px) {
  .scene-grid {
    gap: 8px;
  }
}

/* ===== 场景卡片基础样式 ===== */
.scene-card {
  position: relative;
  min-height: 110px;
  border-radius: 16px;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06), 0 1px 4px rgba(0, 0, 0, 0.04);
}

/* ===== 背景渐变层 ===== */
.scene-card__background {
  position: absolute;
  inset: 0;
  opacity: 0.4;
  transition: all 0.3s ease;
  z-index: 1;
}

/* ===== 装饰性光效 ===== */
.scene-card__glow {
  position: absolute;
  inset: -2px;
  opacity: 0;
  filter: blur(20px);
  transition: all 0.3s ease;
  z-index: 0;
}

/* ===== 主要内容容器 ===== */
.scene-card__content {
  position: relative;
  z-index: 10;
  height: 100%;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

/* ===== 图标样式 ===== */
.scene-card__icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  margin-bottom: 8px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
}

.scene-card__icon {
  width: 22px;
  height: 22px;
  transition: all 0.3s ease;
}

/* ===== 文字样式 ===== */
.scene-card__text {
  width: 100%;
}

.scene-card__title {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 2px;
  line-height: 1.2;
}

.scene-card__subtitle {
  font-size: 11px;
  color: rgba(0, 0, 0, 0.6);
  line-height: 1.2;
}

/* ===== 激活状态指示器 ===== */
.scene-card__indicator {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 20;
}

.scene-card__indicator-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.3), 0 0 20px rgba(16, 185, 129, 0.5);
  animation: pulse-glow 2s ease-in-out infinite;
}

/* ===== 加载状态遮罩 ===== */
.scene-card__loading {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 20px;
  z-index: 30;
}

.scene-card__spinner {
  width: 24px;
  height: 24px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* ===== 点击波纹效果 ===== */
.scene-card__ripple {
  position: absolute;
  inset: 0;
  border-radius: 20px;
  overflow: hidden;
  z-index: 5;
}

.scene-card__ripple::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  transform: translate(-50%, -50%);
  transition: all 0.6s ease-out;
}

/* ===== 交互状态 ===== */
/* 悬停效果 */
.scene-card:hover {
  transform: translateY(-4px) scale(1.02);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15), 0 4px 16px rgba(0, 0, 0, 0.08);
}

.scene-card:hover .scene-card__background {
  opacity: 0.6;
}

.scene-card:hover .scene-card__glow {
  opacity: 0.3;
}

.scene-card:hover .scene-card__icon-wrapper {
  transform: scale(1.1);
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.scene-card:hover .scene-card__icon {
  transform: scale(1.1);
}

/* 激活状态 */
.scene-card--active {
  transform: translateY(-2px);
  box-shadow: 0 16px 32px rgba(59, 130, 246, 0.2), 0 8px 16px rgba(0, 0, 0, 0.1);
  border: 2px solid rgba(59, 130, 246, 0.3);
}

.scene-card--active .scene-card__background {
  opacity: 0.7;
}

.scene-card--active .scene-card__glow {
  opacity: 0.4;
}

/* 点击效果 */
.scene-card:active {
  transform: translateY(-1px) scale(0.98);
}

.scene-card:active .scene-card__ripple::before {
  width: 300px;
  height: 300px;
  opacity: 0;
}

/* 加载状态 */
.scene-card--loading {
  pointer-events: none;
}

/* ===== 预定义颜色类 ===== */
.text-amber-400 {
  color: rgb(251, 191, 36);
}

.text-blue-400 {
  color: rgb(96, 165, 250);
}

.text-purple-400 {
  color: rgb(192, 132, 252);
}

.text-green-400 {
  color: rgb(74, 222, 128);
}

/* ===== 动画定义 ===== */
@keyframes pulse-glow {

  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }

  50% {
    opacity: 0.7;
    transform: scale(1.1);
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

/* ===== 移动端优化 ===== */
@media (max-width: 480px) {
  .scene-card {
    min-height: 100px;
  }

  .scene-card__content {
    padding: 12px;
  }

  .scene-card__icon-wrapper {
    width: 36px;
    height: 36px;
    margin-bottom: 6px;
  }

  .scene-card__icon {
    width: 18px;
    height: 18px;
  }

  .scene-card__title {
    font-size: 12px;
  }

  .scene-card__subtitle {
    font-size: 10px;
  }
}

/* ===== 触摸设备优化 ===== */
@media (hover: none) and (pointer: coarse) {
  .scene-card:hover {
    transform: none;
    box-shadow: none;
  }

  .scene-card:hover .scene-card__background {
    opacity: 0.4;
  }

  .scene-card:hover .scene-card__glow {
    opacity: 0;
  }

  .scene-card:hover .scene-card__icon-wrapper {
    transform: none;
    background: rgba(255, 255, 255, 0.15);
  }

  .scene-card:hover .scene-card__icon {
    transform: none;
  }
}
</style>