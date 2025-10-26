import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { startServer } from './server'
import { join } from 'path'
import { config } from '@shared/config'

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    ...config.VIEWPORT,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      preload: join(__dirname, 'preload.js')
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // Check session validity when window gains focus (coming back from background)
  mainWindow.on('focus', async () => {
    try {
      const { checkAndRefreshSession } = await import('@shared/lib/session')
      await checkAndRefreshSession()
    } catch (error) {
      console.error('Error refreshing session on focus:', error)
    }
  })

  mainWindow.loadURL(`http://localhost:${config.PORT}`)
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  if (process.env.NODE_ENV === 'development') {
    await startServer()
    createWindow()
  } else {
    startServer()
    createWindow()
  }
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  ipcMain.handle('request:datapath:selection', async () => {
    const { filePaths } = await dialog.showOpenDialog({
      properties: ['openDirectory']
    })

    return filePaths[0]
  })

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
