<template>
  <view class="container" @click="handleClick">
    <!-- 初始圆形启动按钮 -->
    <view
      v-if="!isInputMode"
      class="start-button"
    ></view>

    <!-- 波纹动画 -->
    <view v-if="isInputMode" class="wave-container">
      <view
        v-for="(wave, index) in waves"
        :key="index"
        class="wave"
        :style="{ animationDelay: `${index * 0.3}s` }"
      ></view>
    </view>

    <!-- 浮动提示文字 -->
    <view v-if="isInputMode" class="hint-text">
      正在聆听中...
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'

const isInputMode = ref(false)
const waves = Array(3).fill(0)

function handleClick() {
  isInputMode.value = !isInputMode.value
}
</script>

<style scoped>
.container {
  width: 100vw;
  height: 100vh;
  background-color: #ffffff;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  overflow: hidden;
}

/* 启动按钮样式 */
.start-button {
  width: 200rpx;
  height: 200rpx;
  border-radius: 100rpx;
  background-color: #00bfa5;
  box-shadow: 0 0 30rpx rgba(0, 191, 165, 0.5);
  z-index: 2;
}

/* 波纹容器 */
.wave-container {
  position: absolute;
  width: 200rpx;
  height: 200rpx;
  top: 50%;
  left: 50%;
  margin-left: -100rpx;
  margin-top: -100rpx;
  z-index: 1;
  pointer-events: none;
}

/* 波纹动画 */
.wave {
  position: absolute;
  width: 200rpx;
  height: 200rpx;
  border: 4rpx solid #00bfa5;
  border-radius: 100rpx;
  top: 0;
  left: 0;
  animation: wavePulse 2s ease-out infinite;
  opacity: 0;
}

@keyframes wavePulse {
  0% {
    transform: scale(0.2);
    opacity: 0.6;
  }
  50% {
    transform: scale(1.5);
    opacity: 0.3;
  }
  100% {
    transform: scale(2.2);
    opacity: 0;
  }
}

/* 提示文字 */
.hint-text {
  position: absolute;
  top: 70%;
  font-size: 42rpx;
  font-weight: bold;
  color: #00bfa5;
  animation: floatText 2s ease-in-out infinite;
  z-index: 2;
  user-select: none;
}

@keyframes floatText {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-12rpx);
  }
}
</style>
