//preload.js

// const electron = require("electron");
// const contextBridge = electron.contextBridge;
// ↑を短く書いている　 {contextBridge}はElectron道具箱からcontextBridgeを取り出す
// 毎回electron.contextBridgeって書くの大変だから省略されている
// require("electron")はElectronの道具箱を持ってきて的なこと
//
// ipc = Electron内の連絡係 Renderer = 画面側
// ipcRenderer=画面側からElectron本体へお願いを送る道具
//AppData保存の命令をmain.jsへ渡すために使う
const { contextBridge, ipcRenderer } = require("electron");

// contextBtidge（橋）のexpose（公開する）MainWorld（画面全体）
// 画面側へ橋を架ける＝画面で使えるようにする
contextBridge.exposeInMainWorld(
    //fanficという名前の道具箱を作る
  "fanfic",
  {
    hello() {
      return "こんにちは Electron！";
    },

    // main.jsへ保存依頼を送る 保存処理そのものはmain.jsが担当
    saveText(text) {
    // ipcRenderer.send Electron本体へ送る
    // "savetext" 保存をお願いする
    // text この文字を保存して
        ipcRenderer.send("save-text", text);
    },

    // main.jsへJSON保存依頼を送る。
    // dataはpreload側では保存せず、main.jsへ渡すだけ。
    saveJson(filename, data) {
        ipcRenderer.send("save-json", filename, data);
    },

    //invoke 読み込んだデータを返して欲しい
    loadJson(filename) {
        return ipcRenderer.invoke("load-json", filename);
    }

  }
);