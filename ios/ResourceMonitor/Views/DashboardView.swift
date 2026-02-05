import SwiftUI

/// Main dashboard view showing all connected devices
struct DashboardView: View {
    @StateObject private var syncService = iCloudSyncService.shared
    @State private var selectedDevice: DeviceStats?
    @State private var showingCleanup = false
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Header
                    headerSection
                    
                    // Devices
                    if syncService.isLoading && syncService.devices.isEmpty {
                        loadingView
                    } else if syncService.devices.isEmpty {
                        emptyView
                    } else {
                        devicesSection
                    }
                }
                .padding()
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Resource Monitor")
            .refreshable {
                await syncService.fetchDevices()
            }
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        Task {
                            await syncService.fetchDevices()
                        }
                    } label: {
                        Image(systemName: "arrow.clockwise")
                    }
                }
            }
            .sheet(item: $selectedDevice) { device in
                DeviceDetailView(device: device)
            }
        }
        .onAppear {
            syncService.startAutoRefresh()
        }
    }
    
    // MARK: - Subviews
    
    private var headerSection: some View {
        VStack(spacing: 8) {
            HStack {
                Text("📡")
                    .font(.system(size: 40))
                Text("Your Macs")
                    .font(.title)
                    .fontWeight(.bold)
                Spacer()
            }
            
            if let error = syncService.lastError {
                HStack {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundColor(.orange)
                    Text(error)
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Spacer()
                }
            }
        }
    }
    
    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.5)
            Text("Loading devices...")
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, minHeight: 200)
    }
    
    private var emptyView: some View {
        VStack(spacing: 16) {
            Image(systemName: "desktopcomputer")
                .font(.system(size: 60))
                .foregroundColor(.secondary)
            
            Text("No Macs Connected")
                .font(.title2)
                .fontWeight(.semibold)
            
            Text("Make sure the Resource Monitor daemon is running on your Mac")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
            
            Button("Refresh") {
                Task {
                    await syncService.fetchDevices()
                }
            }
            .buttonStyle(.borderedProminent)
        }
        .frame(maxWidth: .infinity, minHeight: 300)
        .padding()
    }
    
    private var devicesSection: some View {
        LazyVStack(spacing: 16) {
            ForEach(syncService.devices) { device in
                DeviceCardView(device: device)
                    .onTapGesture {
                        selectedDevice = device
                    }
            }
        }
    }
}

/// Card view for a single device
struct DeviceCardView: View {
    let device: DeviceStats
    
    var body: some View {
        VStack(spacing: 16) {
            // Header
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text("🖥️")
                            .font(.title2)
                        Text(device.deviceName.components(separatedBy: ".").first ?? device.deviceName)
                            .font(.headline)
                            .lineLimit(1)
                    }
                    
                    HStack(spacing: 8) {
                        Circle()
                            .fill(device.isOnline ? Color.green : Color.gray)
                            .frame(width: 8, height: 8)
                        Text(device.isOnline ? "Online" : device.timeSinceSync)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                
                Spacer()
                
                // Alerts badge
                if !device.alerts.isEmpty {
                    HStack(spacing: 4) {
                        ForEach(device.alerts) { alert in
                            Text(alert.icon)
                                .font(.caption)
                        }
                    }
                }
            }
            
            Divider()
            
            // Stats
            HStack(spacing: 20) {
                // Disk
                if let disk = device.disk {
                    StatView(
                        icon: "💾",
                        label: "Disk",
                        value: "\(disk.percent)%",
                        detail: disk.formatted.available,
                        color: disk.percent > 90 ? .red : (disk.percent > 75 ? .orange : .blue)
                    )
                }
                
                Spacer()
                
                // Memory
                if let memory = device.memory {
                    StatView(
                        icon: "🧠",
                        label: "RAM",
                        value: "\(memory.percent)%",
                        detail: memory.formatted.available,
                        color: memory.percent > 90 ? .red : (memory.percent > 75 ? .orange : .green)
                    )
                }
                
                Spacer()
                
                // Cache
                if let cache = device.cacheSize {
                    StatView(
                        icon: "🗑️",
                        label: "Cache",
                        value: cache.formatted,
                        detail: "",
                        color: .purple
                    )
                }
            }
            
            // node_modules count
            if device.nodeModulesCount > 0 {
                HStack {
                    Text("📦")
                    Text("\(device.nodeModulesCount) node_modules")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Spacer()
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.1), radius: 10, x: 0, y: 4)
    }
}

/// Individual stat display
struct StatView: View {
    let icon: String
    let label: String
    let value: String
    let detail: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 4) {
            Text(icon)
                .font(.title3)
            Text(value)
                .font(.system(.title3, design: .rounded, weight: .bold))
                .foregroundColor(color)
            Text(label)
                .font(.caption2)
                .foregroundColor(.secondary)
            if !detail.isEmpty {
                Text(detail)
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
        }
    }
}

#Preview {
    DashboardView()
}
