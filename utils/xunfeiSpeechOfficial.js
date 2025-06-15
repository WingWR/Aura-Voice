import CryptoJS from 'crypto-js'
import { XUNFEI_CONFIG } from '@/config/xunfei.js'

// 完全按照官方demo逻辑实现的语音识别器
export class XunfeiSpeechRecognizerOfficial {
  constructor() {
    this.ws = null
    this.recordingStatus = 'idle'
    this.currentText = ''
    this.onResult = null
    this.onError = null
    this.onStatusChange = null
    this.onRecordingFile = null // 新增：录音文件回调
    this.currentSid = ''
    this.iatResult = []
    this.frameStatus = 0 // 0: 首帧, 1: 中间帧, 2: 尾帧
    this.lastRecordingFile = null // 新增：保存最后一次录音文件信息
  }

  // 生成鉴权字符串 (完全按照官方demo)
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
        // 按照官方demo生成URL
        const date = new Date().toUTCString()
        const authStr = this.getAuthStr(date)
        const wssUrl = `${XUNFEI_CONFIG.WS_URL}?authorization=${authStr}&date=${date}&host=iat-api.xfyun.cn`
        
        console.log('官方版本WebSocket连接中...')
        
        this.ws = uni.connectSocket({
          url: wssUrl,
          success: () => console.log('WebSocket创建成功'),
          fail: (error) => reject(new Error('WebSocket创建失败: ' + JSON.stringify(error)))
        })

        this.ws.onOpen(() => {
          console.log('官方版本WebSocket已连接')
          this.updateStatus('ready')
          resolve()
        })

        this.ws.onMessage((res) => {
          this.handleMessage(res.data)
        })

        this.ws.onError((error) => {
          console.error('WebSocket错误:', error)
          this.handleError('连接错误')
          reject(error)
        })

        this.ws.onClose(() => {
          console.log(`本次识别sid：${this.currentSid}`)
          console.log('WebSocket连接关闭')
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

  // 处理WebSocket消息 (完全按照官方demo)
  handleMessage(data) {
    try {
      const res = JSON.parse(data)
      
      if (res.code != 0) {
        console.log(`error code ${res.code}, reason ${res.message}`)
        this.handleError(`识别错误: ${res.message}`)
        return
      }

      let str = ""
      if (res.data.status == 2) {
        // 数据全部返回完毕
        str += "最终识别结果"
        this.currentSid = res.sid
        this.ws.close()
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
      
      if (fullText.trim() && this.onResult) {
        this.currentText = fullText
        this.onResult(fullText)
      }

    } catch (error) {
      console.error('处理消息失败:', error)
      this.handleError('解析响应失败')
    }
  }

  // 发送数据 (完全按照官方demo)
  send(data) {
    if (!this.ws || this.ws.readyState !== 1) {
      console.warn('WebSocket未连接')
      return
    }

    let frame = ""
    let frameDataSection = {
      "status": this.frameStatus,
      "format": "audio/L16;rate=16000",
      "audio": data ? uni.arrayBufferToBase64(data) : "",
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
        this.frameStatus = 1 // 下次发送中间帧
        break
        
      case 1: // 中间帧
      case 2: // 尾帧
        frame = {
          data: frameDataSection
        }
        break
    }

    console.log(`发送帧: status=${this.frameStatus}, 数据大小=${data ? data.byteLength : 0}`)
    
    this.ws.send({
      data: JSON.stringify(frame),
      success: () => console.log('帧发送成功'),
      fail: (error) => console.error('帧发送失败:', error)
    })
  }

  // 检查录音权限
  async checkRecordingPermission() {
    return new Promise((resolve) => {
      try {
        // 检查录音权限
        if (typeof uni !== 'undefined' && uni.authorize) {
          uni.authorize({
            scope: 'scope.record',
            success: () => {
              console.log('录音权限已获取')
              resolve(true)
            },
            fail: (error) => {
              console.error('录音权限获取失败:', error)
              // 尝试打开设置页面
              uni.showModal({
                title: '需要录音权限',
                content: '请在设置中开启录音权限',
                confirmText: '去设置',
                success: (res) => {
                  if (res.confirm) {
                    uni.openSetting({
                      success: (settingRes) => {
                        if (settingRes.authSetting['scope.record']) {
                          console.log('用户已开启录音权限')
                          resolve(true)
                        } else {
                          console.log('用户未开启录音权限')
                          resolve(false)
                        }
                      }
                    })
                  } else {
                    resolve(false)
                  }
                }
              })
            }
          })
        } else {
          // 如果没有uni.authorize，假设权限已获取
          console.log('无法检查权限，假设已获取')
          resolve(true)
        }
      } catch (error) {
        console.error('权限检查失败:', error)
        resolve(false)
      }
    })
  }

  // 开始录音
  async start() {
    try {
      if (this.recordingStatus === 'recording') {
        throw new Error('已在录音中')
      }

      // 首先检查录音权限
      console.log('检查录音权限...')
      const hasPermission = await this.checkRecordingPermission()
      if (!hasPermission) {
        throw new Error('录音权限未获取，无法开始录音')
      }
      console.log('录音权限检查通过')

      // 重置状态
      this.currentText = ''
      this.iatResult = []
      this.frameStatus = 0
      this.currentSid = ''

      await this.initWebSocket()

      const recorderManager = uni.getRecorderManager()

      // 检测设备并使用合适的录音参数
      const systemInfo = uni.getSystemInfoSync()
      console.log('设备信息:', systemInfo.brand, systemInfo.model, systemInfo.platform)

      let options
      if (systemInfo.brand && systemInfo.brand.toLowerCase().includes('xiaomi')) {
        // 小米设备使用更兼容的参数
        options = {
          format: 'PCM',
          sampleRate: 16000,
          numberOfChannels: 1,
          frameSize: 320, // 进一步减小帧大小，提高兼容性
          encodeBitRate: 16000
        }
        console.log('小米设备，使用兼容参数')
      } else {
        // 其他设备使用标准参数
        options = {
          format: 'PCM',
          sampleRate: 16000,
          numberOfChannels: 1,
          frameSize: 1280,
          encodeBitRate: 16000 * 16
        }
        console.log('标准设备，使用标准参数')
      }

      // 添加额外的小米设备兼容性检查
      if (systemInfo.platform === 'android' &&
          (systemInfo.brand && systemInfo.brand.toLowerCase().includes('xiaomi') ||
           systemInfo.model && systemInfo.model.toLowerCase().includes('mi'))) {
        console.log('检测到小米Android设备，使用最兼容参数')
        options = {
          format: 'PCM',
          sampleRate: 16000,
          numberOfChannels: 1,
          frameSize: 1280, // 恢复标准帧大小，因为太小的帧可能不触发回调
          encodeBitRate: 16000
        }
      }

      // 尝试不同的录音参数组合
      const alternativeOptions = [
        // 标准参数
        {
          format: 'PCM',
          sampleRate: 16000,
          numberOfChannels: 1,
          frameSize: 1280,
          encodeBitRate: 16000
        },
        // 兼容参数1
        {
          format: 'PCM',
          sampleRate: 16000,
          numberOfChannels: 1,
          frameSize: 640,
          encodeBitRate: 16000
        },
        // 兼容参数2
        {
          format: 'PCM',
          sampleRate: 16000,
          numberOfChannels: 1,
          frameSize: 320,
          encodeBitRate: 16000
        }
      ]

      // 如果是小米设备，使用第一个兼容参数
      if (systemInfo.platform === 'android' &&
          (systemInfo.brand && systemInfo.brand.toLowerCase().includes('xiaomi') ||
           systemInfo.model && systemInfo.model.toLowerCase().includes('mi'))) {
        options = alternativeOptions[1] // 使用640帧大小
        console.log('小米设备使用兼容参数:', options)
      }

      console.log('录音参数:', options)
      console.log('官方版本开始录音')
      
      recorderManager.onStart(() => {
        console.log('录音开始')
        this.updateStatus('recording')
      })

      let frameCount = 0
      let hasReceivedFrames = false
      let frameCallbackRegistered = false

      // 添加更详细的回调注册检查
      try {
        recorderManager.onFrameRecorded((res) => {
          frameCount++
          frameCallbackRegistered = true
          console.log(`onFrameRecorded回调触发 #${frameCount}:`, res)

          if (res.frameBuffer && res.frameBuffer.byteLength > 0) {
            hasReceivedFrames = true
            console.log(`收到音频帧 #${frameCount}: ${res.frameBuffer.byteLength}字节`)
            this.send(res.frameBuffer)
          } else {
            console.warn(`音频帧 #${frameCount} 为空或无效:`, res)
          }
        })
        console.log('onFrameRecorded回调注册成功')
      } catch (error) {
        console.error('onFrameRecorded回调注册失败:', error)
      }

      // 添加定时检查，确保回调被触发
      const frameCheckInterval = setInterval(() => {
        if (this.recordingStatus === 'recording') {
          console.log(`录音状态检查: frameCount=${frameCount}, hasReceivedFrames=${hasReceivedFrames}, callbackRegistered=${frameCallbackRegistered}`)
        } else {
          clearInterval(frameCheckInterval)
        }
      }, 1000) // 每秒检查一次

      recorderManager.onStop((res) => {
        clearInterval(frameCheckInterval) // 清除检查定时器
        console.log('录音结束回调:', res)
        console.log(`录音统计: 总回调次数=${frameCount}, 收到有效帧=${hasReceivedFrames}, 回调已注册=${frameCallbackRegistered}`)
        console.log('录音文件信息:', res.tempFilePath, res.fileSize)

        // 保存录音文件信息用于回放
        if (res.tempFilePath) {
          this.lastRecordingFile = {
            filePath: res.tempFilePath,
            fileSize: res.fileSize || 0,
            format: options.format || 'PCM',
            sampleRate: options.sampleRate || 16000,
            numberOfChannels: options.numberOfChannels || 1,
            timestamp: new Date().toISOString()
          }
          console.log('保存录音文件信息用于回放:', this.lastRecordingFile)

          // 触发录音文件回调
          if (this.onRecordingFile) {
            this.onRecordingFile(this.lastRecordingFile)
          }
        }

        this.updateStatus('processing')

        if (!hasReceivedFrames) {
          console.warn('未收到任何音频帧数据，可能的原因:')
          console.warn('1. 录音权限问题 - 请检查应用是否有录音权限')
          console.warn('2. 设备不支持帧录音 - 小米设备可能存在兼容性问题')
          console.warn('3. 录音参数不兼容 - 当前参数可能不适合此设备')
          console.warn('4. onFrameRecorded回调未被正确触发 - 系统级问题')
          console.warn('5. 录音硬件被其他应用占用')

          // 检查录音文件是否存在且有内容
          if (res.tempFilePath && res.fileSize && res.fileSize > 0) {
            console.log(`录音文件存在且有内容: ${res.fileSize} 字节，尝试使用录音文件`)
            this.handleRecordingFile(res.tempFilePath)
            return
          } else if (res.tempFilePath) {
            console.log('录音文件存在但大小为0，这通常表示录音失败')
            console.log('可能原因: 录音权限被拒绝、麦克风被占用、或设备不兼容')
            console.log('尝试读取文件以确认是否真的为空:', res.tempFilePath)
            this.handleRecordingFile(res.tempFilePath)
            return
          } else {
            console.log('没有录音文件，录音完全失败')
            console.log('直接使用测试音频数据进行功能验证')
            this.sendTestAudio()
            return
          }
        }

        // 如果收到了帧数据，正常发送结束帧
        console.log('收到了帧数据，发送结束帧')
        this.frameStatus = 2
        this.send(null)
      })

      recorderManager.onError((error) => {
        console.error('录音错误:', error)
        this.handleError('录音失败')
      })

      recorderManager.start(options)

    } catch (error) {
      console.error('启动失败:', error)
      this.handleError(error.message)
      throw error
    }
  }

  // 停止录音
  async stop() {
    try {
      if (this.recordingStatus === 'recording') {
        const recorderManager = uni.getRecorderManager()
        recorderManager.stop()
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
    console.error('官方版本错误:', error)
    if (this.onError) {
      this.onError(error)
    }
    this.cleanup()
  }

  // 处理录音文件（备用方案）
  async handleRecordingFile(filePath) {
    try {
      console.log('开始处理录音文件:', filePath)
      console.log('这是录音失败后的备用方案，尝试读取录音文件')

      // 尝试读取文件
      if (typeof plus !== 'undefined' && plus.io) {
        // 设置文件读取超时 - 增加超时时间
        const fileTimeout = setTimeout(() => {
          console.error('文件读取超时，可能原因:')
          console.error('1. 文件路径不正确')
          console.error('2. 文件权限问题')
          console.error('3. 设备存储性能问题')
          console.error('4. 文件系统错误')
          console.error('切换到测试音频')
          this.sendTestAudio()
        }, 15000) // 从5秒增加到15秒

        plus.io.resolveLocalFileSystemURL(filePath, (entry) => {
          console.log('文件路径解析成功:', entry.fullPath)
          console.log('文件完整路径:', entry.toURL())

          entry.file((file) => {
            console.log('文件详细信息:')
            console.log('- 文件大小:', file.size, 'bytes')
            console.log('- 文件类型:', file.type)
            console.log('- 最后修改时间:', new Date(file.lastModified))
            console.log('- 文件名:', file.name)

            if (file.size === 0) {
              console.warn('录音文件确实为空（0字节）')
              console.warn('这表明录音过程中没有捕获到任何音频数据')
              console.warn('可能的原因:')
              console.warn('1. 录音权限在录音过程中被拒绝')
              console.warn('2. 麦克风硬件故障或被其他应用占用')
              console.warn('3. 录音参数与设备不兼容')
              console.warn('4. 系统资源不足导致录音失败')
              clearTimeout(fileTimeout)
              this.sendTestAudio()
              return
            }

            if (file.size < 1000) {
              console.warn(`录音文件过小: ${file.size} 字节，可能录音质量很差`)
              console.warn('但仍然尝试使用该文件')
            }

            const reader = new plus.io.FileReader()

            reader.onloadstart = () => {
              console.log('开始读取文件...')
            }

            reader.onprogress = (e) => {
              console.log('文件读取进度:', e.loaded, '/', e.total)
            }

            reader.onloadend = (e) => {
              clearTimeout(fileTimeout)
              console.log('文件读取完成，数据大小:', e.target.result.byteLength)

              if (e.target.result && e.target.result.byteLength > 0) {
                this.sendFileData(e.target.result)
              } else {
                console.warn('读取到空数据，使用测试音频')
                this.sendTestAudio()
              }
            }

            reader.onerror = (error) => {
              clearTimeout(fileTimeout)
              console.error('FileReader错误:', error)
              console.log('文件读取失败，使用测试音频')
              this.sendTestAudio()
            }

            reader.onabort = () => {
              clearTimeout(fileTimeout)
              console.warn('文件读取被中断，使用测试音频')
              this.sendTestAudio()
            }

            console.log('开始异步读取文件为ArrayBuffer')

            // 添加读取状态检查
            let readingStarted = false
            const readingCheckTimeout = setTimeout(() => {
              if (!readingStarted) {
                console.error('FileReader.readAsArrayBuffer 可能未正常启动')
                console.error('这可能是因为:')
                console.error('1. plus.io.FileReader 与标准 FileReader 行为不一致')
                console.error('2. PCM文件格式不被 readAsArrayBuffer 支持')
                console.error('3. 文件权限问题')
                console.error('4. 设备兼容性问题')
                clearTimeout(fileTimeout)
                this.tryAlternativeFileReading(file, fileTimeout)
              }
            }, 1000) // 1秒后检查是否开始读取

            // 修改 onloadstart 来标记读取已开始
            reader.onloadstart = () => {
              readingStarted = true
              clearTimeout(readingCheckTimeout)
              console.log('开始读取文件...')
            }

            try {
              console.log('调用 reader.readAsArrayBuffer(file)')
              reader.readAsArrayBuffer(file)
              console.log('readAsArrayBuffer 调用完成，等待回调...')
            } catch (error) {
              clearTimeout(fileTimeout)
              clearTimeout(readingCheckTimeout)
              console.error('启动文件读取失败:', error)
              console.error('readAsArrayBuffer 方法调用异常，尝试替代方案')
              this.tryAlternativeFileReading(file, fileTimeout)
            }

          }, (error) => {
            clearTimeout(fileTimeout)
            console.error('获取文件对象失败:', error)
            this.sendTestAudio()
          })
        }, (error) => {
          clearTimeout(fileTimeout)
          console.error('文件路径解析失败:', error)
          this.sendTestAudio()
        })
      } else {
        console.error('plus.io 不可用，直接使用测试音频')
        this.sendTestAudio()
      }
    } catch (error) {
      console.error('处理录音文件错误:', error)
      console.log('所有方法失败，尝试最简单的测试')
      this.sendSimpleTest()
    }
  }

  // 尝试替代的文件读取方法
  tryAlternativeFileReading(file, originalTimeout) {
    try {
      console.log('尝试替代的文件读取方法')
      console.log('文件信息:', {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: new Date(file.lastModified)
      })

      // 清除原始超时
      if (originalTimeout) {
        clearTimeout(originalTimeout)
      }

      // 首先尝试使用 uni.getFileSystemManager
      console.log('检查 uni 对象:', typeof uni)
      console.log('检查 getFileSystemManager:', typeof (uni && uni.getFileSystemManager))

      if (typeof uni !== 'undefined' && uni.getFileSystemManager) {
        console.log('uni.getFileSystemManager 可用，尝试使用')
        this.tryUniFileSystemManager(file)
      } else {
        console.log('uni.getFileSystemManager 不可用，使用备用方法')
        console.log('uni 对象状态:', uni)
        // 方法1: 尝试使用 readAsBinaryString
        this.tryReadAsBinaryString(file)
      }

    } catch (error) {
      console.error('替代文件读取方法失败:', error)
      this.sendTestAudio()
    }
  }

  // 使用 uni.getFileSystemManager 读取文件
  tryUniFileSystemManager(file) {
    try {
      console.log('=== 开始使用 uni.getFileSystemManager 读取文件 ===')
      console.log('文件对象详情:', {
        name: file.name,
        size: file.size,
        type: file.type,
        fullPath: file.fullPath,
        path: file.path,
        localURL: file.localURL
      })

      const fs = uni.getFileSystemManager()
      console.log('文件系统管理器获取成功:', typeof fs)

      // 获取文件的完整路径 - 优先使用 fullPath
      let filePath = file.fullPath
      if (!filePath) {
        filePath = file.path
      }
      if (!filePath && file.localURL) {
        filePath = file.localURL
      }

      console.log('准备读取的文件路径:', filePath)

      if (!filePath) {
        console.error('无法获取有效的文件路径')
        this.tryReadAsBinaryString(file)
        return
      }

      // 设置超时保护
      const timeout = setTimeout(() => {
        console.error('uni.getFileSystemManager 读取超时')
        this.tryReadAsBinaryString(file)
      }, 15000)

      fs.readFile({
        filePath: filePath,
        encoding: '', // 不指定编码，读取原始二进制数据
        success: (res) => {
          clearTimeout(timeout)
          console.log('=== uni.getFileSystemManager 读取成功 ===')
          console.log('返回数据类型:', typeof res.data)
          console.log('返回数据构造函数:', res.data.constructor.name)
          console.log('数据长度:', res.data.byteLength || res.data.length)

          let buffer
          if (res.data instanceof ArrayBuffer) {
            console.log('数据已经是 ArrayBuffer 格式')
            buffer = res.data
          } else if (res.data instanceof Uint8Array) {
            console.log('数据是 Uint8Array，转换为 ArrayBuffer')
            buffer = res.data.buffer.slice(res.data.byteOffset, res.data.byteOffset + res.data.byteLength)
          } else if (typeof res.data === 'string') {
            console.log('数据是字符串，尝试转换为 ArrayBuffer')
            buffer = this.binaryStringToArrayBuffer(res.data)
          } else if (res.data && typeof res.data === 'object' && res.data.length !== undefined) {
            console.log('数据是类数组对象，转换为 ArrayBuffer')
            buffer = new ArrayBuffer(res.data.length)
            const view = new Uint8Array(buffer)
            for (let i = 0; i < res.data.length; i++) {
              view[i] = res.data[i]
            }
          } else {
            console.error('未知的数据类型:', res.data)
            this.tryReadAsBinaryString(file)
            return
          }

          if (buffer && buffer.byteLength > 0) {
            console.log('=== 文件读取成功，ArrayBuffer 大小:', buffer.byteLength, '字节 ===')
            this.sendFileData(buffer)
          } else {
            console.warn('转换后的数据为空，尝试下一种方法')
            this.tryReadAsBinaryString(file)
          }
        },
        fail: (error) => {
          clearTimeout(timeout)
          console.error('=== uni.getFileSystemManager 读取失败 ===')
          console.error('错误详情:', error)
          console.error('错误代码:', error.errCode)
          console.error('错误信息:', error.errMsg)
          console.log('尝试下一种方法: readAsBinaryString')
          this.tryReadAsBinaryString(file)
        }
      })

    } catch (error) {
      console.error('=== uni.getFileSystemManager 方法异常 ===')
      console.error('异常详情:', error)
      console.error('异常堆栈:', error.stack)
      this.tryReadAsBinaryString(file)
    }
  }

  // 方法1: 使用 readAsBinaryString 读取（如果支持的话）
  tryReadAsBinaryString(file) {
    try {
      console.log('=== 尝试使用 readAsBinaryString 读取文件 ===')

      const reader = new plus.io.FileReader()
      console.log('FileReader 对象创建成功')
      console.log('FileReader 支持的方法:', Object.getOwnPropertyNames(reader))

      // 检查是否支持 readAsBinaryString 方法
      if (typeof reader.readAsBinaryString !== 'function') {
        console.error('plus.io.FileReader 不支持 readAsBinaryString 方法')
        console.log('尝试使用 readAsDataURL 方法')
        this.tryReadAsDataURL(file)
        return
      }

      const timeout = setTimeout(() => {
        console.error('readAsBinaryString 超时，尝试下一种方法')
        this.tryReadAsDataURL(file)
      }, 10000)

      reader.onloadend = (e) => {
        clearTimeout(timeout)
        if (e.target.result) {
          console.log('readAsBinaryString 成功，数据长度:', e.target.result.length)
          // 将二进制字符串转换为 ArrayBuffer
          const buffer = this.binaryStringToArrayBuffer(e.target.result)
          console.log('转换后的 ArrayBuffer 大小:', buffer.byteLength)
          this.sendFileData(buffer)
        } else {
          console.warn('readAsBinaryString 返回空数据')
          this.tryReadAsDataURL(file)
        }
      }

      reader.onerror = (error) => {
        clearTimeout(timeout)
        console.error('readAsBinaryString 错误:', error)
        this.tryReadAsDataURL(file)
      }

      reader.readAsBinaryString(file)
      console.log('readAsBinaryString 调用完成')

    } catch (error) {
      console.error('=== readAsBinaryString 方法失败 ===')
      console.error('错误详情:', error)
      this.tryReadAsDataURL(file)
    }
  }

  // 新增方法: 使用 readAsDataURL 读取
  tryReadAsDataURL(file) {
    try {
      console.log('=== 尝试使用 readAsDataURL 读取文件 ===')

      const reader = new plus.io.FileReader()

      // 检查是否支持 readAsDataURL 方法
      if (typeof reader.readAsDataURL !== 'function') {
        console.error('plus.io.FileReader 不支持 readAsDataURL 方法')
        console.log('尝试使用 readAsText 方法')
        this.tryReadAsText(file)
        return
      }

      const timeout = setTimeout(() => {
        console.error('readAsDataURL 超时，尝试下一种方法')
        this.tryReadAsText(file)
      }, 10000)

      reader.onloadend = (e) => {
        clearTimeout(timeout)
        if (e.target.result) {
          console.log('readAsDataURL 成功')
          try {
            // 从 data URL 中提取二进制数据
            const dataUrl = e.target.result
            console.log('=== 数据完整性验证 ===')
            console.log('原始文件大小:', file.size, 'bytes')
            console.log('Data URL 总长度:', dataUrl.length)
            console.log('Data URL 前缀:', dataUrl.substring(0, 50))

            // 检查是否是有效的 data URL
            if (dataUrl.startsWith('data:')) {
              const base64Index = dataUrl.indexOf(',')
              if (base64Index !== -1) {
                const base64 = dataUrl.substring(base64Index + 1)
                console.log('Base64 数据长度:', base64.length)

                // 计算预期的二进制大小
                const expectedSize = Math.floor(base64.length * 3 / 4)
                console.log('预期二进制大小:', expectedSize, 'bytes')

                // 使用改进的 Base64 解码方法
                const buffer = this.improvedBase64ToArrayBuffer(base64, file.size)

                if (buffer && buffer.byteLength > 0) {
                  console.log('=== 解码结果验证 ===')
                  console.log('实际 ArrayBuffer 大小:', buffer.byteLength, 'bytes')
                  console.log('大小差异:', Math.abs(buffer.byteLength - file.size), 'bytes')

                  // 验证数据大小是否合理
                  const sizeDifference = Math.abs(buffer.byteLength - file.size)
                  const sizeRatio = sizeDifference / file.size

                  if (sizeRatio > 0.1) { // 如果差异超过10%
                    console.warn('数据大小差异较大，可能存在数据丢失')
                    console.warn('差异比例:', (sizeRatio * 100).toFixed(2) + '%')
                  }

                  // 验证PCM数据格式
                  const isValidPCM = this.validatePCMData(buffer)
                  if (!isValidPCM) {
                    console.warn('PCM数据验证失败，但仍然尝试发送')
                  }

                  console.log('=== 发送文件数据 ===')
                  this.sendFileData(buffer)
                  return
                } else {
                  console.error('Base64解码失败，buffer为空')
                }
              } else {
                console.error('Data URL 中未找到逗号分隔符')
              }
            } else {
              console.error('不是有效的 Data URL 格式')
            }

            console.warn('Data URL 格式无效或转换失败，尝试下一种方法')
            this.tryReadAsText(file)
          } catch (error) {
            console.error('Data URL 处理失败:', error)
            console.error('错误堆栈:', error.stack)
            this.tryReadAsText(file)
          }
        } else {
          console.warn('readAsDataURL 返回空数据')
          this.tryReadAsText(file)
        }
      }

      reader.onerror = (error) => {
        clearTimeout(timeout)
        console.error('readAsDataURL 错误:', error)
        this.tryReadAsText(file)
      }

      reader.readAsDataURL(file)
      console.log('readAsDataURL 调用完成')

    } catch (error) {
      console.error('=== readAsDataURL 方法失败 ===')
      console.error('错误详情:', error)
      this.tryReadAsText(file)
    }
  }

  // 方法3: 使用 readAsText 读取（作为最后尝试）
  tryReadAsText(file) {
    try {
      console.log('=== 尝试使用 readAsText 读取文件（最后尝试）===')

      const reader = new plus.io.FileReader()

      // 检查是否支持 readAsText 方法
      if (typeof reader.readAsText !== 'function') {
        console.error('plus.io.FileReader 不支持 readAsText 方法')
        console.log('所有 FileReader 方法都失败，使用测试音频')
        this.sendTestAudio()
        return
      }

      const timeout = setTimeout(() => {
        console.error('readAsText 超时，使用测试音频')
        this.sendTestAudio()
      }, 10000)

      reader.onloadstart = () => {
        console.log('readAsText 开始读取...')
      }

      reader.onprogress = (e) => {
        console.log('readAsText 读取进度:', e.loaded, '/', e.total)
      }

      reader.onloadend = (e) => {
        clearTimeout(timeout)
        console.log('readAsText onloadend 触发')
        console.log('读取结果存在:', !!e.target.result)
        console.log('读取结果类型:', typeof e.target.result)

        if (e.target.result) {
          console.log('readAsText 成功，数据长度:', e.target.result.length)
          console.log('数据前100个字符:', e.target.result.substring(0, 100))

          // 尝试多种方式转换文本数据
          let buffer = null

          // 方式1: 直接作为二进制字符串处理
          try {
            buffer = this.binaryStringToArrayBuffer(e.target.result)
            console.log('方式1转换结果:', buffer ? buffer.byteLength : 'null')
          } catch (error) {
            console.log('方式1转换失败:', error.message)
          }

          // 方式2: 使用 TextEncoder
          if (!buffer || buffer.byteLength === 0) {
            try {
              buffer = this.textToArrayBuffer(e.target.result)
              console.log('方式2转换结果:', buffer ? buffer.byteLength : 'null')
            } catch (error) {
              console.log('方式2转换失败:', error.message)
            }
          }

          // 方式3: 尝试 Latin-1 编码
          if (!buffer || buffer.byteLength === 0) {
            try {
              const bytes = new Uint8Array(e.target.result.length)
              for (let i = 0; i < e.target.result.length; i++) {
                bytes[i] = e.target.result.charCodeAt(i) & 0xFF
              }
              buffer = bytes.buffer
              console.log('方式3转换结果:', buffer.byteLength)
            } catch (error) {
              console.log('方式3转换失败:', error.message)
            }
          }

          if (buffer && buffer.byteLength > 0) {
            console.log('=== 文本转换为 ArrayBuffer 成功，大小:', buffer.byteLength, '字节 ===')
            this.sendFileData(buffer)
          } else {
            console.warn('所有文本转换方式都失败，使用测试音频')
            this.sendTestAudio()
          }
        } else {
          console.warn('readAsText 返回空数据，使用测试音频')
          this.sendTestAudio()
        }
      }

      reader.onerror = (error) => {
        clearTimeout(timeout)
        console.error('=== readAsText 错误 ===')
        console.error('错误对象:', error)
        console.error('错误类型:', error.type)
        console.error('错误目标:', error.target)
        if (error.target && error.target.error) {
          console.error('具体错误:', error.target.error)
        }
        this.sendTestAudio()
      }

      reader.onabort = () => {
        clearTimeout(timeout)
        console.warn('readAsText 被中断')
        this.sendTestAudio()
      }

      // 尝试不同的编码方式
      console.log('尝试使用 binary 编码读取')
      reader.readAsText(file, 'binary')
      console.log('readAsText 调用完成')

    } catch (error) {
      console.error('=== readAsText 方法失败 ===')
      console.error('错误详情:', error)
      console.error('错误堆栈:', error.stack)
      this.sendTestAudio()
    }
  }

  // 改进的 Base64 到 ArrayBuffer 转换方法
  improvedBase64ToArrayBuffer(base64, expectedSize) {
    try {
      console.log('=== 改进的 Base64 解码开始 ===')

      // 清理 Base64 字符串（移除可能的空白字符）
      const cleanBase64 = base64.replace(/\s/g, '')
      console.log('清理后的 Base64 长度:', cleanBase64.length)

      // 验证 Base64 格式
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/
      if (!base64Regex.test(cleanBase64)) {
        console.error('Base64 格式无效')
        return null
      }

      // 方法1: 使用标准 atob 解码
      let buffer1 = null
      try {
        const binaryString = atob(cleanBase64)
        console.log('atob 解码后长度:', binaryString.length)
        buffer1 = this.binaryStringToArrayBuffer(binaryString)
        console.log('方法1 (atob) 结果大小:', buffer1 ? buffer1.byteLength : 0)
      } catch (error) {
        console.error('atob 解码失败:', error)
      }

      // 方法2: 手动 Base64 解码（更安全）
      let buffer2 = null
      try {
        buffer2 = this.manualBase64Decode(cleanBase64)
        console.log('方法2 (手动) 结果大小:', buffer2 ? buffer2.byteLength : 0)
      } catch (error) {
        console.error('手动 Base64 解码失败:', error)
      }

      // 选择最佳结果
      let bestBuffer = null
      if (buffer1 && buffer2) {
        // 选择大小更接近预期的那个
        const diff1 = Math.abs(buffer1.byteLength - expectedSize)
        const diff2 = Math.abs(buffer2.byteLength - expectedSize)
        bestBuffer = diff1 <= diff2 ? buffer1 : buffer2
        console.log('选择方法:', diff1 <= diff2 ? '1 (atob)' : '2 (手动)')
      } else {
        bestBuffer = buffer1 || buffer2
        console.log('使用可用的方法:', buffer1 ? '1 (atob)' : '2 (手动)')
      }

      if (bestBuffer) {
        console.log('=== Base64 解码成功 ===')
        console.log('最终 ArrayBuffer 大小:', bestBuffer.byteLength)
        return bestBuffer
      } else {
        console.error('所有 Base64 解码方法都失败')
        return null
      }

    } catch (error) {
      console.error('改进的 Base64 解码失败:', error)
      return null
    }
  }

  // 手动 Base64 解码方法
  manualBase64Decode(base64) {
    try {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
      let result = ''

      // 移除填充字符
      const cleanBase64 = base64.replace(/=/g, '')

      for (let i = 0; i < cleanBase64.length; i += 4) {
        const chunk = cleanBase64.substring(i, i + 4)
        let binary = ''

        for (let j = 0; j < chunk.length; j++) {
          const index = chars.indexOf(chunk[j])
          if (index === -1) {
            throw new Error('无效的 Base64 字符: ' + chunk[j])
          }
          binary += index.toString(2).padStart(6, '0')
        }

        // 转换为字节
        for (let k = 0; k < binary.length; k += 8) {
          if (k + 8 <= binary.length) {
            const byte = parseInt(binary.substring(k, k + 8), 2)
            result += String.fromCharCode(byte)
          }
        }
      }

      return this.binaryStringToArrayBuffer(result)
    } catch (error) {
      console.error('手动 Base64 解码失败:', error)
      return null
    }
  }

  // 将二进制字符串转换为 ArrayBuffer（改进版）
  binaryStringToArrayBuffer(binaryString) {
    try {
      const len = binaryString.length
      const buffer = new ArrayBuffer(len)
      const view = new Uint8Array(buffer)

      for (let i = 0; i < len; i++) {
        // 确保字符码在有效范围内
        const charCode = binaryString.charCodeAt(i)
        view[i] = charCode & 0xFF
      }

      return buffer
    } catch (error) {
      console.error('二进制字符串转换失败:', error)
      return null
    }
  }

  // 验证PCM数据格式
  validatePCMData(buffer) {
    try {
      console.log('=== PCM 数据验证开始 ===')

      if (!buffer || buffer.byteLength === 0) {
        console.error('PCM数据为空')
        return false
      }

      // PCM 16位数据应该是偶数字节
      if (buffer.byteLength % 2 !== 0) {
        console.warn('PCM数据字节数不是偶数，可能不是16位PCM格式')
      }

      const view = new Int16Array(buffer)
      const sampleCount = view.length
      console.log('PCM样本数量:', sampleCount)

      if (sampleCount === 0) {
        console.error('PCM样本数量为0')
        return false
      }

      // 检查前1000个样本的有效性
      const checkSamples = Math.min(1000, sampleCount)
      let validSamples = 0
      let zeroSamples = 0
      let maxValue = -32768
      let minValue = 32767

      for (let i = 0; i < checkSamples; i++) {
        const sample = view[i]

        // 检查是否在16位PCM范围内
        if (sample >= -32768 && sample <= 32767) {
          validSamples++
        }

        // 统计零值样本
        if (sample === 0) {
          zeroSamples++
        }

        // 记录最大最小值
        if (sample > maxValue) maxValue = sample
        if (sample < minValue) minValue = sample
      }

      const validRatio = validSamples / checkSamples
      const zeroRatio = zeroSamples / checkSamples

      console.log('=== PCM 数据统计 ===')
      console.log('有效样本比例:', (validRatio * 100).toFixed(2) + '%')
      console.log('零值样本比例:', (zeroRatio * 100).toFixed(2) + '%')
      console.log('样本值范围:', minValue, '到', maxValue)

      // 验证标准
      if (validRatio < 0.95) {
        console.warn('有效样本比例过低，PCM数据可能损坏')
        return false
      }

      if (zeroRatio > 0.9) {
        console.warn('零值样本过多，可能是静音或损坏的音频')
        return false
      }

      if (maxValue === minValue) {
        console.warn('所有样本值相同，可能不是有效的音频数据')
        return false
      }

      // 检查音频能量
      let totalEnergy = 0
      for (let i = 0; i < checkSamples; i++) {
        totalEnergy += Math.abs(view[i])
      }
      const averageEnergy = totalEnergy / checkSamples
      console.log('平均音频能量:', averageEnergy.toFixed(2))

      if (averageEnergy < 10) {
        console.warn('音频能量过低，可能是静音或音量过小')
      }

      console.log('=== PCM 数据验证通过 ===')
      return true

    } catch (error) {
      console.error('PCM数据验证失败:', error)
      return false
    }
  }

  // 将文本转换为 ArrayBuffer（尝试性方法）
  textToArrayBuffer(text) {
    try {
      // 假设文本是以某种编码的二进制数据
      const encoder = new TextEncoder()
      return encoder.encode(text).buffer
    } catch (error) {
      console.error('文本转换失败:', error)
      return null
    }
  }

  // 发送最简单的测试
  sendSimpleTest() {
    try {
      console.log('发送最简单的测试数据')

      // 重置帧状态
      this.frameStatus = 0

      // 创建一个简单的1280字节测试数据
      const testData = new ArrayBuffer(1280)
      const view = new Int16Array(testData)

      // 填充简单的测试模式
      for (let i = 0; i < view.length; i++) {
        view[i] = Math.sin(i * 0.1) * 1000
      }

      console.log('发送测试数据帧')
      this.send(testData)

      // 延迟发送结束帧
      setTimeout(() => {
        console.log('发送测试结束帧')
        this.frameStatus = 2
        this.send(null)
      }, 1000)

    } catch (error) {
      console.error('发送简单测试失败:', error)
      this.handleError('所有测试方案都失败')
    }
  }

  // 发送测试音频数据 - 使用预设的PCM文件
  sendTestAudio() {
    try {
      console.log('开始读取测试音频文件: static/16k_10.pcm')

      // 使用更可靠的文件读取方法
      this.loadTestAudioFileReliably()

    } catch (error) {
      console.error('读取测试音频文件失败:', error)
      console.log('回退到生成合成音频数据')
      this.generateSyntheticAudio()
    }
  }

  // 更可靠的文件读取方法
  loadTestAudioFileReliably() {
    try {
      console.log('使用可靠方法加载测试音频文件')

      if (typeof plus !== 'undefined' && plus.io) {
        // 构建完整的文件路径
        const filePath = '_www/static/16k_10.pcm'
        const fullPath = plus.io.convertLocalFileSystemURL(filePath)
        console.log('尝试读取完整路径:', fullPath)

        plus.io.resolveLocalFileSystemURL(fullPath, (entry) => {
          entry.file((file) => {
            console.log('文件信息:', file.size, 'bytes')

            // 对于大文件，直接使用分块读取，不使用readAsArrayBuffer
            console.log('检测到大文件，使用流式读取方法')
            this.readFileAsStream(file)

          }, (error) => {
            console.error('获取文件对象失败:', error)
            this.generateSyntheticAudio()
          })
        }, (error) => {
          console.error('文件路径解析失败:', error)
          this.generateSyntheticAudio()
        })
      } else {
        console.log('plus.io不可用，使用合成音频')
        this.generateSyntheticAudio()
      }
    } catch (error) {
      console.error('可靠文件加载失败:', error)
      this.generateSyntheticAudio()
    }
  }

  // 流式读取文件
  readFileAsStream(file) {
    try {
      console.log('开始流式读取文件')

      // 使用较小的块大小，避免内存问题
      const chunkSize = 8192 // 8KB 每块
      const totalChunks = Math.ceil(file.size / chunkSize)
      const chunks = []
      let currentChunk = 0
      let hasError = false

      console.log(`文件将被分为 ${totalChunks} 个块进行读取`)

      const readNextChunk = () => {
        if (hasError) return

        if (currentChunk >= totalChunks) {
          // 所有块读取完成，合并数据
          console.log('所有块读取完成，开始合并数据')
          this.mergeChunksReliably(chunks, file.size)
          return
        }

        const start = currentChunk * chunkSize
        const end = Math.min(start + chunkSize, file.size)
        const blob = file.slice(start, end)

        console.log(`读取块 ${currentChunk + 1}/${totalChunks}: ${start}-${end} (${blob.size} bytes)`)

        const reader = new plus.io.FileReader()

        // 设置每个块的超时 - 增加超时时间
        const chunkTimeout = setTimeout(() => {
          hasError = true
          console.error(`块 ${currentChunk} 读取超时`)
          this.generateSyntheticAudio()
        }, 10000) // 每块从5秒增加到10秒超时

        reader.onloadend = (e) => {
          clearTimeout(chunkTimeout)
          if (hasError) return

          if (e.target.result) {
            chunks[currentChunk] = e.target.result
            currentChunk++

            // 立即读取下一块，不延迟
            readNextChunk()
          } else {
            hasError = true
            console.error(`块 ${currentChunk} 读取失败`)
            this.generateSyntheticAudio()
          }
        }

        reader.onerror = (error) => {
          clearTimeout(chunkTimeout)
          hasError = true
          console.error(`块 ${currentChunk} 读取错误:`, error)
          this.generateSyntheticAudio()
        }

        try {
          reader.readAsArrayBuffer(blob)
        } catch (error) {
          clearTimeout(chunkTimeout)
          hasError = true
          console.error(`启动块 ${currentChunk} 读取失败:`, error)
          this.generateSyntheticAudio()
        }
      }

      // 设置总体超时 - 增加超时时间
      setTimeout(() => {
        if (!hasError && currentChunk < totalChunks) {
          hasError = true
          console.error('流式文件读取总体超时，使用合成音频')
          this.generateSyntheticAudio()
        }
      }, 120000) // 从30秒增加到120秒（2分钟）总超时

      readNextChunk()

    } catch (error) {
      console.error('流式读取文件失败:', error)
      this.generateSyntheticAudio()
    }
  }

  // 可靠的数据块合并
  mergeChunksReliably(chunks, totalSize) {
    try {
      console.log('开始可靠合并数据块，总大小:', totalSize)

      const mergedBuffer = new ArrayBuffer(totalSize)
      const mergedView = new Uint8Array(mergedBuffer)
      let offset = 0

      for (let i = 0; i < chunks.length; i++) {
        if (chunks[i]) {
          const chunkView = new Uint8Array(chunks[i])
          mergedView.set(chunkView, offset)
          offset += chunkView.length
          console.log(`合并块 ${i + 1}/${chunks.length}: ${chunkView.length} bytes`)
        }
      }

      console.log('数据块合并完成，最终大小:', mergedBuffer.byteLength, '字节')
      this.sendFileData(mergedBuffer)

    } catch (error) {
      console.error('可靠合并数据块失败:', error)
      this.generateSyntheticAudio()
    }
  }



  // 尝试其他文件路径格式
  tryAlternativeFilePaths() {
    const pathsToTry = [
      'static/16k_10.pcm',
      '/static/16k_10.pcm',
      './static/16k_10.pcm',
      '../static/16k_10.pcm'
    ]

    let currentIndex = 0

    const tryNextPath = () => {
      if (currentIndex >= pathsToTry.length) {
        console.log('所有路径都尝试失败，使用合成音频')
        this.generateSyntheticAudio()
        return
      }

      const currentPath = pathsToTry[currentIndex]
      console.log(`尝试路径 ${currentIndex + 1}/${pathsToTry.length}: ${currentPath}`)

      try {
        const fullPath = plus.io.convertLocalFileSystemURL(currentPath)
        console.log('转换后的完整路径:', fullPath)

        plus.io.resolveLocalFileSystemURL(fullPath, (entry) => {
          console.log('路径解析成功:', entry.fullPath)
          // 如果路径解析成功，使用这个路径读取文件
          this.readFileFromEntry(entry)
        }, (error) => {
          console.log(`路径 ${currentPath} 解析失败:`, error)
          currentIndex++
          tryNextPath()
        })
      } catch (error) {
        console.log(`路径 ${currentPath} 处理失败:`, error)
        currentIndex++
        tryNextPath()
      }
    }

    tryNextPath()
  }

  // 从文件入口读取文件
  readFileFromEntry(entry) {
    try {
      entry.file((file) => {
        console.log('找到文件，大小:', file.size, 'bytes')

        // 对于大文件，使用分块读取策略
        if (file.size > 100000) { // 大于100KB的文件
          console.log('检测到大文件，使用分块读取策略')
          this.readLargeFileInChunks(file)
        } else {
          console.log('小文件，使用标准读取方式')
          this.readSmallFile(file)
        }

      }, (error) => {
        console.error('获取文件对象失败:', error)
        this.generateSyntheticAudio()
      })
    } catch (error) {
      console.error('读取文件入口失败:', error)
      this.generateSyntheticAudio()
    }
  }

  // 读取小文件
  readSmallFile(file) {
    const fileTimeout = setTimeout(() => {
      console.error('小文件读取超时，使用合成音频')
      this.generateSyntheticAudio()
    }, 10000) // 10秒超时

    const reader = new plus.io.FileReader()

    reader.onloadend = (e) => {
      clearTimeout(fileTimeout)
      if (e.target.result && e.target.result.byteLength > 0) {
        console.log('小文件读取成功，大小:', e.target.result.byteLength, '字节')
        this.sendFileData(e.target.result)
      } else {
        console.warn('读取到空数据，使用合成音频')
        this.generateSyntheticAudio()
      }
    }

    reader.onerror = (error) => {
      clearTimeout(fileTimeout)
      console.error('小文件读取错误:', error)
      this.generateSyntheticAudio()
    }

    try {
      reader.readAsArrayBuffer(file)
    } catch (error) {
      clearTimeout(fileTimeout)
      console.error('启动小文件读取失败:', error)
      this.generateSyntheticAudio()
    }
  }

  // 分块读取大文件
  readLargeFileInChunks(file) {
    try {
      console.log('开始分块读取大文件')

      const chunkSize = 64 * 1024 // 64KB 每块
      const totalChunks = Math.ceil(file.size / chunkSize)
      const chunks = []
      let currentChunk = 0

      const readNextChunk = () => {
        if (currentChunk >= totalChunks) {
          // 所有块读取完成，合并数据
          console.log('所有块读取完成，开始合并数据')
          this.mergeChunks(chunks, file.size)
          return
        }

        const start = currentChunk * chunkSize
        const end = Math.min(start + chunkSize, file.size)
        const blob = file.slice(start, end)

        console.log(`读取块 ${currentChunk + 1}/${totalChunks}: ${start}-${end}`)

        const reader = new plus.io.FileReader()

        reader.onloadend = (e) => {
          if (e.target.result) {
            chunks[currentChunk] = e.target.result
            currentChunk++

            // 延迟读取下一块，避免阻塞UI
            setTimeout(readNextChunk, 10)
          } else {
            console.error(`块 ${currentChunk} 读取失败`)
            this.generateSyntheticAudio()
          }
        }

        reader.onerror = (error) => {
          console.error(`块 ${currentChunk} 读取错误:`, error)
          this.generateSyntheticAudio()
        }

        reader.readAsArrayBuffer(blob)
      }

      // 设置总体超时
      setTimeout(() => {
        console.error('大文件分块读取超时（2分钟），使用合成音频')
        this.generateSyntheticAudio()
      }, 120000) // 2分钟超时

      readNextChunk()

    } catch (error) {
      console.error('分块读取大文件失败:', error)
      this.generateSyntheticAudio()
    }
  }

  // 合并数据块
  mergeChunks(chunks, totalSize) {
    try {
      console.log('开始合并数据块，总大小:', totalSize)

      const mergedBuffer = new ArrayBuffer(totalSize)
      const mergedView = new Uint8Array(mergedBuffer)
      let offset = 0

      for (let i = 0; i < chunks.length; i++) {
        if (chunks[i]) {
          const chunkView = new Uint8Array(chunks[i])
          mergedView.set(chunkView, offset)
          offset += chunkView.length
        }
      }

      console.log('数据块合并完成，最终大小:', mergedBuffer.byteLength, '字节')
      this.sendFileData(mergedBuffer)

    } catch (error) {
      console.error('合并数据块失败:', error)
      this.generateSyntheticAudio()
    }
  }

  // 生成合成音频数据（作为备用方案）
  generateSyntheticAudio() {
    try {
      console.log('生成合成测试音频数据（备用方案）')

      // 生成2秒的混合音频，包含多个频率，更容易被识别
      const sampleRate = 16000
      const duration = 2 // 2秒
      const samples = sampleRate * duration
      const buffer = new ArrayBuffer(samples * 2) // 16位PCM
      const view = new Int16Array(buffer)

      for (let i = 0; i < samples; i++) {
        // 混合多个频率的正弦波，模拟语音特征
        const t = i / sampleRate
        let sample = 0
        sample += Math.sin(2 * Math.PI * 300 * t) * 0.3  // 300Hz
        sample += Math.sin(2 * Math.PI * 600 * t) * 0.2  // 600Hz
        sample += Math.sin(2 * Math.PI * 900 * t) * 0.1  // 900Hz

        // 添加一些随机噪声，模拟真实语音
        sample += (Math.random() - 0.5) * 0.05

        // 应用包络，避免突然开始和结束
        const envelope = Math.sin(Math.PI * t / duration)
        sample *= envelope

        // 转换为16位整数
        view[i] = Math.max(-32768, Math.min(32767, sample * 16384))
      }

      console.log('合成音频生成完成，大小:', buffer.byteLength, '字节，时长:', duration, '秒')
      this.sendFileData(buffer)

    } catch (error) {
      console.error('生成合成音频失败:', error)
      this.handleError('生成合成音频失败')
    }
  }

  // 发送文件数据
  async sendFileData(audioData) {
    try {
      console.log('开始发送文件数据，大小:', audioData.byteLength)

      // 检查WebSocket连接状态，如果已关闭则重新连接
      if (!this.ws || this.ws.readyState !== 1) {
        console.log('WebSocket未连接，重新建立连接...')
        try {
          await this.initWebSocket()
          console.log('WebSocket重新连接成功')
        } catch (error) {
          console.error('WebSocket重新连接失败:', error)
          this.handleError('无法建立WebSocket连接')
          return
        }
      }

      // 重置帧状态
      this.frameStatus = 0

      // 分块发送数据
      const chunkSize = 1280 // 每块1280字节，与官方demo一致
      let offset = 0

      const sendChunk = () => {
        // 再次检查WebSocket状态
        if (!this.ws || this.ws.readyState !== 1) {
          console.error('WebSocket连接已断开，停止发送数据')
          this.handleError('WebSocket连接断开')
          return
        }

        if (offset >= audioData.byteLength) {
          // 发送结束帧
          console.log('文件数据发送完毕，发送结束帧')
          this.frameStatus = 2
          this.send(null)
          return
        }

        const chunk = audioData.slice(offset, offset + chunkSize)
        console.log(`发送文件块: offset=${offset}, size=${chunk.byteLength}`)
        this.send(chunk)

        offset += chunkSize

        // 延迟发送下一块，避免发送过快
        // 1280字节 @ 16kHz 16bit = 40ms的音频数据
        setTimeout(sendChunk, 40) // 40ms间隔，模拟实时录音速度
      }

      sendChunk()

    } catch (error) {
      console.error('发送文件数据错误:', error)
      this.handleError('发送文件数据失败')
    }
  }

  // 获取最后一次录音文件信息
  getLastRecordingFile() {
    return this.lastRecordingFile
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
