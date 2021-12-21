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
  const path = require('path')

  const win = new BrowserWindow({
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
  win.loadFile('index.html')

  // create a temporary splash window
  let splash = new BrowserWindow({width: 450, height: 350, transparent: true, frame: false, alwaysOnTop: false, autoHideMenuBar: true});
  splash.loadFile('splash-electron.html');

  win.once('ready-to-show', () => {
    splash.destroy()
    //show main window with delay to eliminate splash css animation render side effects
    setTimeout(() => win.show(), 200)
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
