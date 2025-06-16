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
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { XunfeiSpeechRecognizerH5 } from '@/utils/xunfeiSpeechH5.js'
import { matchCommand } from '@/utils/voiceCommandMatcher.js'
import { bluetoothControl } from '@/utils/bluetooth.js'
import {
  controlLivingRoomLight,
  controlBedroomLight,
  controlAC,
  controlSpeaker
} from '@/utils/deviceControl.js'

const isListening = ref(false)
const waves = Array(3).fill(0)

const pos = reactive({ x: 5, y: 200 })
let startTouch = { x: 0, y: 0 }
let startPos = { x: 0, y: 0 }
let isDragging = false

let vw = window.innerWidth
let vh = window.innerHeight
const ballSize = 60

let speechRecognizer = null

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
    handleVoice()
  }
  isDragging = false
}

async function handleVoice() {
  try {
    if (isListening.value) {
      // 停止语音识别
      console.log('[悬浮球] 停止语音识别')
      await speechRecognizer.stop()
      isListening.value = false
    } else {
      // 开始语音识别
      console.log('[悬浮球] 开始语音识别')
      await speechRecognizer.start()
      isListening.value = true
    }
  } catch (error) {
    console.error('[悬浮球] 语音识别操作失败:', error)
    isListening.value = false

    // 兼容性处理
    if (typeof uni !== 'undefined') {
      uni.showToast({
        title: '语音识别失败',
        icon: 'none',
        duration: 2000
      })
    } else {
      console.log('[悬浮球] 语音识别失败:', error)
    }
  }
}

// 初始化语音识别器
onMounted(() => {
  speechRecognizer = new XunfeiSpeechRecognizerH5()

  // 设置语音识别回调
  speechRecognizer.onIntermediateResult = (text, isFinal) => {
    if (isFinal) {
      console.log('[悬浮球] 语音识别完成:', text)
      handleRecognitionResult(text)
    }
  }

  speechRecognizer.onError = (error) => {
    console.error('[悬浮球] 语音识别错误:', error)
    isListening.value = false

    // 兼容性处理
    if (typeof uni !== 'undefined') {
      uni.showToast({
        title: '识别失败',
        icon: 'none',
        duration: 2000
      })
    } else {
      console.log('[悬浮球] 识别失败:', error)
    }
  }

  speechRecognizer.onStatusChange = (status) => {
    console.log('[悬浮球] 识别状态:', status)
    if (status === 'idle') {
      isListening.value = false
    }
  }
})

// 处理语音识别结果
async function handleRecognitionResult(text) {
  if (!text.trim()) return

  try {
    // 使用指令匹配
    const commands = matchCommand(text)

    if (commands.length > 0 && !commands[0].error) {
      console.log(`[悬浮球] 检测到 ${commands.length} 个指令:`, commands)

      // 执行所有指令
      for (const command of commands) {
        if (!command.error) {
          await executeDeviceControl(command.signal, command.matchedCommand)
        }
      }

      // 兼容性处理
      if (typeof uni !== 'undefined') {
        uni.showToast({
          title: `执行了 ${commands.filter(c => !c.error).length} 个指令`,
          icon: 'success',
          duration: 2000
        })
      } else {
        console.log(`[悬浮球] 执行了 ${commands.filter(c => !c.error).length} 个指令`)
      }
    } else {
      console.log('[悬浮球] 未找到匹配的指令')
      if (typeof uni !== 'undefined') {
        uni.showToast({
          title: '未识别到有效指令',
          icon: 'none',
          duration: 2000
        })
      }
    }
  } catch (error) {
    console.error('[悬浮球] 处理识别结果失败:', error)
    if (typeof uni !== 'undefined') {
      uni.showToast({
        title: '指令处理失败',
        icon: 'none',
        duration: 2000
      })
    }
  }
}

// 执行设备控制
async function executeDeviceControl(signal, command) {
  console.log(`[悬浮球] 执行设备控制: ${signal} - ${command}`)

  try {
    let success = false

    // 根据信号调用相应的设备控制函数
    switch (signal) {
      case '1': // 打开客厅的灯
        success = await controlLivingRoomLight('toggle', true)
        break
      case '2': // 加大客厅的灯光
        success = await controlLivingRoomLight('brightnessUp', true)
        break
      case '3': // 降低客厅的灯光
        success = await controlLivingRoomLight('brightnessDown', true)
        break
      case '4': // 转换客厅的灯光颜色
        success = await controlLivingRoomLight('changeColor', true)
        break
      case '5': // 关闭客厅的灯光
        success = await controlLivingRoomLight('toggle', true)
        break
      case '6': // 打开卧室的灯
        success = await controlBedroomLight('toggle', true)
        break
      case '7': // 打开卧室的氛围灯
        success = await controlBedroomLight('toggleAmbient', true)
        break
      case '8': // 关闭卧室的灯
        success = await controlBedroomLight('toggle', true)
        break
      case 'd': // 关闭卧室的氛围灯
        success = await controlBedroomLight('toggleAmbient', true)
        break
      case '9': // 打开空调
        success = await controlAC('toggle', true)
        break
      case 'a': // 关闭空调
        success = await controlAC('toggle', true)
        break
      case 'b': // 打开音响，放一首歌
        success = await controlSpeaker('toggle', true)
        break
      case 'c': // 关闭音响
        success = await controlSpeaker('toggle', true)
        break
      default:
        // 对于未映射的信号，使用蓝牙直接控制
        console.log(`[悬浮球] 使用蓝牙直接控制: ${signal}`)
        success = await bluetoothControl.sendCommand(signal)
    }

    if (success) {
      console.log(`[悬浮球] 指令执行成功: ${signal} - ${command}`)
    } else {
      console.warn(`[悬浮球] 指令执行失败: ${signal} - ${command}`)
      throw new Error('设备控制失败')
    }
  } catch (error) {
    console.error('[悬浮球] 设备控制失败:', error)
    throw error
  }
}

// 组件卸载时清理
onUnmounted(() => {
  if (speechRecognizer) {
    speechRecognizer.cleanup()
  }
})

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