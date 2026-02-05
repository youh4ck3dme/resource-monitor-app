import Foundation

/// Cleanup command model for remote cleanup requests
struct CleanupCommand: Codable {
    let type: CleanupType
    let paths: [String]?
    let timestamp: Date
    
    enum CleanupType: String, Codable, CaseIterable {
        case cleanupCaches = "cleanup-caches"
        case cleanupNodemodules = "cleanup-nodemodules"
        
        var displayName: String {
            switch self {
            case .cleanupCaches:
                return "Clean All Caches"
            case .cleanupNodemodules:
                return "Clean node_modules"
            }
        }
        
        var icon: String {
            switch self {
            case .cleanupCaches:
                return "🧹"
            case .cleanupNodemodules:
                return "📦"
            }
        }
    }
}

/// Command queue stored in iCloud
struct CommandQueue: Codable {
    var pending: [CleanupCommand]
    var processed: [CleanupCommand]
    
    init() {
        pending = []
        processed = []
    }
}
