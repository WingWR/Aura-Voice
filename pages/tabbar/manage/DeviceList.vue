<template>
    <section class="my-6">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-lg font-medium flex items-center">
          <DevicesIcon class="h-5 w-5 mr-2 text-purple-400" />
          {{ roomTitle }}
      </h2>
        <span class="text-sm text-gray-400">{{ filteredDevices.length }} 个设备</span>
      </div>
      
      <transition-group 
        name="scale" 
        tag="div" 
        class="grid gap-4"
      >
        <div 
          v-for="device in filteredDevices" 
          :key="device.id" 
          class="ios-card overflow-hidden"
        >
          <!-- 设备头部 -->
          <div class="p-4 flex items-center justify-between">
            <div class="flex items-center">
              <div 
                class="p-2.5 rounded-full mr-3 transition-all duration-300"
                :class="device.active ? `bg-${device.color}-400/20 text-${device.color}-400` : 'bg-gray-800 text-gray-500'"
              >
                <component :is="device.icon" class="h-5 w-5" />
              </div>
              <div>
                <p class="font-medium">{{ device.name }}</p>
                <p class="text-xs text-gray-400">{{ device.room }}</p>
              </div>
            </div>
            
            <label class="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                class="sr-only peer" 
                :checked="device.active"
                @change="handleToggleDevice(device.id)"
                :disabled="loading"
              >
              <div class="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-disabled:opacity-50"
                  :class="`peer-checked:from-${device.color}-500 peer-checked:to-${device.color}-400`"></div>
            </label>
          </div>
          
          <!-- 设备控制面板 -->
          <transition name="slide-fade">
            <div 
              v-if="device.active" 
              class="px-4 pb-4 pt-1"
            >
              <div class="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent mb-3"></div>
              
              <!-- 灯光控制 -->
              <div v-if="device.type === 'light'" class="space-y-4">
                <div>
                  <div class="flex justify-between items-center mb-2">
                    <span class="text-sm text-gray-300">亮度</span>
                    <span class="text-sm text-gray-300 font-medium">{{ device.brightness }}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="100" 
                    :value="device.brightness"
                    @input="handleUpdateProperty(device.id, 'brightness', parseInt($event.target.value))" 
                    class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
                    :disabled="loading"
                  >
                </div>
                
                <div>
                  <p class="text-sm text-gray-300 mb-2">色温</p>
                  <div class="flex justify-between gap-2">
                    <button 
                      v-for="temp in ['暖光', '自然', '冷光']" 
                      :key="temp"
                      @click="handleUpdateProperty(device.id, 'temperature', temp)"
                      class="flex-1 py-2 rounded-lg text-sm transition-colors"
                      :class="device.temperature === temp ? 'bg-amber-400/20 text-amber-400' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'"
                      :disabled="loading"
                    >
                      {{ temp }}
                    </button>
                  </div>
                </div>
              </div>
              
              <!-- 空调控制 -->
              <div v-if="device.type === 'ac'" class="space-y-4">
                <div>
                  <div class="flex justify-between items-center mb-2">
                    <span class="text-sm text-gray-300">温度</span>
                    <span class="text-sm text-gray-300 font-medium">{{ device.temperature }}°C</span>
                  </div>
                  <input 
                    type="range" 
                    min="16" 
                    max="30" 
                    :value="device.temperature"
                    @input="handleUpdateProperty(device.id, 'temperature', parseInt($event.target.value))" 
                    class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-400"
                    :disabled="loading"
                  >
                </div>
                
                <div>
                  <p class="text-sm text-gray-300 mb-2">模式</p>
                  <div class="grid grid-cols-2 gap-2">
                    <button 
                      v-for="mode in ['制冷', '制热', '自动', '睡眠']" 
                      :key="mode"
                      @click="handleUpdateProperty(device.id, 'mode', mode)"
                      class="py-2 rounded-lg text-sm transition-colors"
                      :class="device.mode === mode ? 'bg-blue-400/20 text-blue-400' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'"
                      :disabled="loading"
                    >
                      {{ mode }}
                    </button>
                  </div>
                </div>
              </div>
              
              <!-- 风扇控制 -->
              <div v-if="device.type === 'fan'" class="space-y-4">
                <div>
                  <div class="flex justify-between items-center mb-2">
                    <span class="text-sm text-gray-300">风速</span>
                    <span class="text-sm text-gray-300 font-medium">{{ ['低速', '中速', '高速'][device.speed - 1] }}</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="3" 
                    :value="device.speed"
                    @input="handleUpdateProperty(device.id, 'speed', parseInt($event.target.value))" 
                    class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    :disabled="loading"
                  >
                </div>
                
                <div>
                  <p class="text-sm text-gray-300 mb-2">摆头</p>
                  <div class="flex justify-between gap-2">
                    <button 
                      v-for="swing in ['关闭', '开启']" 
                      :key="swing"
                      @click="handleUpdateProperty(device.id, 'swing', swing)"
                      class="flex-1 py-2 rounded-lg text-sm transition-colors"
                      :class="device.swing === swing ? 'bg-cyan-400/20 text-cyan-400' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'"
                      :disabled="loading"
                    >
                      {{ swing }}
                    </button>
                  </div>
                </div>
              </div>
              
              <!-- 电视控制 -->
              <div v-if="device.type === 'tv'" class="space-y-4">
                <div>
                  <div class="flex justify-between items-center mb-2">
                    <span class="text-sm text-gray-300">音量</span>
                    <span class="text-sm text-gray-300 font-medium">{{ device.volume }}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    :value="device.volume"
                    @input="handleUpdateProperty(device.id, 'volume', parseInt($event.target.value))" 
                    class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-400"
                    :disabled="loading"
                  >
                </div>
                
                <div>
                  <p class="text-sm text-gray-300 mb-2">输入源</p>
                  <div class="flex justify-between gap-2">
                    <button 
                      v-for="source in ['HDMI', 'TV', 'AV']" 
                      :key="source"
                      @click="handleUpdateProperty(device.id, 'source', source)"
                      class="flex-1 py-2 rounded-lg text-sm transition-colors"
                      :class="device.source === source ? 'bg-purple-400/20 text-purple-400' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'"
                      :disabled="loading"
                    >
                      {{ source }}
                    </button>
                  </div>
                </div>
              </div>
              
              <!-- 音响控制 -->
              <div v-if="device.type === 'speaker'" class="space-y-4">
                <div>
                  <div class="flex justify-between items-center mb-2">
                    <span class="text-sm text-gray-300">音量</span>
                    <span class="text-sm text-gray-300 font-medium">{{ device.volume }}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    :value="device.volume"
                    @input="handleUpdateProperty(device.id, 'volume', parseInt($event.target.value))" 
                    class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-pink-400"
                    :disabled="loading"
                  >
                </div>
                
                <div>
                  <p class="text-sm text-gray-300 mb-2">音效</p>
                  <div class="grid grid-cols-2 gap-2">
                    <button 
                      v-for="eq in ['标准', '流行', '古典', '爵士']" 
                      :key="eq"
                      @click="handleUpdateProperty(device.id, 'eq', eq)"
                      class="py-2 rounded-lg text-sm transition-colors"
                      :class="device.eq === eq ? 'bg-pink-400/20 text-pink-400' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'"
                      :disabled="loading"
                    >
                      {{ eq }}
                    </button>
                  </div>
                </div>
              </div>
  
              <!-- 冰箱控制 -->
              <div v-if="device.type === 'fridge'" class="space-y-4">
                <div>
                  <div class="flex justify-between items-center mb-2">
                    <span class="text-sm text-gray-300">冷藏温度</span>
                    <span class="text-sm text-gray-300 font-medium">{{ device.temperature }}°C</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="8" 
                    :value="device.temperature"
                    @input="handleUpdateProperty(device.id, 'temperature', parseInt($event.target.value))" 
                    class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-400"
                    :disabled="loading"
                  >
                </div>
                
                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-300">节能模式</span>
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      class="sr-only peer" 
                      :checked="device.ecoMode"
                      @change="handleUpdateProperty(device.id, 'ecoMode', $event.target.checked)"
                      :disabled="loading"
                    >
                    <div class="w-9 h-5 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                  </label>
                </div>
              </div>
  
              <!-- 洗衣机控制 -->
              <div v-if="device.type === 'washer'" class="space-y-4">
                <div>
                  <p class="text-sm text-gray-300 mb-2">洗涤模式</p>
                  <div class="grid grid-cols-2 gap-2">
                    <button 
                      v-for="mode in ['标准', '快洗', '深度', '羊毛']" 
                      :key="mode"
                      @click="handleUpdateProperty(device.id, 'mode', mode)"
                      class="py-2 rounded-lg text-sm transition-colors"
                      :class="device.mode === mode ? 'bg-indigo-400/20 text-indigo-400' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'"
                      :disabled="loading"
                    >
                      {{ mode }}
                    </button>
                  </div>
                </div>
                
                <div>
                  <div class="flex justify-between items-center mb-2">
                    <span class="text-sm text-gray-300">洗涤时间</span>
                    <span class="text-sm text-gray-300 font-medium">{{ device.duration || 60 }} 分钟</span>
                  </div>
                  <input 
                    type="range" 
                    min="30" 
                    max="180" 
                    step="15"
                    :value="device.duration || 60"
                    @input="handleUpdateProperty(device.id, 'duration', parseInt($event.target.value))" 
                    class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-400"
                    :disabled="loading"
                  >
                </div>
              </div>
            </div>
          </transition>
        </div>
      </transition-group>
      
      <!-- 加载动画 -->
      <div v-if="loading && filteredDevices.length > 0" class="flex justify-center my-8">
        <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
      </div>
      
      <!-- 无设备提示 -->
      <div v-else-if="filteredDevices.length === 0" class="ios-card p-8 text-center">
        <div class="empty-state-animation mb-4">
          <DevicesIcon class="h-16 w-16 text-gray-600" />
        </div>
        <p class="text-gray-300 text-lg font-medium">{{ emptyStateMessage }}</p>
        <p class="text-sm text-gray-500 mt-1">请尝试选择其他房间</p>
      </div>
    </section>
  </template>
  
  <script setup>
  import { computed } from 'vue'
  import { DevicesIcon } from '../../../components/icons/icons'
  import { rooms, useDeviceStore } from '../../../stores/devices'
  
  // 获取设备存储
  const { 
    filteredDevices, 
    selectedRoom, 
    loading, 
    toggleDevice,
    updateDeviceProperty
  } = useDeviceStore()
  
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
    
    // 添加触感反馈
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
  /* 预定义动态类名 */
  .bg-amber-400\/20 { background-color: rgba(251, 191, 36, 0.2); }
  .text-amber-400 { color: rgb(251, 191, 36); }
  .accent-amber-400 { accent-color: rgb(251, 191, 36); }
  .from-amber-500 { --tw-gradient-from: rgb(245, 158, 11); }
  .to-amber-400 { --tw-gradient-to: rgb(251, 191, 36); }
  
  .bg-blue-400\/20 { background-color: rgba(96, 165, 250, 0.2); }
  .text-blue-400 { color: rgb(96, 165, 250); }
  .accent-blue-400 { accent-color: rgb(96, 165, 250); }
  .from-blue-500 { --tw-gradient-from: rgb(59, 130, 246); }
  .to-blue-400 { --tw-gradient-to: rgb(96, 165, 250); }
  
  .bg-purple-400\/20 { background-color: rgba(192, 132, 252, 0.2); }
  .text-purple-400 { color: rgb(192, 132, 252); }
  .accent-purple-400 { accent-color: rgb(192, 132, 252); }
  .from-purple-500 { --tw-gradient-from: rgb(168, 85, 247); }
  .to-purple-400 { --tw-gradient-to: rgb(192, 132, 252); }
  
  .bg-cyan-400\/20 { background-color: rgba(34, 211, 238, 0.2); }
  .text-cyan-400 { color: rgb(34, 211, 238); }
  .accent-cyan-400 { accent-color: rgb(34, 211, 238); }
  .from-cyan-500 { --tw-gradient-from: rgb(6, 182, 212); }
  .to-cyan-400 { --tw-gradient-to: rgb(34, 211, 238); }
  
  .bg-pink-400\/20 { background-color: rgba(244, 114, 182, 0.2); }
  .text-pink-400 { color: rgb(244, 114, 182); }
  .accent-pink-400 { accent-color: rgb(244, 114, 182); }
  .from-pink-500 { --tw-gradient-from: rgb(236, 72, 153); }
  .to-pink-400 { --tw-gradient-to: rgb(244, 114, 182); }
  
  .bg-green-400\/20 { background-color: rgba(74, 222, 128, 0.2); }
  .text-green-400 { color: rgb(74, 222, 128); }
  .accent-green-400 { accent-color: rgb(74, 222, 128); }
  .from-green-500 { --tw-gradient-from: rgb(34, 197, 94); }
  .to-green-400 { --tw-gradient-to: rgb(74, 222, 128); }
  
  .bg-indigo-400\/20 { background-color: rgba(129, 140, 248, 0.2); }
  .text-indigo-400 { color: rgb(129, 140, 248); }
  .accent-indigo-400 { accent-color: rgb(129, 140, 248); }
  .from-indigo-500 { --tw-gradient-from: rgb(99, 102, 241); }
  .to-indigo-400 { --tw-gradient-to: rgb(129, 140, 248); }
  
  /* 自定义滑块样式 */
  input[type="range"] {
    -webkit-appearance: none;
    height: 6px;
    border-radius: 5px;
    background: #374151;
    outline: none;
    transition: all 0.3s ease;
  }
  
  input[type="range"]:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: white;
    cursor: pointer;
    box-shadow: 0 0 5px rgba(0, 0, 0, 0.3);
    transition: all 0.3s ease;
  }
  
  input[type="range"]::-webkit-slider-thumb:hover {
    transform: scale(1.1);
  }
  
  input[type="range"]::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: white;
    cursor: pointer;
    box-shadow: 0 0 5px rgba(0, 0, 0, 0.3);
    border: none;
    transition: all 0.3s ease;
  }
  
  /* 按钮禁用状态 */
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  /* 空状态动画 */
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
  
  /* 滑动淡入动画 */
  .slide-fade-enter-active,
  .slide-fade-leave-active {
    transition: all 0.3s ease;
  }
  
  .slide-fade-enter-from,
  .slide-fade-leave-to {
    transform: translateY(-10px);
    opacity: 0;
  }
  
  /* 缩放动画 */
  .scale-enter-active,
  .scale-leave-active {
    transition: all 0.3s ease;
  }
  
  .scale-enter-from,
  .scale-leave-to {
    transform: scale(0.95);
    opacity: 0;
  }
  </style>