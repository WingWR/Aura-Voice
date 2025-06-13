<template>
  <section class="my-6">
    <div class="flex items-center justify-between mb-3">
      <h2 class="text-lg font-medium flex items-center">
        <DevicesIcon class="h-5 w-5 mr-2 text-purple-400" />
        {{ roomTitle }}
      </h2>
      <span class="text-sm text-gray-400">{{ filteredDevices.length }} 个设备</span>
    </div>
    <div class="grid grid-cols-2 gap-4">
      <div v-for="device in filteredDevices" :key="device.id" class="ios-card relative group"
        :class="{ active: expandedId === device.id }">
        <!-- 在线状态标记 -->
        <span class="absolute left-3 top-3 w-3 h-3 rounded-full border-2 border-white z-10"
          :style="{ background: device.online ? '#22c55e' : '#ef4444' }" :title="device.online ? '在线' : '离线'"></span>
        <!-- 简要状态区 -->
        <div class="flex items-center justify-between p-4 cursor-pointer" @click="toggleExpand(device.id)">
          <div class="flex items-center">
            <div class="p-2.5 rounded-full mr-3 transition-all duration-300"
              :class="device.active ? `bg-${device.color}-400/20 text-${device.color}-400` : 'bg-gray-800 text-gray-500'">
              <component :is="device.icon" class="h-6 w-6" />
            </div>
            <div>
              <p class="font-medium">{{ device.name }}</p>
              <p class="text-xs text-gray-400">{{ device.room }}</p>
            </div>
          </div>
          <div>
            <span :class="device.active ? 'text-green-400' : 'text-gray-400'">
              {{ device.active ? '已开启' : '已关闭' }}
            </span>
          </div>
        </div>
        <!-- 亮度信号条（灯光） -->
        <div v-if="device.type === 'light'" class="flex items-center gap-1 px-4 pb-2">
          <span v-for="level in 3" :key="level" class="inline-block w-2 h-5 rounded-full" :style="{
            background: device.brightnessLevel >= level ? '#fbbf24' : '#e5e7eb',
            opacity: device.brightnessLevel >= level ? 1 : 0.4
          }"></span>
          <span class="ml-2 text-xs text-gray-400">亮度</span>
          <!-- 卧室氛围灯调色 -->
          <template v-if="device.name === '卧室氛围灯'">
            <span class="ml-4 text-xs text-gray-400">颜色</span>
            <input type="color" v-model="device.colorHex"
              @input.stop="handleUpdateProperty(device.id, 'colorHex', device.colorHex)"
              class="ml-1 w-6 h-6 border-none bg-transparent p-0" style="vertical-align: middle;" />
          </template>
        </div>
        <!-- 空调主状态 -->
        <div v-if="device.type === 'ac'" class="flex items-center gap-2 px-4 pb-2">
          <span class="text-blue-400 font-bold text-lg">{{ device.temperature }}°C</span>
          <span class="text-xs text-gray-400">{{ device.mode }}</span>
        </div>
        <!-- 机器人主状态 -->
        <div v-if="device.type === 'robot'" class="flex items-center gap-2 px-4 pb-2">
          <span class="text-blue-400 font-bold text-lg">{{ device.battery }}%</span>
          <span class="text-xs text-gray-400">{{ device.status }}</span>
        </div>
        <!-- 加湿器主状态 -->
        <div v-if="device.type === 'humidifier'" class="flex items-center gap-2 px-4 pb-2">
          <span class="text-cyan-400 font-bold text-lg">{{ device.humidity }}%</span>
          <span class="text-xs text-gray-400">湿度</span>
        </div>
        <!-- 详细操作区（可展开/收起） -->
        <transition name="fade">
          <div v-if="expandedId === device.id" class="p-4 border-t border-gray-700 bg-black/30 rounded-b-[18px]">
            <!-- 灯光详细调节 -->
            <template v-if="device.type === 'light'">
              <div class="mb-2">
                <span class="text-sm text-gray-300">亮度：</span>
                <input type="range" min="1" max="3" :value="device.brightnessLevel"
                  @input="handleUpdateProperty(device.id, 'brightnessLevel', parseInt($event.target.value))"
                  class="w-32 accent-amber-400" :disabled="loading" />
                <span class="ml-2 text-xs text-gray-400">{{ ['低', '中', '高'][device.brightnessLevel - 1] }}</span>
              </div>
              <div>
                <span class="text-sm text-gray-300">开关：</span>
                <input type="checkbox" v-model="device.active" @change="handleToggleDevice(device.id)"
                  :disabled="loading" />
              </div>
            </template>
            <!-- 空调详细调节 -->
            <template v-if="device.type === 'ac'">
              <div class="mb-2 flex items-center gap-2">
                <span class="text-sm text-gray-300">温度：</span>
                <button @click="handleUpdateProperty(device.id, 'temperature', device.temperature - 1)"
                  :disabled="loading || device.temperature <= 16" class="btn-circle">-</button>
                <span class="mx-2 text-lg font-bold text-blue-400">{{ device.temperature }}°C</span>
                <button @click="handleUpdateProperty(device.id, 'temperature', device.temperature + 1)"
                  :disabled="loading || device.temperature >= 30" class="btn-circle">+</button>
              </div>
              <div class="mb-2">
                <span class="text-sm text-gray-300">模式：</span>
                <select v-model="device.mode" @change="handleUpdateProperty(device.id, 'mode', device.mode)"
                  :disabled="loading" class="select-mode">
                  <option value="制冷">制冷</option>
                  <option value="制热">制热</option>
                  <option value="自动">自动</option>
                  <option value="睡眠">睡眠</option>
                </select>
              </div>
              <div>
                <span class="text-sm text-gray-300">开关：</span>
                <input type="checkbox" v-model="device.active" @change="handleToggleDevice(device.id)"
                  :disabled="loading" />
              </div>
            </template>
            <!-- 机器人详细调节 -->
            <template v-if="device.type === 'robot'">
              <div>
                <span class="text-sm text-gray-300">状态：</span>
                <select v-model="device.status" @change="handleUpdateProperty(device.id, 'status', device.status)"
                  :disabled="loading" class="select-mode">
                  <option value="待机">待机</option>
                  <option value="清扫中">清扫中</option>
                  <option value="回充中">回充中</option>
                </select>
              </div>
            </template>
            <!-- 加湿器详细调节 -->
            <template v-if="device.type === 'humidifier'">
              <div>
                <span class="text-sm text-gray-300">湿度：</span>
                <input type="range" min="30" max="70" :value="device.humidity"
                  @input="handleUpdateProperty(device.id, 'humidity', parseInt($event.target.value))"
                  class="w-32 accent-cyan-400" :disabled="loading" />
                <span class="ml-2 text-xs text-gray-400">{{ device.humidity }}%</span>
              </div>
              <div>
                <span class="text-sm text-gray-300">开关：</span>
                <input type="checkbox" v-model="device.active" @change="handleToggleDevice(device.id)"
                  :disabled="loading" />
              </div>
            </template>
            <!-- 其他设备可按需补充 -->
          </div>
        </transition>
      </div>
    </div>
    <!-- 无设备提示 -->
    <div v-if="filteredDevices.length === 0" class="ios-card p-8 text-center mt-4">
      <div class="empty-state-animation mb-4">
        <DevicesIcon class="h-16 w-16 text-gray-600" />
      </div>
      <p class="text-gray-300 text-lg font-medium">{{ emptyStateMessage }}</p>
      <p class="text-sm text-gray-500 mt-1">请尝试选择其他房间</p>
    </div>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import { DevicesIcon } from '../../../components/icons/icons'
import { rooms, useDeviceStore } from '../../../stores/devices'

const {
  filteredDevices,
  selectedRoom,
  loading,
  toggleDevice,
  updateDeviceProperty
} = useDeviceStore()

const expandedId = ref(null)
const toggleExpand = (id) => {
  expandedId.value = expandedId.value === id ? null : id
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

// 处理设备开关切换
const handleToggleDevice = async (deviceId) => {
  if (loading.value) return
  if (window.navigator && window.navigator.vibrate) {
    window.navigator.vibrate(5)
  }
  await toggleDevice(deviceId)
}

// 处理设备属性更新
const handleUpdateProperty = async (deviceId, property, value) => {
  if (loading.value) return
  await updateDeviceProperty(deviceId, property, value)
}
</script>

<style scoped>
.ios-card {
  min-height: 160px;
  border-radius: 18px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  background: rgba(255, 255, 255, 0.04);
  transition: box-shadow 0.2s, transform 0.2s;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  cursor: pointer;
  position: relative;
}

.ios-card:hover,
.ios-card.active {
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
  transform: translateY(-2px) scale(1.02);
}

.btn-circle {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #222;
  color: #fff;
  border: none;
  font-size: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 0 2px;
  transition: background 0.2s;
}

.btn-circle:active {
  background: #444;
}

.select-mode {
  background: #222;
  color: #fff;
  border-radius: 8px;
  border: 1px solid #444;
  padding: 2px 8px;
  margin-left: 8px;
}

input[type="range"] {
  vertical-align: middle;
}

.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.empty-state-animation {
  display: flex;
  justify-content: center;
  align-items: center;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0% {
    transform: translateY(0px);
  }

  50% {
    transform: translateY(-10px);
  }

  100% {
    transform: translateY(0px);
  }
}
</style>