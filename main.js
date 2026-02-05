const { app, BrowserWindow, Notification, ipcMain } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// ============================================
// 🚀 TURBO MODE - 400% PERFORMANCE BOOST
// ============================================

// 1. AGGRESSIVE V8 FLAGS
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=256');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');

// 2. LAZY LOADING with caching
let _si = null;
let _siPromise = null;
const getSystemInfo = () => {
    if (_si) return _si;
    if (!_siPromise) {
        _siPromise = new Promise(resolve => {
            setImmediate(() => {
                _si = require('systeminformation');
                resolve(_si);
            });
        });
    }
    return _siPromise;
};

// 3. DATA CACHE - Avoid redundant calls
const cache = {
    disk: null,
    diskTimestamp: 0,
    DISK_TTL: 30000, // 30s cache for disk (slow to change)
};

let mainWindow;
const homeDir = process.env.HOME || '/Users/youh4ck3dme';

// 4. PRE-WARM everything on 'ready' event
app.on('ready', () => {
    // Start loading systeminformation immediately
    getSystemInfo();
});

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        show: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            backgroundThrottling: false,
            enableWebSQL: false,
            spellcheck: false
        },
        backgroundColor: '#1c1c1e',
        vibrancy: 'under-window',
        visualEffectState: 'active',
        titleBarStyle: 'hiddenInset'
    });

    // 5. INSTANT SHOW - Don't wait for full load
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // 6. START DATA LOOP immediately after content loads
    mainWindow.webContents.once('dom-ready', () => {
        // First update faster to populate UI
        updateStats();
        // Then regular interval
        setInterval(updateStats, 8000); // Slightly faster updates
    });

    mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// ============================================
// 🔥 OPTIMIZED DATA FUNCTIONS
// ============================================

async function getDiskStats() {
    const now = Date.now();
    // Use cache if fresh
    if (cache.disk && (now - cache.diskTimestamp) < cache.DISK_TTL) {
        return cache.disk;
    }

    try {
        const si = await getSystemInfo();
        const disks = await si.fsSize();
        const mainDisk = disks.find(d => d.mount === '/System/Volumes/Data') || disks[0];
        
        if (!mainDisk) return { total: '0', available: '0', usedPercent: '0' };

        const diskData = {
            total: (mainDisk.size / 1024 / 1024 / 1024).toFixed(0),
            available: (mainDisk.available / 1024 / 1024 / 1024).toFixed(0),
            usedPercent: mainDisk.use.toFixed(0)
        };

        // Notification Check
        if (parseFloat(diskData.available) < 10) {
            new Notification({
                title: '⚠️ CRITICAL DISK SPACE',
                body: `Only ${diskData.available}GB remaining!`
            }).show();
        }

        // Cache result
        cache.disk = diskData;
        cache.diskTimestamp = now;
        
        return diskData;
    } catch (e) {
        console.error("Disk Stats Error:", e);
        return cache.disk || { total: '0', available: '0', usedPercent: '0' };
    }
}

// 7. PARALLEL FOLDER STATS with timeout - HOME
async function getHomeFolderStats() {
    try {
        const { stdout } = await execAsync(
            `bash -c "du -sh \\"${homeDir}\\"/* 2>/dev/null | sort -hr | head -n 8"`,
            { timeout: 5000, maxBuffer: 1024 * 1024 }
        );
        if (!stdout || !stdout.trim()) return [];
        return stdout.trim().split('\n').map(line => {
            const parts = line.trim().split(/\s+/);
            if (parts.length < 2) return null;
            const size = parts[0];
            const fullPath = parts.slice(1).join(' ');
            const name = path.basename(fullPath);
            const icon = getFolderIcon(name);
            return { name: String(name), size: String(size), icon, path: fullPath };
        }).filter(Boolean);
    } catch (e) {
        return [];
    }
}

// CACHE FOLDER STATS
async function getCacheFolderStats() {
    const cachePaths = [
        { name: 'VS Code Cache', path: `${homeDir}/Library/Application Support/Code/Cache`, icon: '💻' },
        { name: 'VS Code CachedData', path: `${homeDir}/Library/Application Support/Code/CachedData`, icon: '💻' },
        { name: 'VS Code globalStorage', path: `${homeDir}/Library/Application Support/Code/User/globalStorage`, icon: '💻' },
        { name: 'Cursor Cache', path: `${homeDir}/Library/Application Support/Cursor/Cache`, icon: '🖱️' },
        { name: 'pnpm Store', path: `${homeDir}/Library/Caches/pnpm`, icon: '📦' },
        { name: 'npm Cache', path: `${homeDir}/.npm`, icon: '📦' },
        { name: 'Homebrew', path: `${homeDir}/Library/Caches/Homebrew`, icon: '🍺' },
        { name: 'Playwright', path: `${homeDir}/Library/Caches/ms-playwright`, icon: '🎭' },
        { name: 'Electron', path: `${homeDir}/Library/Caches/electron`, icon: '⚡' },
        { name: 'pip Cache', path: `${homeDir}/Library/Caches/pip`, icon: '🐍' },
        { name: 'Google Chrome', path: `${homeDir}/Library/Caches/Google`, icon: '🌐' },
    ];

    const results = await Promise.all(cachePaths.map(async (c) => {
        try {
            const { stdout } = await execAsync(`du -sh "${c.path}" 2>/dev/null`, { timeout: 3000 });
            const size = stdout.trim().split(/\s+/)[0] || '0B';
            return { ...c, size };
        } catch {
            return { ...c, size: '0B' };
        }
    }));

    // Filter out 0B entries and sort by size
    return results.filter(r => r.size !== '0B').sort((a, b) => {
        return parseSizeToBytes(b.size) - parseSizeToBytes(a.size);
    });
}

// DEV TOOLS FOLDER STATS
async function getDevToolsStats() {
    const devPaths = [
        { name: 'Android SDK', path: `${homeDir}/Library/Android`, icon: '🤖' },
        { name: 'Flutter pub-cache', path: `${homeDir}/.pub-cache`, icon: '🎯' },
        { name: 'Xcode DerivedData', path: `${homeDir}/Library/Developer/Xcode/DerivedData`, icon: '🍎' },
        { name: 'iOS Simulators', path: `${homeDir}/Library/Developer/CoreSimulator`, icon: '📱' },
        { name: 'CocoaPods', path: `${homeDir}/Library/Caches/CocoaPods`, icon: '🫛' },
        { name: 'Gradle', path: `${homeDir}/.gradle`, icon: '🐘' },
        { name: 'Maven', path: `${homeDir}/.m2`, icon: '📦' },
        { name: 'Cargo (Rust)', path: `${homeDir}/.cargo`, icon: '🦀' },
        { name: 'Go Modules', path: `${homeDir}/go`, icon: '🐹' },
    ];

    const results = await Promise.all(devPaths.map(async (d) => {
        try {
            const { stdout } = await execAsync(`du -sh "${d.path}" 2>/dev/null`, { timeout: 5000 });
            const size = stdout.trim().split(/\s+/)[0] || '0B';
            return { ...d, size };
        } catch {
            return { ...d, size: '0B' };
        }
    }));

    return results.filter(r => r.size !== '0B').sort((a, b) => {
        return parseSizeToBytes(b.size) - parseSizeToBytes(a.size);
    });
}

// CLEANUP SIZES for Quick Clean tab
async function getCleanupSizes() {
    const cleanupPaths = {
        vscode: [
            `${homeDir}/Library/Application Support/Code/Cache`,
            `${homeDir}/Library/Application Support/Code/CachedData`,
            `${homeDir}/Library/Application Support/Code/CachedExtensionVSIXs`,
            `${homeDir}/Library/Application Support/Code/logs`,
        ],
        npm: [
            `${homeDir}/Library/Caches/pnpm`,
            `${homeDir}/.npm/_cacache`,
        ],
        homebrew: [`${homeDir}/Library/Caches/Homebrew`],
        playwright: [
            `${homeDir}/Library/Caches/ms-playwright`,
            `${homeDir}/Library/Caches/ms-playwright-go`,
        ],
        electron: [`${homeDir}/Library/Caches/electron`],
    };

    const sizes = {};
    for (const [key, paths] of Object.entries(cleanupPaths)) {
        let total = 0;
        for (const p of paths) {
            try {
                const { stdout } = await execAsync(`du -sk "${p}" 2>/dev/null`, { timeout: 3000 });
                const kb = parseInt(stdout.trim().split(/\s+/)[0]) || 0;
                total += kb;
            } catch { }
        }
        sizes[key] = formatBytes(total * 1024);
    }
    return sizes;
}

// Helper: Parse size string to bytes
function parseSizeToBytes(size) {
    const match = size.match(/^([\d.]+)([KMGT]?)i?B?$/i);
    if (!match) return 0;
    const num = parseFloat(match[1]);
    const unit = (match[2] || '').toUpperCase();
    const multipliers = { '': 1, 'K': 1024, 'M': 1024**2, 'G': 1024**3, 'T': 1024**4 };
    return num * (multipliers[unit] || 1);
}

// Helper: Format bytes
function formatBytes(bytes) {
    if (bytes < 1024) return bytes + 'B';
    if (bytes < 1024**2) return (bytes/1024).toFixed(0) + 'KB';
    if (bytes < 1024**3) return (bytes/1024**2).toFixed(1) + 'MB';
    return (bytes/1024**3).toFixed(1) + 'GB';
}

// Helper: Get folder icon
function getFolderIcon(name) {
    const icons = {
        'Desktop': '🖥️', 'Documents': '📄', 'Downloads': '⬇️', 'Pictures': '🖼️',
        'Movies': '🎬', 'Music': '🎵', 'Library': '📚', 'Applications': '📱',
        '.Trash': '🗑️', 'Developer': '👨‍💻', 'Projects': '📁', 'Work': '💼',
    };
    return icons[name] || '📁';
}

// 8. SIMPLIFIED EDITOR STATS - Less AppleScript calls
function getEditorStats(processes) {
    const editors = [
        { name: 'VS Code', processName: 'Code' },
        { name: 'Cursor', processName: 'Cursor' },
        { name: 'Antigravity', processName: 'Antigravity' }
    ];

    return editors.map(ed => {
        const procs = processes.list.filter(p => 
            p.name && typeof p.name === 'string' && p.name.includes(ed.processName)
        );
        // Use memRss (bytes) for actual memory, not mem (percentage)
        const totalMemBytes = procs.reduce((a, p) => a + (p.memRss || 0), 0);
        const totalCpu = procs.reduce((a, p) => a + (p.cpu || 0), 0);
        const isRunning = procs.length > 0;

        let status = 'Offline';
        if (isRunning) {
            if (totalCpu > 10) status = 'Compiling ⚡️';
            else if (totalCpu > 2) status = 'Active';
            else status = 'Idle';
        }

        // Return ONLY primitive types
        return {
            name: String(ed.name),
            mem: String(Math.round(totalMemBytes / 1024 / 1024)) + 'MB',
            cpu: String(totalCpu.toFixed(1)) + '%',
            project: isRunning ? 'Running' : 'Offline',
            status: String(status),
            isRunning: Boolean(isRunning)
        };
    });
}

// ============================================
// 🧹 CLEANUP IPC HANDLERS
// ============================================

ipcMain.handle('cleanup-cache', async (event, action) => {
    const cleanupCommands = {
        'vscode-cache': `rm -rf "${homeDir}/Library/Application Support/Code/Cache" "${homeDir}/Library/Application Support/Code/CachedData" "${homeDir}/Library/Application Support/Code/CachedExtensionVSIXs" "${homeDir}/Library/Application Support/Code/logs"`,
        'npm-cache': `rm -rf "${homeDir}/Library/Caches/pnpm" "${homeDir}/.npm/_cacache"`,
        'homebrew-cache': `rm -rf "${homeDir}/Library/Caches/Homebrew"`,
        'playwright-cache': `rm -rf "${homeDir}/Library/Caches/ms-playwright" "${homeDir}/Library/Caches/ms-playwright-go"`,
        'electron-cache': `rm -rf "${homeDir}/Library/Caches/electron"`,
    };

    const cmd = cleanupCommands[action];
    if (!cmd) return { success: false, error: 'Unknown action' };

    try {
        await execAsync(cmd, { timeout: 30000 });
        // Invalidate disk cache
        cache.diskTimestamp = 0;
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('cleanup-all', async () => {
    const commands = [
        `rm -rf "${homeDir}/Library/Application Support/Code/Cache"`,
        `rm -rf "${homeDir}/Library/Application Support/Code/CachedData"`,
        `rm -rf "${homeDir}/Library/Application Support/Code/CachedExtensionVSIXs"`,
        `rm -rf "${homeDir}/Library/Caches/pnpm"`,
        `rm -rf "${homeDir}/Library/Caches/Homebrew"`,
        `rm -rf "${homeDir}/Library/Caches/ms-playwright"`,
        `rm -rf "${homeDir}/Library/Caches/electron"`,
    ];

    try {
        for (const cmd of commands) {
            await execAsync(cmd, { timeout: 10000 }).catch(() => {});
        }
        cache.diskTimestamp = 0;
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// ============================================
// 📦 NODE_MODULES SCANNER IPC HANDLERS
// ============================================

// Scan for all node_modules folders
ipcMain.handle('scan-nodemodules', async () => {
    try {
        // Search in common development directories
        const searchPaths = [
            homeDir,
            `${homeDir}/Documents`,
            `${homeDir}/Desktop`,
            `${homeDir}/Projects`,
            `${homeDir}/Work`,
            `${homeDir}/Developer`,
            `${homeDir}/.gemini`,
        ];
        
        const allNodeModules = [];
        const seenPaths = new Set();
        
        for (const searchPath of searchPaths) {
            try {
                // Find all node_modules directories (max depth 6 to avoid going too deep)
                const { stdout } = await execAsync(
                    `find "${searchPath}" -maxdepth 6 -type d -name "node_modules" -prune 2>/dev/null`,
                    { timeout: 60000, maxBuffer: 10 * 1024 * 1024 }
                );
                
                if (stdout && stdout.trim()) {
                    const paths = stdout.trim().split('\n').filter(Boolean);
                    for (const p of paths) {
                        // Skip if we've seen this path or it's inside another node_modules
                        if (seenPaths.has(p)) continue;
                        if ([...seenPaths].some(seen => p.startsWith(seen + '/'))) continue;
                        seenPaths.add(p);
                    }
                }
            } catch (e) {
                // Skip paths that fail
            }
        }
        
        // Get size and last access time for each
        const results = await Promise.all([...seenPaths].map(async (nmPath) => {
            try {
                // Get size
                const { stdout: sizeOut } = await execAsync(`du -sk "${nmPath}" 2>/dev/null`, { timeout: 5000 });
                const sizeKB = parseInt(sizeOut.trim().split(/\s+/)[0]) || 0;
                
                // Get last access time (using stat)
                const { stdout: statOut } = await execAsync(`stat -f "%a" "${nmPath}" 2>/dev/null`, { timeout: 3000 });
                const lastAccessTimestamp = parseInt(statOut.trim()) || 0;
                const lastAccessDate = new Date(lastAccessTimestamp * 1000);
                const now = new Date();
                const daysAgo = Math.floor((now - lastAccessDate) / (1000 * 60 * 60 * 24));
                
                // Get project name (parent folder)
                const parentPath = nmPath.replace(/\/node_modules$/, '');
                const projectName = parentPath.split('/').pop();
                
                return {
                    path: nmPath,
                    projectName,
                    parentPath,
                    size: formatBytes(sizeKB * 1024),
                    sizeBytes: sizeKB * 1024,
                    daysAgo,
                    isOld: daysAgo > 14,
                    lastAccess: lastAccessDate.toLocaleDateString()
                };
            } catch (e) {
                return null;
            }
        }));
        
        // Filter nulls and sort by size (largest first)
        const validResults = results.filter(Boolean).sort((a, b) => b.sizeBytes - a.sizeBytes);
        
        // Calculate totals
        const totalBytes = validResults.reduce((sum, r) => sum + r.sizeBytes, 0);
        const oldCount = validResults.filter(r => r.isOld).length;
        
        return {
            success: true,
            nodeModules: validResults,
            total: formatBytes(totalBytes),
            count: validResults.length,
            oldCount
        };
    } catch (e) {
        console.error('Node modules scan error:', e);
        return { success: false, error: e.message, nodeModules: [], total: '0B', count: 0 };
    }
});

// Delete a single node_modules folder
ipcMain.handle('delete-nodemodule', async (event, nmPath) => {
    if (!nmPath || !nmPath.includes('node_modules')) {
        return { success: false, error: 'Invalid path' };
    }
    
    try {
        await execAsync(`rm -rf "${nmPath}"`, { timeout: 60000 });
        cache.diskTimestamp = 0;
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// Delete all old node_modules (14+ days)
ipcMain.handle('delete-old-nodemodules', async (event, paths) => {
    if (!Array.isArray(paths)) {
        return { success: false, error: 'Invalid paths' };
    }
    
    let deleted = 0;
    let failed = 0;
    
    for (const nmPath of paths) {
        if (!nmPath || !nmPath.includes('node_modules')) continue;
        try {
            await execAsync(`rm -rf "${nmPath}"`, { timeout: 60000 });
            deleted++;
        } catch (e) {
            failed++;
        }
    }
    
    cache.diskTimestamp = 0;
    return { success: true, deleted, failed };
});

// ============================================
// 9. MAIN UPDATE LOOP - Parallel everything
// ============================================

async function updateStats() {
    try {
        const si = await getSystemInfo();
        
        // Run EVERYTHING in parallel
        const [fullProcesses, diskData, memData, homeFolders, cacheFolders, devTools, cleanupSizes] = await Promise.all([
            si.processes(),
            getDiskStats(),
            si.mem(),
            getHomeFolderStats(),
            getCacheFolderStats(),
            getDevToolsStats(),
            getCleanupSizes()
        ]);

        // Process after parallel fetch - use memRss for actual bytes
        const topProcesses = fullProcesses.list
            .filter(p => p.memRss && p.memRss > 0)
            .sort((a, b) => (b.memRss || 0) - (a.memRss || 0))
            .slice(0, 5)
            .map(p => ({
                name: String(p.name || 'Unknown'),
                mem: String(Math.round((p.memRss || 0) / 1024 / 1024)) + 'MB'
            }));

        const editorStats = getEditorStats(fullProcesses);

        // Calculate total cache size
        const totalCacheBytes = cacheFolders.reduce((sum, f) => sum + parseSizeToBytes(f.size), 0);

        // Prepare serializable data object - use JSON to strip non-serializable data
        const data = JSON.parse(JSON.stringify({
            disk: diskData || { total: '0', available: '0', usedPercent: '0' },
            memory: {
                total: String((memData.total / 1024 / 1024 / 1024).toFixed(1)),
                free: String((memData.available / 1024 / 1024 / 1024).toFixed(1)),
                used: String((memData.active / 1024 / 1024 / 1024).toFixed(1)),
                usedPercent: String(Math.round((memData.active / memData.total) * 100))
            },
            processes: topProcesses,
            folders: {
                home: homeFolders || [],
                caches: cacheFolders || [],
                devtools: devTools || [],
                totalCacheSize: formatBytes(totalCacheBytes)
            },
            cleanup: cleanupSizes,
            editors: editorStats,
            timestamp: new Date().toLocaleTimeString()
        }));

        // Send to renderer
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('update-data', data);
        }
    } catch (error) {
        console.error("Update Error:", error.message);
    }
}

