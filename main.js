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

  win.loadURL("http://localhost:5173");
}

ipcMain.on("save-text", (event, text) => {
  const filePath = path.join(
    app.getPath("userData"),
    "test.txt"
  );

  //filePath にtext をutf-8 で保存する
  fs.writeFileSync(filePath, text, "utf-8");

  console.log("保存しました:", filePath);
});


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

app.whenReady().then(() => {
  createWindow();
});