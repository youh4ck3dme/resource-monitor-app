import Foundation

/// Device statistics model - mirrors the JSON from Mac daemon
struct DeviceStats: Codable, Identifiable {
    var id: String { deviceId }
    
    let deviceId: String
    let deviceName: String
    let timestamp: String
    let lastSync: Int
    let disk: DiskStats?
    let memory: MemoryStats?
    let topProcesses: [ProcessInfo]
    let cacheSize: CacheStats?
    let nodeModulesCount: Int
    let alerts: [Alert]
    
    /// Time since last sync
    var timeSinceSync: String {
        let syncDate = Date(timeIntervalSince1970: TimeInterval(lastSync) / 1000)
        let interval = Date().timeIntervalSince(syncDate)
        
        if interval < 60 {
            return "just now"
        } else if interval < 3600 {
            return "\(Int(interval / 60))m ago"
        } else if interval < 86400 {
            return "\(Int(interval / 3600))h ago"
        } else {
            return "\(Int(interval / 86400))d ago"
        }
    }
    
    /// Is device online (synced in last 5 minutes)
    var isOnline: Bool {
        let syncDate = Date(timeIntervalSince1970: TimeInterval(lastSync) / 1000)
        return Date().timeIntervalSince(syncDate) < 300
    }
}

struct DiskStats: Codable {
    let total: Int64
    let used: Int64
    let available: Int64
    let percent: Int
    let formatted: FormattedSize
}

struct MemoryStats: Codable {
    let total: Int64
    let used: Int64
    let available: Int64
    let percent: Int
    let formatted: FormattedSize
}

struct FormattedSize: Codable {
    let total: String
    let used: String
    let available: String
}

struct ProcessInfo: Codable, Identifiable {
    var id: Int { pid }
    
    let name: String
    let pid: Int
    let mem: Int64
    let memFormatted: String
    let cpu: String
}

struct CacheStats: Codable {
    let bytes: Int64
    let formatted: String
}

struct Alert: Codable, Identifiable {
    var id: String { type }
    
    let type: String
    let value: Int
    
    var icon: String {
        switch type {
        case "disk_critical", "memory_critical":
            return "🔴"
        case "disk_warning", "memory_warning":
            return "🟡"
        case "cleanup_available":
            return "🔵"
        default:
            return "⚪"
        }
    }
    
    var message: String {
        switch type {
        case "disk_critical":
            return "Disk is critically full (\(value)%)"
        case "disk_warning":
            return "Disk usage high (\(value)%)"
        case "memory_critical":
            return "Memory critically low"
        case "memory_warning":
            return "Memory usage high (\(value)%)"
        case "cleanup_available":
            return "Cleanup recommended"
        default:
            return type
        }
    }
}
