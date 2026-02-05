const { ipcRenderer } = require('electron');

// View Switching Logic
document.addEventListener('DOMContentLoaded', () => {
    const dashboard = document.querySelector('.dashboard');
    const viewGrid = document.getElementById('view-grid');
    const viewList = document.getElementById('view-list');

    // Load Preference
    const savedView = localStorage.getItem('viewMode');
    if (savedView === 'list') {
        dashboard.classList.add('view-mode-list');
        viewList.checked = true;
    } else {
        dashboard.classList.remove('view-mode-list');
        viewGrid.checked = true;
    }

    // Toggle Listeners
    viewGrid.addEventListener('change', () => {
        if (viewGrid.checked) {
            dashboard.classList.remove('view-mode-list');
            localStorage.setItem('viewMode', 'grid');
        }
    });

    viewList.addEventListener('change', () => {
        if (viewList.checked) {
            dashboard.classList.add('view-mode-list');
            localStorage.setItem('viewMode', 'list');
        }
    });

    // ============================================
    // FOLDER TAB NAVIGATION
    // ============================================
    const folderTabs = document.querySelectorAll('.folder-tab');
    const folderCategories = document.querySelectorAll('.folder-category');

    folderTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const category = tab.dataset.category;
            
            // Update active tab
            folderTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Show corresponding category
            folderCategories.forEach(cat => {
                cat.style.display = cat.id === `folder-${category}` ? 'grid' : 'none';
            });
        });
    });

    // ============================================
    // CLEANUP BUTTON HANDLERS
    // ============================================
    document.querySelectorAll('.cleanup-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const action = btn.dataset.action;
            btn.classList.add('cleaning');
            btn.textContent = 'Cleaning...';
            
            try {
                const result = await ipcRenderer.invoke('cleanup-cache', action);
                if (result.success) {
                    btn.classList.remove('cleaning');
                    btn.classList.add('done');
                    btn.textContent = '✓ Done';
                    // Reset after 3s
                    setTimeout(() => {
                        btn.classList.remove('done');
                        btn.textContent = 'Clean';
                    }, 3000);
                } else {
                    btn.classList.remove('cleaning');
                    btn.textContent = 'Error';
                }
            } catch (e) {
                btn.classList.remove('cleaning');
                btn.textContent = 'Error';
            }
        });
    });

    // Clean All button
    const cleanAllBtn = document.getElementById('cleanup-all');
    if (cleanAllBtn) {
        cleanAllBtn.addEventListener('click', async () => {
            cleanAllBtn.textContent = '🔄 Cleaning...';
            cleanAllBtn.disabled = true;
            
            try {
                await ipcRenderer.invoke('cleanup-all');
                cleanAllBtn.textContent = '✅ All Cleaned!';
                setTimeout(() => {
                    cleanAllBtn.textContent = '🚀 Clean All Caches';
                    cleanAllBtn.disabled = false;
                }, 3000);
            } catch (e) {
                cleanAllBtn.textContent = '❌ Error';
                cleanAllBtn.disabled = false;
            }
        });
    }

    // ============================================
    // NODE_MODULES SCANNER HANDLERS
    // ============================================
    
    // Store scanned data
    let scannedNodeModules = [];
    
    // Scan button
    const scanBtn = document.getElementById('scan-nodemodules');
    if (scanBtn) {
        scanBtn.addEventListener('click', async () => {
            scanBtn.disabled = true;
            scanBtn.textContent = '🔍 Scanning...';
            
            const listContainer = document.getElementById('folder-list-nodemodules');
            listContainer.innerHTML = '<div class="scanning-msg">🔍 Scanning for node_modules... This may take a minute.</div>';
            
            try {
                const result = await ipcRenderer.invoke('scan-nodemodules');
                
                if (result.success) {
                    scannedNodeModules = result.nodeModules;
                    
                    // Update summary
                    setText('nodemodules-count', `${result.count} folders`);
                    setText('nodemodules-total', result.total);
                    
                    // Render list
                    renderNodeModulesList(result.nodeModules);
                } else {
                    listContainer.innerHTML = '<div class="empty-msg">❌ Scan failed: ' + (result.error || 'Unknown error') + '</div>';
                }
            } catch (e) {
                listContainer.innerHTML = '<div class="empty-msg">❌ Error: ' + e.message + '</div>';
            }
            
            scanBtn.disabled = false;
            scanBtn.textContent = '🔍 Scan';
        });
    }
    
    // Clean All Old button
    const cleanOldBtn = document.getElementById('clean-all-nodemodules');
    if (cleanOldBtn) {
        cleanOldBtn.addEventListener('click', async () => {
            const oldPaths = scannedNodeModules.filter(nm => nm.isOld).map(nm => nm.path);
            
            if (oldPaths.length === 0) {
                alert('No old node_modules found (14+ days)');
                return;
            }
            
            if (!confirm(`Delete ${oldPaths.length} old node_modules folders?`)) {
                return;
            }
            
            cleanOldBtn.disabled = true;
            cleanOldBtn.textContent = '🔄 Cleaning...';
            
            try {
                const result = await ipcRenderer.invoke('delete-old-nodemodules', oldPaths);
                
                if (result.success) {
                    cleanOldBtn.textContent = `✅ Deleted ${result.deleted}!`;
                    // Re-scan
                    setTimeout(() => {
                        scanBtn.click();
                        cleanOldBtn.textContent = '🗑️ Clean Old';
                        cleanOldBtn.disabled = false;
                    }, 2000);
                }
            } catch (e) {
                cleanOldBtn.textContent = '❌ Error';
                cleanOldBtn.disabled = false;
            }
        });
    }
    
    // Render node_modules list
    function renderNodeModulesList(nodeModules) {
        const listContainer = document.getElementById('folder-list-nodemodules');
        
        if (!nodeModules || nodeModules.length === 0) {
            listContainer.innerHTML = '<div class="empty-msg">✨ No node_modules found. Click "Scan" to search.</div>';
            return;
        }
        
        listContainer.innerHTML = nodeModules.map(nm => `
            <div class="nodemodule-item ${nm.isOld ? 'old' : ''}" data-path="${nm.path}">
                <div class="nodemodule-info">
                    <span class="nodemodule-path" title="${nm.parentPath}">📦 ${nm.projectName}</span>
                    <div class="nodemodule-meta">
                        <span class="size">${nm.size}</span>
                        <span class="age ${nm.isOld ? 'old' : ''}">${nm.daysAgo} days ago</span>
                    </div>
                </div>
                <button class="nodemodule-delete" data-path="${nm.path}">Delete</button>
            </div>
        `).join('');
        
        // Attach delete handlers
        listContainer.querySelectorAll('.nodemodule-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const path = btn.dataset.path;
                
                btn.classList.add('deleting');
                btn.textContent = 'Deleting...';
                
                try {
                    const result = await ipcRenderer.invoke('delete-nodemodule', path);
                    
                    if (result.success) {
                        btn.classList.remove('deleting');
                        btn.classList.add('deleted');
                        btn.textContent = '✓ Deleted';
                        
                        // Remove from list after animation
                        setTimeout(() => {
                            const item = btn.closest('.nodemodule-item');
                            if (item) item.remove();
                            
                            // Update count
                            scannedNodeModules = scannedNodeModules.filter(nm => nm.path !== path);
                            setText('nodemodules-count', `${scannedNodeModules.length} folders`);
                        }, 1000);
                    } else {
                        btn.classList.remove('deleting');
                        btn.textContent = 'Error';
                    }
                } catch (e) {
                    btn.classList.remove('deleting');
                    btn.textContent = 'Error';
                }
            });
        });
    }
});

ipcRenderer.on('update-data', (event, data) => {
    // Disk Stats
    if (data.disk) {
        setText('disk-avail', `${data.disk.available} GB`);
        setText('disk-total', `${data.disk.total} GB`);
        setText('disk-percent', data.disk.usedPercent);
        
        const progressBar = document.getElementById('disk-progress');
        if (progressBar) {
            progressBar.style.width = `${data.disk.usedPercent}%`;
            progressBar.setAttribute('data-tooltip', `${data.disk.usedPercent}% Used`);
        }
    }

    // Memory Stats (Neon Effects)
    if (data.memory) {
        setText('mem-percent', `${data.memory.usedPercent}%`);
        setText('mem-used', data.memory.used);
        setText('mem-total', data.memory.total);

        const memBar = document.getElementById('mem-progress');
        if (memBar) {
            const pct = parseInt(data.memory.usedPercent, 10);
            memBar.style.width = `${pct}%`;
            memBar.setAttribute('data-tooltip', `${data.memory.used} GB / ${data.memory.total} GB`);

            // Reset classes
            memBar.className = 'progress-bar neon-bar';

            if (pct < 50) memBar.classList.add('neon-safe');
            else if (pct < 80) memBar.classList.add('neon-warn');
            else memBar.classList.add('neon-danger');
        }
    }

    // Processes List
    const processList = document.getElementById('process-list');
    if (processList) {
        processList.innerHTML = (data.processes || []).map(p => `
            <div class="list-item" data-tooltip="${p.name} - ${p.mem}">
                <span class="item-name">${p.name}</span>
                <span class="item-value">${p.mem.replace('MB', ' MB')}</span>
            </div>
        `).join('');
    }

    // Editors List
    const editorList = document.getElementById('editor-list');
    if (editorList && data.editors) {
        editorList.innerHTML = data.editors.map(ed => {
            const statusClass = ed.isRunning ? (ed.status.includes('Compiling') ? 'compiling' : 'status-running') : 'status-offline';
            return `
            <div class="list-item" style="opacity: ${ed.isRunning ? 1 : 0.6};" data-tooltip="${ed.name}: ${ed.status}">
                <div style="display: flex; flex-direction: column; gap: 2px;">
                    <span class="item-name" style="color: var(--text-primary); font-weight: 500;">${ed.name}</span>
                    <span style="${statusClass === 'compiling' ? 'color: var(--warning);' : 'color: var(--accent);'} font-size: 10px;">${ed.project}</span>
                </div>
                <div style="text-align: right;">
                    <div class="${statusClass} item-value" style="font-size: 11px;">${ed.status}</div>
                    <div style="font-size: 10px; color: var(--text-secondary); margin-top: 2px;">${ed.mem.replace('MB', ' MB')}</div>
                </div>
            </div>
            `;
        }).join('');
    }

    // ============================================
    // FOLDER CATEGORIES
    // ============================================
    if (data.folders) {
        // Home Folders
        const homeList = document.getElementById('folder-list-home');
        if (homeList && data.folders.home) {
            homeList.innerHTML = data.folders.home.map(f => `
                <div class="folder-item" data-tooltip="${f.path || f.name}">
                    <span class="item-icon">${f.icon || '📁'}</span>
                    <span class="item-name">${f.name}</span>
                    <span class="item-value">${f.size}</span>
                </div>
            `).join('');
        }

        // Cache Folders
        const cacheList = document.getElementById('folder-list-caches');
        if (cacheList && data.folders.caches) {
            cacheList.innerHTML = data.folders.caches.map(f => `
                <div class="folder-item" data-tooltip="${f.path}">
                    <span class="item-icon">${f.icon}</span>
                    <span class="item-name">${f.name}</span>
                    <span class="item-value">${f.size}</span>
                </div>
            `).join('');
        }

        // Total cache size
        setText('cache-total-size', data.folders.totalCacheSize || '--');

        // Dev Tools Folders
        const devList = document.getElementById('folder-list-devtools');
        if (devList && data.folders.devtools) {
            devList.innerHTML = data.folders.devtools.map(f => `
                <div class="folder-item" data-tooltip="${f.path}">
                    <span class="item-icon">${f.icon}</span>
                    <span class="item-name">${f.name}</span>
                    <span class="item-value">${f.size}</span>
                </div>
            `).join('');
        }
    }

    // ============================================
    // CLEANUP SIZES
    // ============================================
    if (data.cleanup) {
        setText('cleanup-vscode', data.cleanup.vscode || '0B');
        setText('cleanup-npm', data.cleanup.npm || '0B');
        setText('cleanup-homebrew', data.cleanup.homebrew || '0B');
        setText('cleanup-playwright', data.cleanup.playwright || '0B');
        setText('cleanup-electron', data.cleanup.electron || '0B');
    }

    // Timestamp
    if (data.timestamp) {
        setText('timestamp', data.timestamp);
    }
});

// Helper to safely set text
function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
}
