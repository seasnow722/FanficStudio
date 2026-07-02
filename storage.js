// 保存方式をまとめるファイル
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
  browserStorageSave(
    STORAGE_KEYS.workData,
    workData
  );
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