// storage.js 保存方式をまとめるファイル
// 将来はDesktop版・Cloud版へ切り替える

const STORAGE_KEYS = {
  appData: "fanficStudioData",
  userData: "fanficStudioUserData",

  // 旧方式
  referenceData: "fanficStudioReferenceData",
  workData: "fanficStudioWorkData",

  // 新方式：一覧データ
  referenceIndex: "fanficStudioReferenceIndex",
  workIndex: "fanficStudioWorkIndex",

  appSettings: "fanficStudioAppSettings"
};

function browserStorageSave(key, data) {
  localStorage.setItem(
    key,
    JSON.stringify(data)
  );
}

const STORAGE_FILES = {
  // 旧方式
  referenceData: "referenceData.json",
  workData: "workData.json",

  // 新方式：一覧データ
  referenceIndex: "referenceIndex.json",
  workIndex: "workIndex.json",

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

// 設定資料IDから、設定資料本体の保存先を作る
function getReferenceFilePath(referenceId) {
  return `references/${referenceId}.json`;
}


// 作品IDから、作品本体の保存先を作る
function getWorkFilePath(workId) {
  return `works/${workId}.json`;
}


// ブラウザ版で個別設定資料を保存するためのキーを作る
function getReferenceBrowserKey(referenceId) {
  return `fanficStudioReference:${referenceId}`;
}


// ブラウザ版で個別作品を保存するためのキーを作る
function getWorkBrowserKey(workId) {
  return `fanficStudioWork:${workId}`;
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

// ==============================
// 新方式：設定資料index
// ==============================

// 設定資料一覧を保存する
export function saveReferenceIndex(referenceIndex) {
  if (isElectronAvailable()) {
    electronStorageSave(
      STORAGE_FILES.referenceIndex,
      referenceIndex
    );
  } else {
    browserStorageSave(
      STORAGE_KEYS.referenceIndex,
      referenceIndex
    );
  }
}


// 設定資料一覧を読み込む
export async function loadReferenceIndex() {
  if (isElectronAvailable()) {
    return await electronStorageLoad(
      STORAGE_FILES.referenceIndex
    );
  }

  return browserStorageLoad(
    STORAGE_KEYS.referenceIndex
  );
}


// ==============================
// 新方式：作品index
// ==============================

// 作品一覧を保存する
export function saveWorkIndex(workIndex) {
  if (isElectronAvailable()) {
    electronStorageSave(
      STORAGE_FILES.workIndex,
      workIndex
    );
  } else {
    browserStorageSave(
      STORAGE_KEYS.workIndex,
      workIndex
    );
  }
}


// 作品一覧を読み込む
export async function loadWorkIndex() {
  if (isElectronAvailable()) {
    return await electronStorageLoad(
      STORAGE_FILES.workIndex
    );
  }

  return browserStorageLoad(
    STORAGE_KEYS.workIndex
  );
}

// ==============================
// 新方式：設定資料本体
// ==============================

// 設定資料本体を、IDごとのJSONへ保存する
export function saveReferenceById(referenceData) {
  if (!referenceData?.id) {
    throw new Error(
      "設定資料の保存にはidが必要です。"
    );
  }

  if (isElectronAvailable()) {
    electronStorageSave(
      getReferenceFilePath(referenceData.id),
      referenceData
    );
  } else {
    browserStorageSave(
      getReferenceBrowserKey(referenceData.id),
      referenceData
    );
  }
}


// 指定IDの設定資料本体を読み込む
export async function loadReferenceById(referenceId) {
  if (!referenceId) {
    return null;
  }

  if (isElectronAvailable()) {
    return await electronStorageLoad(
      getReferenceFilePath(referenceId)
    );
  }

  return browserStorageLoad(
    getReferenceBrowserKey(referenceId)
  );
}

// ==============================
// 新方式：作品本体
// ==============================

// 作品本体を、IDごとのJSONへ保存する
export function saveWorkById(workData) {
  if (!workData?.id) {
    throw new Error(
      "作品の保存にはidが必要です。"
    );
  }

  if (isElectronAvailable()) {
    electronStorageSave(
      getWorkFilePath(workData.id),
      workData
    );
  } else {
    browserStorageSave(
      getWorkBrowserKey(workData.id),
      workData
    );
  }
}


// 指定IDの作品本体を読み込む
export async function loadWorkById(workId) {
  if (!workId) {
    return null;
  }

  if (isElectronAvailable()) {
    return await electronStorageLoad(
      getWorkFilePath(workId)
    );
  }

  return browserStorageLoad(
    getWorkBrowserKey(workId)
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