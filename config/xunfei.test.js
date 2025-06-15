// 讯飞语音识别测试配置
// 这是一个示例配置文件，请复制到 xunfei.js 并填入真实的API密钥

export const XUNFEI_CONFIG_EXAMPLE = {
  // 讯飞开放平台的应用ID - 示例格式
  APPID: '12345678', // 8位数字
  
  // API密钥 - 示例格式  
  API_KEY: 'abcd1234efgh5678ijkl9012mnop3456', // 32位字符串
  
  // API密钥 - 示例格式
  API_SECRET: 'AbCdEfGhIjKlMnOpQrStUvWxYz123456', // 32位字符串
  
  // WebSocket地址（无需修改）
  WS_URL: 'wss://iat-api.xfyun.cn/v2/iat',
  
  // 语音识别参数
  PARAMS: {
    common: {
      app_id: '', // 这里会在运行时被替换为实际的APPID
    },
    business: {
      language: 'zh_cn', // 中文
      domain: 'iat', // 领域
      accent: 'mandarin', // 普通话
      vad_eos: 3000, // 后端点检测时间，单位是毫秒
      dwa: 'wpgs', // 动态修正功能
    },
    data: {
      status: 0, // 音频的状态，0：第一帧音频、1：中间帧音频、2：最后一帧音频
      format: 'audio/L16;rate=16000', // 音频格式
      encoding: 'raw', // 音频编码
      audio: '', // 音频数据，base64编码
    }
  }
}

// 配置验证函数
export function validateXunfeiConfig(config) {
  const errors = []
  
  if (!config.APPID || config.APPID === 'YOUR_APPID_HERE') {
    errors.push('APPID未配置或使用默认值')
  }
  
  if (!config.API_KEY || config.API_KEY === 'YOUR_API_KEY_HERE') {
    errors.push('API_KEY未配置或使用默认值')
  }
  
  if (!config.API_SECRET || config.API_SECRET === 'YOUR_API_SECRET_HERE') {
    errors.push('API_SECRET未配置或使用默认值')
  }
  
  if (config.APPID && !/^\d{8}$/.test(config.APPID)) {
    errors.push('APPID格式不正确，应为8位数字')
  }
  
  if (config.API_KEY && config.API_KEY.length !== 32) {
    errors.push('API_KEY长度不正确，应为32位字符')
  }
  
  if (config.API_SECRET && config.API_SECRET.length !== 32) {
    errors.push('API_SECRET长度不正确，应为32位字符')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// 使用说明
console.log(`
📋 讯飞API配置说明：

1. 访问 https://www.xfyun.cn/ 注册账号
2. 创建语音听写应用
3. 获取 APPID、API_KEY、API_SECRET
4. 将密钥填入 config/xunfei.js 文件
5. 重新运行应用

⚠️  注意：请勿将真实的API密钥提交到代码仓库！
`)
