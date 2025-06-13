<template>
  <section class="my-6">
    <h2 class="text-lg font-medium mb-3 flex items-center">
      <SparklesIcon class="h-5 w-5 mr-2 text-amber-400" />
      常用场景
    </h2>
    <div class="grid grid-cols-2 gap-4">
      <div v-for="scene in scenes" :key="scene.id"
        class="ios-card p-5 flex flex-col items-center justify-center cursor-pointer relative overflow-hidden group"
        :class="{ 'border-2 border-white/20 shadow-lg shadow-white/10': scene.active }"
        @click="handleSceneClick(scene.id)">
        <!-- 背景渐变 -->
        <div class="absolute inset-0 opacity-40 transition-opacity group-hover:opacity-60"
          :style="{ background: scene.gradient }"></div>

        <!-- 内容 -->
        <div class="relative z-10 flex flex-col items-center">
          <div class="p-3 rounded-full bg-white/10 backdrop-blur-md mb-3 transition-transform group-hover:scale-110">
            <component :is="sceneIcons[scene.id]" class="h-7 w-7" :class="`text-${scene.color}-400`" />
          </div>
          <p class="font-medium text-lg text-center">{{ scene.name }}</p>
          <p class="text-xs text-gray-300 mt-1">{{ scene.affectedDevices.length }} 个设备</p>
        </div>

        <!-- 激活指示器 -->
        <div v-if="scene.active"
          class="absolute top-3 right-3 h-3 w-3 rounded-full bg-green-400 shadow-lg shadow-green-400/50 animate-pulse">
        </div>

        <!-- 加载指示器 -->
        <div v-if="loading && activeSceneId === scene.id"
          class="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center rounded-[20px]">
          <div class="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-white"></div>
        </div>
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
.ios-card {
  min-height: 140px;
  position: relative;
}

/* 预定义动态类名 */
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

/* 场景卡片悬停效果 */
.ios-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
}

/* 场景卡片激活状态 */
.ios-card.border-2 {
  transform: translateY(-2px);
}

/* 点击波纹效果 */
.ios-card:active::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  transform: translate(-50%, -50%) scale(0);
  animation: ripple 0.6s ease-out;
}

@keyframes ripple {
  to {
    transform: translate(-50%, -50%) scale(2);
    opacity: 0;
  }
}

/* 脉冲动画优化 */
@keyframes pulse {

  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.5;
  }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>