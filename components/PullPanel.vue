<template>
  <view>
    <!-- 悬浮小球，识别时隐藏 -->
    <view
      v-if="!isListening"
      class="floating-ball"
      :style="{ left: `${pos.x}px`, top: `${pos.y}px` }"
      @touchstart="onTouchStart"
      @touchmove.prevent="onTouchMove"
      @touchend="onTouchEnd"
      @click="handleVoice"
    >
      <img src="/static/icons/open.svg" class="open-button" />
    </view>

    <!-- 语音识别界面 -->
    <view v-if="isListening" class="voice-overlay" @click="handleVoice">
		<view class="voice-container">
          <view class="wave-container">
            <view
              v-for="(wave, index) in waves"
              :key="index"
              class="wave"
              :style="{ animationDelay: `${index * 0.3}s` }"
            ></view>
          </view>
          <view class="hint-text">正在聆听中...</view>
        </view>
      </view>
	</view>
</template>

<script setup>
import { ref, reactive } from 'vue'

const isListening = ref(false)
const waves = Array(3).fill(0)

const pos = reactive({ x: 5, y: 200 })
let startTouch = { x: 0, y: 0 }
let startPos = { x: 0, y: 0 }
let isDragging = false

let vw = window.innerWidth
let vh = window.innerHeight
const ballSize = 60

let recognition = null

function onTouchStart(e) {
  const touch = e.touches[0]
  startTouch.x = touch.clientX
  startTouch.y = touch.clientY
  startPos.x = pos.x
  startPos.y = pos.y
  isDragging = false
}

function onTouchMove(e) {
  const touch = e.touches[0]
  const dx = touch.clientX - startTouch.x
  const dy = touch.clientY - startTouch.y

  if (!isDragging && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
    isDragging = true
  }

  if (isDragging) {
    let newX = startPos.x + dx
    let newY = startPos.y + dy

    newX = Math.min(Math.max(0, newX), vw - ballSize)
    newY = Math.min(Math.max(0, newY), vh - ballSize)

    pos.x = newX
    pos.y = newY
  }
}

function onTouchEnd() {
  if (isDragging) {
    if (pos.x + ballSize / 2 < vw / 2) {
      pos.x = 5
    } else {
      pos.x = vw - ballSize - 20
    }
  } else {
    startVoiceRecognition()
  }
  isDragging = false
}

function handleVoice(){
	isListening.value = !isListening.value
}

window.addEventListener('resize', () => {
  vw = window.innerWidth
  vh = window.innerHeight
  pos.x = Math.min(pos.x, vw - ballSize)
  pos.y = Math.min(pos.y, vh - ballSize)
})
</script>

<style scoped>
.floating-ball {
  position: fixed;
  width: 60px;
  height: 60px;
  border-radius: 30px;
  background-color: rgba(0, 0, 0, 0.2);
  box-shadow: 0 4px 8px rgba(255, 255, 255, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  user-select: none;
  touch-action: none;
  cursor: pointer;
}

.open-button {
  width: 70%;
  height: 70%;
  object-fit: contain;
}

.voice-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 9998;
  display: flex;
  justify-content: center;
  align-items: center;
}

.voice-container {
  text-align: center;
  user-select: none;
}

.wave-container {
  position: relative;
  width: 120rpx;
  height: 120rpx;
  margin: 0 auto;
}

.wave {
  position: absolute;
  width: 120rpx;
  height: 120rpx;
  border: 3rpx solid #00bfa5;
  border-radius: 60rpx;
  top: 0;
  left: 0;
  animation: wavePulse 2s ease-out infinite;
  opacity: 0;
}

.wave:nth-child(1) {
  animation-delay: 0s;
}
.wave:nth-child(2) {
  animation-delay: 0.3s;
}
.wave:nth-child(3) {
  animation-delay: 0.6s;
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
    transform: scale(3.2);
    opacity: 0;
  }
}

.hint-text {
  margin-top: 140rpx;
  margin-left: 42rpx;
  font-size: 42rpx;
  font-weight: bold;
  color: #00bfa5;
  animation: floatText 2s ease-in-out infinite;
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