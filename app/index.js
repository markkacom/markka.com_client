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
    width: 1024,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })
  win.loadFile('index.html')
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
