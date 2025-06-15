// 讯飞语音识别配置
export const XUNFEI_CONFIG = {
  // 讯飞开放平台的应用ID - 请在讯飞开放平台获取
  APPID: 'b2130caa',
  // API密钥 - 请在讯飞开放平台获取
  API_KEY: 'b2db6325b4fc4abf8f4f240520040f6c',
  // API密钥 - 请在讯飞开放平台获取
  API_SECRET: 'NmIxZDcxODgwNjIyNWU1NGIxOTRmZjc1',
  // WebSocket地址
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