//main.js

const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,

    webPreferences: {
        preload: path.join(__dirname, "preload.js"),
        contextIsolation: true
    }
    });

  if (app.isPackaged) {
    win.loadFile(
      path.join(__dirname, "dist", "index.html")
    );
  } else {
    win.loadURL("http://localhost:5173");
  }
}

ipcMain.on("save-json", (event, filename, data) => {
  const filePath = path.join(
    app.getPath("userData"),
    filename
  );

  //データを読みやすいJSON文字列に変換
  const jsonText = JSON.stringify(data, null, 2);

  //AppDataに上書き保存
  fs.writeFileSync(filePath, jsonText, "utf-8");

  console.log("JSON保存しました:", filePath);
});

ipcMain.handle("load-json", (event, filename) => {
  const filePath = path.join(
    app.getPath("userData"),
    filename
  );

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const jsonText =
    fs.readFileSync(filePath, "utf-8");

  return JSON.parse(jsonText);
});

app.whenReady().then(() => {
  createWindow();
});