<template>
  <view class="container">
    <!-- Canvas 背景粒子 -->
    <canvas
      canvas-id="particleCanvas"
      class="particle-canvas"
      @touchstart.prevent
    ></canvas>

    <!-- 圆形语音按钮 -->
    <view 
      class="mic-button" 
      :class="{ active: isRecording }" 
      @click="toggleRecording"
    >
      <uni-icons type="mic" size="60" color="#fff" />
    </view>

    <!-- 动态波纹动画，录音时显示 -->
    <view v-if="isRecording" class="wave-container">
      <view
        v-for="(wave, index) in waves"
        :key="index"
        :class="['wave', { active: isRecording }]"
        :style="{ animationDelay: `${index * 0.3}s` }"
      ></view>
    </view>

    <!-- 录音提示文字 -->
    <view v-if="isRecording" class="hint-text">
      正在聆听，请讲话...
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const isRecording = ref(false)
const waves = Array(3).fill(0)

let ctx = null
let particles = []
let animationFrameId = null
const particleCount = 50
const activeParticleCount = 120

function random(min, max) {
  return Math.random() * (max - min) + min
}

// 粒子类
class Particle {
  constructor(canvasWidth, canvasHeight, active = false) {
    this.canvasWidth = canvasWidth
    this.canvasHeight = canvasHeight
    this.reset(active)
  }
  reset(active) {
    this.x = random(0, this.canvasWidth)
    this.y = random(0, this.canvasHeight)
    this.size = active ? random(2, 4) : random(1, 2)
    this.speedX = random(-0.5, 0.5)
    this.speedY = random(-0.3, 0.3)
    this.alpha = active ? 0.9 : 0.4
    this.active = active
  }
  update() {
    this.x += this.speedX
    this.y += this.speedY

    if (this.x < 0 || this.x > this.canvasWidth) {
      this.speedX = -this.speedX
    }
    if (this.y < 0 || this.y > this.canvasHeight) {
      this.speedY = -this.speedY
    }

    // 轻微闪烁透明度
    this.alpha += (Math.random() - 0.5) * 0.02
    if (this.alpha > 1) this.alpha = 1
    if (this.alpha < 0.3) this.alpha = 0.3
  }
  draw(ctx) {
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(0, 191, 165, ${this.alpha})` // 青色 rgba
    ctx.fill()
  }
}

function drawFrame() {
  if (!ctx) return
  const canvasWidth = ctx.canvas.width
  const canvasHeight = ctx.canvas.height

  // 清空
  ctx.clearRect(0, 0, canvasWidth, canvasHeight)

  // 画所有粒子
  particles.forEach(p => {
    p.update()
    p.draw(ctx)
  })

  animationFrameId = requestAnimationFrame(drawFrame)
}

function setupParticles(isActive) {
  particles = []
  const count = isActive ? activeParticleCount : particleCount
  for (let i = 0; i < count; i++) {
    particles.push(new Particle(ctx.canvas.width, ctx.canvas.height, isActive))
  }
}

// 切换录音状态
function toggleRecording() {
  isRecording.value = !isRecording.value
  setupParticles(isRecording.value)
}

onMounted(() => {
  // 初始化 canvas context
  const query = uni.createSelectorQuery().in(this)
  query.select('#particleCanvas').fields({ node: true, size: true }).exec(res => {
    const canvas = res[0].node
    ctx = canvas.getContext('2d')

    // 设置画布尺寸（适配屏幕）
    const dpr = uni.getSystemInfoSync().pixelRatio || 1
    canvas.width = res[0].width * dpr
    canvas.height = res[0].height * dpr
    ctx.scale(dpr, dpr)

    setupParticles(false)
    drawFrame()
  })
})

onBeforeUnmount(() => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }
})
</script>

<style scoped>
.container {
  flex: 1;
  position: relative;
  background-color: #fff;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
}

/* Canvas覆盖全屏，放背景粒子 */
.particle-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  background-color: #fff;
}

/* 圆形语音按钮 */
.mic-button {
  position: relative;
  z-index: 10;
  width: 120rpx;
  height: 120rpx;
  background-color: #00bfa5;
  border-radius: 60rpx;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 0 20rpx rgba(0, 191, 165, 0.7);
  transition: box-shadow 0.3s ease;
  cursor: pointer;
}

.mic-button.active {
  box-shadow:
    0 0 10rpx 3rpx rgba(0, 191, 165, 0.6),
    0 0 30rpx 6rpx rgba(0, 191, 165, 0.4),
    0 0 50rpx 10rpx rgba(0, 191, 165, 0.3);
}

/* 波纹容器和波纹大小与按钮完全一致 */
.wave-container {
  position: absolute;
  top: calc(50% - 60rpx);
  left: calc(50% - 60rpx);
  width: 120rpx;
  height: 120rpx;
  z-index: 5;
  pointer-events: none;
}

.wave {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 120rpx;
  height: 120rpx;
  margin-top: -60rpx;
  margin-left: -60rpx;
  border: 2rpx solid #00bfa5;
  border-radius: 60rpx;
  opacity: 0;
  transform: scale(0.8);
  animation-name: wavePulse;
  animation-duration: 2s;
  animation-timing-function: ease-out;
  animation-iteration-count: infinite;
}

.wave.active {
  opacity: 1;
}

@keyframes wavePulse {
  0% {
    opacity: 0.6;
    transform: scale(0.8);
  }
  50% {
    opacity: 0.3;
    transform: scale(1.3);
  }
  100% {
    opacity: 0;
    transform: scale(1.8);
  }
}

/* 录音提示文字 */
.hint-text {
  position: relative;
  z-index: 10;
  margin-top: 40rpx;
  color: #00bfa5;
  font-size: 32rpx;
  font-weight: 600;
  animation: hintMove 1.5s ease-in-out infinite;
  user-select: none;
}

@keyframes hintMove {
  0%, 100% {
    transform: translateX(0);
    opacity: 1;
  }
  50% {
    transform: translateX(10rpx);
    opacity: 0.8;
  }
}
</style>
