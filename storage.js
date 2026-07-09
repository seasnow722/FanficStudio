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

// AppDataの指定ファイルを読んで、中身をjavascriptデータとして返す
async function electronStorageLoad(filename) {
  return await window.fanfic.loadJson(filename);
}

export function saveAppData(dataToSave) {
  browserStorageSave(
    STORAGE_KEYS.appData,
    dataToSave
  );
}

export function saveReferenceData(referenceData) {
  if (isElectronAvailable()) {
    electronStorageSave(
      STORAGE_FILES.referenceData,
      referenceData
    );
  } else {
    browserStorageSave(
      STORAGE_KEYS.referenceData,
      referenceData
    );
  }
}

export async function loadReferenceData() {
  if (isElectronAvailable()) {
    return await electronStorageLoad(
      STORAGE_FILES.referenceData
    );
  }

  return browserStorageLoad(
    STORAGE_KEYS.referenceData
  );
}

export function saveWorkData(workData) {
    //もしElectron保存なら
  if (isElectronAvailable()) {
    //AppDataに行く
    electronStorageSave(
        //上部にあるSTORAGE_FILESオブジェクトから保存ファイル名を取り出す
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

export async function loadWorkData() {
  if (isElectronAvailable()) {
    return await electronStorageLoad(
      STORAGE_FILES.workData
    );
  }

  return browserStorageLoad(
    STORAGE_KEYS.workData
  );
}

export function saveAppSettings(settings) {
  if (isElectronAvailable()) {
    electronStorageSave(
      STORAGE_FILES.appSettings,
      settings
    );
  } else {
    browserStorageSave(
      STORAGE_KEYS.appSettings,
      settings
    );
  }
}

export async function loadAppSettings() {
  if (isElectronAvailable()) {
    return await electronStorageLoad(
      STORAGE_FILES.appSettings
    );
  }

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
  if (isElectronAvailable()) {
    electronStorageSave(
      STORAGE_FILES.userData,
      userDataToSave
    );
  } else {
    browserStorageSave(
      STORAGE_KEYS.userData,
      userDataToSave
    );
  }
}

export function loadAppUserData() {
  return browserStorageLoad(
    STORAGE_KEYS.userData
  );
}