import Foundation

/// Service for syncing with Mac daemon via iCloud
@MainActor
class iCloudSyncService: ObservableObject {
    static let shared = iCloudSyncService()
    
    @Published var devices: [DeviceStats] = []
    @Published var isLoading = false
    @Published var lastError: String?
    
    private let fileManager = FileManager.default
    
    /// iCloud Documents URL
    private var iCloudURL: URL? {
        fileManager.url(forUbiquityContainerIdentifier: nil)?
            .appendingPathComponent("Documents")
    }
    
    /// Local fallback URL (for simulator/debugging)
    private var localURL: URL {
        fileManager.homeDirectoryForCurrentUser
            .appendingPathComponent(".resource-monitor")
    }
    
    /// Get the active sync directory
    private var syncDirectory: URL {
        iCloudURL ?? localURL
    }
    
    // MARK: - Live Updates & Notifications
    
    private var metadataQuery: NSMetadataQuery?
    
    init() {
        // Request notification permissions
        Task {
            try? await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge])
        }
        
        // Start live query
        startMetadataQuery()
        
        // Initial fetch
        Task {
            await fetchDevices()
        }
    }
    
    deinit {
        stopMetadataQuery()
    }
    
    private func startMetadataQuery() {
        let query = NSMetadataQuery()
        query.searchScopes = [NSMetadataQueryUbiquitousDocumentsScope]
        query.predicate = NSPredicate(format: "%K LIKE 'device-*.json'", NSMetadataItemFSNameKey)
        
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(queryDidUpdate),
            name: .NSMetadataQueryDidFinishGathering,
            object: query
        )
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(queryDidUpdate),
            name: .NSMetadataQueryDidUpdate,
            object: query
        )
        
        query.start()
        self.metadataQuery = query
    }
    
    private func stopMetadataQuery() {
        metadataQuery?.stop()
        metadataQuery = nil
        NotificationCenter.default.removeObserver(self)
    }
    
    @objc private func queryDidUpdate(_ notification: Notification) {
        // Disable automatic query updates to prevent loop, we will fetch manually
        metadataQuery?.disableUpdates()
        
        Task {
            await fetchDevices()
            metadataQuery?.enableUpdates()
        }
    }
    
    /// Fetch all device stats from iCloud
    func fetchDevices() async {
        isLoading = true
        lastError = nil
        
        do {
            let url = syncDirectory
            
            // Ensure directory exists
            if !fileManager.fileExists(atPath: url.path) {
                try fileManager.createDirectory(at: url, withIntermediateDirectories: true)
            }
            
            // Find all device-*.json files
            let files = try fileManager.contentsOfDirectory(at: url, includingPropertiesForKeys: nil)
                .filter { $0.lastPathComponent.hasPrefix("device-") && $0.pathExtension == "json" }
            
            var loadedDevices: [DeviceStats] = []
            
            for file in files {
                do {
                    // Trigger download if needed
                    try? fileManager.startDownloadingUbiquitousItem(at: file)
                    
                    let data = try Data(contentsOf: file)
                    let device = try JSONDecoder().decode(DeviceStats.self, from: data)
                    loadedDevices.append(device)
                    
                    // Check for new alerts and notify
                    checkAlerts(for: device)
                    
                } catch {
                    // Ignore transient read errors
                }
            }
            
            // Sort by last sync (most recent first)
            devices = loadedDevices.sorted { $0.lastSync > $1.lastSync }
            
        } catch {
            lastError = error.localizedDescription
            print("Fetch error: \(error)")
        }
        
        isLoading = false
    }
    
    private func checkAlerts(for device: DeviceStats) {
        // Only notify for critical alerts if device is online
        guard device.isOnline, !device.alerts.isEmpty else { return }
        
        for alert in device.alerts {
            if alert.type.contains("critical") {
                sendLocalNotification(
                    title: "⚠️ \(device.deviceName): \(alert.message)",
                    body: "Tap to view details and cleanup options."
                )
            }
        }
    }
    
    private func sendLocalNotification(title: String, body: String) {
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default
        
        // Add a request for now
        let request = UNNotificationRequest(
            identifier: UUID().uuidString,
            content: content,
            trigger: nil // Immediate
        )
        
        UNUserNotificationCenter.current().add(request)
    }
    
    /// Send cleanup command to a device
    func sendCleanupCommand(to deviceId: String, command: CleanupCommand) async throws {
        let commandFile = syncDirectory.appendingPathComponent("commands-\(deviceId).json")
        
        var queue: CommandQueue
        
        // Load existing queue or create new
        if fileManager.fileExists(atPath: commandFile.path) {
            let data = try Data(contentsOf: commandFile)
            queue = try JSONDecoder().decode(CommandQueue.self, from: data)
        } else {
            queue = CommandQueue()
        }
        
        // Add new command
        queue.pending.append(command)
        
        // Save queue
        let encoder = JSONEncoder()
        encoder.outputFormatting = .prettyPrinted
        let data = try encoder.encode(queue)
        try data.write(to: commandFile)
        
        print("Command sent to device \(deviceId)")
    }
    
    /// Start auto-refresh timer
    func startAutoRefresh(interval: TimeInterval = 30) {
        Timer.scheduledTimer(withTimeInterval: interval, repeats: true) { [weak self] _ in
            Task { @MainActor in
                await self?.fetchDevices()
            }
        }
    }
}
