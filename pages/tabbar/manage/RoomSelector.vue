<template>
  <!-- 房间选择器 - 紧凑型移动端设计 -->

  <!-- 标题部分 - 紧凑单行布局 -->
  <div class="section-header">
    <HomeIcon class="section-icon" />
    <h2 class="section-title">房间</h2>
    <span class="section-subtitle">选择房间查看对应设备</span>
  </div>
  <!-- 房间选择网格 - 固定2行布局 -->
  <div class="room-grid">
    <div v-for="room in roomsWithData" :key="room.id" @click="handleRoomSelect(room.id)" class="room-item" :class="{
      'room-item--selected': selectedRoom === room.id,
      'room-item--empty': room.count === 0,
      [`room-item--${room.color}`]: true
    }" :style="{ '--room-color': room.colorHex }">
      <!-- 选中状态背景光晕 -->
      <div v-if="selectedRoom === room.id" class="room-glow"
        :style="{ background: `linear-gradient(135deg, ${room.colorHex}40, ${room.colorHex}20)` }" />

      <!-- 房间卡片主体 -->
      <div class="room-card" :style="selectedRoom !== room.id ? {
        borderColor: `${room.colorHex}35`,
        boxShadow: `inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 1px 3px rgba(0, 0, 0, 0.1), 0 0 0 1px ${room.colorHex}20`
      } : {}">
        <!-- 设备数量徽章 -->
        <div class="device-badge" :class="{
          'device-badge--selected': selectedRoom === room.id,
          'device-badge--empty': room.count === 0
        }" :style="selectedRoom !== room.id && room.count > 0 ? { backgroundColor: room.colorHex } : {}">
          {{ room.count }}
        </div>

        <!-- 房间图标 -->
        <div class="room-icon-wrapper" :class="{ 'room-icon-wrapper--selected': selectedRoom === room.id }"
          :style="selectedRoom !== room.id ? { backgroundColor: `${room.colorHex}20` } : {}">
          <component :is="room.icon" class="room-icon" :class="{ 'room-icon--selected': selectedRoom === room.id }"
            :style="selectedRoom !== room.id ? { color: room.colorHex } : {}" />
        </div>

        <!-- 房间名称 -->
        <span class="room-name" :class="{ 'room-name--selected': selectedRoom === room.id }">
          {{ room.name }}
        </span>

        <!-- 选中指示器 -->
        <div v-if="selectedRoom === room.id" class="selected-indicator" :style="{ backgroundColor: room.colorHex }" />
      </div>

      <!-- 点击反馈效果 -->
      <div class="click-feedback"
        :style="{ background: `linear-gradient(135deg, ${room.colorHex}30, ${room.colorHex}10)` }" />
    </div>
  </div>



</template>

<script setup>
import { ref, computed } from 'vue'
import {
  HomeIcon,
  SofaIcon,
  BedIcon,
  UtensilsIcon,
  ShowerHeadIcon,
  BookIcon
} from '../../../components/icons/icons'
import { rooms, useDeviceStore } from '../../../stores/devices'

// 获取设备数据
const { devices, selectedRoom: storeSelectedRoom } = useDeviceStore()

// 本地选中状态（如果store没有selectedRoom，则使用本地状态）
const localSelectedRoom = ref('all')
const selectedRoom = computed({
  get: () => storeSelectedRoom?.value || localSelectedRoom.value,
  set: (value) => {
    if (storeSelectedRoom) {
      storeSelectedRoom.value = value
    } else {
      localSelectedRoom.value = value
    }
  }
})

// 房间图标映射
const roomIconMap = {
  'all': HomeIcon,
  'living': SofaIcon,
  'bedroom': BedIcon,
  'kitchen': UtensilsIcon,
  'bathroom': ShowerHeadIcon,
  'study': BookIcon
}

// 房间颜色映射 - 增强的主题色配置
const roomColorMap = {
  'all': {
    color: 'gray',
    colorHex: '#9CA3AF',
    bgGradient: 'from-gray-400 to-gray-500'
  },
  'living': {
    color: 'blue',
    colorHex: '#3B82F6',
    bgGradient: 'from-blue-400 to-blue-600'
  },
  'bedroom': {
    color: 'purple',
    colorHex: '#8B5CF6',
    bgGradient: 'from-purple-400 to-purple-600'
  },
  'kitchen': {
    color: 'orange',
    colorHex: '#F97316',
    bgGradient: 'from-orange-400 to-orange-600'
  },
  'bathroom': {
    color: 'cyan',
    colorHex: '#06B6D4',
    bgGradient: 'from-cyan-400 to-cyan-600'
  },
  'study': {
    color: 'green',
    colorHex: '#10B981',
    bgGradient: 'from-green-400 to-green-600'
  }
}

// 计算每个房间的设备数量
const deviceCountByRoom = computed(() => {
  if (!devices?.value) return {}

  const counts = {}
  devices.value.forEach(device => {
    const roomId = device.roomId || 'unknown'
    counts[roomId] = (counts[roomId] || 0) + 1
  })
  return counts
})

// 在线设备数量统计
const onlineDevicesByRoom = computed(() => {
  if (!devices?.value) return {}

  const counts = {}
  devices.value.forEach(device => {
    if (device.online) {
      const roomId = device.roomId || 'unknown'
      counts[roomId] = (counts[roomId] || 0) + 1
    }
  })
  return counts
})

// 带有设备数量的房间数据
const roomsWithData = computed(() => {
  return rooms.map(room => {
    const deviceCount = room.id === 'all'
      ? Object.values(deviceCountByRoom.value).reduce((sum, count) => sum + count, 0)
      : deviceCountByRoom.value[room.id] || 0

    const colorConfig = roomColorMap[room.id] || roomColorMap['all']

    return {
      ...room,
      count: deviceCount,
      onlineCount: room.id === 'all'
        ? Object.values(onlineDevicesByRoom.value).reduce((sum, count) => sum + count, 0)
        : onlineDevicesByRoom.value[room.id] || 0,
      icon: roomIconMap[room.id] || HomeIcon,
      ...colorConfig
    }
  })
})

// 计算属性
const currentRoomName = computed(() => {
  const room = roomsWithData.value.find(r => r.id === selectedRoom.value)
  return room ? room.name : '未知'
})

const totalDevices = computed(() => {
  return Object.values(deviceCountByRoom.value).reduce((sum, count) => sum + count, 0)
})

const onlineDevices = computed(() => {
  return Object.values(onlineDevicesByRoom.value).reduce((sum, count) => sum + count, 0)
})

// 方法
const handleRoomSelect = (roomId) => {
  selectedRoom.value = roomId

  // 添加触觉反馈
  if (window.navigator && window.navigator.vibrate) {
    window.navigator.vibrate(10)
  }

  // 触发自定义事件
  emit('room-changed', roomId)
}

// 定义事件
const emit = defineEmits(['room-changed'])

// 暴露给父组件
defineExpose({
  selectedRoom,
  handleRoomSelect,
  roomsWithData
})
</script>

<style lang="scss" scoped>
/**
 * 房间选择器样式 - 紧凑型移动端设计
 * 特点：限制高度、固定网格、增强视觉反馈
 */

/* 主容器 */
.room-selector-container {
  width: 100%;
  max-width: 28rem;
  /* 与主页面保持一致 */
  margin: 0 auto;
  padding: 1rem;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--card-radius);
  backdrop-filter: var(--backdrop-blur);
  -webkit-backdrop-filter: var(--backdrop-blur);
  box-shadow: var(--card-shadow);
  margin-bottom: 1.5rem;
}

/* 紧凑单行标题样式 */
.section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
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

.device-summary {
  font-size: 0.75rem;
  color: #9CA3AF;
  background: rgba(255, 255, 255, 0.05);
  padding: 0.25rem 0.5rem;
  border-radius: 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* 房间网格 - 固定2行布局 */
.room-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
  margin-bottom: 1rem;
  background: var(--card-bg);
  /* 确保最多显示2行 */
  max-height: 10rem;
  overflow: hidden;
}

/* 房间项目 */
.room-item {
  position: relative;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 0.75rem;

  /* 触摸反馈优化 */
  -webkit-tap-highlight-color: transparent;
  user-select: none;

  &:active {
    transform: scale(0.95);
    transition-duration: 0.1s;
  }

  &.room-item--empty {
    opacity: 0.6;
  }

  &.room-item--selected {
    transform: scale(1.02);
    z-index: 2;
  }
}

/* 选中状态光晕 */
.room-glow {
  position: absolute;
  inset: -2px;
  border-radius: 0.875rem;
  opacity: 0.6;
  animation: pulse-glow 2s ease-in-out infinite;
  pointer-events: none;
}

/* 房间卡片主体 */
.room-card {
  position: relative;
  height: 4.5rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 0.75rem;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);

  /* 添加微妙的内阴影增强边界定义 */
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.1),
    0 1px 3px rgba(0, 0, 0, 0.1);

  .room-item--selected & {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.35);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.2),
      0 8px 32px rgba(0, 0, 0, 0.3),
      0 2px 8px rgba(0, 0, 0, 0.15);
  }

  .room-item:not(.room-item--selected):hover & {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.22);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.12),
      0 2px 8px rgba(0, 0, 0, 0.12),
      0 1px 3px rgba(0, 0, 0, 0.08);
  }
}

/* 设备数量徽章 */
.device-badge {
  position: absolute;
  top: -0.375rem;
  right: -0.375rem;
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.625rem;
  font-weight: 700;
  color: white;
  background: #6B7280;
  border: 2px solid rgba(17, 24, 39, 0.8);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 1;

  &.device-badge--selected {
    background: white !important;
    color: #111827 !important;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transform: scale(1.1);
  }

  &.device-badge--empty {
    background: #4B5563 !important;
    opacity: 0.7;
  }
}

/* 房间图标容器 */
.room-icon-wrapper {
  margin-bottom: 0.25rem;
  padding: 0.5rem;
  border-radius: 0.5rem;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);

  &.room-icon-wrapper--selected {
    background: rgba(59, 130, 246, 0.15) !important;
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
  }
}

/* 房间图标 */
.room-icon {
  width: 1.25rem;
  height: 1.25rem;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);

  &.room-icon--selected {
    color: #1e293b !important;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
  }
}

/* 房间名称 */
.room-name {
  font-size: 0.625rem;
  font-weight: 500;
  color: #6B7280;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  text-align: center;
  line-height: 1.2;

  &.room-name--selected {
    color: #1e293b;
    font-weight: 600;
  }
}

/* 选中指示器 */
.selected-indicator {
  position: absolute;
  bottom: 0.25rem;
  left: 50%;
  transform: translateX(-50%);
  width: 1rem;
  height: 0.125rem;
  border-radius: 0.0625rem;
  opacity: 0.9;
}

/* 点击反馈效果 */
.click-feedback {
  position: absolute;
  inset: 0;
  border-radius: 0.75rem;
  opacity: 0;
  transition: opacity 0.15s ease;
  pointer-events: none;
}

.room-item:active .click-feedback {
  opacity: 0.3;
}

/* 状态信息 */
.status-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 0.75rem;
}

.current-room {
  color: white;
  font-weight: 500;
}

.online-count {
  color: #9CA3AF;
  background: rgba(255, 255, 255, 0.05);
  padding: 0.125rem 0.375rem;
  border-radius: 0.375rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* 动画定义 */
@keyframes pulse-glow {

  0%,
  100% {
    opacity: 0.4;
    transform: scale(1);
  }

  50% {
    opacity: 0.8;
    transform: scale(1.02);
  }
}

/* 响应式优化 */
@media (max-width: 640px) {
  .room-selector-container {
    padding: 0.75rem;
    margin-bottom: 1rem;
  }

  .room-grid {
    gap: 0.5rem;
    max-height: 9rem;
  }

  .room-card {
    height: 4rem;
    padding: 0.5rem;
  }

  .room-icon {
    width: 1rem;
    height: 1rem;
  }

  .room-icon-wrapper {
    padding: 0.375rem;
    margin-bottom: 0.125rem;
  }

  .room-name {
    font-size: 0.5rem;
  }

  .device-badge {
    width: 1rem;
    height: 1rem;
    font-size: 0.5rem;
    top: -0.25rem;
    right: -0.25rem;
  }

  .section-title {
    font-size: 1rem;
  }

  .device-summary {
    font-size: 0.625rem;
    padding: 0.125rem 0.375rem;
  }
}

/* 超小屏幕优化 */
@media (max-width: 480px) {
  .room-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 0.375rem;
    max-height: 8rem;
  }

  .room-card {
    height: 3.5rem;
  }

  .section-header {
    margin-bottom: 0.75rem;
    padding-bottom: 0.5rem;
  }
}

/* 无障碍支持 */
.room-item:focus {
  outline: none;

  &:not(:focus-visible) {
    box-shadow: none;
  }

  &:focus-visible {
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
    border-radius: 0.75rem;
  }
}

/* 触摸设备优化 */
@media (hover: none) and (pointer: coarse) {
  .room-item:hover .room-card {
    background: rgba(255, 255, 255, 0.05) !important;
    border-color: rgba(255, 255, 255, 0.1) !important;
  }
}
</style>
