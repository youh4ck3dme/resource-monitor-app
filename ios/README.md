# Resource Monitor iOS App 📱

Companion app for Resource Monitor that allows you to monitor your Mac from your iPhone.

## Features
- **Live Dashboard**: See Disk, RAM, and Cache usage in real-time.
- **Remote Cleanup**: Trigger cache cleaning on your Mac remotely.
- **Push Alerts**: Get notified when your Mac runs out of space.
- **Widgets**: Home screen widgets for quick status.

## Prerequisites
- Xcode 15+
- Apple Developer Account (for CloudKit & Push Notifications)
- [XcodeGen](https://github.com/yonaskolb/XcodeGen) (`brew install xcodegen`)

## Setup

1. **Install XcodeGen**:
   ```bash
   brew install xcodegen
   ```

2. **Generate Project**:
   ```bash
   cd ios
   xcodegen generate
   ```

3. **Open in Xcode**:
   Open `ResourceMonitor.xcodeproj`

4. **Configure Signing**:
   - Go to Project Settings -> Signing & Capabilities
   - Select your Development Team
   - Ensure "iCloud" capability is checked and "CloudKit" is selected with container `iCloud.com.resourcemonitor.app`

5. **Run**:
   Select your connected iPhone or Simulator and hit Run (Cmd+R).

## Architecture
- **SwiftUI**: Main app UI
- **CloudKit**: Data synchronization (via `Documents` folder)
- **WidgetKit**: Home screen widgets
- **NSMetadataQuery**: Live data updates

## Project Structure
- `ResourceMonitor/`: Main app source
  - `Views/`: SwiftUI views
  - `Models/`: Data models
  - `Services/`: Sync logic
- `ResourceMonitorWidget/`: Widget extension
