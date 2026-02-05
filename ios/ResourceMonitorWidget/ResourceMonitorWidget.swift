import WidgetKit
import SwiftUI

// MARK: - Widget Entry

struct DeviceEntry: TimelineEntry {
    let date: Date
    let device: SimpleDeviceData?
}

struct SimpleDeviceData {
    let name: String
    let diskPercent: Int
    let memoryPercent: Int
    let isOnline: Bool
    let hasAlert: Bool
}

// MARK: - Timeline Provider

struct DeviceTimelineProvider: TimelineProvider {
    func placeholder(in context: Context) -> DeviceEntry {
        DeviceEntry(date: Date(), device: SimpleDeviceData(
            name: "Mac mini",
            diskPercent: 65,
            memoryPercent: 75,
            isOnline: true,
            hasAlert: false
        ))
    }
    
    func getSnapshot(in context: Context, completion: @escaping (DeviceEntry) -> Void) {
        let entry = DeviceEntry(date: Date(), device: SimpleDeviceData(
            name: "Mac mini",
            diskPercent: 65,
            memoryPercent: 75,
            isOnline: true,
            hasAlert: false
        ))
        completion(entry)
    }
    
    func getTimeline(in context: Context, completion: @escaping (Timeline<DeviceEntry>) -> Void) {
        // In real app, load from iCloud here
        let device = SimpleDeviceData(
            name: "Mac mini",
            diskPercent: 65,
            memoryPercent: 75,
            isOnline: true,
            hasAlert: false
        )
        
        let entry = DeviceEntry(date: Date(), device: device)
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 5, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }
}

// MARK: - Small Widget View

struct SmallWidgetView: View {
    let entry: DeviceEntry
    
    var body: some View {
        if let device = entry.device {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text("🖥️")
                        .font(.title3)
                    Text(device.name)
                        .font(.caption)
                        .fontWeight(.semibold)
                        .lineLimit(1)
                }
                
                Spacer()
                
                HStack(spacing: 12) {
                    StatPill(icon: "💾", value: device.diskPercent, color: device.diskPercent > 85 ? .red : .blue)
                    StatPill(icon: "🧠", value: device.memoryPercent, color: device.memoryPercent > 85 ? .red : .green)
                }
                
                HStack {
                    Circle()
                        .fill(device.isOnline ? Color.green : Color.gray)
                        .frame(width: 6, height: 6)
                    Text(device.isOnline ? "Online" : "Offline")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
            .padding()
        } else {
            VStack {
                Image(systemName: "desktopcomputer")
                    .font(.largeTitle)
                    .foregroundColor(.secondary)
                Text("No Data")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
    }
}

struct StatPill: View {
    let icon: String
    let value: Int
    let color: Color
    
    var body: some View {
        HStack(spacing: 2) {
            Text(icon)
                .font(.caption2)
            Text("\(value)%")
                .font(.system(.caption, design: .rounded, weight: .bold))
                .foregroundColor(color)
        }
    }
}

// MARK: - Medium Widget View

struct MediumWidgetView: View {
    let entry: DeviceEntry
    
    var body: some View {
        if let device = entry.device {
            HStack(spacing: 16) {
                // Left side - Device info
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text("🖥️")
                            .font(.title2)
                        VStack(alignment: .leading) {
                            Text(device.name)
                                .font(.headline)
                            HStack {
                                Circle()
                                    .fill(device.isOnline ? Color.green : Color.gray)
                                    .frame(width: 8, height: 8)
                                Text(device.isOnline ? "Online" : "Offline")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                    }
                    
                    if device.hasAlert {
                        HStack {
                            Text("⚠️")
                            Text("Alert")
                                .font(.caption)
                                .foregroundColor(.orange)
                        }
                    }
                }
                
                Spacer()
                
                // Right side - Gauges
                HStack(spacing: 20) {
                    MiniGauge(icon: "💾", percent: device.diskPercent, 
                              color: device.diskPercent > 85 ? .red : .blue)
                    MiniGauge(icon: "🧠", percent: device.memoryPercent,
                              color: device.memoryPercent > 85 ? .red : .green)
                }
            }
            .padding()
        } else {
            HStack {
                Image(systemName: "desktopcomputer")
                    .font(.largeTitle)
                Text("Connect a Mac to get started")
                    .font(.subheadline)
            }
            .foregroundColor(.secondary)
        }
    }
}

struct MiniGauge: View {
    let icon: String
    let percent: Int
    let color: Color
    
    var body: some View {
        VStack(spacing: 4) {
            ZStack {
                Circle()
                    .stroke(Color.gray.opacity(0.3), lineWidth: 4)
                Circle()
                    .trim(from: 0, to: CGFloat(percent) / 100)
                    .stroke(color, style: StrokeStyle(lineWidth: 4, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                Text(icon)
                    .font(.caption)
            }
            .frame(width: 40, height: 40)
            
            Text("\(percent)%")
                .font(.system(.caption2, design: .rounded, weight: .bold))
        }
    }
}

// MARK: - Widget Definition

struct ResourceMonitorWidget: Widget {
    let kind: String = "ResourceMonitorWidget"
    
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: DeviceTimelineProvider()) { entry in
            if #available(iOS 17.0, *) {
                SmallWidgetView(entry: entry)
                    .containerBackground(.fill.tertiary, for: .widget)
            } else {
                SmallWidgetView(entry: entry)
                    .padding()
                    .background()
            }
        }
        .configurationDisplayName("Resource Monitor")
        .description("Monitor your Mac's disk and memory usage")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// MARK: - Widget Bundle

@main
struct ResourceMonitorWidgetBundle: WidgetBundle {
    var body: some Widget {
        ResourceMonitorWidget()
    }
}

// MARK: - Previews

#Preview(as: .systemSmall) {
    ResourceMonitorWidget()
} timeline: {
    DeviceEntry(date: Date(), device: SimpleDeviceData(
        name: "Mac mini",
        diskPercent: 72,
        memoryPercent: 85,
        isOnline: true,
        hasAlert: true
    ))
}

#Preview(as: .systemMedium) {
    ResourceMonitorWidget()
} timeline: {
    DeviceEntry(date: Date(), device: SimpleDeviceData(
        name: "Mac mini",
        diskPercent: 72,
        memoryPercent: 85,
        isOnline: true,
        hasAlert: true
    ))
}
