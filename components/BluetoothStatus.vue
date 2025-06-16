<template>
  <view class="bluetooth-status" :class="{ 'bluetooth-status--connected': isConnected }">
    <view class="bluetooth-icon" @click="toggleConnection" @touchstart="handleTouchStart" @touchend="handleTouchEnd">
      <view class="icon" :class="{ 'icon--connected': isConnected }">
        <!-- 蓝牙图标 SVG -->
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m7 7 10 10-5 5V2l5 5L7 17"/>
        </svg>
      </view>
      <view v-if="isConnected" class="connection-indicator"></view>
    </view>
    <view v-if="showTooltip" class="tooltip">
      <view class="tooltip-title">
        {{ isConnected ? '🔵 HC-05已连接' : '🔵 点击连接HC-05' }}
      </view>
      <view v-if="isConnected" class="tooltip-info">
        连接方式: {{ connectionTypeText }}
      </view>
      <view v-if="!isConnected" class="tooltip-info">
        支持: {{ supportText }}
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { bluetoothControl } from '../utils/bluetooth.js'

// 响应式状态
const showTooltip = ref(false)
const isConnecting = ref(false)
const touchTimer = ref(null)

// 计算属性
const isConnected = computed(() => bluetoothControl.isConnected.value)
const connectionType = computed(() => bluetoothControl.connectionType?.value || 'none')

const connectionTypeText = computed(() => {
  switch (connectionType.value) {
    case 'serial': return '串口连接'
    case 'web-bluetooth': return '蓝牙连接'
    default: return '未连接'
  }
})

const supportText = computed(() => {
  const features = []
  if (navigator.serial) features.push('串口')
  if (navigator.bluetooth) features.push('蓝牙')
  return features.length > 0 ? features.join(', ') : '不支持'
})

// 切换连接状态
const toggleConnection = async () => {
  if (isConnecting.value) return
  
  try {
    isConnecting.value = true
    
    if (isConnected.value) {
      // 断开连接
      bluetoothControl.disconnectBluetooth()
      console.log('[蓝牙状态] 已断开蓝牙连接')
      
      // 显示提示
      uni.showToast({
        title: '蓝牙已断开',
        icon: 'none',
        duration: 2000
      })
    } else {
      // 尝试连接
      console.log('[蓝牙状态] 正在连接蓝牙...')
      
      const success = await bluetoothControl.connectBluetooth()
      
      if (success) {
        console.log('[蓝牙状态] HC-05连接成功')
        const info = bluetoothControl.getConnectionInfo?.() || {}
        uni.showToast({
          title: `HC-05连接成功 (${info.connectionType === 'serial' ? '串口' : '蓝牙'})`,
          icon: 'success',
          duration: 2000
        })
      } else {
        console.log('[蓝牙状态] HC-05连接失败')
        uni.showToast({
          title: 'HC-05连接失败，请检查配对状态',
          icon: 'none',
          duration: 3000
        })
      }
    }
  } catch (error) {
    console.error('[蓝牙状态] HC-05操作失败:', error)
    let errorMessage = 'HC-05操作失败'

    if (error.message.includes('No port selected')) {
      errorMessage = '未选择串口，请重试'
    } else if (error.message.includes('不支持')) {
      errorMessage = '浏览器不支持，请使用Chrome'
    } else if (error.message.includes('配对')) {
      errorMessage = '请先在系统中配对HC-05'
    }

    uni.showToast({
      title: errorMessage,
      icon: 'none',
      duration: 3000
    })
  } finally {
    isConnecting.value = false
  }
}

// 触摸事件处理（移动端）
const handleTouchStart = () => {
  // 长按显示提示
  touchTimer.value = setTimeout(() => {
    showTooltip.value = true
  }, 500)
}

const handleTouchEnd = () => {
  // 清除定时器
  if (touchTimer.value) {
    clearTimeout(touchTimer.value)
    touchTimer.value = null
  }

  // 延迟隐藏提示
  setTimeout(() => {
    showTooltip.value = false
  }, 2000)
}

// 组件挂载时检查蓝牙状态
onMounted(() => {
  console.log('[蓝牙状态] 组件已挂载，当前连接状态:', isConnected.value)
})

// 组件卸载时清理
onUnmounted(() => {
  showTooltip.value = false
  if (touchTimer.value) {
    clearTimeout(touchTimer.value)
    touchTimer.value = null
  }
})
</script>

<style scoped>
.bluetooth-status {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bluetooth-icon {
  position: relative;
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.bluetooth-icon:hover {
  background: rgba(255, 255, 255, 1);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  transform: scale(1.05);
}

.bluetooth-status--connected .bluetooth-icon {
  background: rgba(34, 197, 94, 0.1);
  border-color: rgba(34, 197, 94, 0.3);
}

.icon {
  width: 20px;
  height: 20px;
  color: #6b7280;
  transition: color 0.3s ease;
}

.icon--connected {
  color: #22c55e;
}

.connection-indicator {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 12px;
  height: 12px;
  background: #22c55e;
  border: 2px solid white;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(34, 197, 94, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
  }
}

.tooltip {
  position: absolute;
  top: 50px;
  right: 0;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 12px;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  animation: fadeIn 0.3s ease forwards;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.tooltip-title {
  font-weight: 600;
  margin-bottom: 4px;
}

.tooltip-info {
  font-size: 11px;
  opacity: 0.8;
}

@keyframes fadeIn {
  to {
    opacity: 1;
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .bluetooth-status {
    top: 15px;
    right: 15px;
  }
  
  .bluetooth-icon {
    width: 36px;
    height: 36px;
  }
  
  .icon {
    width: 18px;
    height: 18px;
  }
  
  .connection-indicator {
    width: 10px;
    height: 10px;
  }
  
  .tooltip {
    font-size: 11px;
    padding: 6px 10px;
  }
}
</style>
