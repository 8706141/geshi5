const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  
  getPath: (file) => {
      try {
          if (webUtils && webUtils.getPathForFile) {
              return webUtils.getPathForFile(file);
          }
          return file.path;
      } catch (e) { return ''; }
  },
  
  saveFile: (filePath, buffer) => ipcRenderer.invoke('file:save', { filePath, buffer }),
  deleteFile: (filePath) => ipcRenderer.invoke('file:delete', filePath),
  copyImageToClipboard: (path) => ipcRenderer.invoke('file:copyImage', path),
  
  separator: process.platform === 'win32' ? '\\' : '/'
});