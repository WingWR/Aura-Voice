<template>
    <section class="my-6">
      <h2 class="text-lg font-medium mb-3 flex items-center">
        <HomeIcon class="h-5 w-5 mr-2 text-blue-400" />
        房间
      </h2>
      
      <div class="overflow-x-auto pb-2 -mx-4 px-4">
        <div class="flex gap-3 whitespace-nowrap">
          <button 
            v-for="room in rooms" 
            :key="room.id"
            @click="selectRoom(room.id)"
            class="room-btn flex flex-col items-center justify-center transition-all duration-300"
            :class="selectedRoom === room.id ? 'room-btn-active' : ''"
          >
            <div class="room-icon-wrapper mb-2" :class="selectedRoom === room.id ? 'room-icon-active' : ''">
              <component :is="roomIcons[room.id]" class="h-5 w-5" />
            </div>
            <span class="text-xs font-medium" :class="selectedRoom === room.id ? 'text-white' : 'text-gray-400'">
              {{ room.name }}
            </span>
            <span 
              v-if="room.id !== 'all'" 
              class="text-[10px] mt-0.5" 
              :class="selectedRoom === room.id ? 'text-blue-300' : 'text-gray-500'"
            >
              {{ getDeviceCount(room.id) }} 个设备
            </span>
          </button>
        </div>
      </div>
    </section>
  </template>
  
  <script setup>
  import { roomIcons } from '../../../components/icons/icons'
  import { rooms, useDeviceStore } from '../../../stores/devices'
  
  // 获取设备存储
  const { 
    selectedRoom, 
    filterDevices, 
    getDeviceCount 
  } = useDeviceStore()
  
  // 选择房间
  const selectRoom = (roomId) => {
    if (selectedRoom.value === roomId) return
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(5)
    }
    filterDevices(roomId)
  }
  </script>
  
  <style scoped>
  .room-btn {
    width: 70px;
    height: 80px;
    padding: 12px 0;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.05);
    transition: all 0.3s cubic-bezier(0.25, 1, 0.5, 1);
  }
  
  .room-btn-active {
    background: rgba(255, 255, 255, 0.15);
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    transform: translateY(-2px);
  }
  
  .room-icon-wrapper {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.1);
    color: #8b949e;
    transition: all 0.3s cubic-bezier(0.25, 1, 0.5, 1);
  }
  
  .room-icon-active {
    background: linear-gradient(135deg, #0a84ff, #5e5ce6);
    color: white;
    box-shadow: 0 4px 10px rgba(10, 132, 255, 0.3);
  }
  
  /* 添加滚动条样式 */
  .overflow-x-auto {
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none; /* IE and Edge */
    scroll-behavior: smooth;
  }
  
  .overflow-x-auto::-webkit-scrollbar {
    display: none; /* Chrome, Safari, Opera */
  }
  
  /* 添加点击波纹效果 */
  .room-btn:active::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 100%;
    height: 100%;
    background-color: rgba(255, 255, 255, 0.2);
    border-radius: 16px;
    transform: translate(-50%, -50%) scale(0);
    animation: ripple 0.6s ease-out;
  }
  
  @keyframes ripple {
    to {
      transform: translate(-50%, -50%) scale(2);
      opacity: 0;
    }
  }
  </style>