// 蓝牙控制模块
import { ref } from 'vue';

// 蓝牙设备状态
const bluetoothDevice = ref(null);
const bluetoothCharacteristic = ref(null);
const serialPort = ref(null);
const isConnected = ref(false);
const connectionType = ref('none'); // 'web-bluetooth', 'serial', 'none'

// 蓝牙服务和特征值 UUID
const BLUETOOTH_SERVICE_UUID = '00001101-0000-1000-8000-00805F9B34FB'; // HC-05 标准串口服务UUID
const BLUETOOTH_CHARACTERISTIC_UUID = '00001101-0000-1000-8000-00805F9B34FB'; // HC-05 标准串口特征值UUID

// HC-05 常用的串口设置
const SERIAL_OPTIONS = {
  baudRate: 9600,
  dataBits: 8,
  stopBits: 1,
  parity: 'none',
  flowControl: 'none'
};

class BluetoothControl {
  constructor() {
    this.device = bluetoothDevice;
    this.characteristic = bluetoothCharacteristic;
    this.serialPort = serialPort;
    this.isConnected = isConnected;
    this.connectionType = connectionType;
  }

  // 连接到蓝牙设备 - 智能选择连接方式
  async connectBluetooth() {
    console.log('开始尝试连接HC-05蓝牙模块...');

    // 方案1: 尝试Web Serial API (推荐用于HC-05)
    if (navigator.serial) {
      console.log('检测到Web Serial API支持，尝试串口连接...');
      try {
        return await this.connectViaSerial();
      } catch (error) {
        console.warn('串口连接失败，尝试其他方式:', error.message);
      }
    }

    // 方案2: 尝试Web Bluetooth API
    if (navigator.bluetooth) {
      console.log('尝试Web Bluetooth API连接...');
      try {
        return await this.connectViaBluetooth();
      } catch (error) {
        console.warn('Web Bluetooth连接失败:', error.message);
      }
    }

    // 所有方案都失败
    throw new Error('无法连接HC-05模块。请确保:\n1. HC-05已配对\n2. 使用支持Web Serial的浏览器\n3. 或尝试使用串口调试工具');
  }

  // 通过Web Serial API连接 (适用于HC-05)
  async connectViaSerial() {
    try {
      console.log('请求串口设备...');

      // 请求串口设备
      this.serialPort.value = await navigator.serial.requestPort();

      console.log('串口设备已选择，正在打开连接...');

      // 打开串口连接
      await this.serialPort.value.open(SERIAL_OPTIONS);

      console.log('串口连接已建立');
      console.log('连接参数:', SERIAL_OPTIONS);

      this.isConnected.value = true;
      this.connectionType.value = 'serial';

      return true;
    } catch (error) {
      console.error('串口连接失败:', error);
      this.isConnected.value = false;
      this.connectionType.value = 'none';
      throw error;
    }
  }

  // 通过Web Bluetooth API连接 (可能不适用于HC-05)
  async connectViaBluetooth() {
    try {
      console.log('请求蓝牙设备...');

      // 请求蓝牙设备
      this.device.value = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [BLUETOOTH_SERVICE_UUID]
      });

      console.log('蓝牙设备已选择:', this.device.value.name);

      // 连接到GATT服务器
      const server = await this.device.value.gatt.connect();
      console.log('已连接到GATT服务器');

      // 获取主服务
      const service = await server.getPrimaryService(BLUETOOTH_SERVICE_UUID);
      console.log('已获取主服务');

      // 获取特征值
      this.characteristic.value = await service.getCharacteristic(BLUETOOTH_CHARACTERISTIC_UUID);
      console.log('已获取特征值');

      this.isConnected.value = true;
      this.connectionType.value = 'web-bluetooth';

      return true;
    } catch (error) {
      console.error('Web Bluetooth连接失败:', error);
      this.isConnected.value = false;
      this.connectionType.value = 'none';
      throw error;
    }
  }

  // 断开连接
  async disconnectBluetooth() {
    try {
      if (this.connectionType.value === 'serial' && this.serialPort.value) {
        console.log('关闭串口连接...');
        await this.serialPort.value.close();
        this.serialPort.value = null;
      } else if (this.connectionType.value === 'web-bluetooth' && this.device.value && this.device.value.gatt.connected) {
        console.log('断开Web Bluetooth连接...');
        this.device.value.gatt.disconnect();
        this.device.value = null;
        this.characteristic.value = null;
      }

      this.isConnected.value = false;
      this.connectionType.value = 'none';
      console.log('连接已断开');
    } catch (error) {
      console.error('断开连接时发生错误:', error);
      // 强制重置状态
      this.device.value = null;
      this.characteristic.value = null;
      this.serialPort.value = null;
      this.isConnected.value = false;
      this.connectionType.value = 'none';
    }
  }

  // 发送指令到设备
  async sendCommand(command) {
    if (!this.isConnected.value) {
      console.error('设备未连接');
      return false;
    }

    try {
      console.log(`准备发送指令: ${command}`);

      if (this.connectionType.value === 'serial' && this.serialPort.value) {
        return await this.sendCommandViaSerial(command);
      } else if (this.connectionType.value === 'web-bluetooth' && this.characteristic.value) {
        return await this.sendCommandViaBluetooth(command);
      } else {
        console.error('没有可用的连接方式');
        return false;
      }
    } catch (error) {
      console.error('发送指令失败:', error);
      return false;
    }
  }

  // 通过串口发送指令
  async sendCommandViaSerial(command) {
    try {
      const writer = this.serialPort.value.writable.getWriter();

      // 将指令转换为 Uint8Array，添加换行符
      const encoder = new TextEncoder();
      const data = encoder.encode(command + '\n');

      // 发送数据
      await writer.write(data);
      writer.releaseLock();

      console.log(`✅ 串口指令发送成功: ${command}`);
      return true;
    } catch (error) {
      console.error('串口发送失败:', error);
      return false;
    }
  }

  // 通过Web Bluetooth发送指令
  async sendCommandViaBluetooth(command) {
    try {
      // 将指令转换为 Uint8Array
      const encoder = new TextEncoder();
      const data = encoder.encode(command);

      // 发送数据
      await this.characteristic.value.writeValue(data);

      console.log(`✅ 蓝牙指令发送成功: ${command}`);
      return true;
    } catch (error) {
      console.error('蓝牙发送失败:', error);
      return false;
    }
  }

  // 获取连接状态信息
  getConnectionInfo() {
    return {
      isConnected: this.isConnected.value,
      connectionType: this.connectionType.value,
      deviceName: this.device.value?.name || 'Unknown',
      hasSerial: !!navigator.serial,
      hasBluetooth: !!navigator.bluetooth
    };
  }
}

// 创建单例实例
export const bluetoothControl = new BluetoothControl(); 