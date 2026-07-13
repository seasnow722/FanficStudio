//main.js

const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

// AppData内のJSON保存先を安全に作る
function getJsonFilePath(relativePath) {
  const userDataPath =
    path.resolve(app.getPath("userData"));

  const filePath =
    path.resolve(userDataPath, relativePath);

  // ../ などを使ってAppDataの外へ出る指定を防ぐ
  if (
    filePath !== userDataPath &&
    !filePath.startsWith(userDataPath + path.sep)
  ) {
    throw new Error("不正な保存先です。");
  }

  return filePath;
}

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

// JSONをAppDataへ保存する
// relativePathには、
// "workIndex.json"
// "works/work-abc123.json"
// のような保存先を渡せる
ipcMain.on("save-json", (event, relativePath, data) => {
  try {
    const filePath =
      getJsonFilePath(relativePath);

    // works や references フォルダがなければ自動で作る
    fs.mkdirSync(
      path.dirname(filePath),
      {
        recursive: true
      }
    );

    const jsonText =
      JSON.stringify(data, null, 2);

    fs.writeFileSync(
      filePath,
      jsonText,
      "utf-8"
    );

    console.log(
      "JSON保存しました:",
      filePath
    );
  } catch (error) {
    console.error(
      "JSON保存に失敗しました:",
      error
    );
  }
});


// AppData内のJSONを読み込む
ipcMain.handle(
  "load-json",
  (event, relativePath) => {
    try {
      const filePath =
        getJsonFilePath(relativePath);

      if (!fs.existsSync(filePath)) {
        return null;
      }

      const jsonText =
        fs.readFileSync(
          filePath,
          "utf-8"
        );

      return JSON.parse(jsonText);
    } catch (error) {
      console.error(
        "JSON読み込みに失敗しました:",
        error
      );

      return null;
    }
  }
);

// Fanfic Studioが現在使っているAppDataの場所を返す
ipcMain.handle(
  "get-user-data-path",
  () => {
    return app.getPath("userData");
  }
);

app.whenReady().then(() => {
  createWindow();
});