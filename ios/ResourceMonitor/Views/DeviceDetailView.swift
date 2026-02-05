import SwiftUI

/// Detailed view for a single device
struct DeviceDetailView: View {
    let device: DeviceStats
    @State private var showingCleanupOptions = false
    @State private var isCleaningUp = false
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // Header Card
                    headerCard
                    
                    // Disk & Memory Section
                    storageSection
                    
                    // Top Processes
                    if !device.topProcesses.isEmpty {
                        processesSection
                    }
                    
                    // Quick Actions
                    actionsSection
                    
                    // Alerts
                    if !device.alerts.isEmpty {
                        alertsSection
                    }
                }
                .padding()
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Device Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
            .confirmationDialog("Cleanup Options", isPresented: $showingCleanupOptions) {
                Button("🧹 Clean All Caches") {
                    performCleanup(.cleanupCaches)
                }
                Button("📦 Clean Old node_modules") {
                    performCleanup(.cleanupNodemodules)
                }
                Button("Cancel", role: .cancel) {}
            }
        }
    }
    
    // MARK: - Subviews
    
    private var headerCard: some View {
        VStack(spacing: 12) {
            HStack {
                Text("🖥️")
                    .font(.system(size: 50))
                
                VStack(alignment: .leading) {
                    Text(device.deviceName.components(separatedBy: ".").first ?? device.deviceName)
                        .font(.title2)
                        .fontWeight(.bold)
                    
                    HStack {
                        Circle()
                            .fill(device.isOnline ? Color.green : Color.gray)
                            .frame(width: 10, height: 10)
                        Text(device.isOnline ? "Online" : "Last seen: \(device.timeSinceSync)")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                }
                
                Spacer()
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
    }
    
    private var storageSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Storage")
                .font(.headline)
            
            HStack(spacing: 16) {
                // Disk
                if let disk = device.disk {
                    StorageGaugeView(
                        icon: "💾",
                        title: "Disk",
                        used: disk.formatted.used,
                        total: disk.formatted.total,
                        percent: disk.percent,
                        color: disk.percent > 90 ? .red : (disk.percent > 75 ? .orange : .blue)
                    )
                }
                
                // Memory
                if let memory = device.memory {
                    StorageGaugeView(
                        icon: "🧠",
                        title: "RAM",
                        used: memory.formatted.used,
                        total: memory.formatted.total,
                        percent: memory.percent,
                        color: memory.percent > 90 ? .red : (memory.percent > 75 ? .orange : .green)
                    )
                }
            }
            
            // Cache info
            if let cache = device.cacheSize {
                HStack {
                    Label {
                        Text("Total Cache: \(cache.formatted)")
                    } icon: {
                        Text("🗑️")
                    }
                    Spacer()
                    if device.nodeModulesCount > 0 {
                        Text("📦 \(device.nodeModulesCount) node_modules")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                .padding()
                .background(Color(.secondarySystemGroupedBackground))
                .cornerRadius(12)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
    }
    
    private var processesSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Top Processes")
                .font(.headline)
            
            ForEach(device.topProcesses) { process in
                HStack {
                    Text(process.name)
                        .font(.subheadline)
                        .lineLimit(1)
                    
                    Spacer()
                    
                    Text(process.memFormatted)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .monospacedDigit()
                    
                    Text("\(process.cpu)%")
                        .font(.caption)
                        .foregroundColor(.orange)
                        .monospacedDigit()
                        .frame(width: 50, alignment: .trailing)
                }
                .padding(.vertical, 8)
                
                if process.id != device.topProcesses.last?.id {
                    Divider()
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
    }
    
    private var actionsSection: some View {
        VStack(spacing: 12) {
            Button {
                showingCleanupOptions = true
            } label: {
                HStack {
                    Image(systemName: "trash.circle.fill")
                        .font(.title2)
                    Text("Remote Cleanup")
                        .fontWeight(.semibold)
                    Spacer()
                    Image(systemName: "chevron.right")
                }
                .padding()
                .foregroundColor(.white)
                .background(
                    LinearGradient(
                        colors: [.red, .orange],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .cornerRadius(12)
            }
            .disabled(isCleaningUp || !device.isOnline)
            .opacity(device.isOnline ? 1 : 0.5)
        }
    }
    
    private var alertsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Alerts")
                .font(.headline)
            
            ForEach(device.alerts) { alert in
                HStack {
                    Text(alert.icon)
                    Text(alert.message)
                        .font(.subheadline)
                    Spacer()
                }
                .padding()
                .background(
                    alert.type.contains("critical")
                        ? Color.red.opacity(0.1)
                        : Color.orange.opacity(0.1)
                )
                .cornerRadius(10)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
    }
    
    // MARK: - Actions
    
    private func performCleanup(_ type: CleanupCommand.CleanupType) {
        isCleaningUp = true
        
        Task {
            let command = CleanupCommand(
                type: type,
                paths: nil,
                timestamp: Date()
            )
            
            do {
                try await iCloudSyncService.shared.sendCleanupCommand(
                    to: device.deviceId,
                    command: command
                )
                // Show success feedback
            } catch {
                // Show error
                print("Cleanup error: \(error)")
            }
            
            isCleaningUp = false
        }
    }
}

/// Circular gauge for storage display
struct StorageGaugeView: View {
    let icon: String
    let title: String
    let used: String
    let total: String
    let percent: Int
    let color: Color
    
    var body: some View {
        VStack(spacing: 8) {
            ZStack {
                Circle()
                    .stroke(Color.gray.opacity(0.2), lineWidth: 8)
                
                Circle()
                    .trim(from: 0, to: CGFloat(percent) / 100)
                    .stroke(color, style: StrokeStyle(lineWidth: 8, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                    .animation(.easeOut, value: percent)
                
                VStack(spacing: 2) {
                    Text(icon)
                        .font(.title3)
                    Text("\(percent)%")
                        .font(.system(.headline, design: .rounded, weight: .bold))
                }
            }
            .frame(width: 80, height: 80)
            
            Text(title)
                .font(.caption)
                .fontWeight(.medium)
            
            Text("\(used) / \(total)")
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}

#Preview {
    let mockDevice = DeviceStats(
        deviceId: "test",
        deviceName: "Mac-mini.local",
        timestamp: "2024-01-01",
        lastSync: Int(Date().timeIntervalSince1970 * 1000),
        disk: DiskStats(
            total: 256000000000,
            used: 200000000000,
            available: 56000000000,
            percent: 78,
            formatted: FormattedSize(total: "256GB", used: "200GB", available: "56GB")
        ),
        memory: MemoryStats(
            total: 16000000000,
            used: 12000000000,
            available: 4000000000,
            percent: 75,
            formatted: FormattedSize(total: "16GB", used: "12GB", available: "4GB")
        ),
        topProcesses: [
            ProcessInfo(name: "Code", pid: 1234, mem: 2500000000, memFormatted: "2.5GB", cpu: "12.5")
        ],
        cacheSize: CacheStats(bytes: 5000000000, formatted: "5GB"),
        nodeModulesCount: 13,
        alerts: [Alert(type: "disk_warning", value: 78)]
    )
    
    DeviceDetailView(device: mockDevice)
}
