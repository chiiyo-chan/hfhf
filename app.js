/* ============================================
   HF Drive Index — Main Application
   ============================================ */

(function () {
  'use strict';

  // ── Configuration ──
  const CONFIG = {
    siteName: 'HF Drive Index',
    repos: [
      {
        id: 'Lalapo1/chiyo',
        name: 'Chiyo',
        type: 'dataset',
        revision: 'main'
      }
    ],
    sessionKey: 'hf_drive_session',
    themeKey: 'hf_drive_theme'
  };

  // ── State ──
  const state = {
    currentRepo: CONFIG.repos[0],
    currentPath: '',
    files: [],
    allFiles: [],
    sortField: 'name',
    sortDir: 'asc',
    searchQuery: '',
    isLoggedIn: false,
    username: ''
  };

  // ── DOM Elements ──
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const els = {
    loginOverlay: $('#loginOverlay'),
    loginForm: $('#loginForm'),
    loginError: $('#loginError'),
    loginBtn: $('#loginBtn'),
    app: $('#app'),
    breadcrumb: $('#breadcrumb'),
    fileList: $('#fileList'),
    loadingState: $('#loadingState'),
    emptyState: $('#emptyState'),
    fileCount: $('#fileCount'),
    repoInfo: $('#repoInfo'),
    searchInput: $('#searchInput'),
    themeToggle: $('#themeToggle'),
    iconMoon: $('#iconMoon'),
    iconSun: $('#iconSun'),
    logoutBtn: $('#logoutBtn'),
    userName: $('#userName'),
    userAvatar: $('#userAvatar'),
    mediaModal: $('#mediaModal'),
    modalTitle: $('#modalTitle'),
    modalBody: $('#modalBody'),
    modalClose: $('#modalClose'),
    modalDownload: $('#modalDownload'),
    toast: $('#toast'),
    sortName: $('#sortName'),
    sortSize: $('#sortSize'),
    sortDate: $('#sortDate')
  };

  // ── Utilities ──
  function formatSize(bytes) {
    if (!bytes || bytes === 0) return '—';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;
    let size = bytes;
    while (size >= 1024 && i < units.length - 1) {
      size /= 1024;
      i++;
    }
    return `${size.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (hrs < 24) return `${hrs}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
  }

  function getFileExtension(name) {
    const ext = name.split('.').pop().toLowerCase();
    return ext === name.toLowerCase() ? '' : ext;
  }

  function getFileType(name) {
    const ext = getFileExtension(name);
    const types = {
      video: ['mp4', 'webm', 'mkv', 'avi', 'mov', 'flv', 'ts', 'm4v', '3gp', 'wmv'],
      audio: ['mp3', 'flac', 'wav', 'ogg', 'm4a', 'aac', 'wma', 'opus'],
      image: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'ico', 'tiff', 'avif'],
      archive: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'zst'],
      document: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'rtf'],
      code: ['py', 'js', 'ts', 'json', 'html', 'css', 'java', 'cpp', 'c', 'h', 'rs', 'go', 'rb', 'php', 'sh', 'yaml', 'yml', 'toml', 'xml', 'md', 'sql']
    };
    for (const [type, exts] of Object.entries(types)) {
      if (exts.includes(ext)) return type;
    }
    return 'file';
  }

  function getFileIcon(type, isDir) {
    if (isDir) {
      return `<svg class="file-icon folder" viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2z"/></svg>`;
    }
    const icons = {
      video: `<svg class="file-icon video" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>`,
      audio: `<svg class="file-icon audio" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`,
      image: `<svg class="file-icon image" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
      archive: `<svg class="file-icon archive" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/></svg>`,
      document: `<svg class="file-icon document" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
      code: `<svg class="file-icon code" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
      file: `<svg class="file-icon file" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>`
    };
    return icons[type] || icons.file;
  }

  function showToast(message, type = 'success') {
    els.toast.textContent = message;
    els.toast.className = `toast ${type} show`;
    setTimeout(() => { els.toast.classList.remove('show'); }, 3000);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ── Auth ──
  function getSession() {
    try {
      const session = localStorage.getItem(CONFIG.sessionKey);
      if (session) {
        const parsed = JSON.parse(session);
        // Check expiry (7 days)
        if (parsed.expiry > Date.now()) {
          return parsed;
        }
        localStorage.removeItem(CONFIG.sessionKey);
      }
    } catch (e) { /* ignore */ }
    return null;
  }

  function setSession(username, token) {
    const session = {
      username,
      token,
      expiry: Date.now() + 7 * 24 * 60 * 60 * 1000
    };
    localStorage.setItem(CONFIG.sessionKey, JSON.stringify(session));
  }

  function clearSession() {
    localStorage.removeItem(CONFIG.sessionKey);
  }

  async function login(username, password) {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.success) {
        setSession(username, data.token);
        state.isLoggedIn = true;
        state.username = username;
        return { success: true };
      }
      return { success: false, error: data.error || 'Invalid credentials' };
    } catch (e) {
      return { success: false, error: 'Connection error' };
    }
  }

  function showApp() {
    els.loginOverlay.style.display = 'none';
    els.app.style.display = 'flex';
    els.userName.textContent = state.username;
    els.userAvatar.textContent = state.username.charAt(0).toUpperCase();
    loadFiles();
  }

  function showLogin() {
    els.loginOverlay.style.display = 'flex';
    els.app.style.display = 'none';
  }

  // ── File Operations ──
  async function fetchFiles(path = '') {
    const repo = state.currentRepo;
    const session = getSession();
    const params = new URLSearchParams({
      repo: repo.id,
      type: repo.type,
      revision: repo.revision || 'main',
      path: path
    });
    if (session) params.set('token', session.token);

    const res = await fetch(`/api/list?${params}`);
    if (!res.ok) {
      if (res.status === 401) {
        clearSession();
        showLogin();
        return [];
      }
      throw new Error('Failed to fetch files');
    }
    return res.json();
  }

  async function loadFiles(path) {
    if (path !== undefined) {
      state.currentPath = path;
    }

    els.loadingState.style.display = 'flex';
    els.emptyState.style.display = 'none';
    els.fileList.innerHTML = '';

    try {
      const files = await fetchFiles(state.currentPath);
      state.allFiles = files;
      state.files = files;
      renderBreadcrumb();
      applySearchAndSort();
    } catch (e) {
      console.error('Error loading files:', e);
      showToast('Failed to load files', 'error');
      els.loadingState.style.display = 'none';
      els.emptyState.style.display = 'flex';
    }
  }

  function applySearchAndSort() {
    let filtered = [...state.allFiles];

    // Search
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      filtered = filtered.filter(f => {
        const name = (f.path || f.rfilename || '').split('/').pop().toLowerCase();
        return name.includes(q);
      });
    }

    // Sort
    filtered.sort((a, b) => {
      const aIsDir = a.type === 'directory';
      const bIsDir = b.type === 'directory';

      // Folders first
      if (aIsDir && !bIsDir) return -1;
      if (!aIsDir && bIsDir) return 1;

      let valA, valB;
      const nameA = (a.path || a.rfilename || '').split('/').pop();
      const nameB = (b.path || b.rfilename || '').split('/').pop();

      switch (state.sortField) {
        case 'size':
          valA = a.size || 0;
          valB = b.size || 0;
          break;
        case 'date':
          valA = new Date(a.lastCommit?.date || a.lastModified || 0).getTime();
          valB = new Date(b.lastCommit?.date || b.lastModified || 0).getTime();
          break;
        default:
          valA = nameA.toLowerCase();
          valB = nameB.toLowerCase();
      }

      if (valA < valB) return state.sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return state.sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    state.files = filtered;
    renderFiles();
  }

  // ── Rendering ──
  function renderBreadcrumb() {
    const repo = state.currentRepo;
    let html = `<span class="breadcrumb-item ${!state.currentPath ? 'active' : ''}" data-path="">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
      ${escapeHtml(repo.name)}
    </span>`;

    if (state.currentPath) {
      const parts = state.currentPath.split('/').filter(Boolean);
      let accumulated = '';
      parts.forEach((part, i) => {
        accumulated += (accumulated ? '/' : '') + part;
        const isLast = i === parts.length - 1;
        html += `<span class="breadcrumb-separator"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></span>`;
        html += `<span class="breadcrumb-item ${isLast ? 'active' : ''}" data-path="${escapeHtml(accumulated)}">${escapeHtml(part)}</span>`;
      });
    }

    els.breadcrumb.innerHTML = html;

    // Events
    els.breadcrumb.querySelectorAll('.breadcrumb-item').forEach(el => {
      el.addEventListener('click', () => {
        loadFiles(el.dataset.path);
      });
    });
  }

  function renderFiles() {
    els.loadingState.style.display = 'none';
    const files = state.files;

    if (files.length === 0) {
      els.emptyState.style.display = 'flex';
      els.fileList.innerHTML = '';
      els.fileCount.textContent = 'No files';
      return;
    }

    els.emptyState.style.display = 'none';
    const dirCount = files.filter(f => f.type === 'directory').length;
    const fileCountNum = files.length - dirCount;
    const parts = [];
    if (dirCount > 0) parts.push(`${dirCount} folder${dirCount > 1 ? 's' : ''}`);
    if (fileCountNum > 0) parts.push(`${fileCountNum} file${fileCountNum > 1 ? 's' : ''}`);
    els.fileCount.textContent = parts.join(', ');

    let html = '';
    files.forEach(file => {
      const isDir = file.type === 'directory';
      const fileName = (file.path || file.rfilename || '').split('/').pop();
      const fileType = isDir ? 'folder' : getFileType(fileName);
      const filePath = file.path || file.rfilename || '';

      html += `<tr class="file-row" data-path="${escapeHtml(filePath)}" data-type="${isDir ? 'dir' : 'file'}" data-filetype="${fileType}">
        <td>
          <div class="file-name-cell">
            ${getFileIcon(fileType, isDir)}
            <span class="file-name">${escapeHtml(fileName)}</span>
          </div>
        </td>
        <td class="col-size"><span class="file-size">${isDir ? '—' : formatSize(file.size)}</span></td>
        <td class="col-date"><span class="file-date">${formatDate(file.lastCommit?.date || file.lastModified)}</span></td>
        <td class="col-actions">
          <div class="file-actions">
            ${!isDir ? `
              <button class="file-action-btn" data-action="download" title="Download">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4m4-5 5 5 5-5m-5 5V3"/></svg>
              </button>
              <button class="file-action-btn" data-action="copy" title="Copy link">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              </button>
            ` : ''}
            ${!isDir && ['video', 'audio', 'image'].includes(fileType) ? `
              <button class="file-action-btn" data-action="preview" title="Preview">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            ` : ''}
          </div>
        </td>
      </tr>`;
    });

    els.fileList.innerHTML = html;

    // Events
    els.fileList.querySelectorAll('.file-row').forEach(row => {
      row.addEventListener('click', (e) => {
        // Ignore if clicking action buttons
        if (e.target.closest('.file-action-btn')) return;

        const path = row.dataset.path;
        const type = row.dataset.type;
        const fileType = row.dataset.filetype;

        if (type === 'dir') {
          loadFiles(path);
        } else if (['video', 'audio', 'image'].includes(fileType)) {
          openPreview(path, fileType);
        } else {
          downloadFile(path);
        }
      });

      // Action button events
      row.querySelectorAll('.file-action-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const action = btn.dataset.action;
          const path = row.dataset.path;
          const fileType = row.dataset.filetype;

          switch (action) {
            case 'download': downloadFile(path); break;
            case 'copy': copyLink(path); break;
            case 'preview': openPreview(path, fileType); break;
          }
        });
      });
    });
  }

  // ── File Actions ──
  function getDownloadUrl(filePath) {
    const repo = state.currentRepo;
    const session = getSession();
    const params = new URLSearchParams({
      repo: repo.id,
      type: repo.type,
      file: filePath,
      revision: repo.revision || 'main'
    });
    if (session) params.set('token', session.token);
    return `/api/download?${params}`;
  }

  function downloadFile(filePath) {
    const url = getDownloadUrl(filePath);
    const fileName = filePath.split('/').pop();
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    showToast(`Downloading ${fileName}...`);
  }

  function copyLink(filePath) {
    const url = window.location.origin + getDownloadUrl(filePath);
    navigator.clipboard.writeText(url).then(() => {
      showToast('Link copied to clipboard!');
    }).catch(() => {
      showToast('Failed to copy link', 'error');
    });
  }

  function openPreview(filePath, fileType) {
    const url = getDownloadUrl(filePath);
    const fileName = filePath.split('/').pop();

    els.modalTitle.textContent = fileName;
    els.modalDownload.onclick = () => downloadFile(filePath);

    let content = '';
    switch (fileType) {
      case 'video':
        content = `<video controls autoplay style="width:100%;max-height:70vh;border-radius:10px;"><source src="${url}" type="video/mp4">Your browser does not support the video tag.</video>`;
        break;
      case 'audio':
        content = `<div style="padding:2rem;text-align:center;">
          <svg style="width:80px;height:80px;color:var(--accent);margin-bottom:1.5rem;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
          <p style="color:var(--text-secondary);margin-bottom:1rem;">${escapeHtml(fileName)}</p>
          <audio controls autoplay style="width:100%;max-width:500px;"><source src="${url}">Your browser does not support audio.</audio>
        </div>`;
        break;
      case 'image':
        content = `<img src="${url}" alt="${escapeHtml(fileName)}" style="max-height:70vh;width:100%;object-fit:contain;border-radius:10px;" loading="lazy">`;
        break;
    }

    els.modalBody.innerHTML = content;
    els.mediaModal.classList.add('active');
  }

  function closeModal() {
    els.mediaModal.classList.remove('active');
    // Stop any playing media
    const video = els.modalBody.querySelector('video');
    const audio = els.modalBody.querySelector('audio');
    if (video) video.pause();
    if (audio) audio.pause();
    els.modalBody.innerHTML = '';
  }

  // ── Theme ──
  function initTheme() {
    const saved = localStorage.getItem(CONFIG.themeKey);
    if (saved === 'light') {
      document.documentElement.classList.add('light');
      els.iconMoon.style.display = 'none';
      els.iconSun.style.display = 'block';
    }
  }

  function toggleTheme() {
    const isLight = document.documentElement.classList.toggle('light');
    localStorage.setItem(CONFIG.themeKey, isLight ? 'light' : 'dark');
    els.iconMoon.style.display = isLight ? 'none' : 'block';
    els.iconSun.style.display = isLight ? 'block' : 'none';
  }

  // ── Sorting ──
  function handleSort(field) {
    if (state.sortField === field) {
      state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      state.sortField = field;
      state.sortDir = 'asc';
    }

    // Update UI
    $$('.file-table th').forEach(th => th.classList.remove('sorted'));
    const sortEl = { name: els.sortName, size: els.sortSize, date: els.sortDate }[field];
    if (sortEl) {
      sortEl.classList.add('sorted');
      sortEl.querySelector('.sort-icon').textContent = state.sortDir === 'asc' ? '↑' : '↓';
    }

    applySearchAndSort();
  }

  // ── Search ──
  let searchTimeout;
  function handleSearch(query) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      state.searchQuery = query;
      applySearchAndSort();
    }, 250);
  }

  // ── Event Listeners ──
  function initEvents() {
    // Login form
    els.loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = $('#username').value.trim();
      const password = $('#password').value;

      els.loginBtn.textContent = 'Signing in...';
      els.loginBtn.disabled = true;

      const result = await login(username, password);
      if (result.success) {
        els.loginError.classList.remove('show');
        showApp();
      } else {
        els.loginError.textContent = result.error;
        els.loginError.classList.add('show');
      }

      els.loginBtn.textContent = 'Sign In';
      els.loginBtn.disabled = false;
    });

    // Logout
    els.logoutBtn.addEventListener('click', () => {
      clearSession();
      state.isLoggedIn = false;
      showLogin();
    });

    // Theme
    els.themeToggle.addEventListener('click', toggleTheme);

    // Search
    els.searchInput.addEventListener('input', (e) => handleSearch(e.target.value));

    // Sort
    els.sortName.addEventListener('click', () => handleSort('name'));
    els.sortSize.addEventListener('click', () => handleSort('size'));
    els.sortDate.addEventListener('click', () => handleSort('date'));

    // Modal
    els.modalClose.addEventListener('click', closeModal);
    els.mediaModal.addEventListener('click', (e) => {
      if (e.target === els.mediaModal) closeModal();
    });

    // Keyboard
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
      if (e.key === '/' && !e.target.closest('input')) {
        e.preventDefault();
        els.searchInput.focus();
      }
    });

    // Browser back/forward
    window.addEventListener('popstate', (e) => {
      if (e.state && e.state.path !== undefined) {
        loadFiles(e.state.path);
      }
    });
  }

  // ── Init ──
  function init() {
    initTheme();
    initEvents();

    // Check existing session
    const session = getSession();
    if (session) {
      state.isLoggedIn = true;
      state.username = session.username;
      showApp();
    } else {
      showLogin();
    }

    // Repo info
    els.repoInfo.textContent = `${state.currentRepo.type}: ${state.currentRepo.id}`;
  }

  // Start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
