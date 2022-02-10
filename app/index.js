const electron = require('electron')
const remoteMain = require('@electron/remote/main')
const path = require('path')

remoteMain.initialize()





/*
const { app } = require('electron')
const { BrowserWindow } = require('@electron/remote')
*/

//const { is, setContentSecurityPolicy } = require('electron-util');
// set the CSP in production mode
// if (!is.development) {
//   setContentSecurityPolicy(`
//     default-src 'none';
//     script-src 'self';
//     style-src 'self' 'unsafe-inline';
//     font-src 'self';
//     base-uri 'none';
//     form-action 'none';
//     frame-ancestors 'none';
//   `);
// }

function createWindow () {
  //const path = require('path')

  const win = new electron.BrowserWindow({
    show: false,
    width: 1024,
    height: 800,
    icon: path.join(__dirname, "images/fimk-coin.png"),
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  remoteMain.enable(win.webContents)

  win.loadFile('index.html')

  // create a temporary splash window
  let splash = new electron.BrowserWindow({width: 450, height: 350, transparent: true, frame: false, alwaysOnTop: false, autoHideMenuBar: true});
  splash.loadFile('splash-electron.html');

  win.once('ready-to-show', () => {
    splash.destroy()
    //show main window with delay to eliminate splash css animation render side effects
    setTimeout(() => win.show(), 200)
  })

  // const homePath = app.getPath('home')
  // console.log(`homePath ${homePath}`)
  //
  // var fs = require('fs')
  // let dir = homePath + "./test1"
  // if (!fs.existsSync(dir)){
  //   fs.mkdirSync(dir);
  // }
}

electron.app.whenReady().then(createWindow)

electron.app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    electron.app.quit()
  }
})

electron.app.on('activate', () => {
  if (electron.BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
