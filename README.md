# Aura-Voice Smart Home Voice Control System

[![Vue.js](https://img.shields.io/badge/Vue.js-3.x-4FC08D?style=flat-square&logo=vue.js)](https://vuejs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-16+-339933?style=flat-square&logo=node.js)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen?style=flat-square)](https://github.com/your-repo/aura-voice)

> An intelligent voice-controlled smart home system that integrates speech recognition, device management, and Bluetooth communication for seamless home automation.

## 🌟 Key Features

- **🎯 Intelligent Voice Recognition** - High-precision Chinese speech recognition powered by iFlytek API
- **🧠 Smart Command Matching** - Advanced three-layer matching algorithm supporting synonyms and flexible expressions
- **📱 Mobile-First Design** - Responsive interface optimized for Android devices with modern UI/UX
- **🔗 Bluetooth Integration** - Direct control of HC-05 connected smart home devices
- **🏠 Scene Management** - Preset and customizable scenes for one-touch multi-device control
- **⚡ Real-time Synchronization** - Instant status updates between voice and manual controls

## 🚀 Quick Start

### Prerequisites

- **Node.js** 16.0 or higher
- **Chrome/Edge** 89+ (for Web Serial API support)
- **HC-05 Bluetooth Module** (for device communication)
- **Android Device** 8.0+ (recommended)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-repo/aura-voice.git
   cd aura-voice
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file with your iFlytek API credentials:
   ```env
   VITE_XUNFEI_APP_ID=your_app_id
   VITE_XUNFEI_API_SECRET=your_api_secret
   VITE_XUNFEI_API_KEY=your_api_key
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   Navigate to `http://localhost:3000` in Chrome or Edge

## 🎮 Usage

### Voice Control

1. **Activate Voice Control**: Click the floating voice button or use the main voice interface
2. **Speak Commands**: Use natural Chinese expressions like:
   - "打开客厅的灯" (Turn on the living room light)
   - "关闭空调" (Turn off the air conditioner)
   - "播放音乐" (Play music)
3. **Multi-device Commands**: Chain commands with "和" (and):
   - "打开客厅灯和卧室的灯" (Turn on living room and bedroom lights)

### Manual Control

- **Device Cards**: Tap device cards for quick on/off control
- **Detailed Controls**: Expand cards to access brightness, temperature, and volume controls
- **Scene Management**: Use preset scenes or create custom automation scenarios

### Bluetooth Setup

1. **Pair HC-05**: Connect HC-05 module via Windows Bluetooth settings
2. **Configure Device**: Set up device name and pairing code (default: 1234)
3. **Connect in App**: The system will automatically detect and connect to paired devices

## 🏗️ Technology Stack

### Frontend
- **Vue.js 3** with Composition API
- **Vite** for fast development and building
- **uni-app** for cross-platform mobile support
- **Pinia** for state management
- **CSS3/SCSS** with modern design patterns

### APIs & Libraries
- **iFlytek Voice API** for speech recognition
- **Web Serial API** for Bluetooth communication
- **Fuse.js** for fuzzy command matching
- **Lucide Vue** for modern icons

### Hardware
- **HC-05 Bluetooth Module** for device communication
- **Smart Home Devices** (lights, AC, speakers, etc.)

## 📁 Project Structure

```
Aura-Voice/
├── components/           # Reusable Vue components
│   ├── VoiceControl.vue # Voice recognition interface
│   ├── DeviceCard.vue   # Device control cards
│   └── PullPanel.vue    # Floating voice panel
├── pages/               # Application pages
│   ├── tabbar/         # Main navigation pages
│   │   ├── voice/      # Voice control page
│   │   ├── manage/     # Device management
│   │   └── user/       # User settings
├── stores/              # Pinia state stores
│   ├── devices.js      # Device state management
│   └── instructionMap.json # Command mappings
├── utils/               # Utility functions
│   ├── voiceCommandMatcher.js # Command matching logic
│   ├── deviceControl.js       # Device control functions
│   └── bluetooth.js           # Bluetooth communication
└── docs/               # Documentation
    ├── Report-zh.md    # Chinese documentation
    ├── Report-en.md    # English documentation
    └── README.md       # This file
```

## 🔧 Configuration

### Voice Recognition Setup

1. **Get iFlytek API Credentials**:
   - Register at [iFlytek Open Platform](https://www.xfyun.cn/)
   - Create a new application
   - Obtain APP_ID, API_KEY, and API_SECRET

2. **Configure Environment Variables**:
   ```env
   VITE_XUNFEI_APP_ID=your_app_id
   VITE_XUNFEI_API_SECRET=your_api_secret
   VITE_XUNFEI_API_KEY=your_api_key
   ```

### Bluetooth Device Configuration

1. **HC-05 AT Commands**:
   ```
   AT+NAME=AuraVoice     # Set device name
   AT+PSWD=1234          # Set pairing password
   AT+UART=9600,0,0      # Set serial parameters
   AT+ROLE=0             # Set as slave device
   ```

2. **Windows Pairing**:
   - Open Bluetooth settings
   - Search and pair with HC-05
   - Note the assigned COM port

## 🎯 Supported Voice Commands

| Command (Chinese) | Device | Action |
|-------------------|--------|--------|
| 打开客厅的灯 | Living Room Light | Turn On |
| 关闭客厅的灯 | Living Room Light | Turn Off |
| 打开空调 | Air Conditioner | Turn On |
| 关闭空调 | Air Conditioner | Turn Off |
| 播放音乐 | Speaker | Play Music |
| 关闭音响 | Speaker | Turn Off |

*For complete command list, see [Voice Control Guide](docs/Report-en.md#supported-voice-commands)*

## 🛠️ Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
```

### Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory, ready for deployment.

## 🧪 Testing

### Manual Testing

1. **Voice Recognition**: Test various command expressions and pronunciations
2. **Device Control**: Verify manual controls work correctly
3. **Bluetooth Communication**: Test connection stability and command transmission
4. **Cross-browser**: Test on different browsers and devices

### Debug Mode

Enable detailed logging in browser console:
```javascript
localStorage.setItem('debug', 'aura-voice:*');
```

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Guidelines

- Follow Vue.js 3 Composition API patterns
- Use TypeScript for type safety (when applicable)
- Write clear, descriptive commit messages
- Add tests for new features
- Update documentation as needed

## 📚 Documentation

- **[Chinese Documentation](docs/Report-zh.md)** - 完整的中文技术文档
- **[English Documentation](docs/Report-en.md)** - Complete English technical documentation
- **[API Reference](docs/Report-en.md#api-documentation)** - Detailed API documentation
- **[Troubleshooting Guide](docs/Report-en.md#troubleshooting)** - Common issues and solutions

## 🐛 Troubleshooting

### Common Issues

**Voice Recognition Not Working**
- Check microphone permissions in browser
- Verify iFlytek API credentials
- Ensure stable internet connection

**Bluetooth Connection Failed**
- Verify HC-05 is paired in Windows
- Check COM port availability
- Restart browser and try again

**Commands Not Recognized**
- Use standard Mandarin pronunciation
- Refer to supported command list
- Speak clearly in quiet environment

For more detailed troubleshooting, see our [complete guide](docs/Report-en.md#troubleshooting).

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- **Wang Lei** (2351299) - Frontend Interface Architecture
- **Li Haotian** (235440) - Project Logic & Function Implementation  
- **Wei Yigan** (2351232) - Frontend Interface Architecture
- **Wang Jiongzhao** (2353819) - Project Testing & Hardware Architecture

## 🙏 Acknowledgments

- [iFlytek](https://www.xfyun.cn/) for providing excellent voice recognition API
- [Vue.js](https://vuejs.org/) team for the amazing framework
- [uni-app](https://uniapp.dcloud.io/) for cross-platform mobile development
- Open source community for various libraries and tools

## 📞 Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/your-repo/aura-voice/issues)
- **Documentation**: [Complete technical documentation](docs/)
- **Email**: aura-voice@example.com

---

<div align="center">
  <p>Made with ❤️ by the Aura-Voice Team</p>
  <p>⭐ Star this repository if you find it helpful!</p>
</div>
