<template>
  <view class="container" @click="handleClick">
    <!-- 蓝牙状态指示器 -->
    <BluetoothStatus />

    <!-- 初始圆形启动按钮 -->
    <view
      v-if="!isInputMode"
      class="start-button"
    >
		<view class = "input-text">
			请点击开始输入...
		</view>	
		<img src = "/static/icons/open.svg" class = "open-button">
	</view>

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

    <!-- 中间识别结果 -->
    <view v-if="intermediateText && isInputMode" class="intermediate-result">
      <view class="intermediate-text">
        <text class="intermediate-label">实时识别:</text>
        <text class="intermediate-content">{{ intermediateText }}</text>
      </view>
    </view>

    <!-- 最终识别结果 -->
    <view v-if="finalText" class="result-text">
      <view class="recognition-text">
        <text class="result-label">识别完成:</text>
        <text class="result-content">{{ finalText }}</text>
      </view>

      <!-- 指令匹配结果 -->
      <view v-if="detectedCommands.length > 0" class="command-result">
        <view class="commands-header">
          <text class="commands-title">🎯 识别到的指令 ({{ detectedCommands.length }}个)</text>
        </view>
        <view class="commands-list">
          <view v-for="(cmd, index) in detectedCommands" :key="index" class="command-item"
            :class="{
              'command-executing': executingCommands.includes(cmd.signal),
              'command-completed': cmd.executed
            }">
            <view class="command-info">
              <text class="command-name">{{ cmd.matchedCommand }}</text>
              <text class="command-confidence">匹配度: {{ (cmd.score * 100).toFixed(1) }}%</text>
            </view>
            <view class="command-status">
              <text v-if="executingCommands.includes(cmd.signal)" class="status-executing">⏳</text>
              <text v-else-if="cmd.executed" class="status-completed">✅</text>
              <text v-else class="status-pending">⏸️</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 处理状态 -->
      <view v-if="isProcessingCommand" class="processing-status">
        <text class="processing-icon">⏳</text>
        <text class="processing-text">正在处理指令...</text>
      </view>
    </view>



    <!-- 录音回放控制面板 -->
    <view v-if="lastRecordingFile" class="playback-panel">
      <view class="playback-info">
        <text class="info-title">录音文件信息</text>
        <text class="info-item">大小: {{ formatFileSize(lastRecordingFile.fileSize) }}</text>
        <text class="info-item">格式: {{ lastRecordingFile.format }}</text>
        <text class="info-item">采样率: {{ lastRecordingFile.sampleRate }}Hz</text>
      </view>

      <view class="playback-controls">
        <button
          class="playback-btn"
          :class="{ 'playing': isPlaying }"
          @click="togglePlayback"
          :disabled="isLoading"
        >
          {{ isLoading ? '加载中...' : (isPlaying ? '停止播放' : '回放录音') }}
        </button>

        <view v-if="playbackDuration > 0" class="progress-info">
          <text class="progress-text">
            {{ formatTime(playbackCurrentTime) }} / {{ formatTime(playbackDuration) }}
          </text>
          <view class="progress-bar">
            <view
              class="progress-fill"
              :style="{ width: progressPercentage + '%' }"
            ></view>
          </view>
        </view>
      </view>
    </view>

    <!-- 调试信息面板 -->
    <view v-if="showDebugInfo && lastRecordingFile" class="debug-panel">
      <text class="debug-title">调试信息</text>
      <text class="debug-item">文件路径: {{ lastRecordingFile.filePath }}</text>
      <text class="debug-item">录音时间: {{ lastRecordingFile.timestamp }}</text>
      <text class="debug-item">播放状态: {{ playbackStatus }}</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { XunfeiSpeechRecognizerOfficial } from '@/utils/xunfeiSpeechOfficial.js'
import { XunfeiSpeechRecognizerH5 } from '@/utils/xunfeiSpeechH5.js'
import BluetoothStatus from '@/components/BluetoothStatus.vue'
import { matchCommand, matchSingleCommand } from '@/utils/voiceCommandMatcher.js'
import { bluetoothControl } from '@/utils/bluetooth.js'
import {
  controlLivingRoomLight,
  controlBedroomLight,
  controlAC,
  controlSpeaker
} from '@/utils/deviceControl.js'

const isInputMode = ref(false)
const waves = Array(3).fill(0)
const recognizedText = ref('')
const intermediateText = ref('') // 中间识别结果
const finalText = ref('') // 最终识别结果
const detectedCommands = ref([]) // 识别到的指令列表
const executingCommands = ref([]) // 正在执行的指令列表

// 录音回放相关状态
const lastRecordingFile = ref(null)
const isPlaying = ref(false)
const isLoading = ref(false)
const playbackDuration = ref(0)
const playbackCurrentTime = ref(0)
const playbackStatus = ref('idle')
const showDebugInfo = ref(true) // 显示调试信息

// 语音指令匹配相关状态
const isProcessingCommand = ref(false)

// 防重复执行
const lastProcessedText = ref('')
const processingTimeout = ref(null)

let audioContext = null
let progressTimer = null

// 根据环境自动选择合适的识别器
let speechRecognizer

// #ifdef H5
speechRecognizer = new XunfeiSpeechRecognizerH5()
console.log('使用H5版本语音识别器')
// #endif

// #ifdef APP-PLUS
speechRecognizer = new XunfeiSpeechRecognizerOfficial()
console.log('使用App版本语音识别器')
// #endif

// #ifdef MP-WEIXIN
speechRecognizer = new XunfeiSpeechRecognizerOfficial()
console.log('使用微信小程序版本语音识别器')
// #endif

// 初始化语音识别器
onMounted(() => {
  // 设置中间结果回调（实时显示）
  speechRecognizer.onIntermediateResult = (text, isFinal) => {
    console.log(`[语音识别] ${isFinal ? '最终' : '中间'}结果:`, text)

    if (isFinal) {
      // 最终结果：检测并执行所有指令
      finalText.value = text
      intermediateText.value = '' // 清空中间结果
      detectAndExecuteCommands(text)
    } else {
      // 中间结果：实时显示
      intermediateText.value = text
      recognizedText.value = text // 保持兼容性
    }
  }

  // 设置最终结果回调（已废弃，保持兼容性）
  speechRecognizer.onResult = async (text) => {
    console.log('[语音识别] 最终结果回调:', text)
    // 这个回调现在主要用于兼容性，实际处理在 onIntermediateResult 中
  }

  // 设置错误回调
  speechRecognizer.onError = (error) => {
    console.error('语音识别错误:', error)

    // 根据错误类型显示不同的提示
    let title = '识别失败'
    let duration = 3000

    if (error.includes('API密钥')) {
      title = '请先配置API密钥'
      duration = 5000
    } else if (error.includes('网络')) {
      title = '网络连接失败，请重试'
    } else if (error.includes('权限')) {
      title = '需要录音权限'
    } else if (error.includes('超时')) {
      title = '连接超时，请重试'
    } else {
      title = `识别错误: ${error}`
    }

    uni.showToast({
      title: title,
      icon: 'none',
      duration: duration
    })
    isInputMode.value = false
  }

  // 设置状态变化回调
  speechRecognizer.onStatusChange = (status) => {
    console.log('识别状态:', status)
    if (status === 'idle') {
      isInputMode.value = false
    }
  }

  // 设置录音文件回调
  speechRecognizer.onRecordingFile = (fileInfo) => {
    console.log('收到录音文件信息:', fileInfo)
    lastRecordingFile.value = fileInfo

    // 输出详细的录音文件信息用于调试
    console.log('=== 录音文件详细信息 ===')
    console.log('文件路径:', fileInfo.filePath)
    console.log('文件大小:', fileInfo.fileSize, '字节')
    console.log('文件格式:', fileInfo.format)
    console.log('采样率:', fileInfo.sampleRate, 'Hz')
    console.log('声道数:', fileInfo.numberOfChannels)
    console.log('录音时间:', fileInfo.timestamp)
    console.log('========================')
  }
})

// 检测并执行所有指令
async function detectAndExecuteCommands(text) {
  console.log('[语音控制] 开始检测指令:', text)

  // 防重复执行：检查是否与上次处理的文本相同
  if (text.trim() === lastProcessedText.value.trim()) {
    console.log('[语音控制] 重复的识别结果，跳过处理:', text)
    return
  }

  if (!text.trim()) return

  try {
    lastProcessedText.value = text.trim()

    // 使用统一的指令匹配函数
    const commands = matchCommand(text)

    if (commands.length > 0 && !commands[0].error) {
      console.log(`[语音控制] 检测到 ${commands.length} 个指令:`, commands)

      // 添加到检测列表（去重）
      commands.forEach(cmd => {
        if (!cmd.error) {
          const exists = detectedCommands.value.find(existing =>
            existing.signal === cmd.signal && existing.matchedCommand === cmd.matchedCommand
          )
          if (!exists) {
            detectedCommands.value.push({
              ...cmd,
              executed: false,
              timestamp: new Date()
            })
          }
        }
      })

      // 执行所有新检测到的指令
      await executeAllCommands(commands.filter(cmd => !cmd.error))

    } else {
      console.log('[语音控制] 未检测到有效指令')

      // 只在有明确设备控制意图时才提示
      if (text.includes('打开') || text.includes('关闭') || text.includes('灯') || text.includes('空调') || text.includes('音响')) {
        uni.showToast({
          title: '未识别到有效指令',
          icon: 'none',
          duration: 2000
        })
      }
    }
  } catch (error) {
    console.error('[语音控制] 处理识别结果失败:', error)

    uni.showToast({
      title: '指令处理失败',
      icon: 'none',
      duration: 2000
    })
  }
}



// 执行所有指令
async function executeAllCommands(commands) {
  console.log(`[批量执行] 开始执行 ${commands.length} 个指令`)

  for (const command of commands) {
    try {
      // 标记为正在执行
      executingCommands.value.push(command.signal)

      console.log(`[批量执行] 执行指令: ${command.matchedCommand}`)

      // 执行设备控制
      await executeDeviceControl(command.signal, command.matchedCommand)

      // 标记为已完成
      const detectedCmd = detectedCommands.value.find(cmd =>
        cmd.signal === command.signal && cmd.matchedCommand === command.matchedCommand
      )
      if (detectedCmd) {
        detectedCmd.executed = true
      }

      console.log(`[批量执行] 指令执行成功: ${command.matchedCommand}`)

    } catch (error) {
      console.error(`[批量执行] 指令执行失败: ${command.matchedCommand}`, error)
    } finally {
      // 移除执行标记
      const index = executingCommands.value.indexOf(command.signal)
      if (index > -1) {
        executingCommands.value.splice(index, 1)
      }
    }

    // 指令间延迟，避免过快执行
    await new Promise(resolve => setTimeout(resolve, 300))
  }

  // 显示执行结果
  const successCount = commands.length
  uni.showToast({
    title: `执行完成: ${successCount}个指令`,
    icon: 'success',
    duration: 2000
  })

  console.log(`[批量执行] 所有指令执行完成`)
}

// 执行设备控制
async function executeDeviceControl(signal, command) {
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

// 处理点击事件
async function handleClick() {
  try {
    if (!isInputMode.value) {
      // 清空之前的识别结果和匹配结果
      recognizedText.value = ''
      intermediateText.value = ''
      finalText.value = ''
      isProcessingCommand.value = false
      lastProcessedText.value = ''
      detectedCommands.value = []
      executingCommands.value = []

      // 清除处理超时
      if (processingTimeout.value) {
        clearTimeout(processingTimeout.value)
        processingTimeout.value = null
      }

      // 开始录音
      console.log('开始语音识别...')
      await speechRecognizer.start()
      isInputMode.value = true

      uni.showToast({
        title: '开始录音',
        icon: 'none',
        duration: 1000
      })
    } else {
      // 停止录音
      console.log('停止语音识别...')
      await speechRecognizer.stop()
      isInputMode.value = false

      uni.showToast({
        title: '录音结束',
        icon: 'none',
        duration: 1000
      })
    }
  } catch (error) {
    console.error('操作失败:', error)

    let errorMessage = '操作失败'
    if (error.message) {
      if (error.message.includes('API配置不完整')) {
        errorMessage = '请先配置讯飞API密钥'
      } else if (error.message.includes('网络')) {
        errorMessage = '网络连接失败'
      } else if (error.message.includes('权限')) {
        errorMessage = '需要录音权限'
      } else {
        errorMessage = error.message
      }
    }

    uni.showToast({
      title: errorMessage,
      icon: 'none',
      duration: 3000
    })
    isInputMode.value = false
  }
}

// 录音回放功能
async function togglePlayback() {
  if (isPlaying.value) {
    stopPlayback()
  } else {
    await startPlayback()
  }
}

async function startPlayback() {
  if (!lastRecordingFile.value) {
    uni.showToast({
      title: '没有录音文件',
      icon: 'none',
      duration: 2000
    })
    return
  }

  try {
    isLoading.value = true
    playbackStatus.value = 'loading'
    console.log('开始播放录音文件:', lastRecordingFile.value.filePath)

    // 创建音频上下文
    audioContext = uni.createInnerAudioContext()

    // 设置音频源
    audioContext.src = lastRecordingFile.value.filePath

    // 设置音频事件监听
    audioContext.onCanplay(() => {
      console.log('音频可以播放')
      isLoading.value = false
      playbackStatus.value = 'ready'
    })

    audioContext.onPlay(() => {
      console.log('音频开始播放')
      isPlaying.value = true
      playbackStatus.value = 'playing'
      startProgressTimer()
    })

    audioContext.onPause(() => {
      console.log('音频暂停')
      isPlaying.value = false
      playbackStatus.value = 'paused'
      stopProgressTimer()
    })

    audioContext.onStop(() => {
      console.log('音频停止')
      isPlaying.value = false
      playbackStatus.value = 'stopped'
      playbackCurrentTime.value = 0
      stopProgressTimer()
    })

    audioContext.onEnded(() => {
      console.log('音频播放完成')
      isPlaying.value = false
      playbackStatus.value = 'ended'
      playbackCurrentTime.value = playbackDuration.value
      stopProgressTimer()
    })

    audioContext.onError((error) => {
      console.error('音频播放错误:', error)
      isLoading.value = false
      isPlaying.value = false
      playbackStatus.value = 'error'

      let errorMessage = '播放失败'
      if (error.errMsg) {
        if (error.errMsg.includes('format')) {
          errorMessage = 'PCM格式文件无法直接播放，需要转换格式'
        } else if (error.errMsg.includes('not found')) {
          errorMessage = '录音文件不存在或已被删除'
        } else {
          errorMessage = `播放错误: ${error.errMsg}`
        }
      }

      uni.showToast({
        title: errorMessage,
        icon: 'none',
        duration: 3000
      })
    })

    audioContext.onTimeUpdate(() => {
      playbackCurrentTime.value = audioContext.currentTime
      playbackDuration.value = audioContext.duration
    })

    // 开始播放
    audioContext.play()

  } catch (error) {
    console.error('启动播放失败:', error)
    isLoading.value = false
    isPlaying.value = false
    playbackStatus.value = 'error'

    uni.showToast({
      title: '播放启动失败',
      icon: 'none',
      duration: 2000
    })
  }
}

function stopPlayback() {
  if (audioContext) {
    audioContext.stop()
    audioContext.destroy()
    audioContext = null
  }
  isPlaying.value = false
  playbackStatus.value = 'stopped'
  stopProgressTimer()
}

function startProgressTimer() {
  stopProgressTimer()
  progressTimer = setInterval(() => {
    if (audioContext && isPlaying.value) {
      playbackCurrentTime.value = audioContext.currentTime
      playbackDuration.value = audioContext.duration
    }
  }, 100)
}

function stopProgressTimer() {
  if (progressTimer) {
    clearInterval(progressTimer)
    progressTimer = null
  }
}

// 计算播放进度百分比
const progressPercentage = computed(() => {
  if (playbackDuration.value <= 0) return 0
  return (playbackCurrentTime.value / playbackDuration.value) * 100
})

// 格式化文件大小
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 格式化时间
function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '00:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// 组件销毁时清理
onUnmounted(() => {
  console.log('[组件销毁] 开始清理语音识别组件')

  // 清理语音识别器
  if (speechRecognizer) {
    if (speechRecognizer.ws) {
      speechRecognizer.ws.close()
    }
    if (speechRecognizer.cleanup) {
      speechRecognizer.cleanup()
    }
  }

  // 清理音频播放器
  if (audioContext) {
    audioContext.destroy()
    audioContext = null
  }

  // 清理定时器
  stopProgressTimer()

  // 清理处理超时
  if (processingTimeout.value) {
    clearTimeout(processingTimeout.value)
    processingTimeout.value = null
  }

  console.log('[组件销毁] 语音识别组件清理完成')
})
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
.input-text{
	position: absolute;
	top: 20%;
	left: 32%;
	font-size: 42rpx;
	font-weight: bold;
	color: #00bfa5;
	animation: floatText 2s ease-in-out infinite;
	z-index: 2;
	user-select: none;
}

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

.open-button{
	width: 100%;
}

/* 中间识别结果样式 */
.intermediate-result {
  position: absolute;
  bottom: 350rpx;
  left: 50%;
  transform: translateX(-50%);
  width: 85%;
  padding: 20rpx 30rpx;
  background: rgba(0, 191, 165, 0.1);
  border: 2rpx dashed #00bfa5;
  border-radius: 15rpx;
  z-index: 2;
  backdrop-filter: blur(5rpx);
}

.intermediate-text {
  text-align: center;
}

.intermediate-label {
  display: block;
  font-size: 22rpx;
  color: #00bfa5;
  font-weight: bold;
  margin-bottom: 8rpx;
}

.intermediate-content {
  display: block;
  font-size: 28rpx;
  color: #333;
  line-height: 1.4;
}

/* 最终识别结果样式 */
.result-text {
  position: absolute;
  bottom: 280rpx;
  left: 50%;
  transform: translateX(-50%);
  width: 85%;
  padding: 30rpx;
  background-color: rgba(255, 255, 255, 0.95);
  border-radius: 20rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
  z-index: 3;
  backdrop-filter: blur(10rpx);
}

.recognition-text {
  margin-bottom: 20rpx;
  text-align: center;
}

.result-label {
  display: block;
  font-size: 24rpx;
  color: #666;
  margin-bottom: 10rpx;
}

.result-content {
  display: block;
  font-size: 32rpx;
  color: #333;
  font-weight: 500;
}

.command-result {
  border-top: 1rpx solid #eee;
  padding-top: 20rpx;
  margin-top: 20rpx;
}

.commands-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  padding-bottom: 15rpx;
  border-bottom: 1rpx solid #eee;
  margin-bottom: 15rpx;
}

.commands-title {
  font-size: 24rpx;
  font-weight: bold;
  color: #00bfa5;
}

.commands-list {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.command-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15rpx;
  background: #f8f9fa;
  border-radius: 10rpx;
  border-left: 3rpx solid #ddd;
  transition: all 0.3s ease;
}

.command-item.command-executing {
  background: rgba(255, 193, 7, 0.1);
  border-left-color: #ffc107;
  animation: pulse 1.5s infinite;
}

.command-item.command-completed {
  background: rgba(76, 175, 80, 0.1);
  border-left-color: #4caf50;
}

.command-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 5rpx;
}

.command-name {
  font-size: 24rpx;
  font-weight: 500;
  color: #333;
}

.command-confidence {
  font-size: 20rpx;
  color: #666;
}

.command-status {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 50rpx;
  height: 50rpx;
}

.status-executing {
  font-size: 24rpx;
  animation: spin 1s linear infinite;
}

.status-completed {
  font-size: 24rpx;
  color: #4caf50;
}

.status-pending {
  font-size: 24rpx;
  color: #999;
}

.processing-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  margin-top: 15rpx;
  padding: 10rpx;
  background-color: rgba(255, 193, 7, 0.1);
  border-radius: 10rpx;
}

.processing-icon {
  font-size: 24rpx;
  animation: spin 1s linear infinite;
}

.processing-text {
  font-size: 24rpx;
  color: #ffc107;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.02);
  }
}



/* 录音回放面板样式 */
.playback-panel {
  position: absolute;
  bottom: 100rpx;
  left: 50%;
  transform: translateX(-50%);
  width: 90%;
  background-color: rgba(255, 255, 255, 0.95);
  border-radius: 20rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
  padding: 30rpx;
  z-index: 3;
}

.playback-info {
  margin-bottom: 30rpx;
}

.info-title {
  display: block;
  font-size: 28rpx;
  font-weight: bold;
  color: #00bfa5;
  margin-bottom: 15rpx;
}

.info-item {
  display: block;
  font-size: 24rpx;
  color: #666;
  margin-bottom: 8rpx;
}

.playback-controls {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.playback-btn {
  width: 200rpx;
  height: 80rpx;
  background-color: #00bfa5;
  color: white;
  border: none;
  border-radius: 40rpx;
  font-size: 28rpx;
  margin-bottom: 20rpx;
}

.playback-btn:disabled {
  background-color: #ccc;
}

.playback-btn.playing {
  background-color: #ff5722;
}

.progress-info {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.progress-text {
  font-size: 24rpx;
  color: #666;
  margin-bottom: 10rpx;
}

.progress-bar {
  width: 100%;
  height: 8rpx;
  background-color: #e0e0e0;
  border-radius: 4rpx;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: #00bfa5;
  transition: width 0.1s ease;
}

/* 调试信息面板样式 */
.debug-panel {
  position: absolute;
  top: 50rpx;
  left: 50%;
  transform: translateX(-50%);
  width: 90%;
  background-color: rgba(0, 0, 0, 0.8);
  border-radius: 10rpx;
  padding: 20rpx;
  z-index: 4;
}

.debug-title {
  display: block;
  font-size: 24rpx;
  font-weight: bold;
  color: #00bfa5;
  margin-bottom: 10rpx;
}

.debug-item {
  display: block;
  font-size: 20rpx;
  color: #fff;
  margin-bottom: 5rpx;
  word-break: break-all;
}
</style>
