import { bluetoothControl } from './bluetooth';

// 设备控制状态 - 与stores/devices.js中的初始状态保持一致
const deviceStates = {
  livingRoomLight: {
    isOn: false,  // 与stores/devices.js中客厅灯(id:1)的active状态一致
    brightness: 3, // 与stores/devices.js中brightnessLevel一致
    color: '#fbbf24'  // 与stores/devices.js中colorHex一致
  },
  bedroomLight: {
    isOn: false,  // 与stores/devices.js中卧室主灯(id:2)的active状态一致
    isAmbientOn: false  // 与stores/devices.js中卧室氛围灯(id:3)的active状态一致
  },
  ac: {
    isOn: false  // 与stores/devices.js中空调(id:4)的active状态一致
  },
  speaker: {
    isOn: false  // 与stores/devices.js中音响(id:7)的active状态一致
  }
};

// 设备存储引用 - 用于同步状态到前端界面
let deviceStoreRef = null;

// 设置设备存储引用
export function setDeviceStoreRef(storeRef) {
  deviceStoreRef = storeRef;
  console.log('[设备控制] 设备存储引用已设置');

  // 同步初始状态
  syncInitialStates();
}

// 同步初始状态
function syncInitialStates() {
  if (!deviceStoreRef) return;

  // 从设备存储获取当前状态并同步到deviceStates
  const livingRoomLight = deviceStoreRef.getDevice(1); // 客厅灯
  const bedroomMainLight = deviceStoreRef.getDevice(2); // 卧室主灯
  const bedroomAmbientLight = deviceStoreRef.getDevice(3); // 卧室氛围灯
  const ac = deviceStoreRef.getDevice(4); // 空调
  const speaker = deviceStoreRef.getDevice(7); // 音响

  if (livingRoomLight) {
    deviceStates.livingRoomLight.isOn = livingRoomLight.active;
  }
  if (bedroomMainLight) {
    deviceStates.bedroomLight.isOn = bedroomMainLight.active;
  }
  if (bedroomAmbientLight) {
    deviceStates.bedroomLight.isAmbientOn = bedroomAmbientLight.active;
  }
  if (ac) {
    deviceStates.ac.isOn = ac.active;
  }
  if (speaker) {
    deviceStates.speaker.isOn = speaker.active;
  }

  console.log('[设备控制] 初始状态已同步:', deviceStates);
}

// 同步设备状态（用于手动控制）
export function syncDeviceState(deviceName, isActive) {
  console.log(`[设备控制] 同步设备状态: ${deviceName} -> ${isActive ? '开启' : '关闭'}`);

  switch (deviceName) {
    case '客厅灯':
      deviceStates.livingRoomLight.isOn = isActive;
      break;
    case '卧室主灯':
      deviceStates.bedroomLight.isOn = isActive;
      break;
    case '卧室氛围灯':
      deviceStates.bedroomLight.isAmbientOn = isActive;
      break;
    case '空调':
      deviceStates.ac.isOn = isActive;
      break;
    case '音响':
      deviceStates.speaker.isOn = isActive;
      break;
    default:
      console.log(`[设备控制] 设备 ${deviceName} 不需要同步到 deviceStates`);
  }
}

// 发送指令并显示调试信息
async function sendCommandWithDebug(command, action) {
  console.log(`[调试信息] 正在执行操作: ${action}`);
  console.log(`[调试信息] 发送指令: ${command}`);
  
  const success = await bluetoothControl.sendCommand(command);
  
  if (success) {
    console.log('[调试信息] 指令发送成功');
  } else {
    console.error('[调试信息] 指令发送失败');
  }
  
  return success;
}

// 客厅灯控制
export async function controlLivingRoomLight(action, fromVoice = false) {
  switch (action) {
    case 'toggle':
      if (!deviceStates.livingRoomLight.isOn) {
        const success = await sendCommandWithDebug('1', '打开客厅的灯');
        if (success) {
          deviceStates.livingRoomLight.isOn = true;
          // 只有语音控制才同步到前端界面，手动控制由toggleDevice处理
          if (fromVoice && deviceStoreRef) {
            deviceStoreRef.updateDeviceStateFromVoice('客厅灯', { active: true });
          }
        }
        return success;
      } else {
        const success = await sendCommandWithDebug('5', '关闭客厅的灯光');
        if (success) {
          deviceStates.livingRoomLight.isOn = false;
          // 只有语音控制才同步到前端界面，手动控制由toggleDevice处理
          if (fromVoice && deviceStoreRef) {
            deviceStoreRef.updateDeviceStateFromVoice('客厅灯', { active: false });
          }
        }
        return success;
      }
    case 'brightnessUp':
      const successUp = await sendCommandWithDebug('2', '加大客厅的灯光');
      if (successUp && fromVoice && deviceStoreRef) {
        // 假设亮度增加1级
        const currentDevice = deviceStoreRef.getDevice(1); // 客厅灯ID为1
        if (currentDevice) {
          const newBrightness = Math.min(3, currentDevice.brightnessLevel + 1);
          deviceStoreRef.updateDeviceStateFromVoice('客厅灯', { brightnessLevel: newBrightness });
        }
      }
      return successUp;
    case 'brightnessDown':
      const successDown = await sendCommandWithDebug('3', '降低客厅的灯光');
      if (successDown && fromVoice && deviceStoreRef) {
        // 假设亮度减少1级
        const currentDevice = deviceStoreRef.getDevice(1); // 客厅灯ID为1
        if (currentDevice) {
          const newBrightness = Math.max(1, currentDevice.brightnessLevel - 1);
          deviceStoreRef.updateDeviceStateFromVoice('客厅灯', { brightnessLevel: newBrightness });
        }
      }
      return successDown;
    case 'changeColor':
      const successColor = await sendCommandWithDebug('4', '转换客厅的灯光颜色');
      if (successColor && fromVoice && deviceStoreRef) {
        // 循环切换颜色
        const colors = ['#fbbf24', '#ef4444', '#22c55e', '#3b82f6', '#a78bfa', '#ec4899'];
        const currentDevice = deviceStoreRef.getDevice(1);
        if (currentDevice) {
          const currentIndex = colors.indexOf(currentDevice.colorHex);
          const nextIndex = (currentIndex + 1) % colors.length;
          deviceStoreRef.updateDeviceStateFromVoice('客厅灯', { colorHex: colors[nextIndex] });
        }
      }
      return successColor;
    default:
      console.error('未知的客厅灯控制操作');
      return false;
  }
}

// 卧室灯控制
export async function controlBedroomLight(action, fromVoice = false) {
  switch (action) {
    case 'toggle':
      if (!deviceStates.bedroomLight.isOn) {
        const success = await sendCommandWithDebug('6', '打开卧室的灯');
        if (success) {
          deviceStates.bedroomLight.isOn = true;
          // 只有语音控制才同步到前端界面，手动控制由toggleDevice处理
          if (fromVoice && deviceStoreRef) {
            deviceStoreRef.updateDeviceStateFromVoice('卧室主灯', { active: true });
          }
        }
        return success;
      } else {
        const success = await sendCommandWithDebug('8', '关闭卧室的灯');
        if (success) {
          deviceStates.bedroomLight.isOn = false;
          // 只有语音控制才同步到前端界面，手动控制由toggleDevice处理
          if (fromVoice && deviceStoreRef) {
            deviceStoreRef.updateDeviceStateFromVoice('卧室主灯', { active: false });
          }
        }
        return success;
      }
    case 'toggleAmbient':
      if (!deviceStates.bedroomLight.isAmbientOn) {
        const success = await sendCommandWithDebug('7', '打开卧室的氛围灯');
        if (success) {
          deviceStates.bedroomLight.isAmbientOn = true;
          // 只有语音控制才同步到前端界面，手动控制由toggleDevice处理
          if (fromVoice && deviceStoreRef) {
            deviceStoreRef.updateDeviceStateFromVoice('卧室氛围灯', { active: true });
          }
        }
        return success;
      } else {
        // 使用专门的氛围灯关闭指令
        const success = await sendCommandWithDebug('d', '关闭卧室的氛围灯');
        if (success) {
          deviceStates.bedroomLight.isAmbientOn = false;
          // 只有语音控制才同步到前端界面，手动控制由toggleDevice处理
          if (fromVoice && deviceStoreRef) {
            deviceStoreRef.updateDeviceStateFromVoice('卧室氛围灯', { active: false });
          }
        }
        return success;
      }
    default:
      console.error('未知的卧室灯控制操作');
      return false;
  }
}

// 空调控制
export async function controlAC(action, fromVoice = false) {
  switch (action) {
    case 'toggle':
      if (!deviceStates.ac.isOn) {
        const success = await sendCommandWithDebug('9', '打开空调');
        if (success) {
          deviceStates.ac.isOn = true;
          // 只有语音控制才同步到前端界面，手动控制由toggleDevice处理
          if (fromVoice && deviceStoreRef) {
            deviceStoreRef.updateDeviceStateFromVoice('空调', { active: true });
          }
        }
        return success;
      } else {
        const success = await sendCommandWithDebug('a', '关闭空调');
        if (success) {
          deviceStates.ac.isOn = false;
          // 只有语音控制才同步到前端界面，手动控制由toggleDevice处理
          if (fromVoice && deviceStoreRef) {
            deviceStoreRef.updateDeviceStateFromVoice('空调', { active: false });
          }
        }
        return success;
      }
    default:
      console.error('未知的空调控制操作');
      return false;
  }
}

// 音响控制
export async function controlSpeaker(action, fromVoice = false) {
  switch (action) {
    case 'toggle':
      if (!deviceStates.speaker.isOn) {
        const success = await sendCommandWithDebug('b', '打开音响，放一首歌');
        if (success) {
          deviceStates.speaker.isOn = true;
          // 只有语音控制才同步到前端界面，手动控制由toggleDevice处理
          if (fromVoice && deviceStoreRef) {
            deviceStoreRef.updateDeviceStateFromVoice('音响', { active: true });
          }
        }
        return success;
      } else {
        const success = await sendCommandWithDebug('c', '关闭音响');
        if (success) {
          deviceStates.speaker.isOn = false;
          // 只有语音控制才同步到前端界面，手动控制由toggleDevice处理
          if (fromVoice && deviceStoreRef) {
            deviceStoreRef.updateDeviceStateFromVoice('音响', { active: false });
          }
        }
        return success;
      }
    default:
      console.error('未知的音响控制操作');
      return false;
  }
}

// 导出设备状态
export { deviceStates };