import CryptoJS from 'crypto-js'
import { XUNFEI_CONFIG } from '@/config/xunfei.js'

// 简化版语音识别器，专门解决小米手机问题
export class XunfeiSpeechRecognizerSimple {
  constructor() {
    this.ws = null
    this.recordingStatus = 'idle'
    this.currentText = ''
    this.onResult = null
    this.onError = null
    this.onStatusChange = null
    this.recorderManager = null
  }

  // 生成鉴权信息
  createAuthInfo() {
    try {
      if (!XUNFEI_CONFIG.APPID || !XUNFEI_CONFIG.API_KEY || !XUNFEI_CONFIG.API_SECRET) {
        throw new Error('讯飞API配置不完整')
      }

      const url = XUNFEI_CONFIG.WS_URL
      const apiKey = XUNFEI_CONFIG.API_KEY
      const apiSecret = XUNFEI_CONFIG.API_SECRET
      const host = url.replace('wss://', '').replace('ws://', '')
      const date = new Date().toGMTString()
      const algorithm = 'hmac-sha256'
      const headers = 'host date request-line'
      const signatureOrigin = `host: ${host}\ndate: ${date}\nGET /v2/iat HTTP/1.1`
      const signatureSha = CryptoJS.HmacSHA256(signatureOrigin, apiSecret)
      const signature = CryptoJS.enc.Base64.stringify(signatureSha)
      const authorizationOrigin = `api_key="${apiKey}", algorithm="${algorithm}", headers="${headers}", signature="${signature}"`
      const authorization = btoa(authorizationOrigin)

      const wsUrl = `${url}?authorization=${authorization}&date=${encodeURIComponent(date)}&host=${host}`
      
      console.log('简化版认证信息生成成功')
      return { url: wsUrl }
    } catch (error) {
      console.error('生成认证信息失败:', error)
      throw error
    }
  }

  // 初始化WebSocket
  async initWebSocket() {
    return new Promise((resolve, reject) => {
      try {
        const authInfo = this.createAuthInfo()
        console.log('简化版WebSocket连接中...')

        this.ws = uni.connectSocket({
          url: authInfo.url,
          success: () => console.log('WebSocket创建成功'),
          fail: (error) => reject(new Error('WebSocket创建失败: ' + JSON.stringify(error)))
        })

        this.ws.onOpen(() => {
          console.log('简化版WebSocket已连接')
          this.updateStatus('ready')
          resolve()
        })

        this.ws.onMessage((res) => {
          try {
            const response = JSON.parse(res.data)
            this.handleResponse(response)
          } catch (error) {
            console.error('解析消息失败:', error)
          }
        })

        this.ws.onError((error) => {
          console.error('WebSocket错误:', error)
          this.handleError('连接错误')
          reject(error)
        })

        this.ws.onClose(() => {
          console.log('WebSocket已关闭')
          this.updateStatus('idle')
          this.ws = null
        })

        setTimeout(() => {
          if (this.recordingStatus !== 'ready') {
            reject(new Error('连接超时'))
          }
        }, 8000)

      } catch (error) {
        reject(error)
      }
    })
  }

  // 处理识别结果
  handleResponse(response) {
    try {
      console.log('简化版收到响应:', response.code, response.message)
      
      if (response.code !== 0) {
        this.handleError(response.message || '识别失败')
        return
      }

      const result = response.data.result
      if (result && result.ws) {
        let text = ''
        result.ws.forEach(ws => {
          ws.cw.forEach(cw => {
            if (cw.w) text += cw.w
          })
        })
        
        if (text.trim()) {
          this.currentText += text
          console.log('识别到文字:', text)
          if (this.onResult) {
            this.onResult(this.currentText)
          }
        }
      }
    } catch (error) {
      console.error('处理响应失败:', error)
    }
  }

  // 发送音频数据
  sendAudioData(audioData, status = 1) {
    if (!this.ws || this.ws.readyState !== 1) {
      console.warn('WebSocket未连接')
      return
    }

    try {
      const base64Audio = uni.arrayBufferToBase64(audioData)
      const params = {
        common: { app_id: XUNFEI_CONFIG.APPID },
        business: {
          language: 'zh_cn',
          domain: 'iat',
          accent: 'mandarin'
        },
        data: {
          status: status,
          format: 'audio/L16;rate=16000',
          encoding: 'raw',
          audio: base64Audio
        }
      }

      this.ws.send({
        data: JSON.stringify(params),
        success: () => console.log(`音频数据发送成功 (status=${status})`),
        fail: (error) => console.error('发送失败:', error)
      })
    } catch (error) {
      console.error('发送音频数据错误:', error)
    }
  }

  // 开始录音
  async start() {
    try {
      if (this.recordingStatus === 'recording') {
        throw new Error('已在录音中')
      }

      this.currentText = ''
      await this.initWebSocket()

      this.recorderManager = uni.getRecorderManager()
      
      // 简化的录音参数
      const options = {
        format: 'PCM',
        sampleRate: 16000,
        numberOfChannels: 1
      }

      console.log('简化版开始录音')
      
      this.recorderManager.onStart(() => {
        console.log('录音开始')
        this.updateStatus('recording')
      })

      this.recorderManager.onStop((res) => {
        console.log('录音结束:', res)
        this.updateStatus('processing')
        
        // 发送结束帧
        this.sendAudioData(new ArrayBuffer(0), 2)
        
        setTimeout(() => {
          this.cleanup()
        }, 2000)
      })

      this.recorderManager.onError((error) => {
        console.error('录音错误:', error)
        this.handleError('录音失败')
      })

      // 如果支持帧录音，使用帧录音
      this.recorderManager.onFrameRecorded((res) => {
        if (res.frameBuffer && res.frameBuffer.byteLength > 0) {
          console.log('收到音频帧:', res.frameBuffer.byteLength)
          this.sendAudioData(res.frameBuffer, res.isLastFrame ? 2 : 1)
        }
      })

      this.recorderManager.start(options)

    } catch (error) {
      console.error('启动失败:', error)
      this.handleError(error.message)
      throw error
    }
  }

  // 停止录音
  async stop() {
    try {
      if (this.recordingStatus === 'recording' && this.recorderManager) {
        this.recorderManager.stop()
      } else {
        this.cleanup()
      }
    } catch (error) {
      console.error('停止失败:', error)
      this.cleanup()
    }
  }

  // 更新状态
  updateStatus(status) {
    this.recordingStatus = status
    if (this.onStatusChange) {
      this.onStatusChange(status)
    }
  }

  // 处理错误
  handleError(error) {
    console.error('简化版错误:', error)
    if (this.onError) {
      this.onError(error)
    }
    this.cleanup()
  }

  // 清理资源
  cleanup() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.updateStatus('idle')
  }
}
