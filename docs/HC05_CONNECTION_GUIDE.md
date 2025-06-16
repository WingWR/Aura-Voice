# HC-05 蓝牙模块连接指南

## 🔵 问题分析

HC-05蓝牙模块在电脑上配对成功但无法连接的原因：

1. **协议差异**：HC-05使用经典蓝牙SPP协议，而Web Bluetooth API主要支持BLE
2. **驱动问题**：Windows可能没有正确安装HC-05的串口驱动
3. **端口占用**：COM端口可能被其他程序占用
4. **浏览器限制**：Web Bluetooth API对经典蓝牙支持有限

## 🛠️ 解决方案

### 方案1：使用Web Serial API（推荐）

Web Serial API可以直接访问串口，适合HC-05这类串口蓝牙模块。

#### 系统要求：
- Chrome 89+ 或 Edge 89+
- Windows 10/11
- HC-05已配对并分配COM端口

#### 连接步骤：

1. **配对HC-05**
   ```
   Windows设置 → 蓝牙和其他设备 → 添加蓝牙或其他设备
   选择HC-05，输入PIN码（通常是1234或0000）
   ```

2. **查看COM端口**
   ```
   设备管理器 → 端口(COM和LPT) → 查看HC-05分配的COM端口号
   ```

3. **使用测试页面**
   ```
   打开 test-hc05-connection.html
   点击"连接HC-05"按钮
   在弹出对话框中选择对应的COM端口
   ```

### 方案2：使用串口调试工具

如果Web Serial API不可用，可以使用传统串口工具：

#### 推荐工具：
- **PuTTY**：轻量级终端工具
- **Arduino IDE串口监视器**：如果安装了Arduino IDE
- **SSCOM**：专业串口调试工具

#### 连接参数：
```
波特率：9600
数据位：8
停止位：1
校验位：无
流控制：无
```

### 方案3：修改HC-05为BLE模式

某些HC-05模块支持切换到BLE模式：

1. **进入AT命令模式**
   - 按住HC-05上的按钮
   - 上电启动
   - LED慢闪表示进入AT模式

2. **发送AT命令**
   ```
   AT+VERSION?     // 查看版本
   AT+ROLE=0       // 设置为从机模式
   AT+UART=9600,0,0 // 设置串口参数
   ```

## 🧪 测试方法

### 1. 使用专用测试页面

打开 `test-hc05-connection.html` 进行全面测试：

- ✅ 检测浏览器API支持
- ✅ 连接状态监控
- ✅ 指令发送测试
- ✅ 实时日志显示

### 2. 手动测试步骤

1. **确认配对**
   ```bash
   # Windows命令行查看蓝牙设备
   powershell "Get-PnpDevice | Where-Object {$_.FriendlyName -like '*HC-05*'}"
   ```

2. **测试串口通信**
   ```bash
   # 使用mode命令查看COM端口状态
   mode COM6
   ```

3. **发送测试指令**
   ```
   指令1: "1" - 打开客厅灯
   指令2: "2" - 调节亮度
   指令3: "AT" - AT命令测试
   ```

## 🔧 故障排除

### 常见问题及解决方案：

#### 1. 配对成功但找不到COM端口
```
解决方案：
- 重新安装蓝牙驱动
- 在设备管理器中更新HC-05驱动
- 重启蓝牙服务
```

#### 2. COM端口被占用
```
解决方案：
- 关闭其他串口程序
- 重新配对HC-05
- 使用不同的COM端口
```

#### 3. Web Serial API不支持
```
解决方案：
- 更新Chrome到最新版本
- 启用实验性功能：chrome://flags/#enable-experimental-web-platform-features
- 使用Edge浏览器
```

#### 4. 连接后无法发送数据
```
解决方案：
- 检查串口参数设置
- 确认HC-05工作模式
- 测试AT命令响应
```

## 📋 连接检查清单

在尝试连接前，请确认：

- [ ] HC-05已在Windows中配对成功
- [ ] 设备管理器中显示COM端口
- [ ] 使用Chrome 89+或Edge 89+浏览器
- [ ] 没有其他程序占用COM端口
- [ ] HC-05电源正常，LED指示正确

## 🔍 调试技巧

### 1. 查看详细日志
```javascript
// 在浏览器控制台中启用详细日志
localStorage.setItem('debug', 'bluetooth:*');
```

### 2. 监控串口数据
```javascript
// 监听串口数据接收
if (port.readable) {
  const reader = port.readable.getReader();
  // 读取数据...
}
```

### 3. 测试AT命令
```
AT          // 基本连接测试
AT+VERSION? // 查看固件版本
AT+ADDR?    // 查看蓝牙地址
AT+NAME?    // 查看设备名称
```

## 📞 技术支持

如果仍然无法连接，请提供以下信息：

1. HC-05模块型号和版本
2. Windows版本和蓝牙驱动版本
3. 浏览器版本
4. 设备管理器中的COM端口信息
5. 错误日志和截图

## 🔗 相关资源

- [Web Serial API文档](https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API)
- [HC-05数据手册](https://www.electronicwings.com/sensors-modules/hc-05-bluetooth-module)
- [Chrome浏览器兼容性](https://caniuse.com/web-serial)

---

**最后更新：** 2024年12月
**版本：** 1.0
