import CryptoJS from 'crypto-js'
import { XUNFEI_CONFIG } from '@/config/xunfei.js'

// H5环境专用的语音识别器
export class XunfeiSpeechRecognizerH5 {
  constructor() {
    this.ws = null
    this.recordingStatus = 'idle'
    this.currentText = ''
    this.onResult = null
    this.onError = null
    this.onStatusChange = null
    this.currentSid = ''
    this.iatResult = []
    this.frameStatus = 0 // 0: 首帧, 1: 中间帧, 2: 尾帧
    this.mediaRecorder = null
    this.audioContext = null
    this.stream = null
  }

  // 生成鉴权字符串
  getAuthStr(date) {
    const signatureOrigin = `host: iat-api.xfyun.cn\ndate: ${date}\nGET /v2/iat HTTP/1.1`
    const signatureSha = CryptoJS.HmacSHA256(signatureOrigin, XUNFEI_CONFIG.API_SECRET)
    const signature = CryptoJS.enc.Base64.stringify(signatureSha)
    const authorizationOrigin = `api_key="${XUNFEI_CONFIG.API_KEY}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`
    const authStr = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(authorizationOrigin))
    return authStr
  }

  // 初始化WebSocket连接
  async initWebSocket() {
    return new Promise((resolve, reject) => {
      try {
        const date = new Date().toUTCString()
        const authStr = this.getAuthStr(date)
        const wssUrl = `${XUNFEI_CONFIG.WS_URL}?authorization=${authStr}&date=${date}&host=iat-api.xfyun.cn`
        
        console.log('H5版本WebSocket连接中...')
        
        this.ws = new WebSocket(wssUrl)

        this.ws.onopen = () => {
          console.log('H5版本WebSocket已连接')
          this.updateStatus('ready')
          resolve()
        }

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data)
        }

        this.ws.onerror = (error) => {
          console.error('WebSocket错误:', error)
          this.handleError('连接错误')
          reject(error)
        }

        this.ws.onclose = () => {
          console.log(`本次识别sid：${this.currentSid}`)
          console.log('WebSocket连接关闭')
          this.updateStatus('idle')
          this.ws = null
        }

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

  // 处理WebSocket消息
  handleMessage(data) {
    try {
      const res = JSON.parse(data)

      if (res.code != 0) {
        console.log(`error code ${res.code}, reason ${res.message}`)
        this.handleError(`识别错误: ${res.message}`)
        return
      }

      let str = ""
      const isFinalResult = res.data.status == 2

      if (isFinalResult) {
        str += "最终识别结果"
        this.currentSid = res.sid
      } else {
        str += "中间识别结果"
      }

      this.iatResult[res.data.result.sn] = res.data.result

      if (res.data.result.pgs == 'rpl') {
        res.data.result.rg.forEach(i => {
          this.iatResult[i] = null
        })
        str += "【动态修正】"
      }

      str += "："
      let fullText = ""
      this.iatResult.forEach(i => {
        if (i != null) {
          i.ws.forEach(j => {
            j.cw.forEach(k => {
              str += k.w
              fullText += k.w
            })
          })
        }
      })

      console.log(str)

      // 只有最终结果才触发回调，避免重复执行
      if (isFinalResult && fullText.trim() && this.onResult) {
        this.currentText = fullText
        this.onResult(fullText)

        // 延迟关闭WebSocket，确保回调执行完成
        setTimeout(() => {
          if (this.ws) {
            this.ws.close()
          }
        }, 100)
      }

    } catch (error) {
      console.error('处理消息失败:', error)
      this.handleError('解析响应失败')
    }
  }

  // 发送数据
  send(data) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket未连接')
      return
    }

    let frame = ""
    let frameDataSection = {
      "status": this.frameStatus,
      "format": "audio/L16;rate=16000",
      "audio": data ? this.arrayBufferToBase64(data) : "",
      "encoding": "raw"
    }

    switch (this.frameStatus) {
      case 0: // 首帧
        frame = {
          common: {
            app_id: XUNFEI_CONFIG.APPID
          },
          business: {
            language: "zh_cn",
            domain: "iat",
            accent: "mandarin",
            dwa: "wpgs"
          },
          data: frameDataSection
        }
        this.frameStatus = 1
        break
        
      case 1: // 中间帧
      case 2: // 尾帧
        frame = {
          data: frameDataSection
        }
        break
    }

    console.log(`发送帧: status=${this.frameStatus}, 数据大小=${data ? data.byteLength : 0}`)
    this.ws.send(JSON.stringify(frame))
  }

  // ArrayBuffer转Base64
  arrayBufferToBase64(buffer) {
    let binary = ''
    const bytes = new Uint8Array(buffer)
    const len = bytes.byteLength
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  // 请求麦克风权限
  async requestMicrophonePermission() {
    try {
      console.log('请求麦克风权限...')
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        } 
      })
      console.log('麦克风权限获取成功')
      return true
    } catch (error) {
      console.error('麦克风权限获取失败:', error)
      throw new Error('需要麦克风权限才能进行语音识别')
    }
  }

  // 开始录音
  async start() {
    try {
      if (this.recordingStatus === 'recording') {
        throw new Error('已在录音中')
      }

      // 重置状态
      this.currentText = ''
      this.iatResult = []
      this.frameStatus = 0
      this.currentSid = ''

      await this.initWebSocket()
      await this.requestMicrophonePermission()

      // 创建AudioContext
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000
      })

      console.log('H5版本开始录音')
      this.updateStatus('recording')

      // 创建音频处理节点
      const source = this.audioContext.createMediaStreamSource(this.stream)
      const processor = this.audioContext.createScriptProcessor(1024, 1, 1)

      processor.onaudioprocess = (event) => {
        const inputBuffer = event.inputBuffer
        const inputData = inputBuffer.getChannelData(0)
        
        // 转换为16位PCM
        const pcmData = this.float32ToPCM16(inputData)
        this.send(pcmData.buffer)
      }

      source.connect(processor)
      processor.connect(this.audioContext.destination)

      this.processor = processor
      this.source = source

    } catch (error) {
      console.error('启动失败:', error)
      this.handleError(error.message)
      throw error
    }
  }

  // Float32转PCM16
  float32ToPCM16(float32Array) {
    const pcm16 = new Int16Array(float32Array.length)
    for (let i = 0; i < float32Array.length; i++) {
      const sample = Math.max(-1, Math.min(1, float32Array[i]))
      pcm16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF
    }
    return pcm16
  }

  // 停止录音
  async stop() {
    try {
      console.log(`[停止录音] 当前状态: ${this.recordingStatus}`)

      if (this.recordingStatus === 'recording') {
        console.log('录音结束，发送尾帧')
        this.updateStatus('processing')

        // 发送尾帧（在断开音频处理之前）
        this.frameStatus = 2
        this.send(null)

        // 断开音频处理
        if (this.processor) {
          this.processor.disconnect()
          this.processor = null
          console.log('[停止录音] 音频处理器已断开')
        }
        if (this.source) {
          this.source.disconnect()
          this.source = null
          console.log('[停止录音] 音频源已断开')
        }
        if (this.audioContext && this.audioContext.state !== 'closed') {
          this.audioContext.close()
          this.audioContext = null
          console.log('[停止录音] AudioContext已关闭')
        }
        if (this.stream) {
          this.stream.getTracks().forEach(track => track.stop())
          this.stream = null
          console.log('[停止录音] 媒体流已停止')
        }

        // 不立即关闭WebSocket，等待最终结果
        console.log('[停止录音] 等待识别结果...')
      } else {
        console.log('[停止录音] 非录音状态，直接清理')
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
    console.error('H5版本错误:', error)
    if (this.onError) {
      this.onError(error)
    }
    this.cleanup()
  }

  // 清理资源
  cleanup() {
    console.log('[清理] 开始清理语音识别资源')

    if (this.processor) {
      this.processor.disconnect()
      this.processor = null
      console.log('[清理] 音频处理器已断开')
    }
    if (this.source) {
      this.source.disconnect()
      this.source = null
      console.log('[清理] 音频源已断开')
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close()
      this.audioContext = null
      console.log('[清理] AudioContext已关闭')
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop())
      this.stream = null
      console.log('[清理] 媒体流已停止')
    }
    if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
      this.ws.close()
      this.ws = null
      console.log('[清理] WebSocket连接已关闭')
    }

    // 重置状态
    this.currentText = ''
    this.iatResult = []
    this.frameStatus = 0
    this.currentSid = ''

    this.updateStatus('idle')
    console.log('[清理] 资源清理完成')
  }
}
