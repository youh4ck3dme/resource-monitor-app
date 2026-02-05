/**
 * Resource Monitor - Utility Functions
 * Extracted for easy testing
 */

/**
 * Parse size string (e.g., "1.5G", "500M", "200K") to bytes
 * @param {string} size - Size string
 * @returns {number} Size in bytes
 */
function parseSizeToBytes(size) {
    if (!size || typeof size !== 'string') return 0;
    const match = size.match(/^([\d.]+)([KMGT]?)i?B?$/i);
    if (!match) return 0;
    const num = parseFloat(match[1]);
    const unit = (match[2] || '').toUpperCase();
    const multipliers = { '': 1, 'K': 1024, 'M': 1024**2, 'G': 1024**3, 'T': 1024**4 };
    return num * (multipliers[unit] || 1);
}

/**
 * Format bytes to human-readable string
 * @param {number} bytes - Number of bytes
 * @returns {string} Formatted string
 */
function formatBytes(bytes) {
    if (typeof bytes !== 'number' || bytes < 0) return '0B';
    if (bytes < 1024) return bytes + 'B';
    if (bytes < 1024**2) return (bytes/1024).toFixed(0) + 'KB';
    if (bytes < 1024**3) return (bytes/1024**2).toFixed(1) + 'MB';
    return (bytes/1024**3).toFixed(1) + 'GB';
}

/**
 * Get folder icon based on name
 * @param {string} name - Folder name
 * @returns {string} Emoji icon
 */
function getFolderIcon(name) {
    const icons = {
        'Desktop': '🖥️', 'Documents': '📄', 'Downloads': '⬇️', 'Pictures': '🖼️',
        'Movies': '🎬', 'Music': '🎵', 'Library': '📚', 'Applications': '📱',
        '.Trash': '🗑️', 'Developer': '👨‍💻', 'Projects': '📁', 'Work': '💼',
    };
    return icons[name] || '📁';
}

/**
 * Check if a path is a valid node_modules path
 * @param {string} path - Path to check
 * @returns {boolean} True if valid
 */
function isValidNodeModulesPath(path) {
    if (!path || typeof path !== 'string') return false;
    return path.includes('node_modules') && !path.includes('..');
}

/**
 * Calculate days since timestamp
 * @param {number} timestamp - Unix timestamp in seconds
 * @returns {number} Days ago
 */
function calculateDaysAgo(timestamp) {
    if (!timestamp || typeof timestamp !== 'number') return 0;
    const date = new Date(timestamp * 1000);
    const now = new Date();
    return Math.floor((now - date) / (1000 * 60 * 60 * 24));
}

/**
 * Validate cleanup action
 * @param {string} action - Action name
 * @returns {boolean} True if valid action
 */
function isValidCleanupAction(action) {
    const validActions = [
        'vscode-cache',
        'npm-cache',
        'homebrew-cache',
        'playwright-cache',
        'electron-cache'
    ];
    return validActions.includes(action);
}

/**
 * Parse disk usage output to extract size
 * @param {string} output - du command output
 * @returns {number} Size in KB
 */
function parseDuOutput(output) {
    if (!output || typeof output !== 'string') return 0;
    const parts = output.trim().split(/\s+/);
    return parseInt(parts[0]) || 0;
}

/**
 * Extract project name from node_modules path
 * @param {string} nmPath - Path to node_modules
 * @returns {string} Project name
 */
function extractProjectName(nmPath) {
    if (!nmPath || typeof nmPath !== 'string') return 'Unknown';
    const parentPath = nmPath.replace(/\/node_modules$/, '');
    return parentPath.split('/').pop() || 'Unknown';
}

/**
 * Check if path should be excluded from scan
 * @param {string} path - Path to check
 * @param {Set} seenPaths - Already seen paths
 * @returns {boolean} True if should be excluded
 */
function shouldExcludePath(path, seenPaths) {
    if (!path || typeof path !== 'string') return true;
    if (seenPaths.has(path)) return true;
    // Check if this path is inside another node_modules
    for (const seen of seenPaths) {
        if (path.startsWith(seen + '/')) return true;
    }
    return false;
}

module.exports = {
    parseSizeToBytes,
    formatBytes,
    getFolderIcon,
    isValidNodeModulesPath,
    calculateDaysAgo,
    isValidCleanupAction,
    parseDuOutput,
    extractProjectName,
    shouldExcludePath
};
