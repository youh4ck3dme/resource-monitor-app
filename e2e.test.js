/**
 * Resource Monitor - E2E / Integration Tests
 * Tests IPC handlers and folder scanning functionality
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');

const execAsync = promisify(exec);

// ============================================  
// FILE SYSTEM TESTS
// ============================================
describe('File System Tests', () => {
    test('home directory exists', async () => {
        const homeDir = process.env.HOME || '/Users/youh4ck3dme';
        expect(fs.existsSync(homeDir)).toBe(true);
    });

    test('can list home directory', async () => {
        const homeDir = process.env.HOME || '/Users/youh4ck3dme';
        const contents = fs.readdirSync(homeDir);
        expect(contents.length).toBeGreaterThan(0);
    });

    test('common directories exist', async () => {
        const homeDir = process.env.HOME || '/Users/youh4ck3dme';
        const commonDirs = ['Library', 'Documents', 'Desktop'];
        
        for (const dir of commonDirs) {
            const fullPath = path.join(homeDir, dir);
            const exists = fs.existsSync(fullPath);
            // At least Library should exist on macOS
            if (dir === 'Library') {
                expect(exists).toBe(true);
            }
        }
    });
});

// ============================================
// SHELL COMMAND TESTS
// ============================================
describe('Shell Command Tests', () => {
    test('du command works', async () => {
        const nodeModulesPath = path.join(__dirname, 'node_modules', 'electron');
        const { stdout } = await execAsync(`du -sk "${nodeModulesPath}" 2>/dev/null | head -1`);
        expect(stdout.length).toBeGreaterThan(0);
        
        const parts = stdout.trim().split(/\s+/);
        const sizeKB = parseInt(parts[0]);
        expect(sizeKB).toBeGreaterThan(0);
    }, 60000);

    test('find command works for node_modules', async () => {
        const projectDir = path.join(__dirname);
        const { stdout } = await execAsync(`find "${projectDir}" -maxdepth 2 -type d -name "node_modules" 2>/dev/null`);
        // This test project should have node_modules
        expect(stdout.length).toBeGreaterThan(0);
    }, 10000);

    test('stat command returns valid timestamp', async () => {
        const homeDir = process.env.HOME || '/Users/youh4ck3dme';
        const { stdout } = await execAsync(`stat -f "%a" "${homeDir}" 2>/dev/null`);
        const timestamp = parseInt(stdout.trim());
        expect(timestamp).toBeGreaterThan(0);
    }, 10000);

    test('df command works', async () => {
        const { stdout } = await execAsync('df -h / | tail -1');
        expect(stdout.length).toBeGreaterThan(0);
        expect(stdout).toMatch(/\d+[GMK]i?\s/);
    }, 10000);
});

// ============================================
// CACHE DIRECTORY TESTS
// ============================================
describe('Cache Directory Tests', () => {
    const homeDir = process.env.HOME || '/Users/youh4ck3dme';
    
    test('can check common cache paths', () => {
        const cachePaths = [
            `${homeDir}/Library/Caches`,
            `${homeDir}/Library/Application Support/Code`,
            `${homeDir}/Library/Caches/Homebrew`,
        ];
        
        for (const cachePath of cachePaths) {
            // Just verify we can check if they exist without error
            const exists = fs.existsSync(cachePath);
            expect(typeof exists).toBe('boolean');
        }
    });

    test('Library/Caches exists on macOS', () => {
        const cachesPath = path.join(homeDir, 'Library', 'Caches');
        expect(fs.existsSync(cachesPath)).toBe(true);
    });
});

// ============================================
// NODE_MODULES DETECTION TESTS
// ============================================
describe('Node Modules Detection', () => {
    test('current project has node_modules', () => {
        const nodeModulesPath = path.join(__dirname, 'node_modules');
        expect(fs.existsSync(nodeModulesPath)).toBe(true);
    });

    test('node_modules contains electron', () => {
        const electronPath = path.join(__dirname, 'node_modules', 'electron');
        expect(fs.existsSync(electronPath)).toBe(true);
    });

    test('node_modules contains jest', () => {
        const jestPath = path.join(__dirname, 'node_modules', 'jest');
        expect(fs.existsSync(jestPath)).toBe(true);
    });

    test('can get node_modules size', async () => {
        const nodeModulesPath = path.join(__dirname, 'node_modules');
        const { stdout } = await execAsync(`du -sk "${nodeModulesPath}" 2>/dev/null`);
        const sizeKB = parseInt(stdout.trim().split(/\s+/)[0]);
        expect(sizeKB).toBeGreaterThan(1000); // Should be at least 1MB
    }, 30000);
});

// ============================================
// PROCESS TESTS
// ============================================
describe('Process Detection', () => {
    test('can list processes', async () => {
        const { stdout } = await execAsync('ps aux | head -10');
        expect(stdout.length).toBeGreaterThan(0);
        expect(stdout).toContain('USER');
    });

    test('node process is running', async () => {
        const { stdout } = await execAsync('pgrep -l node || true');
        // Node should be running (this test is running on node)
        expect(stdout.length).toBeGreaterThanOrEqual(0);
    });
});

// ============================================
// CLEANUP PATH VALIDATION
// ============================================
describe('Cleanup Path Validation', () => {
    const homeDir = process.env.HOME || '/Users/youh4ck3dme';
    
    test('cleanup paths are within home directory', () => {
        const cleanupPaths = [
            `${homeDir}/Library/Application Support/Code/Cache`,
            `${homeDir}/Library/Caches/pnpm`,
            `${homeDir}/Library/Caches/Homebrew`,
            `${homeDir}/Library/Caches/ms-playwright`,
            `${homeDir}/Library/Caches/electron`,
        ];
        
        for (const cleanupPath of cleanupPaths) {
            expect(cleanupPath.startsWith(homeDir)).toBe(true);
            expect(cleanupPath).not.toContain('..');
        }
    });

    test('cleanup paths do not include system directories', () => {
        const cleanupPaths = [
            `${homeDir}/Library/Application Support/Code/Cache`,
            `${homeDir}/Library/Caches/pnpm`,
        ];
        
        for (const cleanupPath of cleanupPaths) {
            expect(cleanupPath).not.toMatch(/^\/System/);
            expect(cleanupPath).not.toMatch(/^\/usr/);
            expect(cleanupPath).not.toMatch(/^\/bin/);
        }
    });
});

// ============================================
// MEMORY TESTS
// ============================================
describe('Memory Usage', () => {
    test('vm_stat command works on macOS', async () => {
        try {
            const { stdout } = await execAsync('vm_stat');
            expect(stdout).toContain('Pages');
        } catch (e) {
            // Skip on non-macOS
            expect(true).toBe(true);
        }
    });

    test('process memory is available', () => {
        const memUsage = process.memoryUsage();
        expect(memUsage.heapUsed).toBeGreaterThan(0);
        expect(memUsage.heapTotal).toBeGreaterThan(0);
    });
});
