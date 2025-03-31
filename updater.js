const { autoUpdater } = require('electron-updater');

module.exports = (window) => {
  autoUpdater.autoDownload = false;

  autoUpdater.on('update-available', () => {
    window.webContents.send('update-available');
  });

  autoUpdater.on('update-downloaded', () => {
    autoUpdater.quitAndInstall();
  });

  autoUpdater.checkForUpdates();
};