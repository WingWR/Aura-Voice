// 从lucide-vue-next导入所有需要的图标
import {
    Bell,
    Settings,
    Home,
    Sofa,
    Bed,
    Utensils,
    ShowerHead,
    Book,
    Lightbulb,
    Tv,
    Fan,
    Thermometer,
    Speaker,
    Refrigerator,
    WashingMachine,
    Smartphone, // 替代 DevicesIcon
    SearchX,
    Sparkles,
    Sunrise,
    Moon,
    Coffee,
    Wind // 替代 AirVentIcon
  } from 'lucide-vue-next'
  
  // 导出所有图标
  export {
    Bell as BellIcon,
    Settings as SettingsIcon,
    Home as HomeIcon,
    Sofa as SofaIcon,
    Bed as BedIcon,
    Utensils as UtensilsIcon,
    ShowerHead as ShowerHeadIcon,
    Book as BookIcon,
    Lightbulb as LightbulbIcon,
    Tv as TvIcon,
    Fan as FanIcon,
    Thermometer as ThermometerIcon,
    Speaker as SpeakerIcon,
    Refrigerator as RefrigeratorIcon,
    WashingMachine as WashingMachineIcon,
    Smartphone as DevicesIcon,
    SearchX as SearchXIcon,
    Sparkles as SparklesIcon,
    Sunrise as SunriseIcon,
    Moon as MoonIcon,
    Coffee as CoffeeIcon,
    Wind as AirVentIcon
  }
  
  // 设备类型到图标的映射
  export const deviceTypeIcons = {
    light: Lightbulb,
    ac: Thermometer,
    tv: Tv,
    fan: Fan,
    speaker: Speaker,
    fridge: Refrigerator,
    washer: WashingMachine
  }
  
  // 房间ID到图标的映射
  export const roomIcons = {
    all: Home,
    living: Sofa,
    bedroom: Bed,
    kitchen: Utensils,
    bathroom: ShowerHead,
    study: Book
  }
  
  // 场景ID到图标的映射
  export const sceneIcons = {
    morning: Sunrise,
    sleep: Moon,
    movie: Sofa,
    guest: Coffee
  }