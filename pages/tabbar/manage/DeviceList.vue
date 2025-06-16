<template>
  <section class="device-list-section">
    <!-- 标题部分 - 紧凑单行布局 -->
    <div class="section-header">
      <DevicesIcon class="section-icon" />
      <h2 class="section-title">{{ roomTitle }}</h2>
      <span class="section-subtitle">{{ deviceCountText }}</span>
    </div>

    <!-- 设备网格 -->
    <div class="device-grid">
      <div v-for="device in filteredDevices" :key="`${device.id}-${device.active}-${device.lastUpdated}`" class="device-card-container">
        <!-- 主设备卡片 -->
        <div class="device-card" :class="[
          `device-card--${device.type}`,
          {
            'device-card--active': device.active,
            'device-card--offline': !device.online
          }
        ]" :style="getDeviceCardStyle(device)">
          <!-- 在线状态指示器 -->
          <div class="online-status-indicator">
            <component :is="device.online ? WifiIcon : WifiOffIcon" class="online-status-icon"
              :class="device.online ? 'online-status-icon--online' : 'online-status-icon--offline'" />
          </div>

          <!-- 设备图标和开关 -->
          <div class="device-header">
            <button class="device-power-btn" :class="{
              'device-power-btn--active': device.active,
              'device-power-btn--disabled': !device.online
            }" @click="device.online && handleToggleDevice(device.id)" :disabled="!device.online">
              <component :is="device.icon" class="device-power-icon"
                :class="{ 'device-power-icon--active': device.active }" />
            </button>

            <button class="device-settings-btn" @click="toggleExpand(device.id)">
              <component :is="SettingsIcon" class="device-settings-icon" />
            </button>
          </div>

          <!-- 设备信息 -->
          <div class="device-info">
            <h3 class="device-name">{{ device.name }}</h3>
            <p class="device-room">{{ device.room }}</p>

            <!-- 设备状态栏 -->
            <div v-if="device.active && device.online" class="device-status-display">
              <template v-if="device.type === 'light'">
                <div class="status-item">
                  <component :is="SunIcon" class="status-icon" />
                  <span>{{ Math.round((device.brightnessLevel / 3) * 100) }}%</span>
                </div>
                <div v-if="device.name.includes('氛围灯')" class="color-indicator-small"
                  :style="{ backgroundColor: device.colorHex }"></div>
              </template>

              <template v-if="device.type === 'ac'">
                <div class="status-item">
                  <component :is="ThermometerIcon" class="status-icon" />
                  <span>{{ device.temperature }}°C</span>
                </div>
                <span class="status-mode">{{ device.mode }}</span>
              </template>

              <template
                v-if="['tv', 'fan', 'speaker', 'fridge', 'washer', 'robot', 'humidifier'].includes(device.type)">
                <span class="status-text">{{ getDeviceStatusText(device) }}</span>
              </template>
            </div>

            <!-- 离线状态 -->
            <div v-if="!device.online" class="device-offline-status">
              设备离线
            </div>
          </div>

          <!-- 活动指示器 -->
          <div v-if="device.active" class="device-activity-bar" :style="getActivityBarStyle(device)"></div>
        </div>

        <!-- 展开的控制面板 -->
        <div v-if="expandedId === device.id" class="device-control-panel-expanded">
          <div class="control-panel-header">
            <h4 class="control-panel-title">{{ device.name }} 控制</h4>
            <button class="control-panel-close" @click="toggleExpand(null)">
              ✕
            </button>
          </div>

          <!-- 灯光设备控制 -->
          <template v-if="device.type === 'light'">
            <div class="control-group">
              <label class="control-label">亮度控制</label>
              <!-- 自定义滑动条组件 -->
              <div class="brightness-slider-container">
                <div class="brightness-slider" @touchstart="handleSliderTouchStart" @touchmove="handleSliderTouchMove"
                  @touchend="handleSliderTouchEnd" @mousedown="handleSliderMouseDown" @mousemove="handleSliderMouseMove"
                  @mouseup="handleSliderMouseEnd" :class="{ 'brightness-slider--disabled': loading || !device.online }">
                  <div class="brightness-track" :style="getBrightnessTrackStyle(device)">
                    <div class="brightness-fill" :style="getBrightnessFillStyle(device)"></div>
                    <div class="brightness-thumb" :style="getBrightnessThumbStyle(device)" :data-device-id="device.id">
                    </div>
                  </div>
                </div>
                <div class="brightness-labels">
                  <span class="brightness-label">低</span>
                  <span class="brightness-label">中</span>
                  <span class="brightness-label">高</span>
                </div>
                <div class="brightness-value">{{ Math.round((device.brightnessLevel / 3) * 100) }}%</div>
              </div>
            </div>

            <div v-if="device.name.includes('氛围灯')" class="control-group">
              <label class="control-label">颜色主题</label>
              <div class="color-palette">
                <div v-for="color in ['#fbbf24', '#ef4444', '#22c55e', '#3b82f6', '#a78bfa', '#ec4899']" :key="color"
                  class="color-option" :class="{ 'color-option--active': device.colorHex === color }"
                  :style="{ backgroundColor: color }" @click="handleColorChange(device.id, color)"></div>
              </div>
            </div>
          </template>

          <!-- 空调设备控制 -->
          <template v-if="device.type === 'ac'">
            <div class="control-group">
              <label class="control-label">温度调节</label>
              <div class="temperature-controls">
                <button class="temp-btn temp-btn--decrease"
                  @click="handleTempChange(device.id, Math.max(16, device.temperature - 1))"
                  :disabled="loading || device.temperature <= 16 || !device.online">
                  -
                </button>
                <span class="temp-display">{{ device.temperature }}°C</span>
                <button class="temp-btn temp-btn--increase"
                  @click="handleTempChange(device.id, Math.min(30, device.temperature + 1))"
                  :disabled="loading || device.temperature >= 30 || !device.online">
                  +
                </button>
              </div>
            </div>

            <div class="control-group">
              <label class="control-label">运行模式</label>
              <div class="mode-buttons">
                <button v-for="mode in ['制冷', '制热', '送风', '除湿']" :key="mode" class="mode-btn"
                  :class="{ 'mode-btn--active': device.mode === mode }" @click="handleModeChange(device.id, mode)"
                  :disabled="loading || !device.online">
                  {{ mode }}
                </button>
              </div>
            </div>
          </template>

          <!-- 风扇设备控制 -->
          <template v-if="device.type === 'fan'">
            <div class="control-group">
              <label class="control-label">风速控制</label>
              <div class="fan-speed-container">
                <div class="fan-speed-buttons">
                  <button v-for="speed in [1, 2, 3]" :key="speed" class="speed-btn"
                    :class="{ 'speed-btn--active': device.speed === speed }"
                    @click="handleSpeedChange(device.id, speed)" :disabled="loading || !device.online">
                    {{ speed }}档
                  </button>
                </div>
                <div class="fan-swing-control">
                  <label class="swing-label">摆风</label>
                  <button class="swing-btn" :class="{ 'swing-btn--active': device.swing === '开启' }"
                    @click="handleSwingToggle(device.id)" :disabled="loading || !device.online">
                    {{ device.swing === '开启' ? '开启' : '关闭' }}
                  </button>
                </div>
              </div>
            </div>
          </template>

          <!-- 音响/电视音量控制 -->
          <template v-if="['tv', 'speaker'].includes(device.type)">
            <div class="control-group">
              <label class="control-label">音量控制</label>
              <div class="volume-slider-container">
                <div class="volume-controls">
                  <button class="volume-btn volume-btn--decrease"
                    @click="handleVolumeChange(device.id, Math.max(0, device.volume - 5))"
                    :disabled="loading || device.volume <= 0 || !device.online">
                    🔉
                  </button>
                  <div class="volume-display">{{ device.volume }}%</div>
                  <button class="volume-btn volume-btn--increase"
                    @click="handleVolumeChange(device.id, Math.min(100, device.volume + 5))"
                    :disabled="loading || device.volume >= 100 || !device.online">
                    🔊
                  </button>
                </div>
              </div>
            </div>
          </template>

          <div class="control-panel-footer">
            <p class="last-updated-text">
              最后更新: {{ formatLastUpdated(device.lastUpdated) }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- 无设备提示 -->
    <div v-if="filteredDevices.length === 0" class="empty-state">
      <div class="empty-state-icon">
        <DevicesIcon />
      </div>
      <h3 class="empty-state-title">{{ emptyStateMessage }}</h3>
      <p class="empty-state-subtitle">请尝试选择其他房间查看设备</p>
    </div>
  </section>
</template>

<script setup>
/**
 * 设备列表组件
 * 智能家居设备的展示和控制界面
 * 支持设备状态查看、一键开关、详细控制等功能
 */

import { ref, computed, nextTick } from 'vue'
import {
  DevicesIcon,
  WifiIcon,
  WifiOffIcon,
  SettingsIcon,
  SunIcon,
  ThermometerIcon
} from '../../../components/icons/icons'
import { rooms, useDeviceStore } from '../../../stores/devices'

// 设备存储和状态管理
const {
  filteredDevices,
  selectedRoom,
  loading,
  toggleDevice,
  updateDeviceProperty
} = useDeviceStore()

// 组件状态
const expandedId = ref(null)
const isDragging = ref(false)
const dragDeviceId = ref(null)

// 颜色预设（用于氛围灯）
const colorPresets = [
  { name: '暖白', hex: '#FFF8DC' },
  { name: '冷白', hex: '#F0F8FF' },
  { name: '红色', hex: '#FF6B6B' },
  { name: '蓝色', hex: '#4ECDC4' },
  { name: '绿色', hex: '#45B7D1' },
  { name: '紫色', hex: '#96CEB4' },
  { name: '橙色', hex: '#FFEAA7' },
  { name: '粉色', hex: '#FD79A8' }
]

// 设备类型颜色映射
const deviceColorMap = {
  light: { primary: '#FBBF24', secondary: '#F59E0B', gradient: 'from-amber-400 to-amber-600' },
  ac: { primary: '#3B82F6', secondary: '#2563EB', gradient: 'from-blue-400 to-blue-600' },
  tv: { primary: '#8B5CF6', secondary: '#7C3AED', gradient: 'from-purple-400 to-purple-600' },
  fan: { primary: '#06B6D4', secondary: '#0891B2', gradient: 'from-cyan-400 to-cyan-600' },
  speaker: { primary: '#EC4899', secondary: '#DB2777', gradient: 'from-pink-400 to-pink-600' },
  fridge: { primary: '#10B981', secondary: '#059669', gradient: 'from-emerald-400 to-emerald-600' },
  washer: { primary: '#6366F1', secondary: '#4F46E5', gradient: 'from-indigo-400 to-indigo-600' },
  robot: { primary: '#3B82F6', secondary: '#2563EB', gradient: 'from-blue-400 to-blue-600' },
  humidifier: { primary: '#06B6D4', secondary: '#0891B2', gradient: 'from-cyan-400 to-cyan-600' }
}

// 展开/收起控制面板
const toggleExpand = (id) => {
  expandedId.value = expandedId.value === id ? null : id
}

// 获取设备卡片样式
const getDeviceCardStyle = (device) => {
  const colors = deviceColorMap[device.type] || deviceColorMap.light
  const baseStyle = {
    transition: 'all 0.3s ease'
  }

  if (device.active) {
    return {
      ...baseStyle,
      background: `linear-gradient(135deg,
        rgba(255,255,255,0.95) 0%,
        rgba(255,255,255,0.85) 50%,
        ${colors.primary}15 100%)`,
      boxShadow: `0 8px 32px ${colors.primary}25, 0 4px 16px rgba(0,0,0,0.1)`,
      borderColor: `${colors.primary}30`
    }
  }

  return {
    ...baseStyle,
    background: `linear-gradient(135deg,
      rgba(255,255,255,0.9) 0%,
      rgba(255,255,255,0.8) 100%)`,
    opacity: device.online ? 1 : 0.6,
    boxShadow: '0 4px 16px rgba(0,0,0,0.08)'
  }
}

// 获取活动指示器样式
const getActivityBarStyle = (device) => {
  const colors = deviceColorMap[device.type] || deviceColorMap.light
  let width = '0%'

  if (device.active && device.online) {
    switch (device.type) {
      case 'light':
        width = `${(device.brightnessLevel / 3) * 100}%`
        break
      case 'ac':
        width = `${((device.temperature - 16) / (30 - 16)) * 100}%`
        break
      case 'robot':
        width = `${device.battery}%`
        break
      case 'humidifier':
        width = `${((device.humidity - 30) / (70 - 30)) * 100}%`
        break
      default:
        width = device.active ? '100%' : '0%'
    }
  }

  return {
    width,
    background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})`
  }
}

// 动态标题
const roomTitle = computed(() => {
  if (selectedRoom.value === 'all') {
    return '所有设备'
  }
  const room = rooms.find(r => r.id === selectedRoom.value)
  return room ? `${room.name}设备` : '所有设备'
})

// 空状态消息
const emptyStateMessage = computed(() => {
  if (selectedRoom.value === 'all') {
    return '没有找到任何设备'
  }
  const room = rooms.find(r => r.id === selectedRoom.value)
  return room ? `${room.name}没有设备` : '没有找到设备'
})

// 设备数量统计文本
const deviceCountText = computed(() => {
  const total = filteredDevices.value.length
  const online = filteredDevices.value.filter(d => d.online).length
  return `共${total}个设备，${online}个在线`
})



// 获取设备状态文本
const getDeviceStatusText = (device) => {
  switch (device.type) {
    case 'tv':
      return device.volume ? `音量 ${device.volume}` : '待机'
    case 'fan':
      return device.speed ? `${device.speed}档` : '关闭'
    case 'speaker':
      return device.volume ? `音量 ${device.volume}` : '静音'
    case 'fridge':
      return device.ecoMode ? '节能模式' : '正常运行'
    case 'washer':
      return device.duration ? `剩余 ${device.duration}分钟` : '待机'
    default:
      return device.active ? '运行中' : '待机'
  }
}

// 格式化最后更新时间
const formatLastUpdated = (date) => {
  const now = new Date()
  const diff = now - new Date(date)
  const minutes = Math.floor(diff / 60000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (minutes < 1440) return `${Math.floor(minutes / 60)}小时前`
  return `${Math.floor(minutes / 1440)}天前`
}



// 处理设备开关切换（带触觉反馈）
const handleToggleDevice = async (deviceId) => {
  if (loading.value) return

  // 触觉反馈
  if (window.navigator && window.navigator.vibrate) {
    window.navigator.vibrate(50)
  }

  try {
    await toggleDevice(deviceId)

    // 强制触发下一次DOM更新，确保界面立即响应
    await nextTick()

    console.log(`[界面更新] 设备 ${deviceId} 状态切换完成，界面已更新`)
  } catch (error) {
    console.error('设备开关切换失败:', error)
  }
}

// 处理设备属性更新
const handleUpdateProperty = async (deviceId, property, value) => {
  if (loading.value) return

  try {
    await updateDeviceProperty(deviceId, property, value)

    // 强制触发下一次DOM更新，确保界面立即响应
    await nextTick()

    console.log(`[界面更新] 设备 ${deviceId} 属性 ${property} 更新完成，界面已更新`)
  } catch (error) {
    console.error('设备属性更新失败:', error)
  }
}

// 获取亮度滑动条轨道样式
const getBrightnessTrackStyle = (device) => {
  const colors = deviceColorMap[device.type] || deviceColorMap.light
  return {
    background: `linear-gradient(90deg, rgba(255,255,255,0.2) 0%, ${colors.primary}40 100%)`,
    borderRadius: '1rem'
  }
}

// 获取亮度滑动条填充样式
const getBrightnessFillStyle = (device) => {
  const colors = deviceColorMap[device.type] || deviceColorMap.light
  const percentage = (device.brightnessLevel / 3) * 100
  return {
    width: `${percentage}%`,
    background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})`,
    borderRadius: '1rem',
    transition: 'width 0.3s ease'
  }
}

// 获取亮度滑动条拇指样式
const getBrightnessThumbStyle = (device) => {
  const percentage = (device.brightnessLevel / 3) * 100
  return {
    left: `calc(${percentage}% - 0.75rem)`,
    transition: isDragging.value ? 'none' : 'left 0.3s ease'
  }
}

// 处理颜色变化（带动画效果）
const handleColorChange = async (deviceId, color) => {
  if (loading.value) return

  // 触觉反馈
  if (window.navigator && window.navigator.vibrate) {
    window.navigator.vibrate(30)
  }

  try {
    await updateDeviceProperty(deviceId, 'colorHex', color)
  } catch (error) {
    console.error('颜色更新失败:', error)
  }
}

// 滑动条触摸事件处理
const handleSliderTouchStart = (event) => {
  if (loading.value) return
  event.preventDefault()
  isDragging.value = true
  const deviceId = event.target.closest('.brightness-slider').querySelector('.brightness-thumb').dataset.deviceId
  dragDeviceId.value = parseInt(deviceId)

  // 触觉反馈
  if (window.navigator && window.navigator.vibrate) {
    window.navigator.vibrate(50)
  }
}

const handleSliderTouchMove = (event) => {
  if (!isDragging.value || loading.value) return
  event.preventDefault()
  updateSliderValue(event.touches[0])
}

const handleSliderTouchEnd = (event) => {
  if (!isDragging.value) return
  event.preventDefault()
  isDragging.value = false
  dragDeviceId.value = null
}

// 滑动条鼠标事件处理
const handleSliderMouseDown = (event) => {
  if (loading.value) return
  isDragging.value = true
  const deviceId = event.target.closest('.brightness-slider').querySelector('.brightness-thumb').dataset.deviceId
  dragDeviceId.value = parseInt(deviceId)
}

const handleSliderMouseMove = (event) => {
  if (!isDragging.value || loading.value) return
  updateSliderValue(event)
}

const handleSliderMouseEnd = () => {
  isDragging.value = false
  dragDeviceId.value = null
}

// 更新滑动条数值
const updateSliderValue = (clientEvent) => {
  if (!dragDeviceId.value) return

  const slider = document.querySelector(`[data-device-id="${dragDeviceId.value}"]`).closest('.brightness-slider')
  const rect = slider.getBoundingClientRect()
  const x = clientEvent.clientX - rect.left
  const percentage = Math.max(0, Math.min(1, x / rect.width))
  const newLevel = Math.max(1, Math.min(3, Math.round(percentage * 3) || 1))

  handleUpdateProperty(dragDeviceId.value, 'brightnessLevel', newLevel)
}

// 处理温度变化（带触觉反馈）
const handleTempChange = async (deviceId, temperature) => {
  if (loading.value) return

  // 触觉反馈
  if (window.navigator && window.navigator.vibrate) {
    window.navigator.vibrate(30)
  }

  try {
    await updateDeviceProperty(deviceId, 'temperature', temperature)
  } catch (error) {
    console.error('温度更新失败:', error)
  }
}

// 处理模式变化（带触觉反馈）
const handleModeChange = async (deviceId, mode) => {
  if (loading.value) return

  // 触觉反馈
  if (window.navigator && window.navigator.vibrate) {
    window.navigator.vibrate(40)
  }

  try {
    await updateDeviceProperty(deviceId, 'mode', mode)
  } catch (error) {
    console.error('模式更新失败:', error)
  }
}

// 处理风扇速度变化
const handleSpeedChange = async (deviceId, speed) => {
  if (loading.value) return

  // 触觉反馈
  if (window.navigator && window.navigator.vibrate) {
    window.navigator.vibrate(35)
  }

  try {
    await updateDeviceProperty(deviceId, 'speed', speed)
  } catch (error) {
    console.error('风速更新失败:', error)
  }
}

// 处理摆风切换
const handleSwingToggle = async (deviceId) => {
  if (loading.value) return

  const device = filteredDevices.value.find(d => d.id === deviceId)
  const newSwing = device.swing === '开启' ? '关闭' : '开启'

  // 触觉反馈
  if (window.navigator && window.navigator.vibrate) {
    window.navigator.vibrate(45)
  }

  try {
    await updateDeviceProperty(deviceId, 'swing', newSwing)
  } catch (error) {
    console.error('摆风设置更新失败:', error)
  }
}

// 处理音量变化
const handleVolumeChange = async (deviceId, volume) => {
  if (loading.value) return

  // 触觉反馈
  if (window.navigator && window.navigator.vibrate) {
    window.navigator.vibrate(25)
  }

  try {
    await updateDeviceProperty(deviceId, 'volume', volume)
  } catch (error) {
    console.error('音量更新失败:', error)
  }
}
</script>

<style scoped>
/**
 * 设备列表组件样式
 * 采用现代化移动端设计，支持深色主题和触摸交互
 */

/* ===== 主容器样式 ===== */
.device-list-section {
  margin: 1.5rem 0;
}

/* ===== 紧凑单行标题样式 ===== */
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

/* ===== 设备网格布局 ===== */
.device-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}

.device-card-container {
  position: relative;
}

/* ===== 设备卡片基础样式 ===== */
.device-card {
  position: relative;
  min-height: 160px;
  background: linear-gradient(135deg,
      rgba(255, 255, 255, 0.95) 0%,
      rgba(255, 255, 255, 0.9) 50%,
      rgba(248, 250, 252, 0.95) 100%);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 1rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04);
  backdrop-filter: blur(20px);
  overflow: hidden;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  padding: 1rem;
}

/* 设备卡片状态变体 */
.device-card--active {
  background: rgba(255, 255, 255, 0.95);
  border-color: rgba(59, 130, 246, 0.3);
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.1), 0 2px 8px rgba(0, 0, 0, 0.08);
}

.device-card--offline {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 悬停效果 */
.device-card:hover:not(.device-card--offline) {
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 4px 16px rgba(0, 0, 0, 0.08);
  border-color: rgba(0, 0, 0, 0.12);
}

.device-card:active:not(.device-card--offline) {
  transform: scale(0.98);
  transition-duration: 0.1s;
}

/* ===== 在线状态指示器 ===== */
.online-status-indicator {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
}

.online-status-icon {
  width: 0.75rem;
  height: 0.75rem;
  transition: color 0.3s ease;
}

.online-status-icon--online {
  color: #22c55e;
}

.online-status-icon--offline {
  color: #ef4444;
}

/* ===== 设备头部样式 ===== */
.device-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.device-power-btn {
  padding: 0.75rem;
  border-radius: 0.75rem;
  border: none;
  background: rgba(0, 0, 0, 0.08);
  backdrop-filter: blur(8px);
  cursor: pointer;
  transition: all 0.3s ease;
}

.device-power-btn--active {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.3);
}

.device-power-btn--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.device-power-btn:hover:not(.device-power-btn--disabled) {
  background: rgba(0, 0, 0, 0.12);
  transform: scale(1.05);
}

.device-power-btn--active:hover {
  background: linear-gradient(135deg, #2563eb, #7c3aed);
}

.device-power-icon {
  width: 1.5rem;
  height: 1.5rem;
  color: rgba(0, 0, 0, 0.6);
  transition: color 0.3s ease;
}

.device-power-icon--active {
  color: white;
}

.device-settings-btn {
  padding: 0.5rem;
  border-radius: 0.5rem;
  border: none;
  background: rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition: all 0.3s ease;
}

.device-settings-btn:hover {
  background: rgba(0, 0, 0, 0.1);
}

.device-settings-icon {
  width: 1rem;
  height: 1rem;
  color: rgba(0, 0, 0, 0.6);
}

/* ===== 设备信息区域 ===== */
.device-info {
  flex: 1;
}

.device-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 0.25rem 0;
  line-height: 1.2;
}

.device-room {
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.6);
  margin: 0 0 0.5rem 0;
}

/* ===== 设备状态显示 ===== */
.device-status-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.status-icon {
  width: 0.75rem;
  height: 0.75rem;
  color: rgba(0, 0, 0, 0.7);
}

.status-mode {
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.6);
}

.status-text {
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.7);
}

.color-indicator-small {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.2);
}

.device-offline-status {
  font-size: 0.75rem;
  color: #ef4444;
  margin-top: 0.5rem;
}

/* ===== 活动指示器 ===== */
.device-activity-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 0.25rem;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
  transition: width 0.3s ease;
  border-radius: 0 0 1rem 1rem;
}

/* ===== 展开控制面板 ===== */
.device-control-panel-expanded {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 0.5rem;
  background: linear-gradient(135deg,
      rgba(255, 255, 255, 0.95) 0%,
      rgba(255, 255, 255, 0.9) 50%,
      rgba(248, 250, 252, 0.95) 100%);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 1rem;
  padding: 1rem;
  z-index: 10;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15), 0 4px 16px rgba(0, 0, 0, 0.1);
}

.control-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.control-panel-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.control-panel-close {
  background: none;
  border: none;
  color: rgba(30, 41, 59, 0.6);
  cursor: pointer;
  font-size: 1rem;
  padding: 0.25rem;
  border-radius: 0.25rem;
  transition: color 0.3s ease;
}

.control-panel-close:hover {
  color: #1e293b;
  background: rgba(0, 0, 0, 0.05);
}

.control-group {
  margin-bottom: 1rem;
}

.control-group:last-child {
  margin-bottom: 0;
}

.control-label {
  display: block;
  font-size: 0.75rem;
  color: rgba(30, 41, 59, 0.8);
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.control-slider {
  width: 100%;
  height: 0.5rem;
  border-radius: 0.25rem;
  background: rgba(0, 0, 0, 0.1);
  outline: none;
  cursor: pointer;
  accent-color: #3b82f6;
}

/* ===== 自定义亮度滑动条样式 ===== */
.brightness-slider-container {
  margin: 0.75rem 0;
}

.brightness-slider {
  position: relative;
  width: 100%;
  height: 3rem;
  padding: 1rem 0;
  cursor: pointer;
  user-select: none;
}

.brightness-slider--disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.brightness-track {
  position: relative;
  width: 100%;
  height: 0.5rem;
  border-radius: 1rem;
  overflow: hidden;
}

.brightness-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  border-radius: 1rem;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

.brightness-thumb {
  position: absolute;
  top: 50%;
  width: 1.5rem;
  height: 1.5rem;
  background: white;
  border: 2px solid #3b82f6;
  border-radius: 50%;
  transform: translateY(-50%);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1);
  cursor: grab;
  z-index: 2;
}

.brightness-thumb:active {
  cursor: grabbing;
  transform: translateY(-50%) scale(1.1);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2), 0 3px 6px rgba(0, 0, 0, 0.15);
}

.brightness-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 0.5rem;
  padding: 0 0.75rem;
}

.brightness-label {
  font-size: 0.625rem;
  color: rgba(30, 41, 59, 0.6);
  font-weight: 500;
}

.brightness-value {
  text-align: center;
  margin-top: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #3b82f6;
}

.color-palette {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.color-option {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  border: 2px solid rgba(0, 0, 0, 0.2);
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.color-option--active {
  border-color: #3b82f6;
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3), 0 2px 8px rgba(0, 0, 0, 0.1);
}

.color-option:hover {
  transform: scale(1.05);
  border-color: rgba(0, 0, 0, 0.4);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.temperature-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}

.temp-btn {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.2);
  background: rgba(255, 255, 255, 0.8);
  color: #1e293b;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.temp-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 1);
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.temp-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.temp-display {
  font-size: 1.25rem;
  font-weight: 600;
  color: #3b82f6;
  min-width: 4rem;
  text-align: center;
}

.mode-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.mode-btn {
  padding: 0.5rem 0.75rem;
  border: 1px solid rgba(0, 0, 0, 0.2);
  border-radius: 0.5rem;
  background: rgba(255, 255, 255, 0.8);
  color: rgba(30, 41, 59, 0.8);
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.mode-btn--active {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.mode-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 1);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.mode-btn--active:hover {
  background: #2563eb;
  border-color: #2563eb;
}

.control-panel-footer {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

.last-updated-text {
  font-size: 0.75rem;
  color: rgba(30, 41, 59, 0.5);
  margin: 0;
}

/* ===== 风扇控制样式 ===== */
.fan-speed-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.fan-speed-buttons {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
}

.speed-btn {
  padding: 0.5rem 1rem;
  border: 1px solid rgba(0, 0, 0, 0.2);
  border-radius: 0.5rem;
  background: rgba(255, 255, 255, 0.8);
  color: rgba(30, 41, 59, 0.8);
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.speed-btn--active {
  background: #06b6d4;
  color: white;
  border-color: #06b6d4;
  box-shadow: 0 4px 12px rgba(6, 182, 212, 0.3);
}

.speed-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 1);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.speed-btn--active:hover {
  background: #0891b2;
  border-color: #0891b2;
}

.fan-swing-control {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0;
}

.swing-label {
  font-size: 0.75rem;
  color: rgba(30, 41, 59, 0.8);
  font-weight: 500;
}

.swing-btn {
  padding: 0.375rem 0.75rem;
  border: 1px solid rgba(0, 0, 0, 0.2);
  border-radius: 0.375rem;
  background: rgba(255, 255, 255, 0.8);
  color: rgba(30, 41, 59, 0.8);
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.swing-btn--active {
  background: #22c55e;
  color: white;
  border-color: #22c55e;
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
}

.swing-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 1);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.swing-btn--active:hover {
  background: #16a34a;
  border-color: #16a34a;
}

/* ===== 音量控制样式 ===== */
.volume-slider-container {
  margin: 0.75rem 0;
}

.volume-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}

.volume-btn {
  width: 2.5rem;
  height: 2.5rem;
  border: 1px solid rgba(0, 0, 0, 0.2);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.8);
  color: #1e293b;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.volume-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 1);
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.volume-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.volume-display {
  font-size: 1.125rem;
  font-weight: 600;
  color: #8b5cf6;
  min-width: 3rem;
  text-align: center;
}

/* ===== 开关控制样式 ===== */
.toggle-control {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 3rem;
  height: 1.5rem;
  cursor: pointer;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
  border-radius: 1.5rem;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 1.125rem;
  width: 1.125rem;
  left: 0.1875rem;
  bottom: 0.1875rem;
  background: white;
  transition: all 0.3s ease;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

input:checked+.toggle-slider {
  background: #22c55e;
}

input:checked+.toggle-slider:before {
  transform: translateX(1.5rem);
}

input:disabled+.toggle-slider {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ===== 空状态样式 ===== */

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  text-align: center;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  backdrop-filter: blur(16px);
  margin-top: 1rem;
}

.empty-state-icon {
  width: 4rem;
  height: 4rem;
  margin-bottom: 1rem;
  color: rgba(0, 0, 0, 0.4);
  animation: float 3s ease-in-out infinite;
}

.empty-state-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.8);
  margin: 0 0 0.5rem 0;
}

.empty-state-subtitle {
  font-size: 0.875rem;
  color: rgba(0, 0, 0, 0.5);
  margin: 0;
}

/* ===== 动画定义 ===== */
@keyframes float {

  0%,
  100% {
    transform: translateY(0px);
  }

  50% {
    transform: translateY(-10px);
  }
}

/* ===== 响应式设计 ===== */
@media (max-width: 640px) {
  .device-grid {
    gap: 0.5rem;
  }

  .device-card {
    min-height: 140px;
    padding: 0.75rem;
  }

  .device-power-btn {
    padding: 0.5rem;
  }

  .device-power-icon {
    width: 1.25rem;
    height: 1.25rem;
  }

  .device-name {
    font-size: 0.75rem;
  }

  .device-room {
    font-size: 0.625rem;
  }

  .control-panel-expanded {
    padding: 0.75rem;
  }

  .temp-display {
    font-size: 1rem;
  }
}

@media (max-width: 480px) {
  .device-grid {
    gap: 0.375rem;
  }

  .device-card {
    min-height: 120px;
    padding: 0.5rem;
  }
}

/* ===== 触摸设备优化 ===== */
@media (hover: none) and (pointer: coarse) {
  .device-card:hover {
    transform: none;
    box-shadow: none;
  }

  .device-power-btn:hover {
    transform: none;
  }

  .voice-toggle-btn:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .voice-toggle-btn--active:hover {
    background: #22c55e;
  }
}
</style>