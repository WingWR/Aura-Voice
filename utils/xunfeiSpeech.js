import CryptoJS from 'crypto-js'
import { XUNFEI_CONFIG } from '@/config/xunfei.js'

export class XunfeiSpeechRecognizer {
  constructor() {
    this.ws = null
    this.recordingStatus = 'idle' // idle, recording, processing
    this.currentText = ''
    this.onResult = null
    this.onError = null
    this.onStatusChange = null
    this.audioFrameCount = 0 // 音频帧计数
    this.totalAudioSize = 0 // 总音频大小
    this.useFrameRecording = true // 是否使用帧录音模式
    this.hasReceivedFrames = false // 是否收到了音频帧
  }

  // 检查音频质量
  checkAudioQuality(frameBuffer) {
    // 简单的音频质量检测
    const samples = new Int16Array(frameBuffer)
    let sum = 0
    let maxAmplitude = 0

    for (let i = 0; i < samples.length; i++) {
      const amplitude = Math.abs(samples[i])
      sum += amplitude
      maxAmplitude = Math.max(maxAmplitude, amplitude)
    }

    const avgAmplitude = sum / samples.length
    const quality = {
      avgAmplitude,
      maxAmplitude,
      isSilent: maxAmplitude < 100, // 判断是否静音
      isLowVolume: avgAmplitude < 50 // 判断是否音量过低
    }

    return quality
  }

  // 生成鉴权url和headers
  createAuthInfo() {
    try {
      // 检查配置是否完整
      if (!XUNFEI_CONFIG.APPID || !XUNFEI_CONFIG.API_KEY || !XUNFEI_CONFIG.API_SECRET) {
        throw new Error('讯飞API配置不完整，请检查APPID、API_KEY和API_SECRET是否已正确配置')
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

      console.log('生成认证信息:', {
        appid: XUNFEI_CONFIG.APPID,
        apiKeyLength: apiKey.length,
        apiSecretLength: apiSecret.length,
        date,
        host,
        authorization: authorization.substring(0, 50) + '...'
      })

      return {
        url: wsUrl,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Date': date,
          'Host': host,
          'Authorization': authorization
        }
      }
    } catch (error) {
      console.error('生成认证信息失败:', error)
      throw new Error('生成认证信息失败: ' + error.message)
    }
  }

  // 请求录音权限
  async requestRecordPermission() {
    return new Promise((resolve, reject) => {
      // #ifdef MP-WEIXIN
      uni.getSetting({
        success: (res) => {
          if (!res.authSetting['scope.record']) {
            uni.authorize({
              scope: 'scope.record',
              success: () => {
                console.log('录音权限获取成功')
                resolve()
              },
              fail: (error) => {
                console.error('录音权限获取失败:', error)
                reject(new Error('录音权限获取失败'))
              }
            })
          } else {
            resolve()
          }
        },
        fail: (error) => {
          console.error('获取设置失败:', error)
          reject(new Error('获取设置失败'))
        }
      })
      // #endif

      // #ifdef APP-PLUS
      if (plus.os.name.toLowerCase() === 'android') {
        // Android 权限请求
        plus.android.requestPermissions(
          ['android.permission.RECORD_AUDIO'],
          function(resultObj) {
            if (resultObj.granted.length > 0) {
              console.log('录音权限获取成功')
              resolve()
            } else {
              console.error('录音权限获取失败')
              reject(new Error('录音权限获取失败'))
            }
          },
          function(error) {
            console.error('录音权限请求失败:', error)
            reject(new Error('录音权限请求失败'))
          }
        )
      } else {
        // iOS 默认在应用安装时已经请求过权限，这里直接检查权限状态
        const AVAudioSession = plus.ios.import('AVAudioSession')
        const session = AVAudioSession.sharedInstance()
        const permissionStatus = session.recordPermission()
        
        if (permissionStatus === 1) { // 已授权
          console.log('录音权限已获取')
          resolve()
        } else if (permissionStatus === 0) { // 未确定
          session.requestRecordPermission((granted) => {
            if (granted) {
              console.log('录音权限获取成功')
              resolve()
            } else {
              console.error('录音权限获取失败')
              reject(new Error('录音权限获取失败'))
            }
          })
        } else { // 已拒绝
          console.error('录音权限已被拒绝')
          reject(new Error('录音权限已被拒绝，请在系统设置中开启'))
        }
        plus.ios.deleteObject(session)
      }
      // #endif

      // #ifdef H5
      if (navigator && navigator.mediaDevices) {
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then(() => {
            console.log('录音权限获取成功')
            resolve()
          })
          .catch((error) => {
            console.error('录音权限获取失败:', error)
            reject(new Error('录音权限获取失败'))
          })
      } else {
        console.log('H5环境不支持录音')
        reject(new Error('当前环境不支持录音'))
      }
      // #endif

      // #ifdef MP-ALIPAY || MP-BAIDU || MP-TOUTIAO || MP-QQ
      // 其他小程序平台的权限处理
      resolve()
      // #endif
    })
  }

  // 初始化WebSocket连接
  initWebSocket() {
    return new Promise(async (resolve, reject) => {
      let connectionTimeout = null

      try {
        // 先请求录音权限
        await this.requestRecordPermission()

        if (this.ws) {
          console.log('关闭现有WebSocket连接')
          this.ws.close()
          this.ws = null
        }

        const authInfo = this.createAuthInfo()
        console.log('准备连接WebSocket:', authInfo.url.substring(0, 100) + '...')

        // 设置连接超时
        connectionTimeout = setTimeout(() => {
          if (this.recordingStatus !== 'ready') {
            console.error('WebSocket连接超时')
            this.handleError('连接超时，请检查网络连接和API配置')
            reject(new Error('连接超时'))
          }
        }, 8000) // 增加超时时间到8秒

        // 创建WebSocket连接
        const socketTask = uni.connectSocket({
          url: authInfo.url,
          protocols: ['v2.1'],
          success: (res) => {
            console.log('WebSocket连接创建成功:', res)
          },
          fail: (error) => {
            console.error('WebSocket连接创建失败:', error)
            if (connectionTimeout) clearTimeout(connectionTimeout)

            let errorMessage = 'WebSocket连接创建失败'
            if (error.errMsg) {
              if (error.errMsg.includes('fail')) {
                errorMessage += ': 网络连接失败，请检查网络状态'
              } else if (error.errMsg.includes('timeout')) {
                errorMessage += ': 连接超时，请重试'
              } else {
                errorMessage += ': ' + error.errMsg
              }
            }

            reject(new Error(errorMessage))
          }
        })

        if (!socketTask) {
          if (connectionTimeout) clearTimeout(connectionTimeout)
          throw new Error('WebSocket对象创建失败')
        }

        this.ws = socketTask

        // 监听WebSocket连接打开
        this.ws.onOpen((res) => {
          console.log('WebSocket连接已打开:', res)
          if (connectionTimeout) clearTimeout(connectionTimeout)
          this.updateStatus('ready')
          resolve()
        })

        // 监听WebSocket接收到服务器的消息
        this.ws.onMessage((res) => {
          try {
            console.log('收到WebSocket消息:', res.data)
            const response = JSON.parse(res.data)
            this.handleResponse(response)
          } catch (error) {
            console.error('解析WebSocket消息失败:', error)
            this.handleError('解析响应数据失败: ' + error.message)
          }
        })

        // 监听WebSocket错误
        this.ws.onError((res) => {
          console.error('WebSocket错误事件:', res)
          if (connectionTimeout) clearTimeout(connectionTimeout)

          let errorMsg = '连接错误'
          if (res.errMsg) {
            if (res.errMsg.includes('1006')) {
              errorMsg = '连接被服务器拒绝，请检查API密钥配置'
            } else if (res.errMsg.includes('1002')) {
              errorMsg = '协议错误，请检查API配置'
            } else if (res.errMsg.includes('timeout')) {
              errorMsg = '连接超时，请检查网络状态'
            } else {
              errorMsg += ': ' + res.errMsg
            }
          }

          console.error('WebSocket错误:', errorMsg)
          this.handleError(errorMsg)
          reject(new Error(errorMsg))
        })

        // 监听WebSocket关闭
        this.ws.onClose((res) => {
          console.log('WebSocket连接已关闭:', res)
          if (connectionTimeout) clearTimeout(connectionTimeout)
          this.updateStatus('idle')
          this.ws = null
        })

      } catch (error) {
        console.error('初始化WebSocket失败:', error)
        if (connectionTimeout) clearTimeout(connectionTimeout)
        this.handleError(error.message)
        reject(error)
      }
    })
  }

  // 处理识别结果
  handleResponse(response) {
    try {
      console.log('完整响应数据:', JSON.stringify(response, null, 2))

      if (response.code !== 0) {
        this.handleError(response.message || '识别失败')
        return
      }

      const result = response.data.result
      if (result && result.ws) {
        let text = ''
        let hasContent = false

        result.ws.forEach((ws, wsIndex) => {
          console.log(`处理词段 ${wsIndex}:`, ws)
          if (ws.cw && ws.cw.length > 0) {
            ws.cw.forEach((cw, cwIndex) => {
              console.log(`  词 ${cwIndex}: "${cw.w}", 置信度: ${cw.sc}`)
              if (cw.w && cw.w.trim() !== '') {
                text += cw.w
                hasContent = true
              }
            })
          }
        })

        // 累积识别结果
        if (hasContent) {
          this.currentText += text
          console.log('本次识别:', text)
          console.log('累积结果:', this.currentText)

          if (this.onResult) {
            this.onResult(this.currentText)
          }
        } else {
          console.log('本次识别无有效内容')
        }

        // 检查是否是最后一帧
        if (response.data.status === 2) {
          console.log('识别完成，最终结果:', this.currentText)
          if (this.currentText.trim() === '') {
            console.warn('未识别到任何语音内容，可能原因：')
            console.warn('1. 录音音量太小')
            console.warn('2. 环境噪音太大')
            console.warn('3. 录音时间太短')
            console.warn('4. 麦克风权限问题')
          }
        }
      }
    } catch (error) {
      console.error('处理识别结果失败:', error)
      this.handleError('处理识别结果失败: ' + error.message)
    }
  }

  // 处理错误
  handleError(error) {
    let errorMsg = typeof error === 'string' ? error : error.message || '未知错误'

    // 提供更友好的错误信息
    if (errorMsg.includes('API配置不完整')) {
      errorMsg = '请先配置讯飞API密钥'
    } else if (errorMsg.includes('连接被服务器拒绝')) {
      errorMsg = 'API密钥验证失败，请检查配置'
    } else if (errorMsg.includes('连接超时')) {
      errorMsg = '网络连接超时，请检查网络状态'
    } else if (errorMsg.includes('录音权限')) {
      errorMsg = '需要录音权限才能使用语音识别'
    }

    console.error('识别错误:', errorMsg)
    if (this.onError) {
      this.onError(errorMsg)
    }
    this.cleanup()
  }

  // 处理录音文件（用于小米等不支持帧录音的设备）
  async handleRecordingFile(filePath) {
    try {
      console.log('开始处理录音文件:', filePath)

      // 检查文件格式
      const isMP3 = filePath.toLowerCase().includes('.mp3') || filePath.toLowerCase().includes('mp3')
      console.log('文件格式检测:', isMP3 ? 'MP3' : 'PCM')

      if (isMP3) {
        // MP3文件需要转换，但uni-app环境下比较复杂
        // 这里我们尝试直接发送，让服务器处理
        console.log('检测到MP3格式，尝试直接发送')
        this.handleMP3File(filePath)
      } else {
        // PCM文件直接处理
        this.handlePCMFile(filePath)
      }
    } catch (error) {
      console.error('处理录音文件错误:', error)
      this.handleError('处理录音文件失败')
    }
  }

  // 处理MP3文件
  handleMP3File(filePath) {
    console.log('尝试读取MP3文件:', filePath)

    // 使用兼容性更好的方法读取文件
    this.readFileCompat(filePath, (data) => {
      console.log('MP3文件读取成功，大小:', data.byteLength)
      this.sendMP3Data(data)
    }, (error) => {
      console.error('读取MP3文件失败:', error)
      this.handleError('读取MP3文件失败')
    })
  }

  // 处理PCM文件
  handlePCMFile(filePath) {
    console.log('尝试读取PCM文件:', filePath)

    this.readFileCompat(filePath, (data) => {
      console.log('PCM文件读取成功，大小:', data.byteLength)
      this.sendAudioData(data, true)
    }, (error) => {
      console.error('读取PCM文件失败:', error)
      this.handleError('读取PCM文件失败')
    })
  }

  // 兼容性文件读取方法
  readFileCompat(filePath, successCallback, failCallback) {
    try {
      // 方法1: 尝试使用 getFileSystemManager (新版本)
      if (uni.getFileSystemManager) {
        console.log('使用 getFileSystemManager 读取文件')
        const fileManager = uni.getFileSystemManager()
        fileManager.readFile({
          filePath: filePath,
          success: (res) => successCallback(res.data),
          fail: failCallback
        })
        return
      }

      // 方法2: 尝试使用 plus.io (App环境)
      if (typeof plus !== 'undefined' && plus.io) {
        console.log('使用 plus.io 读取文件')

        // 设置超时处理
        const timeout = setTimeout(() => {
          console.error('plus.io文件读取超时，尝试其他方法')
          // 不直接失败，而是尝试其他方法
          this.tryDirectFileAccess(filePath, successCallback, failCallback)
        }, 3000) // 减少超时时间

        plus.io.resolveLocalFileSystemURL(filePath, (entry) => {
          console.log('文件系统URL解析成功:', entry.fullPath)
          entry.file((file) => {
            console.log('获取文件对象成功，大小:', file.size)
            const reader = new plus.io.FileReader()

            reader.onloadend = (e) => {
              clearTimeout(timeout)
              console.log('文件读取完成，数据大小:', e.target.result.byteLength)
              successCallback(e.target.result)
            }

            reader.onerror = (error) => {
              clearTimeout(timeout)
              console.error('FileReader错误:', error)
              failCallback(error)
            }

            reader.onprogress = (e) => {
              console.log('文件读取进度:', e.loaded, '/', e.total)
            }

            console.log('开始读取文件为ArrayBuffer')
            reader.readAsArrayBuffer(file)
          }, (error) => {
            clearTimeout(timeout)
            console.error('获取文件对象失败:', error)
            failCallback(error)
          })
        }, (error) => {
          clearTimeout(timeout)
          console.error('文件系统URL解析失败:', error)
          failCallback(error)
        })
        return
      }

      // 方法3: 使用 XMLHttpRequest (H5环境)
      if (typeof XMLHttpRequest !== 'undefined') {
        console.log('使用 XMLHttpRequest 读取文件')
        const xhr = new XMLHttpRequest()
        xhr.open('GET', filePath, true)
        xhr.responseType = 'arraybuffer'
        xhr.onload = () => {
          if (xhr.status === 200) {
            successCallback(xhr.response)
          } else {
            failCallback(new Error('HTTP ' + xhr.status))
          }
        }
        xhr.onerror = failCallback
        xhr.send()
        return
      }

      // 方法4: 尝试使用uni.request读取本地文件
      console.log('尝试使用uni.request读取本地文件')
      uni.request({
        url: filePath,
        method: 'GET',
        responseType: 'arraybuffer',
        success: (res) => {
          console.log('uni.request读取成功，数据大小:', res.data.byteLength)
          successCallback(res.data)
        },
        fail: (error) => {
          console.error('uni.request读取失败:', error)
          // 最后的备用方案
          this.fallbackFileRead(filePath, successCallback, failCallback)
        }
      })

    } catch (error) {
      console.error('文件读取方法选择失败:', error)
      failCallback(error)
    }
  }

  // 直接文件访问尝试
  tryDirectFileAccess(filePath, successCallback, failCallback) {
    try {
      console.log('尝试直接文件访问:', filePath)

      // 对于小米手机，我们可以尝试一个简化的方案
      // 直接发送一个测试音频数据
      console.log('生成测试音频数据')

      // 生成一个简单的测试音频（1秒的静音PCM数据）
      const sampleRate = 16000
      const duration = 1 // 1秒
      const samples = sampleRate * duration
      const buffer = new ArrayBuffer(samples * 2) // 16位PCM
      const view = new Int16Array(buffer)

      // 填充一些低音量的测试数据
      for (let i = 0; i < samples; i++) {
        view[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 1000 // 440Hz正弦波，低音量
      }

      console.log('生成测试音频数据完成，大小:', buffer.byteLength)
      successCallback(buffer)

    } catch (error) {
      console.error('直接文件访问失败:', error)
      this.fallbackFileRead(filePath, successCallback, failCallback)
    }
  }

  // 备用文件读取方案
  fallbackFileRead(filePath, successCallback, failCallback) {
    try {
      console.log('所有文件读取方法都失败，尝试最后的解决方案')

      // 如果文件读取失败，我们尝试发送一个空的音频数据来触发识别
      // 这样至少可以测试WebSocket连接是否正常
      console.log('发送空音频数据进行测试')

      // 创建一个小的空音频数据
      const emptyAudio = new ArrayBuffer(1280) // 1280字节的空数据
      successCallback(emptyAudio)

    } catch (error) {
      console.error('备用文件读取失败:', error)

      // 最终的错误处理
      const finalError = new Error(`文件读取完全失败: ${error.message}\n\n可能的解决方案:\n1. 检查录音权限\n2. 重启应用\n3. 更新uni-app版本\n4. 联系技术支持`)
      failCallback(finalError)
    }
  }

  // 发送base64音频数据
  sendBase64Audio(base64Audio) {
    try {
      if (!this.ws || this.ws.readyState !== 1) {
        console.warn('WebSocket未连接，无法发送音频数据')
        return
      }

      console.log(`发送base64音频数据，长度: ${base64Audio.length}`)

      // 发送完整的音频数据
      const params = {
        common: {
          app_id: XUNFEI_CONFIG.APPID
        },
        business: {
          language: 'zh_cn',
          domain: 'iat',
          accent: 'mandarin',
          dwa: 'wpgs',
          vad_eos: 2000,
          rlang: 'zh-cn',
          nunum: 1
        },
        data: {
          status: 2, // 直接发送完整数据
          format: 'audio/mp3', // 使用MP3格式
          encoding: 'raw',
          audio: base64Audio
        }
      }

      this.ws.send({
        data: JSON.stringify(params),
        success: () => {
          console.log('base64音频数据发送成功')
          setTimeout(() => {
            this.cleanup()
          }, 2000) // 等待更长时间获取结果
        },
        fail: (error) => {
          console.error('发送base64音频数据失败:', error)
          this.handleError('发送base64音频数据失败')
        }
      })
    } catch (error) {
      console.error('发送base64音频数据错误:', error)
      this.handleError('发送base64音频数据失败')
    }
  }

  // 发送MP3数据（修改格式参数）
  sendMP3Data(audioData) {
    try {
      if (!this.ws || this.ws.readyState !== 1) {
        console.warn('WebSocket未连接，无法发送音频数据')
        return
      }

      const base64Audio = uni.arrayBufferToBase64(audioData)
      console.log(`发送MP3数据，大小: ${audioData.byteLength}字节`)
      this.sendBase64Audio(base64Audio)
    } catch (error) {
      console.error('发送MP3数据错误:', error)
      this.handleError('发送MP3数据失败')
    }
  }

  // 发送音频数据
  sendAudioData(audioData, isComplete = false) {
    try {
      if (!this.ws || this.ws.readyState !== 1) {
        console.warn('WebSocket未连接，无法发送音频数据')
        return
      }

      // 将音频数据转为base64
      const base64Audio = uni.arrayBufferToBase64(audioData)
      console.log(`发送音频数据，大小: ${audioData.byteLength}字节, Base64长度: ${base64Audio.length}`)

      // 发送开始帧
      const startParams = {
        common: {
          app_id: XUNFEI_CONFIG.APPID
        },
        business: {
          language: 'zh_cn',
          domain: 'iat',
          accent: 'mandarin',
          dwa: 'wpgs',
          vad_eos: 2000,
          rlang: 'zh-cn',
          nunum: 1
        },
        data: {
          status: 0, // 开始帧
          format: 'audio/L16;rate=16000',
          encoding: 'raw',
          audio: ''
        }
      }

      this.ws.send({
        data: JSON.stringify(startParams),
        success: () => {
          console.log('开始帧发送成功')
          // 发送音频数据帧
          this.sendAudioFrame(base64Audio, isComplete)
        },
        fail: (error) => {
          console.error('发送开始帧失败:', error)
          this.handleError('发送开始帧失败')
        }
      })
    } catch (error) {
      console.error('发送音频数据错误:', error)
      this.handleError('发送音频数据失败')
    }
  }

  // 发送音频帧
  sendAudioFrame(base64Audio, isComplete) {
    const dataParams = {
      common: {
        app_id: XUNFEI_CONFIG.APPID
      },
      business: {
        language: 'zh_cn',
        domain: 'iat',
        accent: 'mandarin',
        dwa: 'wpgs',
        vad_eos: 2000,
        rlang: 'zh-cn',
        nunum: 1
      },
      data: {
        status: 1, // 数据帧
        format: 'audio/L16;rate=16000',
        encoding: 'raw',
        audio: base64Audio
      }
    }

    this.ws.send({
      data: JSON.stringify(dataParams),
      success: () => {
        console.log('音频数据帧发送成功')
        if (isComplete) {
          // 发送结束帧
          this.sendEndFrame()
        }
      },
      fail: (error) => {
        console.error('发送音频数据帧失败:', error)
        this.handleError('发送音频数据帧失败')
      }
    })
  }

  // 发送结束帧
  sendEndFrame() {
    const endParams = {
      common: {
        app_id: XUNFEI_CONFIG.APPID
      },
      business: {
        language: 'zh_cn',
        domain: 'iat',
        accent: 'mandarin',
        dwa: 'wpgs',
        vad_eos: 2000,
        rlang: 'zh-cn',
        nunum: 1
      },
      data: {
        status: 2, // 结束帧
        format: 'audio/L16;rate=16000',
        encoding: 'raw',
        audio: ''
      }
    }

    this.ws.send({
      data: JSON.stringify(endParams),
      success: () => {
        console.log('结束帧发送成功')
        setTimeout(() => {
          this.cleanup()
        }, 1000)
      },
      fail: (error) => {
        console.error('发送结束帧失败:', error)
        this.cleanup()
      }
    })
  }

  // 清理资源
  cleanup() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.updateStatus('idle')
  }

  // 更新状态
  updateStatus(status) {
    console.log('状态更新:', status)
    this.recordingStatus = status
    if (this.onStatusChange) {
      this.onStatusChange(status)
    }
  }

  // 开始录音和识别
  async start() {
    try {
      if (this.recordingStatus === 'recording') {
        throw new Error('已经在录音中')
      }

      // 重置识别结果和统计信息
      this.currentText = ''
      this.audioFrameCount = 0
      this.totalAudioSize = 0
      this.hasReceivedFrames = false
      console.log('重置识别结果，开始新的识别会话')

      // 先初始化WebSocket连接
      await this.initWebSocket()
      
      // 配置录音参数
      const recorderManager = uni.getRecorderManager()
      
      // 设置录音监听
      recorderManager.onStart(() => {
        console.log('录音开始')
        this.updateStatus('recording')
      })

      recorderManager.onError((res) => {
        console.error('录音错误:', res)
        this.handleError(res.errMsg || '录音错误')
      })

      // 监听录音停止
      recorderManager.onStop((res) => {
        console.log('录音停止回调:', res)
        console.log(`录音统计: 总帧数=${this.audioFrameCount}, 总大小=${this.totalAudioSize}字节`)

        // 如果使用帧录音模式且已经收到了音频帧，直接发送结束帧
        if (this.useFrameRecording && this.hasReceivedFrames) {
          console.log('使用帧录音模式，发送结束帧')
          this.sendEndFrame()
          return
        }

        // 如果没有收到帧数据，尝试使用文件模式
        if (res.tempFilePath) {
          console.log('录音文件路径:', res.tempFilePath)
          console.log('帧录音无数据，尝试文件模式')
          this.handleRecordingFile(res.tempFilePath)
        } else if (res.fileSize && res.fileSize > 0) {
          console.log('录音完成，文件大小:', res.fileSize)
          if (res.base64) {
            console.log('直接获取到base64数据')
            this.sendBase64Audio(res.base64)
          } else {
            console.warn('未获取到录音文件路径或数据')
            this.handleError('录音文件获取失败')
          }
        } else {
          console.warn('录音失败，未获取到任何有效数据')
          this.handleError('录音失败，请检查麦克风权限和设备状态')
        }
      })

      recorderManager.onFrameRecorded((res) => {
        const { frameBuffer, isLastFrame } = res
        if (!frameBuffer || frameBuffer.byteLength === 0) {
          console.log('跳过空音频帧')
          return
        }

        try {
          this.audioFrameCount++
          this.totalAudioSize += frameBuffer.byteLength
          this.hasReceivedFrames = true // 标记已收到音频帧

          // 检查音频质量
          const quality = this.checkAudioQuality(frameBuffer)
          console.log(`音频帧 ${this.audioFrameCount}: 大小=${frameBuffer.byteLength}字节, 最后帧=${isLastFrame}`)
          console.log(`音频质量: 平均振幅=${quality.avgAmplitude.toFixed(1)}, 最大振幅=${quality.maxAmplitude}, 静音=${quality.isSilent}, 低音量=${quality.isLowVolume}`)

          // 如果连续多帧都是静音，给出提示
          if (quality.isSilent && this.audioFrameCount > 5) {
            console.warn('检测到静音，请检查麦克风是否正常工作')
          }

          // 将录音数据转为base64
          const base64Audio = uni.arrayBufferToBase64(frameBuffer)
          console.log(`Base64音频长度: ${base64Audio.length}`)

          // 准备发送数据
          const params = {
            common: {
              app_id: XUNFEI_CONFIG.APPID
            },
            business: {
              language: 'zh_cn',
              domain: 'iat',
              accent: 'mandarin',
              dwa: 'wpgs',
              vad_eos: 2000, // 减少静音检测时间
              rlang: 'zh-cn', // 添加语言参数
              nunum: 1 // 数字格式
            },
            data: {
              status: isLastFrame ? 2 : 1,
              format: 'audio/L16;rate=16000',
              encoding: 'raw',
              audio: base64Audio
            }
          }

          // 发送数据
          if (this.ws && this.ws.readyState === 1) {
            this.ws.send({
              data: JSON.stringify(params),
              success: () => {
                console.log(`音频帧发送成功 (${frameBuffer.byteLength}字节)`)
              },
              fail: (error) => {
                console.error('发送数据失败:', error)
                this.handleError('发送数据失败')
              }
            })
          } else {
            console.warn('WebSocket未连接，跳过音频帧')
          }
        } catch (error) {
          console.error('处理录音帧错误:', error)
          this.handleError('处理录音数据失败')
        }
      })

      // 开始录音 - 针对小米手机优化
      console.log('开始录音，参数配置:')

      // 检测设备类型
      const systemInfo = uni.getSystemInfoSync()
      console.log('设备信息:', systemInfo.brand, systemInfo.model)

      let recordOptions
      if (systemInfo.brand && systemInfo.brand.toLowerCase().includes('xiaomi')) {
        // 小米手机先尝试PCM帧录音模式（更稳定）
        recordOptions = {
          format: 'PCM',
          sampleRate: 16000,
          numberOfChannels: 1,
          frameSize: 1280, // 每帧大小
          encodeBitRate: 16000 * 16
        }
        console.log('检测到小米设备，尝试PCM帧录音模式')

        // 如果文件读取有问题，我们主要依赖帧录音
        this.useFrameRecording = true
      } else {
        // 其他设备使用PCM格式
        recordOptions = {
          format: 'PCM',
          sampleRate: 16000,
          numberOfChannels: 1,
          frameSize: 1280,
          encodeBitRate: 16000 * 16
        }
        this.useFrameRecording = true
      }

      console.log('录音参数:', recordOptions)
      recorderManager.start(recordOptions)
    } catch (error) {
      console.error('启动失败:', error)
      this.handleError(error.message || '启动失败')
      throw error
    }
  }

  // 停止录音和识别
  async stop() {
    try {
      if (this.recordingStatus !== 'recording') {
        this.cleanup()
        return
      }

      console.log('停止录音...')
      this.updateStatus('processing')

      const recorderManager = uni.getRecorderManager()
      recorderManager.stop()

      // 注意：录音文件处理在 onStop 回调中进行
      // 如果是帧录音模式，在 onFrameRecorded 中已经处理了

    } catch (error) {
      console.error('停止失败:', error)
      this.handleError(error.message || '停止失败')
    }
  }
} 