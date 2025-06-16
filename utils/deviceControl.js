import { bluetoothControl } from './bluetooth';
import instructionMap from '../stores/instructionMap.json';

// 设备控制状态
const deviceStates = {
  livingRoomLight: {
    isOn: false,
    brightness: 1, // 1-3
    color: '#ffffff'
  },
  bedroomLight: {
    isOn: false,
    isAmbientOn: false
  },
  ac: {
    isOn: false
  },
  speaker: {
    isOn: false
  }
};

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
export async function controlLivingRoomLight(action) {
  switch (action) {
    case 'toggle':
      if (!deviceStates.livingRoomLight.isOn) {
        const success = await sendCommandWithDebug('1', '打开客厅的灯');
        if (success) deviceStates.livingRoomLight.isOn = true;
        return success;
      } else {
        const success = await sendCommandWithDebug('5', '关闭客厅的灯光');
        if (success) deviceStates.livingRoomLight.isOn = false;
        return success;
      }
    case 'brightnessUp':
      return await sendCommandWithDebug('2', '加大客厅的灯光');
    case 'brightnessDown':
      return await sendCommandWithDebug('3', '降低客厅的灯光');
    case 'changeColor':
      return await sendCommandWithDebug('4', '转换客厅的灯光颜色');
    default:
      console.error('未知的客厅灯控制操作');
      return false;
  }
}

// 卧室灯控制
export async function controlBedroomLight(action) {
  switch (action) {
    case 'toggle':
      if (!deviceStates.bedroomLight.isOn) {
        const success = await sendCommandWithDebug('6', '打开卧室的灯');
        if (success) deviceStates.bedroomLight.isOn = true;
        return success;
      } else {
        const success = await sendCommandWithDebug('8', '关闭卧室的灯');
        if (success) deviceStates.bedroomLight.isOn = false;
        return success;
      }
    case 'toggleAmbient':
      if (!deviceStates.bedroomLight.isAmbientOn) {
        const success = await sendCommandWithDebug('7', '打开卧室的氛围灯');
        if (success) deviceStates.bedroomLight.isAmbientOn = true;
        return success;
      } else {
        const success = await sendCommandWithDebug('8', '关闭卧室的灯');
        if (success) deviceStates.bedroomLight.isAmbientOn = false;
        return success;
      }
    default:
      console.error('未知的卧室灯控制操作');
      return false;
  }
}

// 空调控制
export async function controlAC(action) {
  switch (action) {
    case 'toggle':
      if (!deviceStates.ac.isOn) {
        const success = await sendCommandWithDebug('9', '打开空调');
        if (success) deviceStates.ac.isOn = true;
        return success;
      } else {
        const success = await sendCommandWithDebug('a', '关闭空调');
        if (success) deviceStates.ac.isOn = false;
        return success;
      }
    default:
      console.error('未知的空调控制操作');
      return false;
  }
}

// 音响控制
export async function controlSpeaker(action) {
  switch (action) {
    case 'toggle':
      if (!deviceStates.speaker.isOn) {
        const success = await sendCommandWithDebug('b', '打开音响，放一首歌');
        if (success) deviceStates.speaker.isOn = true;
        return success;
      } else {
        const success = await sendCommandWithDebug('c', '关闭音响');
        if (success) deviceStates.speaker.isOn = false;
        return success;
      }
    default:
      console.error('未知的音响控制操作');
      return false;
  }
}

// 导出设备状态
export { deviceStates }; 