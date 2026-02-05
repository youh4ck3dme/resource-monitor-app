# 🖥️ Resource Monitor App

A beautiful, macOS-native resource monitoring application built with Electron. Features real-time system stats, neon animations, and a fully responsive UI.

![macOS](https://img.shields.io/badge/macOS-000000?style=flat&logo=apple&logoColor=white)
![Electron](https://img.shields.io/badge/Electron-47848F?style=flat&logo=electron&logoColor=white)

## ✨ Features

### 📊 Real-Time Monitoring
- **Disk Usage** - Available space, total capacity, usage percentage
- **RAM Usage** - Active memory with dynamic neon progress bar
- **Top Processes** - Memory hogs sorted by consumption
- **Large Folders** - Biggest directories in your home folder
- **Dev Station** - Track running editors (VS Code, Cursor, Antigravity)

### 🎨 Premium UI/UX
- **macOS Native Look** - Vibrancy effects, SF Pro typography
- **Neon Progress Bars** - Color shifts based on utilization:
  - 🔵 **0-50%** - Ocean Blue (Safe)
  - 🟣 **50-80%** - Purple (Warning)
  - 🔴 **80-100%** - Red with pulse (Critical)
- **View Modes** - Toggle between Grid and List layouts
- **100% Responsive** - Adapts from mobile (400px) to ultra-wide (2K+)

### ⚡ Micro-Animations
- Shimmer effect on progress bars
- Pulse animation on critical levels
- Smooth transitions on all interactions
- Respects `prefers-reduced-motion`

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run the app
npm start
```

## 🧪 Testing

```bash
# Run UI/UX test suite
npx electron ui_ux_test.js

# Run stress test (allocates memory, creates large file)
node stress_test.js
```

## 📁 Project Structure

```
resource-monitor-app/
├── main.js          # Electron main process
├── renderer.js      # Frontend logic & data binding
├── index.html       # UI structure
├── styles.css       # All styles + animations + responsive
├── stress_test.js   # Memory/disk stress simulation
├── ui_ux_test.js    # Automated UI/UX test suite
└── package.json     # Dependencies
```

## 🎛️ Responsive Breakpoints

| Breakpoint | Device | Layout |
|------------|--------|--------|
| 1600px+ | Ultra-wide | 4 columns |
| 1200-1599px | Desktop | 2 columns |
| 800-1199px | Small Desktop | 2 columns (compact) |
| 600-799px | Tablet | 1 column |
| <600px | Mobile | 1 column (scrollable) |

## 🔧 Tech Stack

- **Electron 40** - Cross-platform desktop framework
- **systeminformation** - System stats library
- **Vanilla CSS** - No frameworks, pure performance
- **AppleScript** - Window title detection for editors

## 📝 License

ISC
