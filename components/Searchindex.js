const Fuse = require("fuse.js");
const fs = require("fs");
const path = require("path");

// 读取指令对照表
let instructionMap;
try {
  const instructionMapPath = path.join(__dirname, "../stores/instructionMap.json");
  instructionMap = JSON.parse(fs.readFileSync(instructionMapPath, "utf8"));
} catch (error) {
  console.error("读取指令对照表失败:", error);
  instructionMap = {};
}

// 构建搜索列表
const commandList = Object.entries(instructionMap).map(([code, text]) => ({
  code,
  text,
}));

// 创建 Fuse 实例
const fuse = new Fuse(commandList, {
  keys: ["text"],
  threshold: 0.6,
  includeScore: true,
});

// 输入接口
const readline = require("readline").createInterface({
  input: process.stdin,
  output: process.stdout,
});

// 关键词提取和分类
const keywords = {
  locations: ["客厅", "卧室", "厨房", "卫生间", "书房"],
  devices: ["灯", "灯光", "空调", "音响", "氛围灯"],
  actions: [
    "打开",
    "关闭",
    "开启",
    "关掉",
    "启动",
    "停止",
    "加大",
    "降低",
    "转换",
  ],
  connectors: ["和", "还有", "以及", "与", "跟", "同时", "一起"],
  colors: ["颜色", "红色", "蓝色", "绿色", "白色", "黄色"],
  music: ["歌", "音乐", "播放"],
};

// 文本预处理函数
function preprocessText(text) {
  // 移除标点符号和多余空格
  return text.replace(/[，。！？、；：""''（）【】]/g, "").replace(/\s+/g, "");
}

// 提取关键词
function extractKeywords(text) {
  const processed = preprocessText(text);
  const extracted = {
    locations: [],
    devices: [],
    actions: [],
    connectors: [],
    colors: [],
    music: [],
  };

  for (const [category, words] of Object.entries(keywords)) {
    for (const word of words) {
      if (processed.includes(word)) {
        extracted[category].push(word);
      }
    }
  }

  return extracted;
}

// 分割多命令输入
function splitMultipleCommands(input) {
  const processed = preprocessText(input);
  const connectorPattern = new RegExp(
    `(${keywords.connectors.join("|")})`,
    "g"
  );

  // 先按连接词分割
  let parts = processed
    .split(connectorPattern)
    .filter(
      (part) => part.trim() && !keywords.connectors.includes(part.trim())
    );

  // 如果没有明显的连接词，尝试识别重复的动作模式
  if (parts.length === 1) {
    const actionPattern = new RegExp(`(${keywords.actions.join("|")})`, "g");
    const actions = processed.match(actionPattern) || [];

    if (actions.length > 1) {
      // 尝试按动作词分割
      parts = processed.split(actionPattern).filter((part) => part.trim());
      // 重新组合，确保每部分都包含动作
      const newParts = [];
      for (let i = 0; i < parts.length - 1; i++) {
        if (actions[i]) {
          newParts.push(actions[i] + parts[i + 1]);
        }
      }
      parts = newParts.length > 0 ? newParts : [processed];
    }
  }

  return parts.length > 1 ? parts : [input];
}

// 灵活匹配单个命令
function flexibleMatch(input, commandItem) {
  const inputKeywords = extractKeywords(input);
  const commandKeywords = extractKeywords(commandItem.text);

  let score = 0;
  let totalWeight = 0;

  // 位置匹配权重最高
  const locationWeight = 3;
  const deviceWeight = 2;
  const actionWeight = 2;
  const otherWeight = 1;

  // 检查位置匹配
  for (const location of inputKeywords.locations) {
    totalWeight += locationWeight;
    if (commandKeywords.locations.includes(location)) {
      score += locationWeight;
    }
  }

  // 检查设备匹配
  for (const device of inputKeywords.devices) {
    totalWeight += deviceWeight;
    if (commandKeywords.devices.includes(device)) {
      score += deviceWeight;
    }
  }

  // 检查动作匹配
  for (const action of inputKeywords.actions) {
    totalWeight += actionWeight;
    if (commandKeywords.actions.includes(action)) {
      score += actionWeight;
    }
  }

  // 检查其他关键词
  for (const category of ["colors", "music"]) {
    for (const keyword of inputKeywords[category]) {
      totalWeight += otherWeight;
      if (commandKeywords[category].includes(keyword)) {
        score += otherWeight;
      }
    }
  }

  return totalWeight > 0 ? score / totalWeight : 0;
}

// 增强的指令匹配函数
function matchCommand(input) {
  const commands = splitMultipleCommands(input);
  const results = [];

  for (const command of commands) {
    const trimmedCommand = command.trim();
    if (!trimmedCommand) continue;

    // 先尝试精确匹配
    const exactMatch = commandList.find((item) => item.text === trimmedCommand);
    if (exactMatch) {
      results.push({
        signal: exactMatch.code,
        matchedCommand: exactMatch.text,
        matchType: "exact",
        score: 1.0,
        input: trimmedCommand,
      });
      continue;
    }

    // 灵活匹配
    const flexibleMatches = commandList
      .map((item) => ({
        ...item,
        flexScore: flexibleMatch(trimmedCommand, item),
      }))
      .filter((item) => item.flexScore > 0.3)
      .sort((a, b) => b.flexScore - a.flexScore);

    if (flexibleMatches.length > 0) {
      results.push({
        signal: flexibleMatches[0].code,
        matchedCommand: flexibleMatches[0].text,
        matchType: "flexible",
        score: flexibleMatches[0].flexScore,
        input: trimmedCommand,
      });
      continue;
    }

    // 模糊匹配作为后备
    const fuseResults = fuse.search(trimmedCommand);
    if (fuseResults.length > 0) {
      results.push({
        signal: fuseResults[0].item.code,
        matchedCommand: fuseResults[0].item.text,
        matchType: "fuzzy",
        score: 1 - fuseResults[0].score,
        input: trimmedCommand,
      });
    } else {
      results.push({
        error: "未找到匹配的指令",
        input: trimmedCommand,
      });
    }
  }

  return results;
}

// 向后兼容的单命令匹配函数
function matchSingleCommand(input) {
  const results = matchCommand(input);
  return results.length > 0 ? results[0] : { error: "未找到匹配的指令" };
}

// 演示函数
function demonstrateEnhancements() {
  console.log("=== 增强命令匹配系统演示 ===\n");

  const testCases = [
    "打开客厅灯", // 原始格式
    "客厅灯打开", // 词序变化
    "打开客厅和卧室的灯", // 多命令
    "客厅灯打开，还有卧室的灯", // 多命令不同表达
    "开启客厅灯光和音响", // 混合设备
    "关闭所有的灯", // 模糊匹配
    "播放音乐", // 部分匹配
    "转换客厅灯颜色", // 复杂命令
  ];

  testCases.forEach((testCase, index) => {
    console.log(`测试 ${index + 1}: "${testCase}"`);
    const results = matchCommand(testCase);

    if (results.length === 1 && results[0].error) {
      console.log(`  结果: ${results[0].error}`);
    } else {
      console.log(`  找到 ${results.length} 个匹配命令:`);
      results.forEach((result, i) => {
        console.log(
          `    ${i + 1}. 信号: ${result.signal}, 命令: "${
            result.matchedCommand
          }"`
        );
        console.log(
          `       匹配类型: ${result.matchType}, 得分: ${result.score.toFixed(
            3
          )}`
        );
      });
    }
    console.log("");
  });
}

// 交互式输入处理
function startInteractiveMode() {
  console.log("进入交互模式，输入 'demo' 查看演示，输入 'exit' 退出\n");

  function askForInput() {
    readline.question("请输入语音指令：", (userInput) => {
      const input = userInput.trim();

      if (input.toLowerCase() === "exit") {
        console.log("再见！");
        readline.close();
        return;
      }

      if (input.toLowerCase() === "demo") {
        demonstrateEnhancements();
        askForInput();
        return;
      }

      if (!input) {
        console.log("请输入有效的指令\n");
        askForInput();
        return;
      }

      console.log("\n=== 匹配结果 ===");
      const results = matchCommand(input);

      if (results.length === 1 && results[0].error) {
        console.log(`错误: ${results[0].error}`);
      } else {
        console.log(`找到 ${results.length} 个匹配命令:`);
        results.forEach((result, i) => {
          console.log(`\n命令 ${i + 1}:`);
          console.log(`  信号ID: ${result.signal}`);
          console.log(`  匹配命令: "${result.matchedCommand}"`);
          console.log(`  匹配类型: ${result.matchType}`);
          console.log(`  匹配得分: ${result.score.toFixed(3)}`);
          console.log(`  输入片段: "${result.input}"`);
        });
      }
      console.log("\n" + "=".repeat(50) + "\n");

      askForInput();
    });
  }

  askForInput();
}

// 导出函数供其他模块使用
module.exports = {
  matchCommand, // 主要的多命令匹配函数
  matchSingleCommand, // 向后兼容的单命令匹配函数
  extractKeywords, // 关键词提取
  splitMultipleCommands, // 多命令分割
  flexibleMatch, // 灵活匹配
  demonstrateEnhancements, // 演示功能
  getInstructionMap: () => instructionMap, // 添加获取指令映射的方法
};

// 如果直接运行此文件，启动交互模式
if (require.main === module) {
  startInteractiveMode();
}
