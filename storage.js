// storage.js 保存方式をまとめるファイル
// 将来はDesktop版・Cloud版へ切り替える

const STORAGE_KEYS = {
  appData: "fanficStudioData",
  userData: "fanficStudioUserData",

  referenceData: "fanficStudioReferenceData",
  workData: "fanficStudioWorkData",
  appSettings: "fanficStudioAppSettings"
};

function browserStorageSave(key, data) {
  localStorage.setItem(
    key,
    JSON.stringify(data)
  );
}

const STORAGE_FILES = {
  referenceData: "referenceData.json",
  workData: "workData.json",
  appSettings: "appSettings.json",
  userData: "userData.json"
};


// このファイル名で、このデータを保存して。の関数
function electronStorageSave(filename, data) {
  window.fanfic.saveJson(
    filename,
    data
  );
}

//Electronが利用できるか？の関数
//帰ってくるのはyesかno
function isElectronAvailable() {
    //下が全部YESならTrueが帰ってくる
  return (
    //window全体がちゃんとありますか？
    typeof window !== "undefined" &&
    //関数内でよく出てくるからfanficが入っている可能性が高い
    window.fanfic &&
    //savejsonという機能ありますか？
    typeof window.fanfic.saveJson === "function"
  );
}


function browserStorageLoad(key) {
  const savedData =
    localStorage.getItem(key);

  if (!savedData) {
    return null;
  }

  return JSON.parse(savedData);
}

export function saveAppData(dataToSave) {
  browserStorageSave(
    STORAGE_KEYS.appData,
    dataToSave
  );
}

export function saveReferenceData(referenceData) {
  browserStorageSave(
    STORAGE_KEYS.referenceData,
    referenceData
  );
}

export function loadReferenceData() {
  return browserStorageLoad(
    STORAGE_KEYS.referenceData
  );
}

export function saveWorkData(workData) {
    //もしElectron保存なら
  if (isElectronAvailable()) {
    //AppDataに行く
    electronStorageSave(
        //上部にあるSTORAGE_FILESの配列から保存先を決める
      STORAGE_FILES.workData,
      workData
    );
    //それ以外（ブラウザ保存）なら
  } else {
    //ブラウザ保存に行く
    browserStorageSave(
        //上部にあるKEYから保存先が決まる
      STORAGE_KEYS.workData,
      workData
    );

  }

}

export function loadWorkData() {
  return browserStorageLoad(
    STORAGE_KEYS.workData
  );
}

export function saveAppSettings(settings) {
  browserStorageSave(
    STORAGE_KEYS.appSettings,
    settings
  );
}

export function loadAppSettings() {
  return browserStorageLoad(
    STORAGE_KEYS.appSettings
  );
}

export function loadAppData() {
  return browserStorageLoad(
    STORAGE_KEYS.appData
  );
}

export function saveAppUserData(userDataToSave) {
  browserStorageSave(
    STORAGE_KEYS.userData,
    userDataToSave
  );
}

export function loadAppUserData() {
  return browserStorageLoad(
    STORAGE_KEYS.userData
  );
}