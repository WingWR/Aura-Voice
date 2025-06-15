# Aura-Voice 项目文档

## 项目概述

Aura-Voice 是一个智能语音控制系统，用于实现智能家居设备的语音控制。本项目采用模块化设计，支持多种设备控制和场景联动。

## 核心模块

### 1. 语音指令匹配模块

语音指令匹配模块是 Aura-Voice 的核心组件之一，负责将自然语言指令转换为对应的控制信号。

#### 1.1 功能特点

- 支持多命令识别（如"打开客厅灯和卧室灯"）
- 灵活的词序匹配（如"客厅灯打开"和"打开客厅灯"）
- 智能关键词提取
- 多种匹配模式：
  - 精确匹配
  - 灵活匹配（基于关键词权重）
  - 模糊匹配（使用 Fuse.js）
- 支持多种设备类型：
  - 灯光控制
  - 空调控制
  - 音响控制
  - 氛围灯控制

#### 1.2 安装依赖

确保项目中已安装必要的依赖：

```bash
npm install fuse.js
```

#### 1.3 使用方法

##### 1.3.1 导入组件

```javascript
const { matchCommand, matchSingleCommand } = require('./components/Searchindex');
```

##### 1.3.2 基本使用

```javascript
// 处理单个命令
const result = matchSingleCommand("打开客厅的灯");
console.log(result);
// 输出示例：
// {
//   signal: "1",
//   matchedCommand: "打开客厅的灯",
//   matchType: "exact",
//   score: 1.0,
//   input: "打开客厅的灯"
// }

// 处理多个命令
const results = matchCommand("打开客厅灯和卧室的灯");
console.log(results);
// 输出示例：
// [
//   {
//     signal: "1",
//     matchedCommand: "打开客厅的灯",
//     matchType: "flexible",
//     score: 0.85,
//     input: "打开客厅灯"
//   },
//   {
//     signal: "6",
//     matchedCommand: "打开卧室的灯",
//     matchType: "flexible",
//     score: 0.85,
//     input: "打开卧室的灯"
//   }
// ]
```

#### 1.4 指令映射配置

在 `stores/instructionMap.json` 中配置指令映射：

```json
{
  "1": "打开客厅的灯",
  "2": "加大客厅的灯光",
  "3": "降低客厅的灯光",
  "4": "转换客厅的灯光颜色",
  "5": "关闭客厅的灯光",
  "6": "打开卧室的灯",
  "7": "打开卧室的氛围灯",
  "8": "关闭卧室的灯",
  "9": "打开空调",
  "a": "关闭空调",
  "b": "打开音响，放一首歌",
  "c": "关闭音响"
}
```

#### 1.5 支持的关键词类型

系统支持以下类型的关键词：

- 位置：客厅、卧室、厨房、卫生间、书房
- 设备：灯、灯光、空调、音响、氛围灯
- 动作：打开、关闭、开启、关掉、启动、停止、加大、降低、转换
- 连接词：和、还有、以及、与、跟、同时、一起
- 颜色：颜色、红色、蓝色、绿色、白色、黄色
- 音乐：歌、音乐、播放

#### 1.6 错误处理

```javascript
const result = matchCommand("无效指令");
if (result.error) {
  console.error(result.error); // 输出：未找到匹配的指令
}
```

#### 1.7 高级功能

##### 1.7.1 关键词提取

```javascript
const { extractKeywords } = require('./components/Searchindex');
const keywords = extractKeywords("打开客厅的红色灯光");
console.log(keywords);
// 输出示例：
// {
//   locations: ["客厅"],
//   devices: ["灯", "灯光"],
//   actions: ["打开"],
//   colors: ["红色"],
//   ...
// }
```

##### 1.7.2 多命令分割

```javascript
const { splitMultipleCommands } = require('./components/Searchindex');
const commands = splitMultipleCommands("打开客厅灯和卧室的灯");
console.log(commands);
// 输出示例：
// ["打开客厅灯", "打开卧室的灯"]
```

#### 1.8 注意事项

1. 确保 `instructionMap.json` 文件路径正确
2. 添加新指令时，建议在 `instructionMap.json` 中使用有意义的信号ID
3. 系统会自动处理常见的同义词和不同表达方式
4. 匹配得分低于 0.3 的命令将被视为不匹配

#### 1.9 调试模式

可以通过运行 `Searchindex.js` 直接进入交互式调试模式：

```bash
node components/Searchindex.js
```

在调试模式中：
- 输入 `demo` 查看演示用例
- 输入 `exit` 退出程序
- 直接输入命令进行测试

## 其他模块

（此处将添加其他模块的文档）

## 项目贡献

1. Fork 项目
2. 创建特性分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 许可证

MIT License 