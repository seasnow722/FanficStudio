export function saveAppData(dataToSave) {
  localStorage.setItem(
    "fanficStudioData",
    JSON.stringify(dataToSave)
  );
}

export function loadAppData() {
  const savedData =
    localStorage.getItem("fanficStudioData");

  if (!savedData) {
    return null;
  }

  return JSON.parse(savedData);
}

export function saveAppUserData(userDataToSave) {
  localStorage.setItem(
    "fanficStudioUserData",
    JSON.stringify(userDataToSave)
  );
}

export function loadAppUserData() {
  const savedUserData =
    localStorage.getItem("fanficStudioUserData");

  if (!savedUserData) {
    return null;
  }

  return JSON.parse(savedUserData);
}