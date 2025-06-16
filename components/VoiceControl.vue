<template>
  <view class="voice-control" :class="{ 'voice-control--active': isListening }">
    <!-- 语音控制按钮 -->
    <view 
      class="voice-button" 
      :class="{ 
        'voice-button--listening': isListening,
        'voice-button--processing': isProcessing,
        'voice-button--disabled': !isEnabled
      }"
      @click="toggleVoiceControl"
      @touchstart="handleTouchStart"
      @touchend="handleTouchEnd"
    >
      <!-- 麦克风图标 -->
      <view class="voice-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <path d="M12 19v4"/>
          <path d="M8 23h8"/>
        </svg>
      </view>
      
      <!-- 状态指示器 -->
      <view v-if="isListening" class="listening-indicator">
        <view class="wave" v-for="n in 3" :key="n" :style="{ animationDelay: `${n * 0.1}s` }"></view>
      </view>
    </view>
    
    <!-- 状态文本 -->
    <view class="voice-status" v-if="statusText">
      {{ statusText }}
    </view>
    
    <!-- 识别结果显示 -->
    <view v-if="lastRecognizedText" class="recognition-result">
      <view class="result-header">识别结果:</view>
      <view class="result-text">{{ lastRecognizedText }}</view>
      <view v-if="lastMatchResult" class="match-result">
        <view class="match-header">匹配指令:</view>
        <view class="match-text">{{ lastMatchResult.matchedCommand }}</view>
        <view class="match-score">匹配度: {{ (lastMatchResult.score * 100).toFixed(1) }}%</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { XunfeiSpeechRecognizerH5 } from '../utils/xunfeiSpeechH5.js'
import { bluetoothControl } from '../utils/bluetooth.js'
import { matchSingleCommand, testVoiceCommand } from '../utils/voiceCommandMatcher.js'
import {
  controlLivingRoomLight,
  controlBedroomLight,
  controlAC,
  controlSpeaker
} from '../utils/deviceControl.js'

// 响应式状态
const isListening = ref(false)
const isProcessing = ref(false)
const isEnabled = ref(true)
const lastRecognizedText = ref('')
const lastMatchResult = ref(null)
const speechRecognizer = ref(null)

// 计算属性
const statusText = computed(() => {
  if (isListening.value) return '正在聆听...'
  if (isProcessing.value) return '处理中...'
  return ''
})

// 初始化语音识别器
onMounted(() => {
  speechRecognizer.value = new XunfeiSpeechRecognizerH5()
  
  // 设置回调函数
  speechRecognizer.value.onResult = handleRecognitionResult
  speechRecognizer.value.onError = handleRecognitionError
  speechRecognizer.value.onStatusChange = handleStatusChange
  
  console.log('[语音控制] 组件已初始化')
})

// 处理识别结果
const handleRecognitionResult = async (text) => {
  console.log('[语音控制] 识别结果:', text)
  lastRecognizedText.value = text

  if (!text.trim()) return

  try {
    isProcessing.value = true

    // 使用增强的语音指令匹配
    console.log('[语音控制] 开始匹配语音指令...')
    const matchResult = matchSingleCommand(text)

    // 显示详细的测试结果
    testVoiceCommand(text)

    if (matchResult && !matchResult.error) {
      console.log('[语音控制] 指令匹配成功:', matchResult)
      lastMatchResult.value = matchResult

      // 执行设备控制
      await executeDeviceControl(matchResult.signal, matchResult.matchedCommand)

      // 显示成功提示
      uni.showToast({
        title: `执行: ${matchResult.matchedCommand}`,
        icon: 'success',
        duration: 2000
      })
    } else {
      console.log('[语音控制] 未找到匹配的指令:', matchResult?.error || '无匹配结果')
      lastMatchResult.value = null

      uni.showToast({
        title: matchResult?.error || '未识别到有效指令',
        icon: 'none',
        duration: 2000
      })
    }
  } catch (error) {
    console.error('[语音控制] 处理识别结果失败:', error)
    uni.showToast({
      title: '指令执行失败',
      icon: 'none',
      duration: 2000
    })
  } finally {
    isProcessing.value = false
  }
}

// 执行设备控制
const executeDeviceControl = async (signal, command) => {
  console.log(`[语音控制] 执行设备控制: ${signal} - ${command}`)

  try {
    let success = false

    // 根据信号调用相应的设备控制函数，标记为语音控制
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
        // 对于未映射的信号，使用原来的蓝牙控制方式
        console.log(`[语音控制] 使用蓝牙直接控制: ${signal}`)
        success = await bluetoothControl.sendCommand(signal)
    }

    if (success) {
      console.log(`[语音控制] 指令执行成功: ${signal} - ${command}`)
    } else {
      console.warn(`[语音控制] 指令执行失败: ${signal} - ${command}`)
      throw new Error('设备控制失败')
    }
  } catch (error) {
    console.error('[语音控制] 设备控制失败:', error)
    throw error
  }
}

// 处理识别错误
const handleRecognitionError = (error) => {
  console.error('[语音控制] 识别错误:', error)
  isListening.value = false
  isProcessing.value = false
  
  let errorMessage = '语音识别失败'
  if (error.includes('权限')) {
    errorMessage = '需要麦克风权限'
  } else if (error.includes('网络')) {
    errorMessage = '网络连接失败'
  } else if (error.includes('API')) {
    errorMessage = '请配置语音识别API'
  }
  
  uni.showToast({
    title: errorMessage,
    icon: 'none',
    duration: 2000
  })
}

// 处理状态变化
const handleStatusChange = (status) => {
  console.log('[语音控制] 状态变化:', status)
  
  switch (status) {
    case 'recording':
      isListening.value = true
      isProcessing.value = false
      break
    case 'processing':
      isListening.value = false
      isProcessing.value = true
      break
    case 'idle':
      isListening.value = false
      isProcessing.value = false
      break
  }
}

// 切换语音控制
const toggleVoiceControl = async () => {
  if (!isEnabled.value) return
  
  try {
    if (isListening.value) {
      // 停止录音
      await speechRecognizer.value.stop()
    } else {
      // 开始录音
      console.log('[语音控制] 开始语音识别...')
      await speechRecognizer.value.start()
    }
  } catch (error) {
    console.error('[语音控制] 切换失败:', error)
    handleRecognitionError(error.message)
  }
}

// 触摸事件处理
const handleTouchStart = () => {
  // 触觉反馈
  if (window.navigator && window.navigator.vibrate) {
    window.navigator.vibrate(50)
  }
}

const handleTouchEnd = () => {
  // 可以添加额外的触摸结束处理
}

// 组件卸载时清理
onUnmounted(() => {
  if (speechRecognizer.value) {
    speechRecognizer.value.cleanup()
  }
})
</script>

<style scoped>
.voice-control {
  position: fixed;
  bottom: 30px;
  right: 30px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.voice-button {
  position: relative;
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.voice-button:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
}

.voice-button--listening {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
  animation: pulse 1.5s infinite;
}

.voice-button--processing {
  background: linear-gradient(135deg, #feca57 0%, #ff9ff3 100%);
  animation: spin 1s linear infinite;
}

.voice-button--disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
}

.voice-icon {
  width: 24px;
  height: 24px;
  color: white;
}

.listening-indicator {
  position: absolute;
  top: -10px;
  right: -10px;
  display: flex;
  gap: 2px;
}

.wave {
  width: 3px;
  height: 12px;
  background: #ff6b6b;
  border-radius: 2px;
  animation: wave 1s infinite ease-in-out;
}

.voice-status {
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 6px 12px;
  border-radius: 15px;
  font-size: 12px;
  white-space: nowrap;
  backdrop-filter: blur(10px);
}

.recognition-result {
  position: absolute;
  bottom: 80px;
  right: 0;
  min-width: 200px;
  max-width: 300px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  padding: 15px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.result-header, .match-header {
  font-size: 12px;
  color: #666;
  margin-bottom: 5px;
  font-weight: 500;
}

.result-text {
  font-size: 14px;
  color: #333;
  margin-bottom: 10px;
  line-height: 1.4;
}

.match-text {
  font-size: 13px;
  color: #007bff;
  margin-bottom: 5px;
  font-weight: 500;
}

.match-score {
  font-size: 11px;
  color: #28a745;
}

@keyframes pulse {
  0% {
    box-shadow: 0 4px 16px rgba(255, 107, 107, 0.3);
  }
  50% {
    box-shadow: 0 4px 16px rgba(255, 107, 107, 0.6), 0 0 0 10px rgba(255, 107, 107, 0.1);
  }
  100% {
    box-shadow: 0 4px 16px rgba(255, 107, 107, 0.3);
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes wave {
  0%, 40%, 100% {
    transform: scaleY(0.4);
  }
  20% {
    transform: scaleY(1);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .voice-control {
    bottom: 20px;
    right: 20px;
  }
  
  .voice-button {
    width: 50px;
    height: 50px;
  }
  
  .voice-icon {
    width: 20px;
    height: 20px;
  }
  
  .recognition-result {
    min-width: 180px;
    max-width: 250px;
    bottom: 70px;
  }
}
</style>
