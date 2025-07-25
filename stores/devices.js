import { ref, reactive, computed, provide, inject } from 'vue'
import { deviceTypeIcons } from '../components/icons/icons'
import {
  controlLivingRoomLight,
  controlBedroomLight,
  controlAC,
  controlSpeaker,
  deviceStates,
  syncDeviceState
} from '../utils/deviceControl.js'

// 设备数据
const initialDevices = [
  {
    id: 1,
    name: '客厅灯',
    type: 'light',
    room: '客厅',
    roomId: 'living',
    active: false,
    color: 'amber',
    brightnessLevel: 3,
    colorHex: '#fbbf24',
    online: true,
    lastUpdated: new Date()
  },
  {
    id: 2,
    name: '卧室主灯',
    type: 'light',
    room: '卧室',
    roomId: 'bedroom',
    active: false,
    color: 'amber',
    brightnessLevel: 2,
    colorHex: '#fbbf24',
    online: true,
    lastUpdated: new Date()
  },
  {
    id: 3,
    name: '卧室氛围灯',
    type: 'light',
    room: '卧室',
    roomId: 'bedroom',
    active: false,
    color: 'purple',
    brightnessLevel: 1,
    colorHex: '#a78bfa',
    online: true,
    lastUpdated: new Date()
  },
  {
    id: 4,
    name: '空调',
    type: 'ac',
    room: '客厅',
    roomId: 'living',
    active: false,
    color: 'blue',
    temperature: 25,
    mode: '制冷',
    online: true,
    lastUpdated: new Date()
  },
  { 
    id: 5, 
    name: '电视', 
    type: 'tv',
    room: '客厅', 
    roomId: 'living',
    active: false, 
    color: 'purple',
    volume: 50,
    source: 'HDMI',
    online: false,
    lastUpdated: new Date()
  },
  { 
    id: 6, 
    name: '风扇', 
    type: 'fan',
    room: '卧室', 
    roomId: 'bedroom',
    active: false, 
    color: 'cyan',
    speed: 2,
    swing: '关闭',
    online: false,
    lastUpdated: new Date()
  },
  { 
    id: 7, 
    name: '音响', 
    type: 'speaker',
    room: '客厅', 
    roomId: 'living',
    active: false, 
    color: 'pink',
    volume: 60,
    eq: '标准',
    online: true,
    lastUpdated: new Date()
  },
  {
    id: 8,
    name: '冰箱',
    type: 'fridge',
    room: '厨房',
    roomId: 'kitchen',
    active: false,
    color: 'green',
    temperature: 4,
    ecoMode: true,
    online: false,
    lastUpdated: new Date()
  },
  {
    id: 9,
    name: '洗衣机',
    type: 'washer',
    room: '浴室',
    roomId: 'bathroom',
    active: false,
    color: 'indigo',
    mode: '标准',
    duration: 60,
    online: false,
    lastUpdated: new Date()
  },
  {
    id: 10,
    name: '扫地机器人',
    type: 'robot',
    room: '客厅',
    roomId: 'living',
    active: false,
    color: 'blue',
    battery: 80,
    status: '待机',
    online: false,
    lastUpdated: new Date()
  },
  {
    id: 11,
    name: '加湿器',
    type: 'humidifier',
    room: '卧室',
    roomId: 'bedroom',
    active: false,
    color: 'cyan',
    humidity: 45,
    online: false,
    lastUpdated: new Date()
  }
]

// 房间数据
export const rooms = [
  { id: 'all', name: '全部' },
  { id: 'living', name: '客厅' },
  { id: 'bedroom', name: '卧室' },
  { id: 'kitchen', name: '厨房' },
  { id: 'bathroom', name: '浴室' },
  { id: 'study', name: '书房' }
]

// 场景数据
export const initialScenes = [
  {
    id: 'morning',
    name: '早晨模式',
    color: 'amber',
    gradient: 'linear-gradient(135deg, #ff9500, #ff2d55)',
    active: false,
    affectedDevices: [
      { id: 1, active: true },  // 客厅灯
      { id: 2, active: true },  // 卧室主灯
      { id: 4, active: true, temperature: 26 },  // 空调
      { id: 7, active: true, volume: 40 }   // 音响
    ]
  },
  {
    id: 'sleep',
    name: '睡眠模式',
    color: 'blue',
    gradient: 'linear-gradient(135deg, #0a84ff, #5e5ce6)',
    active: false,
    affectedDevices: [
      { id: 1, active: false },  // 客厅灯
      { id: 2, active: false },  // 卧室主灯
      { id: 3, active: true },   // 卧室氛围灯
      { id: 4, active: false },  // 空调
      { id: 5, active: false },  // 电视
      { id: 7, active: false }   // 音响
    ]
  },
  {
    id: 'movie',
    name: '影院模式',
    color: 'purple',
    gradient: 'linear-gradient(135deg, #bf5af2, #ff375f)',
    active: false,
    affectedDevices: [
      { id: 1, active: true, brightness: 30 },  // 客厅灯
      { id: 5, active: true },  // 电视
      { id: 7, active: true, volume: 70 }   // 音响
    ]
  },
  {
    id: 'guest',
    name: '会客模式',
    color: 'green',
    gradient: 'linear-gradient(135deg, #30d158, #64d2ff)',
    active: false,
    affectedDevices: [
      { id: 1, active: true, brightness: 80 },  // 客厅灯
      { id: 4, active: true, temperature: 25, mode: '自动' },  // 空调
      { id: 5, active: false },  // 电视
      { id: 7, active: true, volume: 30 }   // 音响
    ]
  }
]

// 创建设备存储
export function createDeviceStore() {
  // 响应式状态
  const devices = ref(initialDevices.map(device => ({
    ...device,
    icon: deviceTypeIcons[device.type]
  })))
  const scenes = ref(initialScenes)
  const selectedRoom = ref('all')
  const loading = ref(false)
  
  // 初始化方法
  const initialize = async () => {
    loading.value = true
    try {
      // 模拟API调用延迟
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 初始化设备数据
      devices.value = initialDevices.map(device => ({
        ...device,
        icon: deviceTypeIcons[device.type]
      }))
      
      // 初始化场景数据
      scenes.value = initialScenes
      
      return true
    } catch (error) {
      console.error('初始化设备数据失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }
  
  // 计算属性
  const filteredDevices = computed(() => {
    if (selectedRoom.value === 'all') {
      return devices.value
    }
    return devices.value.filter(device => device.roomId === selectedRoom.value)
  })
  
  // 获取设备数量
  const getDeviceCount = (roomId) => {
    return devices.value.filter(device => device.roomId === roomId).length
  }
  
  // 获取房间名称
  const getRoomName = (roomId) => {
    const room = rooms.find(r => r.id === roomId)
    return room ? room.name : '未知房间'
  }
  
  // 获取设备
  const getDevice = (id) => {
    return devices.value.find(device => device.id === id)
  }
  
  // 切换设备状态
  const toggleDevice = async (id) => {
    loading.value = true

    try {
      const device = devices.value.find(d => d.id === id)
      if (!device) return

      console.log(`[设备控制] 正在切换设备: ${device.name} (ID: ${id})`)

      // 根据设备类型和名称调用相应的控制函数
      let success = false

      if (device.name === '客厅灯') {
        success = await controlLivingRoomLight('toggle')
      } else if (device.name === '卧室主灯') {
        success = await controlBedroomLight('toggle')
      } else if (device.name === '卧室氛围灯') {
        success = await controlBedroomLight('toggleAmbient')
      } else if (device.name === '空调') {
        success = await controlAC('toggle')
      } else if (device.name === '音响') {
        success = await controlSpeaker('toggle')
      } else {
        // 对于其他设备，只显示调试信息但不发送蓝牙指令
        console.log(`[设备控制] 设备 ${device.name} 暂不支持蓝牙控制，仅更新UI状态`)
        success = true
        // 模拟API调用延迟
        await new Promise(resolve => setTimeout(resolve, 300))
      }

      if (success) {
        const index = devices.value.findIndex(device => device.id === id)
        if (index !== -1) {
          const newActiveState = !devices.value[index].active

          // 使用Vue的响应式更新方式，确保界面立即更新
          const updatedDevice = {
            ...devices.value[index],
            active: newActiveState,
            lastUpdated: new Date()
          }

          // 直接替换数组中的元素，触发响应式更新
          devices.value.splice(index, 1, updatedDevice)

          // 同步设备控制状态
          syncDeviceState(device.name, newActiveState)

          console.log(`[设备控制] 设备状态更新成功: ${device.name} -> ${newActiveState ? '开启' : '关闭'}`)

          // 强制触发响应式更新（如果需要）
          console.log(`[设备控制] 当前设备状态: active=${updatedDevice.active}`)
        }
      } else {
        console.error(`[设备控制] 设备控制失败: ${device.name}`)
      }
    } catch (error) {
      console.error('[设备控制] 切换设备时发生错误:', error)
    } finally {
      loading.value = false
    }
  }
  
  // 更新设备属性
  const updateDeviceProperty = async (id, property, value) => {
    loading.value = true

    try {
      const device = devices.value.find(d => d.id === id)
      if (!device) return

      console.log(`[设备控制] 正在更新设备属性: ${device.name} - ${property}: ${value}`)

      // 根据设备类型和属性调用相应的控制函数
      let success = false

      if (device.name === '客厅灯' && property === 'brightnessLevel') {
        if (value > device.brightnessLevel) {
          success = await controlLivingRoomLight('brightnessUp')
        } else if (value < device.brightnessLevel) {
          success = await controlLivingRoomLight('brightnessDown')
        } else {
          success = true // 相同值，不需要操作
        }
      } else if (device.name === '客厅灯' && property === 'colorHex') {
        success = await controlLivingRoomLight('changeColor')
      } else {
        // 对于其他属性更新，只显示调试信息但不发送蓝牙指令
        console.log(`[设备控制] 属性 ${property} 暂不支持蓝牙控制，仅更新UI状态`)
        success = true
        // 模拟API调用延迟
        await new Promise(resolve => setTimeout(resolve, 200))
      }

      if (success) {
        const index = devices.value.findIndex(device => device.id === id)
        if (index !== -1) {
          // 使用Vue的响应式更新方式
          const updatedDevice = {
            ...devices.value[index],
            [property]: value,
            lastUpdated: new Date()
          }

          // 直接替换数组中的元素，触发响应式更新
          devices.value.splice(index, 1, updatedDevice)

          console.log(`[设备控制] 设备属性更新成功: ${device.name} - ${property}: ${value}`)
        }
      } else {
        console.error(`[设备控制] 设备属性更新失败: ${device.name} - ${property}: ${value}`)
      }
    } catch (error) {
      console.error('[设备控制] 更新设备属性时发生错误:', error)
    } finally {
      loading.value = false
    }
  }
  
  // 批量更新设备
  const updateDevices = async (updatedDevices) => {
    loading.value = true
    
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // 更新每个受影响的设备
      updatedDevices.forEach(updatedDevice => {
        const index = devices.value.findIndex(d => d.id === updatedDevice.id)
        if (index !== -1) {
          devices.value[index] = {
            ...devices.value[index],
            ...updatedDevice,
            lastUpdated: new Date()
          }
        }
      })
    } finally {
      loading.value = false
    }
  }
  
  // 过滤设备
  const filterDevices = async (roomId) => {
    loading.value = true
    
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 500))
      selectedRoom.value = roomId
    } finally {
      loading.value = false
    }
  }
  
  // 激活场景
  const activateScene = async (id) => {
    loading.value = true

    try {
      console.log(`[场景控制] 正在激活场景: ${id}`)

      // 重置所有场景的激活状态
      scenes.value.forEach(scene => {
        scene.active = scene.id === id ? !scene.active : false
      })

      const activeScene = scenes.value.find(scene => scene.active)

      if (activeScene) {
        console.log(`[场景控制] 场景 ${activeScene.name} 已激活，开始控制设备`)

        // 执行场景中的设备控制
        for (const affectedDevice of activeScene.affectedDevices) {
          const device = getDevice(affectedDevice.id)
          if (device) {
            console.log(`[场景控制] 控制设备: ${device.name} -> ${affectedDevice.active ? '开启' : '关闭'}`)

            // 根据设备名称调用相应的控制函数
            let success = false

            if (device.name === '客厅灯') {
              if (device.active !== affectedDevice.active) {
                success = await controlLivingRoomLight('toggle', true)
              } else {
                success = true // 状态已经正确，不需要操作
              }
            } else if (device.name === '卧室主灯') {
              if (device.active !== affectedDevice.active) {
                success = await controlBedroomLight('toggle', true)
              } else {
                success = true
              }
            } else if (device.name === '卧室氛围灯') {
              if (device.active !== affectedDevice.active) {
                success = await controlBedroomLight('toggleAmbient', true)
              } else {
                success = true
              }
            } else if (device.name === '空调') {
              if (device.active !== affectedDevice.active) {
                success = await controlAC('toggle', true)
              } else {
                success = true
              }
            } else if (device.name === '音响') {
              if (device.active !== affectedDevice.active) {
                success = await controlSpeaker('toggle', true)
              } else {
                success = true
              }
            } else {
              // 对于其他设备，只更新UI状态
              console.log(`[场景控制] 设备 ${device.name} 暂不支持蓝牙控制，仅更新UI状态`)
              success = true
            }

            if (success) {
              // 更新设备状态
              const index = devices.value.findIndex(d => d.id === device.id)
              if (index !== -1) {
                const updatedDevice = {
                  ...devices.value[index],
                  ...affectedDevice,
                  lastUpdated: new Date()
                }
                devices.value.splice(index, 1, updatedDevice)

                // 同步设备控制状态
                syncDeviceState(device.name, affectedDevice.active)

                console.log(`[场景控制] 设备状态更新成功: ${device.name} -> ${affectedDevice.active ? '开启' : '关闭'}`)
              }
            } else {
              console.error(`[场景控制] 设备控制失败: ${device.name}`)
            }

            // 设备间控制延迟，避免指令冲突
            await new Promise(resolve => setTimeout(resolve, 200))
          }
        }

        console.log(`[场景控制] 场景 ${activeScene.name} 执行完成`)
      } else {
        console.log(`[场景控制] 场景 ${id} 已关闭`)
      }
    } catch (error) {
      console.error('[场景控制] 激活场景时发生错误:', error)
    } finally {
      loading.value = false
    }
  }

  // 语音控制专用的设备状态更新方法
  const updateDeviceStateFromVoice = (deviceName, newState) => {
    console.log(`[语音控制] 更新设备状态: ${deviceName} -> ${JSON.stringify(newState)}`)

    const device = devices.value.find(d => d.name === deviceName)
    if (!device) {
      console.warn(`[语音控制] 未找到设备: ${deviceName}`)
      return false
    }

    const index = devices.value.findIndex(d => d.id === device.id)
    if (index !== -1) {
      // 使用Vue的响应式更新方式
      const updatedDevice = {
        ...devices.value[index],
        ...newState,
        lastUpdated: new Date()
      }

      // 直接替换数组中的元素，触发响应式更新
      devices.value.splice(index, 1, updatedDevice)

      console.log(`[语音控制] 设备状态更新成功: ${deviceName}`)
      return true
    }

    return false
  }
  
  // 返回存储和方法
  return {
    devices,
    scenes,
    selectedRoom,
    loading,
    initialize,
    filteredDevices,
    getDeviceCount,
    getRoomName,
    getDevice,
    toggleDevice,
    updateDeviceProperty,
    updateDevices,
    filterDevices,
    activateScene,
    updateDeviceStateFromVoice
  }
}

// 提供设备存储
export function provideDeviceStore() {
  const deviceStore = createDeviceStore()
  provide('deviceStore', deviceStore)
  return deviceStore
}

// 注入设备存储
export function useDeviceStore() {
  const deviceStore = inject('deviceStore')
  if (!deviceStore) {
    throw new Error('deviceStore not provided')
  }
  return deviceStore
}