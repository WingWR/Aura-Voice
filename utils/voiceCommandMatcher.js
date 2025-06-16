// 语音指令匹配工具 - 基于Searchindex.js的逻辑，适配前端环境
import instructionMap from '../stores/instructionMap.json'

console.log('[语音指令匹配器] 已加载指令映射表:', instructionMap)

// 关键词分类
const keywords = {
  locations: ["客厅", "卧室", "厨房", "卫生间", "书房"],
  devices: ["灯", "灯光", "空调", "音响", "氛围灯"],
  actions: [
    "打开", "关闭", "开启", "关掉", "启动", "停止", 
    "加大", "降低", "转换", "调节", "设置"
  ],
  connectors: ["和", "还有", "以及", "与", "跟", "同时", "一起"],
  colors: ["颜色", "红色", "蓝色", "绿色", "白色", "黄色"],
  music: ["歌", "音乐", "播放"]
}

// 构建搜索列表
const commandList = Object.entries(instructionMap).map(([code, text]) => ({
  code,
  text
}))

/**
 * 文本预处理函数
 * @param {string} text - 原始文本
 * @returns {string} - 处理后的文本
 */
function preprocessText(text) {
  // 移除标点符号和多余空格
  return text.replace(/[，。！？、；：""''（）【】]/g, "").replace(/\s+/g, "")
}

/**
 * 提取关键词
 * @param {string} text - 输入文本
 * @returns {Object} - 提取的关键词分类
 */
function extractKeywords(text) {
  const processed = preprocessText(text)
  const extracted = {
    locations: [],
    devices: [],
    actions: [],
    connectors: [],
    colors: [],
    music: []
  }

  for (const [category, words] of Object.entries(keywords)) {
    for (const word of words) {
      if (processed.includes(word)) {
        extracted[category].push(word)
      }
    }
  }

  return extracted
}

/**
 * 分割多命令输入
 * @param {string} input - 输入文本
 * @returns {Array} - 分割后的命令数组
 */
function splitMultipleCommands(input) {
  const processed = preprocessText(input)
  const connectorPattern = new RegExp(
    `(${keywords.connectors.join("|")})`,
    "g"
  )

  // 先按连接词分割
  let parts = processed
    .split(connectorPattern)
    .filter(
      (part) => part.trim() && !keywords.connectors.includes(part.trim())
    )

  // 如果没有明显的连接词，尝试识别重复的动作模式
  if (parts.length === 1) {
    const actionPattern = new RegExp(`(${keywords.actions.join("|")})`, "g")
    const actions = processed.match(actionPattern) || []

    if (actions.length > 1) {
      // 尝试按动作词分割
      parts = processed.split(actionPattern).filter((part) => part.trim())
      // 重新组合，确保每部分都包含动作
      const newParts = []
      for (let i = 0; i < parts.length - 1; i++) {
        if (actions[i]) {
          newParts.push(actions[i] + parts[i + 1])
        }
      }
      parts = newParts.length > 0 ? newParts : [processed]
    }
  }

  return parts.length > 1 ? parts : [input]
}

/**
 * 灵活匹配单个命令
 * @param {string} input - 输入文本
 * @param {Object} commandItem - 命令项
 * @returns {number} - 匹配得分
 */
function flexibleMatch(input, commandItem) {
  const inputKeywords = extractKeywords(input)
  const commandKeywords = extractKeywords(commandItem.text)

  let score = 0
  let totalWeight = 0

  // 权重设置
  const locationWeight = 3
  const deviceWeight = 2
  const actionWeight = 2
  const otherWeight = 1

  // 检查位置匹配
  for (const location of inputKeywords.locations) {
    totalWeight += locationWeight
    if (commandKeywords.locations.includes(location)) {
      score += locationWeight
    }
  }

  // 检查设备匹配
  for (const device of inputKeywords.devices) {
    totalWeight += deviceWeight
    if (commandKeywords.devices.includes(device)) {
      score += deviceWeight
    }
  }

  // 检查动作匹配
  for (const action of inputKeywords.actions) {
    totalWeight += actionWeight
    if (commandKeywords.actions.includes(action)) {
      score += actionWeight
    }
  }

  // 检查其他关键词
  for (const category of ["colors", "music"]) {
    for (const keyword of inputKeywords[category]) {
      totalWeight += otherWeight
      if (commandKeywords[category].includes(keyword)) {
        score += otherWeight
      }
    }
  }

  return totalWeight > 0 ? score / totalWeight : 0
}

/**
 * 简单的模糊匹配算法
 * @param {string} input - 输入文本
 * @param {string} target - 目标文本
 * @returns {number} - 相似度得分 (0-1)
 */
function fuzzyMatch(input, target) {
  const inputProcessed = preprocessText(input)
  const targetProcessed = preprocessText(target)
  
  if (inputProcessed === targetProcessed) return 1.0
  
  // 计算编辑距离
  const matrix = []
  const inputLen = inputProcessed.length
  const targetLen = targetProcessed.length
  
  for (let i = 0; i <= inputLen; i++) {
    matrix[i] = [i]
  }
  
  for (let j = 0; j <= targetLen; j++) {
    matrix[0][j] = j
  }
  
  for (let i = 1; i <= inputLen; i++) {
    for (let j = 1; j <= targetLen; j++) {
      if (inputProcessed[i - 1] === targetProcessed[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,     // 删除
          matrix[i][j - 1] + 1,     // 插入
          matrix[i - 1][j - 1] + 1  // 替换
        )
      }
    }
  }
  
  const distance = matrix[inputLen][targetLen]
  const maxLen = Math.max(inputLen, targetLen)
  
  return maxLen > 0 ? 1 - (distance / maxLen) : 0
}

/**
 * 增强的指令匹配函数
 * @param {string} input - 输入文本
 * @returns {Array} - 匹配结果数组
 */
export function matchCommand(input) {
  const commands = splitMultipleCommands(input)
  const results = []

  for (const command of commands) {
    const trimmedCommand = command.trim()
    if (!trimmedCommand) continue

    // 先尝试精确匹配
    const exactMatch = commandList.find((item) => item.text === trimmedCommand)
    if (exactMatch) {
      results.push({
        signal: exactMatch.code,
        matchedCommand: exactMatch.text,
        matchType: "exact",
        score: 1.0,
        input: trimmedCommand
      })
      continue
    }

    // 灵活匹配
    const flexibleMatches = commandList
      .map((item) => ({
        ...item,
        flexScore: flexibleMatch(trimmedCommand, item)
      }))
      .filter((item) => item.flexScore > 0.3)
      .sort((a, b) => b.flexScore - a.flexScore)

    if (flexibleMatches.length > 0) {
      results.push({
        signal: flexibleMatches[0].code,
        matchedCommand: flexibleMatches[0].text,
        matchType: "flexible",
        score: flexibleMatches[0].flexScore,
        input: trimmedCommand
      })
      continue
    }

    // 模糊匹配作为后备
    const fuzzyMatches = commandList
      .map((item) => ({
        ...item,
        fuzzyScore: fuzzyMatch(trimmedCommand, item.text)
      }))
      .filter((item) => item.fuzzyScore > 0.6)
      .sort((a, b) => b.fuzzyScore - a.fuzzyScore)

    if (fuzzyMatches.length > 0) {
      results.push({
        signal: fuzzyMatches[0].code,
        matchedCommand: fuzzyMatches[0].text,
        matchType: "fuzzy",
        score: fuzzyMatches[0].fuzzyScore,
        input: trimmedCommand
      })
    } else {
      results.push({
        error: "未找到匹配的指令",
        input: trimmedCommand
      })
    }
  }

  return results
}

/**
 * 向后兼容的单命令匹配函数
 * @param {string} input - 输入文本
 * @returns {Object} - 匹配结果
 */
export function matchSingleCommand(input) {
  const results = matchCommand(input)
  return results.length > 0 ? results[0] : { error: "未找到匹配的指令" }
}

/**
 * 获取指令映射表
 * @returns {Object} - 指令映射表
 */
export function getInstructionMap() {
  return instructionMap
}

/**
 * 获取所有可用指令列表
 * @returns {Array} - 指令列表
 */
export function getAvailableCommands() {
  return commandList
}

/**
 * 测试语音指令匹配
 * @param {string} input - 测试输入
 * @returns {Object} - 测试结果
 */
export function testVoiceCommand(input) {
  console.log(`[语音指令测试] 输入: "${input}"`)
  
  const results = matchCommand(input)
  
  console.log(`[语音指令测试] 找到 ${results.length} 个匹配结果:`)
  results.forEach((result, index) => {
    if (result.error) {
      console.log(`  ${index + 1}. 错误: ${result.error}`)
    } else {
      console.log(`  ${index + 1}. 信号: ${result.signal}, 命令: "${result.matchedCommand}"`)
      console.log(`     匹配类型: ${result.matchType}, 得分: ${result.score.toFixed(3)}`)
    }
  })
  
  return results
}

// 导出工具函数
export {
  extractKeywords,
  splitMultipleCommands,
  flexibleMatch,
  fuzzyMatch,
  preprocessText
}
