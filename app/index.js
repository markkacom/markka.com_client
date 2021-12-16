const { app, BrowserWindow } = require('electron')

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
  const win = new BrowserWindow({
    show: false,
    width: 1024,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  // create a temporary splash window
  let splash = new BrowserWindow({width: 810, height: 610, transparent: true, frame: false, alwaysOnTop: true, autoHideMenuBar: true});
  splash.loadFile('splash-electron.html');

  win.loadFile('index.html')
  win.once('ready-to-show', () => {
    splash.destroy()
    win.show()
  })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
