<template>
  <view class="top-navbar">
    <view class="welcome-text">
      {{ welcomeMessage }}
    </view>
    <view class="date-text">
      {{ currentTime }}
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

// 欢迎内容（可根据用户登录信息自定义）
const welcomeMessage = ref('欢迎回家~')

// 当前时间显示
const currentTime = ref('')

// 更新时间
function updateTime() {
  const now = new Date()
  const options = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
	}
  currentTime.value = now.toLocaleString('zh-CN', options)
}

let timer = null

onMounted(() => {
  updateTime()
  timer = setInterval(updateTime, 1000)
})

onBeforeUnmount(() => {
  clearInterval(timer)
})
</script>

<style scoped>
.top-navbar {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  padding: 20rpx 32rpx;
  background-color: #00bfa5;
  color: white;
  z-index: 999;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
  font-size: 32rpx;
}

.welcome-text {
  font-weight: 600;
}

.date-text {
  font-size: 28rpx;
  opacity: 0.9;
  font-weight: bolder;
  
  padding: 20rpx 64rpx;
}
</style>
