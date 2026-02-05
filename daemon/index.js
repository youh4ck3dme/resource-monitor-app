/**
 * Resource Monitor Daemon
 * Background service that collects system stats and syncs to iCloud
 * 
 * Features:
 * - Collects disk, memory, and process stats every 60s
 * - Syncs data to iCloud via CloudKit-compatible JSON files
 * - Monitors thresholds for push notifications
 * - Listens for remote cleanup commands
 */

import si from 'systeminformation';
import { promises as fs } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

const execAsync = promisify(exec);

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
    // Sync interval in milliseconds
    syncInterval: 60000, // 60 seconds
    
    // iCloud sync directory (CloudKit Documents)
    iCloudPath: path.join(
        os.homedir(),
        'Library/Mobile Documents/iCloud~com~resourcemonitor~app/Documents'
    ),
    
    // Local fallback path
    localPath: path.join(os.homedir(), '.resource-monitor'),
    
    // Thresholds for alerts
    thresholds: {
        disk: { warning: 85, critical: 95 },
        memory: { warning: 85, critical: 95 },
        cacheSize: 10 * 1024 * 1024 * 1024, // 10GB
    },
    
    // Device info
    deviceId: null, // Generated on first run
    deviceName: os.hostname(),
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatBytes(bytes) {
    if (bytes < 1024) return bytes + 'B';
    if (bytes < 1024**2) return (bytes/1024).toFixed(0) + 'KB';
    if (bytes < 1024**3) return (bytes/1024**2).toFixed(1) + 'MB';
    return (bytes/1024**3).toFixed(1) + 'GB';
}

async function ensureDir(dirPath) {
    try {
        await fs.mkdir(dirPath, { recursive: true });
    } catch (e) {
        if (e.code !== 'EEXIST') throw e;
    }
}

async function getDeviceId() {
    const idFile = path.join(CONFIG.localPath, 'device-id');
    try {
        return await fs.readFile(idFile, 'utf8');
    } catch (e) {
        const newId = crypto.randomUUID();
        await ensureDir(CONFIG.localPath);
        await fs.writeFile(idFile, newId);
        return newId;
    }
}

// ============================================
// DATA COLLECTION
// ============================================

async function collectDiskStats() {
    try {
        const disks = await si.fsSize();
        const mainDisk = disks.find(d => d.mount === '/') || disks[0];
        
        return {
            total: mainDisk.size,
            used: mainDisk.used,
            available: mainDisk.available,
            percent: Math.round(mainDisk.use),
            formatted: {
                total: formatBytes(mainDisk.size),
                used: formatBytes(mainDisk.used),
                available: formatBytes(mainDisk.available),
            }
        };
    } catch (e) {
        console.error('Disk stats error:', e.message);
        return null;
    }
}

async function collectMemoryStats() {
    try {
        const mem = await si.mem();
        const usedPercent = Math.round((mem.used / mem.total) * 100);
        
        return {
            total: mem.total,
            used: mem.used,
            available: mem.available,
            percent: usedPercent,
            formatted: {
                total: formatBytes(mem.total),
                used: formatBytes(mem.used),
                available: formatBytes(mem.available),
            }
        };
    } catch (e) {
        console.error('Memory stats error:', e.message);
        return null;
    }
}

async function collectTopProcesses(limit = 5) {
    try {
        const procs = await si.processes();
        const sorted = procs.list
            .filter(p => p.memRss > 0)
            .sort((a, b) => b.memRss - a.memRss)
            .slice(0, limit);
        
        return sorted.map(p => ({
            name: p.name,
            pid: p.pid,
            mem: p.memRss,
            memFormatted: formatBytes(p.memRss),
            cpu: p.cpu?.toFixed(1) || '0.0',
        }));
    } catch (e) {
        console.error('Process stats error:', e.message);
        return [];
    }
}

async function collectCacheSize() {
    const cachePaths = [
        '~/Library/Caches',
        '~/Library/Application Support/Code/Cache',
        '~/Library/Application Support/Code/CachedData',
    ].map(p => p.replace('~', os.homedir()));
    
    let totalSize = 0;
    
    for (const cachePath of cachePaths) {
        try {
            const { stdout } = await execAsync(`du -sk "${cachePath}" 2>/dev/null || echo "0"`);
            const sizeKB = parseInt(stdout.trim().split(/\s+/)[0]) || 0;
            totalSize += sizeKB * 1024;
        } catch (e) {
            // Ignore errors
        }
    }
    
    return {
        bytes: totalSize,
        formatted: formatBytes(totalSize),
    };
}

async function countNodeModules() {
    try {
        const { stdout } = await execAsync(
            `find "${os.homedir()}" -maxdepth 5 -type d -name "node_modules" -prune 2>/dev/null | wc -l`,
            { timeout: 30000 }
        );
        return parseInt(stdout.trim()) || 0;
    } catch (e) {
        return 0;
    }
}

// ============================================
// ALERT DETECTION
// ============================================

function detectAlerts(stats) {
    const alerts = [];
    
    if (stats.disk) {
        if (stats.disk.percent >= CONFIG.thresholds.disk.critical) {
            alerts.push({ type: 'disk_critical', value: stats.disk.percent });
        } else if (stats.disk.percent >= CONFIG.thresholds.disk.warning) {
            alerts.push({ type: 'disk_warning', value: stats.disk.percent });
        }
    }
    
    if (stats.memory) {
        if (stats.memory.percent >= CONFIG.thresholds.memory.critical) {
            alerts.push({ type: 'memory_critical', value: stats.memory.percent });
        } else if (stats.memory.percent >= CONFIG.thresholds.memory.warning) {
            alerts.push({ type: 'memory_warning', value: stats.memory.percent });
        }
    }
    
    if (stats.cacheSize && stats.cacheSize.bytes >= CONFIG.thresholds.cacheSize) {
        alerts.push({ type: 'cleanup_available', value: stats.cacheSize.formatted });
    }
    
    return alerts;
}

// ============================================
// SYNC TO ICLOUD
// ============================================

async function syncToICloud(stats) {
    // Try iCloud path first, fallback to local
    let syncPath = CONFIG.iCloudPath;
    
    try {
        await ensureDir(syncPath);
    } catch (e) {
        console.log('iCloud not available, using local path');
        syncPath = CONFIG.localPath;
        await ensureDir(syncPath);
    }
    
    const statsFile = path.join(syncPath, `device-${CONFIG.deviceId}.json`);
    
    const payload = {
        deviceId: CONFIG.deviceId,
        deviceName: CONFIG.deviceName,
        timestamp: new Date().toISOString(),
        lastSync: Date.now(),
        ...stats,
    };
    
    await fs.writeFile(statsFile, JSON.stringify(payload, null, 2));
    console.log(`[${new Date().toLocaleTimeString()}] Synced to: ${statsFile}`);
    
    return payload;
}

// ============================================
// COMMAND QUEUE (for remote cleanup)
// ============================================

async function checkCommandQueue() {
    const commandFile = path.join(CONFIG.iCloudPath, `commands-${CONFIG.deviceId}.json`);
    
    try {
        const content = await fs.readFile(commandFile, 'utf8');
        const commands = JSON.parse(content);
        
        if (commands.pending && commands.pending.length > 0) {
            console.log('Processing remote commands:', commands.pending);
            
            for (const cmd of commands.pending) {
                await executeCommand(cmd);
            }
            
            // Clear processed commands
            await fs.writeFile(commandFile, JSON.stringify({ pending: [], processed: commands.pending }));
        }
    } catch (e) {
        // No commands file or empty - that's fine
    }
}

async function executeCommand(cmd) {
    console.log(`Executing command: ${cmd.type}`);
    
    switch (cmd.type) {
        case 'cleanup-caches':
            await execAsync(`rm -rf "${os.homedir()}/Library/Caches/pnpm" 2>/dev/null || true`);
            await execAsync(`rm -rf "${os.homedir()}/Library/Application Support/Code/Cache" 2>/dev/null || true`);
            console.log('Caches cleaned');
            break;
            
        case 'cleanup-nodemodules':
            // Only cleanup specified paths
            if (cmd.paths) {
                for (const p of cmd.paths) {
                    if (p.includes('node_modules')) {
                        await execAsync(`rm -rf "${p}" 2>/dev/null || true`);
                    }
                }
            }
            console.log('node_modules cleaned');
            break;
            
        default:
            console.log('Unknown command:', cmd.type);
    }
}

// ============================================
// MAIN LOOP
// ============================================

async function collectAndSync() {
    console.log(`[${new Date().toLocaleTimeString()}] Collecting stats...`);
    
    // Collect all stats in parallel
    const [disk, memory, topProcesses, cacheSize, nodeModulesCount] = await Promise.all([
        collectDiskStats(),
        collectMemoryStats(),
        collectTopProcesses(),
        collectCacheSize(),
        countNodeModules(),
    ]);
    
    const stats = {
        disk,
        memory,
        topProcesses,
        cacheSize,
        nodeModulesCount,
        alerts: [],
    };
    
    stats.alerts = detectAlerts(stats);
    
    // Sync to iCloud
    await syncToICloud(stats);
    
    // Check for remote commands
    await checkCommandQueue();
    
    // Log alerts
    if (stats.alerts.length > 0) {
        console.log('⚠️ Alerts:', stats.alerts.map(a => a.type).join(', '));
    }
}

async function main() {
    console.log('🚀 Resource Monitor Daemon starting...');
    
    // Get or create device ID
    CONFIG.deviceId = await getDeviceId();
    console.log(`📱 Device ID: ${CONFIG.deviceId}`);
    console.log(`💻 Device Name: ${CONFIG.deviceName}`);
    console.log(`☁️ iCloud Path: ${CONFIG.iCloudPath}`);
    console.log(`⏱️ Sync Interval: ${CONFIG.syncInterval / 1000}s`);
    console.log('');
    
    // Initial sync
    await collectAndSync();
    
    // Schedule regular syncs
    setInterval(collectAndSync, CONFIG.syncInterval);
    
    console.log('✅ Daemon running. Press Ctrl+C to stop.');
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Daemon shutting down...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n👋 Daemon shutting down...');
    process.exit(0);
});

// Start the daemon
main().catch(err => {
    console.error('❌ Daemon error:', err);
    process.exit(1);
});
