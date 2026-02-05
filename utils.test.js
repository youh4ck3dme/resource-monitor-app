/**
 * Resource Monitor - Comprehensive Unit Tests
 * Tests all utility functions and validates core functionality
 */

const {
    parseSizeToBytes,
    formatBytes,
    getFolderIcon,
    isValidNodeModulesPath,
    calculateDaysAgo,
    isValidCleanupAction,
    parseDuOutput,
    extractProjectName,
    shouldExcludePath
} = require('./utils');

// ============================================
// parseSizeToBytes TESTS
// ============================================
describe('parseSizeToBytes', () => {
    test('parses bytes correctly', () => {
        expect(parseSizeToBytes('100B')).toBe(100);
        expect(parseSizeToBytes('1B')).toBe(1);
    });

    test('parses kilobytes correctly', () => {
        expect(parseSizeToBytes('1K')).toBe(1024);
        expect(parseSizeToBytes('1KB')).toBe(1024);
        expect(parseSizeToBytes('2.5K')).toBe(2560);
    });

    test('parses megabytes correctly', () => {
        expect(parseSizeToBytes('1M')).toBe(1024 * 1024);
        expect(parseSizeToBytes('1MB')).toBe(1024 * 1024);
        expect(parseSizeToBytes('1.5M')).toBe(1.5 * 1024 * 1024);
    });

    test('parses gigabytes correctly', () => {
        expect(parseSizeToBytes('1G')).toBe(1024 * 1024 * 1024);
        expect(parseSizeToBytes('1GB')).toBe(1024 * 1024 * 1024);
        expect(parseSizeToBytes('2.5G')).toBe(2.5 * 1024 * 1024 * 1024);
    });

    test('parses terabytes correctly', () => {
        expect(parseSizeToBytes('1T')).toBe(1024 * 1024 * 1024 * 1024);
    });

    test('handles case insensitivity', () => {
        expect(parseSizeToBytes('1g')).toBe(1024 * 1024 * 1024);
        expect(parseSizeToBytes('1m')).toBe(1024 * 1024);
        expect(parseSizeToBytes('1k')).toBe(1024);
    });

    test('handles invalid input', () => {
        expect(parseSizeToBytes('')).toBe(0);
        expect(parseSizeToBytes(null)).toBe(0);
        expect(parseSizeToBytes(undefined)).toBe(0);
        expect(parseSizeToBytes('invalid')).toBe(0);
        expect(parseSizeToBytes(123)).toBe(0);
    });

    test('handles numbers without unit', () => {
        expect(parseSizeToBytes('100')).toBe(100);
    });
});

// ============================================
// formatBytes TESTS
// ============================================
describe('formatBytes', () => {
    test('formats bytes correctly', () => {
        expect(formatBytes(0)).toBe('0B');
        expect(formatBytes(100)).toBe('100B');
        expect(formatBytes(1023)).toBe('1023B');
    });

    test('formats kilobytes correctly', () => {
        expect(formatBytes(1024)).toBe('1KB');
        expect(formatBytes(2048)).toBe('2KB');
        expect(formatBytes(1024 * 500)).toBe('500KB');
    });

    test('formats megabytes correctly', () => {
        expect(formatBytes(1024 * 1024)).toBe('1.0MB');
        expect(formatBytes(1024 * 1024 * 5.5)).toBe('5.5MB');
        expect(formatBytes(1024 * 1024 * 100)).toBe('100.0MB');
    });

    test('formats gigabytes correctly', () => {
        expect(formatBytes(1024 * 1024 * 1024)).toBe('1.0GB');
        expect(formatBytes(1024 * 1024 * 1024 * 2.5)).toBe('2.5GB');
    });

    test('handles invalid input', () => {
        expect(formatBytes(-1)).toBe('0B');
        expect(formatBytes(null)).toBe('0B');
        expect(formatBytes(undefined)).toBe('0B');
        expect(formatBytes('string')).toBe('0B');
    });
});

// ============================================
// getFolderIcon TESTS
// ============================================
describe('getFolderIcon', () => {
    test('returns correct icon for known folders', () => {
        expect(getFolderIcon('Desktop')).toBe('🖥️');
        expect(getFolderIcon('Documents')).toBe('📄');
        expect(getFolderIcon('Downloads')).toBe('⬇️');
        expect(getFolderIcon('Pictures')).toBe('🖼️');
        expect(getFolderIcon('Movies')).toBe('🎬');
        expect(getFolderIcon('Music')).toBe('🎵');
        expect(getFolderIcon('Library')).toBe('📚');
        expect(getFolderIcon('Applications')).toBe('📱');
        expect(getFolderIcon('.Trash')).toBe('🗑️');
        expect(getFolderIcon('Developer')).toBe('👨‍💻');
        expect(getFolderIcon('Projects')).toBe('📁');
        expect(getFolderIcon('Work')).toBe('💼');
    });

    test('returns default icon for unknown folders', () => {
        expect(getFolderIcon('random-folder')).toBe('📁');
        expect(getFolderIcon('my-project')).toBe('📁');
        expect(getFolderIcon('')).toBe('📁');
    });
});

// ============================================
// isValidNodeModulesPath TESTS
// ============================================
describe('isValidNodeModulesPath', () => {
    test('validates correct node_modules paths', () => {
        expect(isValidNodeModulesPath('/Users/test/project/node_modules')).toBe(true);
        expect(isValidNodeModulesPath('/home/user/app/node_modules')).toBe(true);
        expect(isValidNodeModulesPath('~/project/node_modules')).toBe(true);
    });

    test('rejects paths without node_modules', () => {
        expect(isValidNodeModulesPath('/Users/test/project')).toBe(false);
        expect(isValidNodeModulesPath('/home/user/app')).toBe(false);
    });

    test('rejects paths with directory traversal', () => {
        expect(isValidNodeModulesPath('/Users/../node_modules')).toBe(false);
        expect(isValidNodeModulesPath('../node_modules')).toBe(false);
    });

    test('rejects invalid input', () => {
        expect(isValidNodeModulesPath('')).toBe(false);
        expect(isValidNodeModulesPath(null)).toBe(false);
        expect(isValidNodeModulesPath(undefined)).toBe(false);
        expect(isValidNodeModulesPath(123)).toBe(false);
    });
});

// ============================================
// calculateDaysAgo TESTS
// ============================================
describe('calculateDaysAgo', () => {
    test('calculates days correctly for recent timestamps', () => {
        const now = Math.floor(Date.now() / 1000);
        const yesterday = now - 86400; // 24 hours ago
        const weekAgo = now - (86400 * 7);
        
        expect(calculateDaysAgo(now)).toBe(0);
        expect(calculateDaysAgo(yesterday)).toBeGreaterThanOrEqual(0);
        expect(calculateDaysAgo(yesterday)).toBeLessThanOrEqual(2);
        expect(calculateDaysAgo(weekAgo)).toBeGreaterThanOrEqual(6);
        expect(calculateDaysAgo(weekAgo)).toBeLessThanOrEqual(8);
    });

    test('handles invalid input', () => {
        expect(calculateDaysAgo(null)).toBe(0);
        expect(calculateDaysAgo(undefined)).toBe(0);
        expect(calculateDaysAgo(0)).toBe(0); // 0 is treated as invalid input
        expect(calculateDaysAgo('string')).toBe(0);
    });
});

// ============================================
// isValidCleanupAction TESTS
// ============================================
describe('isValidCleanupAction', () => {
    test('validates correct cleanup actions', () => {
        expect(isValidCleanupAction('vscode-cache')).toBe(true);
        expect(isValidCleanupAction('npm-cache')).toBe(true);
        expect(isValidCleanupAction('homebrew-cache')).toBe(true);
        expect(isValidCleanupAction('playwright-cache')).toBe(true);
        expect(isValidCleanupAction('electron-cache')).toBe(true);
    });

    test('rejects invalid cleanup actions', () => {
        expect(isValidCleanupAction('invalid-cache')).toBe(false);
        expect(isValidCleanupAction('random')).toBe(false);
        expect(isValidCleanupAction('')).toBe(false);
        expect(isValidCleanupAction(null)).toBe(false);
        expect(isValidCleanupAction(undefined)).toBe(false);
    });
});

// ============================================
// parseDuOutput TESTS
// ============================================
describe('parseDuOutput', () => {
    test('parses du output correctly', () => {
        expect(parseDuOutput('1024\t/path/to/folder')).toBe(1024);
        expect(parseDuOutput('500\t/some/path')).toBe(500);
        expect(parseDuOutput('0\t/empty')).toBe(0);
    });

    test('handles different formats', () => {
        expect(parseDuOutput('1024    /path')).toBe(1024);
        expect(parseDuOutput('1024\n')).toBe(1024);
    });

    test('handles invalid input', () => {
        expect(parseDuOutput('')).toBe(0);
        expect(parseDuOutput(null)).toBe(0);
        expect(parseDuOutput(undefined)).toBe(0);
        expect(parseDuOutput('invalid')).toBe(0);
    });
});

// ============================================
// extractProjectName TESTS
// ============================================
describe('extractProjectName', () => {
    test('extracts project name correctly', () => {
        expect(extractProjectName('/Users/test/my-project/node_modules')).toBe('my-project');
        expect(extractProjectName('/home/user/awesome-app/node_modules')).toBe('awesome-app');
        expect(extractProjectName('~/code/test-app/node_modules')).toBe('test-app');
    });

    test('handles nested paths', () => {
        expect(extractProjectName('/Users/test/code/projects/app/node_modules')).toBe('app');
    });

    test('handles invalid input', () => {
        expect(extractProjectName('')).toBe('Unknown');
        expect(extractProjectName(null)).toBe('Unknown');
        expect(extractProjectName(undefined)).toBe('Unknown');
    });
});

// ============================================
// shouldExcludePath TESTS
// ============================================
describe('shouldExcludePath', () => {
    test('excludes already seen paths', () => {
        const seenPaths = new Set(['/path/to/node_modules']);
        expect(shouldExcludePath('/path/to/node_modules', seenPaths)).toBe(true);
    });

    test('excludes nested node_modules', () => {
        const seenPaths = new Set(['/project/node_modules']);
        expect(shouldExcludePath('/project/node_modules/pkg/node_modules', seenPaths)).toBe(true);
    });

    test('allows new unique paths', () => {
        const seenPaths = new Set(['/project1/node_modules']);
        expect(shouldExcludePath('/project2/node_modules', seenPaths)).toBe(false);
    });

    test('handles invalid input', () => {
        const seenPaths = new Set();
        expect(shouldExcludePath('', seenPaths)).toBe(true);
        expect(shouldExcludePath(null, seenPaths)).toBe(true);
        expect(shouldExcludePath(undefined, seenPaths)).toBe(true);
    });
});

// ============================================
// INTEGRATION TESTS
// ============================================
describe('Integration Tests', () => {
    test('size parsing and formatting round-trip', () => {
        const bytes = parseSizeToBytes('1.5G');
        const formatted = formatBytes(bytes);
        expect(formatted).toBe('1.5GB');
    });

    test('size conversion chain', () => {
        // 1GB in bytes
        const gb = 1024 * 1024 * 1024;
        expect(formatBytes(gb)).toBe('1.0GB');
        expect(parseSizeToBytes('1G')).toBe(gb);
    });

    test('cleanup action validation is exhaustive', () => {
        const validActions = ['vscode-cache', 'npm-cache', 'homebrew-cache', 'playwright-cache', 'electron-cache'];
        validActions.forEach(action => {
            expect(isValidCleanupAction(action)).toBe(true);
        });
    });
});

// ============================================
// EDGE CASE TESTS
// ============================================
describe('Edge Cases', () => {
    test('very large sizes', () => {
        const tb = 1024 * 1024 * 1024 * 1024;
        expect(formatBytes(tb)).toBe('1024.0GB'); // Should handle TB
    });

    test('very small sizes', () => {
        expect(formatBytes(1)).toBe('1B');
        expect(formatBytes(0)).toBe('0B');
    });

    test('floating point precision', () => {
        expect(parseSizeToBytes('1.5M')).toBe(1.5 * 1024 * 1024);
        expect(parseSizeToBytes('2.75G')).toBe(2.75 * 1024 * 1024 * 1024);
    });

    test('special characters in paths', () => {
        expect(extractProjectName('/Users/test/my project (1)/node_modules')).toBe('my project (1)');
        expect(isValidNodeModulesPath('/Users/test/project-with-dashes/node_modules')).toBe(true);
    });

    test('unicode in folder names', () => {
        expect(extractProjectName('/Users/test/môj-projekt/node_modules')).toBe('môj-projekt');
    });
});
