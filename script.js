// ==============================
// 目次
// 1. サンプルデータ
// 2. データ読み込み・現在状態
// 3. HTML要素取得
// 4. 汎用関数
// 5. 表示関数
// 6. 移動系関数
// 7. Wikiリンク系
// 8. ボタン・入力イベント登録
// 9. codeMirror系
// 99. 初期表示
// ==============================



// codemirrorのEditorViewを持ってくる
import { EditorView } from "codemirror";
import { undo, redo, history, historyKeymap } from "@codemirror/commands";
import { Decoration, WidgetType, keymap } from "@codemirror/view";
import Chart from "chart.js/auto";
import {
  saveReferenceData,
  loadReferenceData,

  saveWorkData,
  loadWorkData,

  saveAppSettings,
  loadAppSettings,

  loadAppData,

  saveAppUserData,
  loadAppUserData
} from "./storage.js";

// 小説本文用CodeMirror本体を入れる箱を先に作る
let novelEditor = null;
let writingChartInstance = null;


// ==============================
// 1. サンプルデータ
// ==============================
const defaultData = {
  folders: [
    { id: "guide", title: "はじめに", order: 1, collapsed: false },
    { id: "world", title: "世界観", order: 2, collapsed: false },
    { id: "characters", title: "キャラクター", order: 3, collapsed: false }
  ],

  basePages: [
    {
      id: "guide-start",
      title: "Fanfic Studioの使い方",
      folderId: "guide",
      order: 1,
      tags: ["ガイド"],
      body:
`Fanfic Studioへようこそ。

これは二次創作小説を書くための創作支援ツールです。

左側の一覧から辞書ページや小説本文を開けます。
中央で小説本文を書き、右側で辞書ページを編集できます。

辞書本文では [[ルーク]] のように書くと、別の辞書ページへ移動できます。

辞書本文の各行の下にある「＋」から、
設定資料出典や作品注釈を追加できます。

上部の「設定資料のみ / 設定資料＋作品注釈」ボタンで、
作品注釈の表示・非表示を切り替えられます。`,
      sources: [],
      lineIds: [
        "line-guide-1",
        "line-guide-2",
        "line-guide-3",
        "line-guide-4",
        "line-guide-5",
        "line-guide-6",
        "line-guide-7",
        "line-guide-8",
        "line-guide-9",
        "line-guide-10",
        "line-guide-11",
        "line-guide-12",
        "line-guide-13"
      ]
    },
    {
      id: "magic",
      title: "魔法",
      folderId: "world",
      order: 1,
      tags: ["世界観", "魔法"],
      body:
`この世界に存在する力。
訓練を受けた者だけが安定して扱える。
[[ルーク]]は魔法を少し苦手としている。`,
      sources: [
        {
          id: "source-magic-1",
          lineIndex: 0,
          lineId: "line-magic-1",
          source: "サンプル設定資料：第1章"
        }
      ],
      lineIds: [
        "line-magic-1",
        "line-magic-2",
        "line-magic-3"
      ]
    },
    {
      id: "luke",
      title: "ルーク",
      folderId: "characters",
      order: 1,
      tags: ["キャラクター", "剣士"],
      body:
`一人称：俺
二人称：君
身長：178cm

剣士。
[[魔法]]に少し苦手意識がある。`,
      sources: [
        {
          id: "source-luke-1",
          lineIndex: 0,
          lineId: "line-luke-1",
          source: "サンプル設定資料：キャラクター紹介"
        }
      ],
      lineIds: [
        "line-luke-1",
        "line-luke-2",
        "line-luke-3",
        "line-luke-4",
        "line-luke-5",
        "line-luke-6"
      ]
    },
    {
      id: "catherine",
      title: "キャサリン",
      folderId: "characters",
      order: 2,
      tags: ["キャラクター", "研究者"],
      body:
`一人称：私
二人称：あなた
身長：165cm

魔法研究者。
[[ルーク]]に魔法の基礎を教えたことがある。`,
      sources: [],
      lineIds: [
        "line-catherine-1",
        "line-catherine-2",
        "line-catherine-3",
        "line-catherine-4",
        "line-catherine-5",
        "line-catherine-6"
      ]
    }
  ],

  works: [
    {
      id: "work1",
      title: "サンプル作品",
      novels: [
        {
          id: "chapter1",
          title: "第一話：サンプル本文",
          body:
`[[ルーク]]は森の入口で足を止めた。

「本当にここで[[魔法]]の訓練をするのか？」

遠くで、[[キャサリン]]が小さく笑った。`
        }
      ],
      events: [],
      flags: [],
      pages: [],
      annotations: [
        {
          id: "annotation-luke-1",
          pageId: "luke",
          lineIndex: 5,
          lineId: "line-luke-6",
          body: "この作品では、ルークは魔法への苦手意識を少し強めに扱う。"
        },
        {
          id: "annotation-magic-1",
          pageId: "magic",
          lineIndex: 2,
          lineId: "line-magic-3",
          body: "設定資料では苦手意識程度だが、この作品ではトラウマ寄りに変更予定。"
        }
      ]
    }
  ],

  leftPaneWidth: 240,
  rightPaneWidth: 320
};

const defaultUserData = {
  profile: {
    name: "ユーザー"
  },

  stats: {
    launchCount: 0,
    totalWrittenChars: 0,
    totalWritingTimeMinutes: 0
  },

  writingLogs: [],

  achievements: [],

  settings: {
    showAchievements: true
  }
};


// ==============================
// 2. データ読み込み・現在状態
// ==============================
//localStorageに保存しているデータを読み込む
//なければ上のデフォルトデータを読み込む
const data = loadData();

//dataで読み込んだフォルダ名、ページ名を保存する
let folders = data.folders;
let basePages = data.basePages;
let works = data.works;

// 起動時に、最初に作業する作品IDを決める。
// 前回開いていた作品IDが保存されていて、今も存在するならそれを使う。
// そうでなければ、作品一覧の先頭を使う。
// 作品が1つもなければ null にする。
let currentWorkId =
  data.lastWorkId && works.some((work) => work.id === data.lastWorkId)
    ? data.lastWorkId
    : works.length > 0
      ? works[0].id
      : null;

// 今どの辞書ページを開いているかを覚える。
// 起動直後はまだ何も開いていないので null。
let currentPageId = null;

//今どの小説本文を開いているか（何話とか）を覚える
// 起動直後はまだ何も開いていないので null。
let currentNovelId = null;

// 現在扱う辞書ページ一覧。
// 今は設定資料辞書 basePages をそのまま使っている。
let pages = basePages;

// 現在の作品に属する小説本文一覧。
// currentWorkId が決まったあとで getCurrentWork().novels を入れる。
// これを更新しないと、前の作品の本文一覧が残ってしまう。
let novels = [];

if (currentWorkId) {
  // currentWorkId に対応する作品の本文一覧を取り出す。
  // これをしないと「今の作品」と「表示する本文一覧」がつながらない。
  novels = getCurrentWork().novels;
  }

// 現在開いている中央タブ
// novel / timeline / relation / flags のどれか
let currentMainTab = "novel";

let currentEventId = null;

let focusFlagId = null;

let currentReceiptDateKey = null;

// 小説本文一覧が開いているかどうか。
// trueなら表示、falseなら折りたたむ。
let isNovelListOpen = true;

// 辞書ページの表示モード
// "base" = 設定資料のみ
// "overlay" = 設定資料 + 現在の作品注釈
let dictionaryLayerMode = "base";

//ページの幅
let leftPaneWidth = data.leftPaneWidth;
let rightPaneWidth = data.rightPaneWidth;

//辞書用codemirror本体
let dictionaryEditor = null;
//今編集している辞書
let currentDictionaryPage = null;
//辞書本文codemirror化
let timelineEditor = null;
let currentTimelineEvent = null;
let timelineViewMode = "detail";

// 辞書本文の行下に出す一時メニュー
let activeLineMenu = null;

//ユーザーデータ用
const userData = loadUserData();

let activityDisplayMonth = new Date();

// 起動画面で選択中の作品ID。
// まだ本体で作業する作品ではなく、右側に詳細表示するための一時的な選択。
let selectedStartupWorkId = currentWorkId;





// ==============================
// 3. HTML要素取得
// ==============================
// HTML上の要素をJavaScriptから操作できるように取得する。

const titleInput = document.getElementById("page-title");
const typeArea = document.getElementById("page-type");
const newEventButton = document.getElementById("new-event-button");

//HTML全体の中からIDが"page-body"の要素を探して、bodyInputという箱に入れる
const bodyInput = document.getElementById("page-body");

const sideInfo = document.getElementById("side-info");

const pageList = document.getElementById("page-list");
const newFolderButton = document.getElementById("new-folder-button");
const newPageButton = document.getElementById("new-page-button");
const newNovelButton = document.getElementById("new-novel-button");

const deletePageButton = document.getElementById("delete-page-button");
const deleteNovelButton = document.getElementById("delete-novel-button");

const importButton = document.getElementById("import-button");
const exportButton = document.getElementById("export-button");
const importBaseFile = document.getElementById("import-base-file");
const importWorkFile = document.getElementById("import-work-file");

const searchInput = document.getElementById("search-input");

const mainTabs = document.querySelectorAll(".main-tab");
const tabPanels = document.querySelectorAll(".tab-panel");

const timelineList = document.getElementById("timeline-list");

const timelineDetailPanel =
  document.getElementById("timeline-detail-panel");

const toggleTimelineSideButton =
  document.getElementById("toggle-timeline-side-button");

const timelinePanel =
  document.getElementById("timeline-panel");

const newFlagButton = document.getElementById("new-flag-button");
const flagList = document.getElementById("flag-list");

const layerToggleButton = document.getElementById("layer-toggle-button");

const importMenu = document.getElementById("import-menu");
const exportMenu = document.getElementById("export-menu");

const importBaseButton = document.getElementById("import-base-button");
const importWorkButton = document.getElementById("import-work-button");
const exportBaseButton = document.getElementById("export-base-button");
const exportWorkButton = document.getElementById("export-work-button");

//HTML要素取得
const editorElement = document.getElementById("editor");

//文字数カウント
const novelCharCount = document.getElementById("novel-char-count");
const currentNovelCharCount =
  document.getElementById("current-novel-char-count");
const totalWorkCharCount =
  document.getElementById("total-work-char-count");

// アンドゥリドゥボタンの要素
const undoButton = document.getElementById("undo-button");
const redoButton = document.getElementById("redo-button");

//保存状態表示用
const saveStatus = document.getElementById("save-status");
let saveStatusTimer = null;

//左右画面閉じ開き
const toggleLeftPaneButton = document.getElementById("toggle-left-pane-button");
const toggleRightPaneButton = document.getElementById("toggle-right-pane-button");


const leftPane = document.querySelector(".left-pane");
const rightPane = document.querySelector(".right-pane");
const appLayout = document.querySelector(".app-layout");

//サイドバー二種の境界線取得
const leftResizer =
  document.getElementById("left-resizer");
const rightResizer =
  document.getElementById("right-resizer");

const sidebar = document.querySelector(".sidebar");

//小説本文テキスト保存
const exportCurrentNovelTextButton =
  document.getElementById("export-current-novel-text-button");
const exportAllNovelsTextButton =
  document.getElementById("export-all-novels-text-button");

//modal（ポップアップ）系
const modalOverlay = document.getElementById("modal-overlay");
const modalTitle = document.getElementById("modal-title");
const modalBody = document.getElementById("modal-body");
const modalOk = document.getElementById("modal-ok");
const modalCancel = document.getElementById("modal-cancel");

const novelCharList =
  document.getElementById("novel-char-list");

const writingChartRange =
  document.getElementById("writing-chart-range");

const timelineDetailLayout =
  document.getElementById("timeline-detail-layout");

const timelineOverviewPanel =
  document.getElementById("timeline-overview-panel");

const saveReceiptImageButton =
  document.getElementById("save-receipt-image-button");

const activityMonthLabel =
  document.getElementById("activity-month-label");

const activityPrevMonthButton =
  document.getElementById("activity-prev-month-button");

const activityNextMonthButton =
  document.getElementById("activity-next-month-button");

const activityReceipt =
  document.getElementById("activity-receipt");

const startupScreen =
  document.getElementById("startup-screen");

const appShell =
  document.getElementById("app-shell");

const openAppButton =
  document.getElementById("open-app-button");

const startupLastWorkTitle =
  document.getElementById(
    "startup-last-work-title"
  );

const continueWorkButton =
  document.getElementById(
    "continue-work-button"
  );

// 起動画面に表示する作品一覧の置き場。
// HTML側の #startup-work-list に、JSで作品ボタンを並べる。
const startupWorkList =
  document.getElementById(
    "startup-work-list"
  );

const newWorkButton =
  document.getElementById("new-work-button");

const startupWorkTotalChars =
  document.getElementById("startup-work-total-chars");

const startupWorkUpdatedAt =
  document.getElementById("startup-work-updated-at");

const appMenuButton =
  document.getElementById("app-menu-button");

const appMenu =
  document.getElementById("app-menu");

const backToStartupButton =
  document.getElementById("back-to-startup-button");

const appImportToggleButton =
  document.getElementById("app-import-toggle-button");

const appImportSection =
  document.getElementById("app-import-section");

const appExportToggleButton =
  document.getElementById("app-export-toggle-button");

const appExportSection =
  document.getElementById("app-export-section");

const appImportBaseButton =
  document.getElementById("app-import-base-button");

const appImportWorkButton =
  document.getElementById("app-import-work-button");

const appExportBaseButton =
  document.getElementById("app-export-base-button");

const appExportWorkButton =
  document.getElementById("app-export-work-button");

const appExportCurrentNovelTextButton =
  document.getElementById("app-export-current-novel-text-button");

const appExportAllNovelsTextButton =
  document.getElementById("app-export-all-novels-text-button");

const startupMenuButton =
  document.getElementById("startup-menu-button");

const startupMenu =
  document.getElementById("startup-menu");

const exportFullBackupButton =
  document.getElementById("export-full-backup-button");

const importFullBackupButton =
  document.getElementById("import-full-backup-button");

const importFullBackupFile =
  document.getElementById("import-full-backup-file");



// ==============================
// 4. 汎用関数
// ==============================
//何か変更したときここで保存する
function saveData() {
  updateSaveStatus("🟡 保存中...", "saving");

  saveReferenceData({
  folders,
  basePages
  });

  saveWorkData(
    works
  );

  saveAppSettings({
    leftPaneWidth,
    rightPaneWidth,
    lastWorkId: currentWorkId
  });

  if (saveStatusTimer) {
    clearTimeout(saveStatusTimer);
  }

  saveStatusTimer = setTimeout(() => {
    updateSaveStatus("🟢 保存済み", "saved");
  }, 300);
}

//localStorageにあるデータを読み込む
function loadData() {
  const referenceData = loadReferenceData();
  const workData = loadWorkData();
  const appSettings = loadAppSettings();

  const oldAppData = loadAppData();

  const parsedData = {
  folders:
    referenceData?.folders ??
    oldAppData?.folders ??
    defaultData.folders,

  basePages:
    referenceData?.basePages ??
    oldAppData?.basePages ??
    defaultData.basePages,

  works:
    workData ??
    oldAppData?.works ??
    defaultData.works,

  leftPaneWidth:
    appSettings?.leftPaneWidth ??
    oldAppData?.leftPaneWidth ??
    defaultData.leftPaneWidth,

  rightPaneWidth:
    appSettings?.rightPaneWidth ??
    oldAppData?.rightPaneWidth ??
    defaultData.rightPaneWidth,

  lastWorkId:
    appSettings?.lastWorkId ??
    null
};

  if (!parsedData.folders) {
    parsedData.folders = defaultData.folders;
  }

  parsedData.basePages.forEach((page) => {
    if (!page.folderId) {
      page.folderId = page.type || "other";
    }

    if (!page.order) {
      page.order = 999;
    }

    // 設定資料本文の各行に付ける出典を保存する配列
    // lineIndex = 本文の何行目か
    // source = 出典名（ゲーム3章、アニメ5話など）
    if (!page.sources) {
    page.sources = [];
    }

    //辞書ページにlineIdsがなければ本文の行数分IDをつくる
    if (!page.lineIds) {
    page.lineIds = page.body
    .split("\n")
    .map(() => createPageId());
}

  });

  parsedData.works.forEach((work) => {
    // 小説の配列を保存する
    if (!work.novels) work.novels = [];
    // 時系列の配列を保存する
    if (!work.events) work.events = [];
    //フラグの配列を保存する
    if (!work.flags)work.flags = [];
    // 作品ごとの行単位注釈を保存する配列
    if (!work.annotations) work.annotations = [];
  });

  //左右の幅が保存されていたら使う（??）
  //保存されていないなら240か320になる
  parsedData.leftPaneWidth = parsedData.leftPaneWidth ?? 240;
  parsedData.rightPaneWidth = parsedData.rightPaneWidth ?? 320;

  return parsedData;
}

//新しいページ・本文・イベント・フラグで使うIDを作る
//Date.now()は現在時刻の数字なので、毎回違うIDになりやすい
function createPageId() {
  return `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// currentWorkId をもとに、現在選択中の作品データを取り出す
// 古いデータに novels / events / flags がなければ、ここで空配列を足す
function getCurrentWork() {
  const work = works.find((work) => work.id === currentWorkId);

  if (!work) return null;

  if (!work.novels) {
    work.novels = [];
  }

  if (!work.events) {
    work.events = [];
  }

  if (!work.flags) {
  work.flags = [];
  }

  // 作品ごとの行単位注釈がなければ作る
  if (!work.annotations) {
  work.annotations = [];
  }

  if (!work.progress) {
  work.progress = {
    useGoal: false,
    goalChars: 0
  };
  }

  if (!work.hiddenPageIds) {
    work.hiddenPageIds = [];
  }

  if (work.hiddenPagesCollapsed === undefined) {
    work.hiddenPagesCollapsed = false;
  }

  return work;
}

// currentPageId をもとに、現在選択中の辞書ページを取り出す
function getCurrentPage() {
  return pages.find((p) => p.id === currentPageId);
}

// currentNovelId をもとに、現在選択中の小説本文を取り出す
function getCurrentNovel() {
  return novels.find((n) => n.id === currentNovelId);
}

// 指定したデータをJSONファイルとして書き出す
function downloadJson(filename, data) {
  const jsonText = JSON.stringify(data, null, 2);

  const blob = new Blob(
    [jsonText],
    {
      type: "application/json"
    }
  );

  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

// Fanfic Studio全体をバックアップ用の1つのデータにまとめる。
// この戻り値を downloadJson() に渡してJSON保存する。
function buildFullBackupData() {
  return {
    version: 1,

    exportedAt: new Date().toISOString(),

    userData,

    referenceData: {
      folders,
      basePages
    },

    workData: works,

    appSettings: {
      leftPaneWidth,
      rightPaneWidth,
      lastWorkId: currentWorkId
    }
  };
}

function restoreFullBackupData(backupData) {
  const restoredReferenceData =
    backupData?.referenceData || {};

  const restoredAppSettings =
    backupData?.appSettings || {};

  if (Array.isArray(backupData?.workData)) {
    works = backupData.workData;
  }

  if (Array.isArray(restoredReferenceData.folders)) {
    folders = restoredReferenceData.folders;
  }

  if (Array.isArray(restoredReferenceData.basePages)) {
    basePages = restoredReferenceData.basePages;
  }

  if (backupData?.userData && typeof backupData.userData === "object") {
    Object.keys(userData).forEach((key) => {
      delete userData[key];
    });

    Object.assign(userData, backupData.userData);
  }

  if (restoredAppSettings.leftPaneWidth !== undefined) {
    leftPaneWidth = restoredAppSettings.leftPaneWidth;
  }

  if (restoredAppSettings.rightPaneWidth !== undefined) {
    rightPaneWidth = restoredAppSettings.rightPaneWidth;
  }

  const restoredLastWorkId =
    restoredAppSettings.lastWorkId;

  currentWorkId =
    restoredLastWorkId &&
    works.some((work) => work.id === restoredLastWorkId)
      ? restoredLastWorkId
      : works.length > 0
        ? works[0].id
        : null;

  selectedStartupWorkId = currentWorkId;
  novels = currentWorkId ? getCurrentWork().novels : [];
  pages = basePages;

  saveData();
  saveUserData();
  updatePaneGrid();
  renderStartupWorkList();
  renderStartupSelectedWork();
  renderPageList();

  if (novels.length > 0) {
    showNovel(novels[0].id);
  }

  alert("バックアップから復元しました。");
}

//小説本文テキスト保存
function downloadText(filename, text) {
  const blob = new Blob(
    [text],
    {
      type: "text/plain"
    }
  );

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

function buildAllNovelsText() {
  return novels
    .map((novel) => {
      return `====================
${novel.title}
====================

${novel.body}`;
    })
    .join("\n\n\n");
}

//保存中などのステータスを表示する
function updateSaveStatus(text, className = "") {
  
  saveStatus.textContent = text;

  //classNameを書き換える
  saveStatus.className = "save-status";

  //classを追加する
  if (className) {
    saveStatus.classList.add(className);
  }
}

function loadUserData() {
  const parsedUserData = loadAppUserData();

  if (!parsedUserData) {
    return structuredClone(defaultUserData);
  }

  return {
    ...structuredClone(defaultUserData),
    ...parsedUserData,
    profile: {
      ...defaultUserData.profile,
      ...parsedUserData.profile
    },
    stats: {
      ...defaultUserData.stats,
      ...parsedUserData.stats
    },
    settings: {
      ...defaultUserData.settings,
      ...parsedUserData.settings
    }
  };
}

function saveUserData() {
  saveAppUserData(userData);
}

//日付取得
function getTodayKey() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const date = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${date}`;
}

//今日のログを取得/作成
function getTodayWritingLog() {
  const today = getTodayKey();

  let log = userData.writingLogs.find((log) => {
    return log.date === today;
  });

  if (!log) {
  log = {
    date: today,
    launch: false,
    addedChars: 0,
    deletedChars: 0,
    dictionaryEdits: 0,
    timelineEdits: 0,
    flagEdits: 0,
    relationEdits: 0,
    pomodoro: 0
  };

    userData.writingLogs.push(log);
  }

  return log;
}

//起動記録関数
function recordTodayLaunch() {
  const log = getTodayWritingLog();

  log.launch = true;

  saveUserData();
}

//文字数変化を記録する関数
function recordWritingChange(beforeLength, afterLength) {
  const diff = afterLength - beforeLength;

  if (diff === 0) return;

  const log = getTodayWritingLog();

  if (diff > 0) {
    log.addedChars += diff;
  } else {
    log.deletedChars += Math.abs(diff);
  }

  saveUserData();
}

//過去7日間の日付を作る関数
function getDateKeyFromDate(dateObject) {
  const year = dateObject.getFullYear();
  const month = String(dateObject.getMonth() + 1).padStart(2, "0");
  const date = String(dateObject.getDate()).padStart(2, "0");

  return `${year}-${month}-${date}`;
}

function getRecentDateKeys(days) {
  const dateKeys = [];

  for (let i = days - 1; i >= 0; i--) {
    const dateObject = new Date();
    dateObject.setDate(dateObject.getDate() - i);

    dateKeys.push(getDateKeyFromDate(dateObject));
  }

  return dateKeys;
}

function getMonthDateKeys(baseDate) {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();

  const firstDate = new Date(year, month, 1);
  const lastDate = new Date(year, month + 1, 0);

  const dateKeys = [];

  for (
    let date = new Date(firstDate);
    date <= lastDate;
    date.setDate(date.getDate() + 1)
  ) {
    dateKeys.push(getDateKeyFromDate(date));
  }

  return dateKeys;
}

function isFutureMonth(baseDate) {
  const today = new Date();

  const targetYear = baseDate.getFullYear();
  const targetMonth = baseDate.getMonth();

  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth();

  return (
    targetYear > todayYear ||
    (
      targetYear === todayYear &&
      targetMonth > todayMonth
    )
  );
}

//草
function getAllWritingLogDateKeys() {
  return userData.writingLogs
    .map((log) => log.date)
    .sort();
}

function getWritingChartDateKeys() {
  const rangeSelect =
    document.getElementById("writing-chart-range");

  const range = rangeSelect ? rangeSelect.value : "7";

  if (range === "all") {
    const allDateKeys = getAllWritingLogDateKeys();

    if (allDateKeys.length === 0) {
      return getRecentDateKeys(7);
    }

    return allDateKeys;
  }

  return getRecentDateKeys(Number(range));
}


function calculateGrassScore(log) {
  if (!log) return 0;

  let score = 0;

  if (log.launch) score += 1;

  if (log.addedChars > 0) score += 1;
  if (log.addedChars >= 10) score += 1;
  if (log.addedChars >= 100) score += 1;
  if (log.addedChars >= 200) score += 1;
  if (log.addedChars >= 300) score += 1;
  if (log.addedChars >= 500) score += 1;
  if (log.addedChars >= 1000) score += 1;

  score += Math.min(log.dictionaryEdits || 0, 1);
  score += Math.min(log.timelineEdits || 0, 1);
  score += Math.min(log.flagEdits || 0, 1);
  score += Math.min(log.relationEdits || 0, 1);
  score += Math.min(log.pomodoro || 0, 1);

  return score;
}

function getGrassLevel(score) {
  if (score <= 0) return 0;
  if (score <= 2) return 1;
  if (score <= 4) return 2;
  if (score <= 6) return 3;
  return 4;
}

function buildReceiptImageFileName(dateKey) {
  const compactDate =
    dateKey.slice(2).replaceAll("-", "");

  return `${compactDate}-FfS.png`;
}

function downloadReceiptImage() {
  const receiptCard =
    document.querySelector(".receipt-card");

  if (!receiptCard) {
    alert("保存するレシートがありません。");
    return;
  }

  if (!currentReceiptDateKey) {
    alert("先に草をクリックして、保存したい日のレシートを表示してください。");
    return;
  }

  html2canvas(receiptCard, {
    backgroundColor: null,
    scale: 2
  }).then((canvas) => {
    const link = document.createElement("a");

    link.download =
      buildReceiptImageFileName(currentReceiptDateKey);

    link.href = canvas.toDataURL("image/png");
    link.click();
  });
}



// ==============================
// 5. 表示関数
// 名の通り「画面を作る」担当のコード
// ==============================
// 指定した小説本文を中央エリアに表示する
function showNovel(novelId) {
  console.log("showNovel呼ばれた", novelId);

  const novel =
    novels.find((n) => n.id === novelId);

  console.log("見つかったnovel", novel);

  if (!novel) return;

  currentNovelId = novelId;

  titleInput.value = novel.title;
  typeArea.textContent = "種類：本文";
  bodyInput.value = novel.body;

  console.log("CodeMirrorに入れる本文", novel.body);

  if (novelEditor) {
    novelEditor.dispatch({
      changes: {
        from: 0,
        to: novelEditor.state.doc.length,
        insert: novel.body
      }
    });
  }
  updateNovelCharCount();
}


// 指定した辞書ページを右側のサイドビューに表示する
function showPage(pageId) {
  // pages の中から、クリックされたIDと同じ辞書ページを探す
  const page = pages.find((p) => p.id === pageId);
  // 見つからなければ何もしない
  if (!page) return;

  // 今選んでいる辞書ページIDを更新する
  currentPageId = pageId;
  // 右側のサイドビューに辞書ページの内容を表示する
  updateSideInfo(page);
  // 左側リストの選択状態を更新する
  renderPageList();
}

//HTMLを作る
function updateSideInfo(page) {
    const work = getCurrentWork();
    if (!work) return;

  const relatedEvents = work.events.filter((event) => {
    if (!event.relatedPageIds) {
      event.relatedPageIds = [];
    }

    return event.relatedPageIds.includes(page.id);
  });

  const relatedEventsHtml =
    relatedEvents.length > 0
      ? relatedEvents.map((event) => `<li>${event.title}</li>`).join("")
      : "<li>なし</li>";

  const folderOptions = folders.map((folder) => {
    const selected = folder.id === page.folderId ? "selected" : "";
    return `<option value="${folder.id}" ${selected}>${folder.title}</option>`;
  }).join("");

  sideInfo.innerHTML = `
    <label>タイトル</label>
    <input id="side-title" class="side-input" value="${page.title}">

    <label>フォルダ</label>
    <select id="side-folder" class="side-input">
      ${folderOptions}
    </select>

    <label>タグ</label>
    <input id="side-tags" class="side-input" value="${page.tags.join(", ")}">

    <label>本文</label>

    <div id="dictionary-editor"></div>

    <div id="side-inline-form-area"></div>

        <label>関連イベント</label>
    <div class="side-related-events">
      <ul>
        ${relatedEventsHtml}
      </ul>
    </div>

    <div class="side-button-row">
      <button id="move-page-up" class="side-button">↑ 上へ</button>
      <button id="move-page-down" class="side-button">↓ 下へ</button>
    </div>
  `;

  

  setupSideEditor(page);
  initDictionaryEditor(page);
  setupWikiLinkClicks(sideInfo);

}

function showAnnotationForm(page, lineInfo) {
  const formArea =
    document.getElementById("side-inline-form-area");

  if (!formArea) return;

  formArea.innerHTML = `
    <div class="inline-form-box">
      <label>作品注釈</label>

      <textarea
        id="inline-annotation-body"
        class="inline-form-textarea"
        placeholder="この行に追加する作品注釈を入力"
      ></textarea>

      <div class="inline-form-actions">
        <button id="save-inline-annotation-button" class="side-button">
          保存
        </button>

        <button id="cancel-inline-form-button" class="side-button">
          キャンセル
        </button>
      </div>
    </div>
  `;

  const bodyInput =
    document.getElementById("inline-annotation-body");

  const saveButton =
    document.getElementById("save-inline-annotation-button");

  const cancelButton =
    document.getElementById("cancel-inline-form-button");

  bodyInput.focus();

  saveButton.addEventListener("click", () => {
    const body = bodyInput.value.trim();

    if (!body) {
      alert("注釈本文を入力してください。");
      return;
    }

    const work = getCurrentWork();
    if (!work) return;

    if (!work.annotations) {
      work.annotations = [];
    }

    work.annotations.push({
      id: createPageId(),
      pageId: page.id,
      lineIndex: lineInfo.lineIndex,
      lineId: lineInfo.lineId,
      body
    });

    activeLineMenu = null;

    updateSideInfo(page);
    saveData();
    dictionaryEditor.focus();
  });

  cancelButton.addEventListener("click", () => {
    activeLineMenu = null;

    formArea.innerHTML = "";

    updateSideInfo(page);
  });
}

function showSourceForm(page, lineInfo) {
  const formArea =
    document.getElementById("side-inline-form-area");

  if (!formArea) return;

  formArea.innerHTML = `
    <div class="inline-form-box">
      <label>設定資料出典</label>

      <textarea
        id="inline-source-body"
        class="inline-form-textarea"
        placeholder="この行の設定資料出典を入力"
      ></textarea>

      <div class="inline-form-actions">
        <button id="save-inline-source-button" class="side-button">
          保存
        </button>

        <button id="cancel-inline-form-button" class="side-button">
          キャンセル
        </button>
      </div>
    </div>
  `;

  const sourceInput =
    document.getElementById("inline-source-body");

  const saveButton =
    document.getElementById("save-inline-source-button");

  const cancelButton =
    document.getElementById("cancel-inline-form-button");

  sourceInput.focus();

  saveButton.addEventListener("click", () => {
    const source = sourceInput.value.trim();

    if (!source) {
      alert("出典を入力してください。");
      return;
    }

    if (!page.sources) {
      page.sources = [];
    }

    page.sources.push({
      id: createPageId(),
      lineIndex: lineInfo.lineIndex,
      lineId: lineInfo.lineId,
      source
    });

    activeLineMenu = null;

    updateSideInfo(page);
    saveData();
    dictionaryEditor.focus();
  });

  cancelButton.addEventListener("click", () => {
    activeLineMenu = null;

    formArea.innerHTML = "";

    updateSideInfo(page);
  });
}

function showLineActionMenu(page, lineInfo) {
  const formArea =
    document.getElementById("side-inline-form-area");

  if (!formArea) return;

  formArea.innerHTML = `
    <div class="inline-form-box">
      <label>この行に追加</label>

      <div class="inline-form-actions">
        <button id="choose-annotation-button" class="side-button">
          作品注釈
        </button>

        <button id="choose-source-button" class="side-button">
          設定資料出典
        </button>

        <button id="cancel-inline-form-button" class="side-button">
          キャンセル
        </button>
      </div>
    </div>
  `;

  const annotationButton =
    document.getElementById("choose-annotation-button");

  const sourceButton =
    document.getElementById("choose-source-button");

  const cancelButton =
    document.getElementById("cancel-inline-form-button");

  annotationButton.addEventListener("click", () => {
    showAnnotationForm(page, lineInfo);
  });

  sourceButton.addEventListener("click", () => {
    showSourceForm(page, lineInfo);
  });

  cancelButton.addEventListener("click", () => {
    formArea.innerHTML = "";
  });
}

//注釈編集ダイアログ
function showEditAnnotationForm(page, annotation) {
  const formArea =
    document.getElementById("side-inline-form-area");

  if (!formArea) return;

  formArea.innerHTML = `
    <div class="inline-form-box">
      <label>作品注釈を編集</label>

      <textarea
        id="inline-edit-annotation-body"
        class="inline-form-textarea"
      >${annotation.body}</textarea>

      <div class="inline-form-actions">
        <button id="save-edit-annotation-button" class="side-button">
          保存
        </button>

        <button id="cancel-inline-form-button" class="side-button">
          キャンセル
        </button>
      </div>
    </div>
  `;

  const bodyInput =
    document.getElementById("inline-edit-annotation-body");

  const saveButton =
    document.getElementById("save-edit-annotation-button");

  const cancelButton =
    document.getElementById("cancel-inline-form-button");

  bodyInput.focus();

  saveButton.addEventListener("click", () => {
    const newBody = bodyInput.value.trim();

    if (!newBody) {
      alert("注釈本文を入力してください。");
      return;
    }

    annotation.body = newBody;

    updateSideInfo(page);
    saveData();

    dictionaryEditor.focus();
  });

  cancelButton.addEventListener("click", () => {
    formArea.innerHTML = "";
  });
}

//出典編集ダイアログ
function showEditSourceForm(page, sourceItem) {
  const formArea =
    document.getElementById("side-inline-form-area");

  if (!formArea) return;

  formArea.innerHTML = `
    <div class="inline-form-box">
      <label>設定資料出典を編集</label>

      <textarea
        id="inline-edit-source-body"
        class="inline-form-textarea"
      >${sourceItem.source}</textarea>

      <div class="inline-form-actions">
        <button id="save-edit-source-button" class="side-button">
          保存
        </button>

        <button id="cancel-inline-form-button" class="side-button">
          キャンセル
        </button>
      </div>
    </div>
  `;

  const sourceInput =
    document.getElementById("inline-edit-source-body");

  const saveButton =
    document.getElementById("save-edit-source-button");

  const cancelButton =
    document.getElementById("cancel-inline-form-button");

  sourceInput.focus();

  saveButton.addEventListener("click", () => {
    const newSource = sourceInput.value.trim();

    if (!newSource) {
      alert("出典を入力してください。");
      return;
    }

    sourceItem.source = newSource;

    updateSideInfo(page);
    saveData();

    dictionaryEditor.focus();
  });

  cancelButton.addEventListener("click", () => {
    formArea.innerHTML = "";
  });
}


//updateSideInfo(page)で作ったHTMLにイベントを付ける
function setupSideEditor(page) {
  const sideTitle = document.getElementById("side-title");
  const sideFolder = document.getElementById("side-folder");
  const sideTags = document.getElementById("side-tags");
  //const sideBody = document.getElementById("side-body");
  const moveUpButton = document.getElementById("move-page-up");
  const moveDownButton = document.getElementById("move-page-down");

  sideTitle.addEventListener("input", () => {
    page.title = sideTitle.value;
    saveData();
    renderPageList();
  });

  sideFolder.addEventListener("change", () => {
    page.folderId = sideFolder.value;
    saveData();
    renderPageList();
  });

  sideTags.addEventListener("input", () => {
    page.tags = sideTags.value
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag !== "");

    saveData();
  });

moveUpButton.addEventListener("click", () => {
  movePage(page, -1);
});

moveDownButton.addEventListener("click", () => {
  movePage(page, 1);
});

}

//左サイドバーに小説本文一覧と辞書ページ一覧を表示する
function renderPageList() {
  pageList.innerHTML = "";

  renderNovelList();

  const keyword = searchInput.value.trim().toLowerCase();
  const isTagSearch = keyword.startsWith("#");
  const tagKeyword = keyword.replace("#", "");

  const work = getCurrentWork();

  const hiddenPageIds =
    work && dictionaryLayerMode === "overlay"
      ? work.hiddenPageIds || []
      : [];

  const sortedFolders = [...folders].sort((a, b) => a.order - b.order);

  sortedFolders.forEach((folder) => {
    const folderPages = pages
      .filter((page) => page.folderId === folder.id)
      .filter((page) => !hiddenPageIds.includes(page.id))
      .filter((page) => {
        if (!keyword) return true;

        if (isTagSearch) {
          return page.tags.some((tag) =>
            tag.toLowerCase().includes(tagKeyword)
          );
        }

        return (
          page.title.toLowerCase().includes(keyword) ||
          page.body.toLowerCase().includes(keyword) ||
          page.tags.join(" ").toLowerCase().includes(keyword)
        );
      })
      .sort((a, b) => a.order - b.order);

    if (keyword && folderPages.length === 0) return;

    const group = document.createElement("section");
    group.className = "page-group";

    const folderHeader = document.createElement("div");
    folderHeader.className = "folder-header";

    const collapseButton = document.createElement("button");
    collapseButton.className = "folder-action-button";
    collapseButton.textContent = folder.collapsed ? "▶" : "▼";

    collapseButton.addEventListener("click", () => {
      folder.collapsed = !folder.collapsed;
      saveData();
      renderPageList();
    });

    const groupTitle = document.createElement("h3");
    groupTitle.className = "page-group-title";
    groupTitle.textContent = folder.title;

    const renameButton = document.createElement("button");
    renameButton.className = "folder-action-button";
    renameButton.textContent = "✎";
    renameButton.title = "フォルダ名を変更";

    renameButton.addEventListener("click", () => {
      showInputModal(
        "フォルダ名を変更",
        "新しいフォルダ名",
        folder.title,
        (newTitle) => {
          folder.title = newTitle;
          saveData();
          renderPageList();
        }
      );
    });

    const deleteButton = document.createElement("button");
    deleteButton.className = "folder-action-button";
    deleteButton.textContent = "×";
    deleteButton.title = "フォルダを削除";

    deleteButton.addEventListener("click", () => {
      const folderPages = pages.filter((page) => page.folderId === folder.id);

      if (folderPages.length > 0) {
        alert("このフォルダにはページが入っているため削除できません。先にページを別フォルダへ移動してください。");
        return;
      }

      const ok = confirm(`「${folder.title}」フォルダを削除しますか？`);
      if (!ok) return;

      folders = folders.filter((f) => f.id !== folder.id);
      saveData();
      renderPageList();
    });

    folderHeader.appendChild(collapseButton);
    folderHeader.appendChild(groupTitle);
    folderHeader.appendChild(renameButton);
    folderHeader.appendChild(deleteButton);

    group.appendChild(folderHeader);

    if (folder.collapsed) {
      pageList.appendChild(group);
      return;
    }

    folderPages.forEach((page) => {
      const row = document.createElement("div");
      row.className = "page-button-row";

      const button = document.createElement("button");
      button.className = "page-button";
      button.textContent = page.title;
      button.dataset.id = page.id;

      if (page.id === currentPageId) {
        button.classList.add("active");
      }

      button.addEventListener("click", () => {
        showPage(page.id);
      });

      row.appendChild(button);

      if (dictionaryLayerMode === "overlay") {
        const hideButton = document.createElement("button");
        hideButton.className = "hide-page-button";
        hideButton.textContent = "−";
        hideButton.title = "この作品では非表示にする";

        hideButton.addEventListener("click", (event) => {
          event.stopPropagation();

          const work = getCurrentWork();
          if (!work) return;

          if (!work.hiddenPageIds) {
            work.hiddenPageIds = [];
          }

          if (!work.hiddenPageIds.includes(page.id)) {
            work.hiddenPageIds.push(page.id);
          }

          saveData();
          renderPageList();
        });

        row.appendChild(hideButton);
      }

      group.appendChild(row);
    });

    pageList.appendChild(group);
  });

  if (dictionaryLayerMode === "overlay") {
    renderHiddenPageList();
  }
}
function renderHiddenPageList() {
  const work = getCurrentWork();
  if (!work) return;

  if (!work.hiddenPageIds) {
    work.hiddenPageIds = [];
  }

  const hiddenPages = pages.filter((page) => {
    return work.hiddenPageIds.includes(page.id);
  });

  if (hiddenPages.length === 0) return;

  const hiddenGroup = document.createElement("section");
  hiddenGroup.className = "page-group hidden-page-group";

  const header = document.createElement("div");
header.className = "folder-header";

const collapseButton = document.createElement("button");
collapseButton.className = "folder-action-button";
collapseButton.textContent = work.hiddenPagesCollapsed ? "▶" : "▼";

collapseButton.addEventListener("click", () => {
  work.hiddenPagesCollapsed = !work.hiddenPagesCollapsed;

  saveData();
  renderPageList();
});

const title = document.createElement("h3");
title.className = "page-group-title";
title.textContent = "非表示";

header.appendChild(collapseButton);
header.appendChild(title);

hiddenGroup.appendChild(header);

if (work.hiddenPagesCollapsed) {
  pageList.appendChild(hiddenGroup);
  return;
}

  const sortedFolders = [...folders].sort((a, b) => a.order - b.order);

  sortedFolders.forEach((folder) => {
    const folderHiddenPages = hiddenPages.filter((page) => {
      return page.folderId === folder.id;
    });

    if (folderHiddenPages.length === 0) return;

    const folderTitle = document.createElement("div");
    folderTitle.className = "hidden-folder-title";
    folderTitle.textContent = folder.title;

    hiddenGroup.appendChild(folderTitle);

    folderHiddenPages.forEach((page) => {
      const row = document.createElement("div");
      row.className = "page-button-row";

      const button = document.createElement("button");
      button.className = "page-button hidden-page-button";
      button.textContent = page.title;

      if (page.id === currentPageId) {
        button.classList.add("active");
      }

      button.addEventListener("click", () => {
        showPage(page.id);
      });

      const restoreButton = document.createElement("button");
      restoreButton.className = "restore-page-button";
      restoreButton.textContent = "👁";
      restoreButton.title = "通常表示に戻す";

      restoreButton.addEventListener("click", (event) => {
        event.stopPropagation();

        work.hiddenPageIds =
          work.hiddenPageIds.filter((id) => id !== page.id);

        saveData();
        renderPageList();
      });

      row.appendChild(button);
      row.appendChild(restoreButton);

      hiddenGroup.appendChild(row);
    });
  });

  pageList.appendChild(hiddenGroup);
}

//左サイドバーの「小説本文」一覧だけを表示する
function renderNovelList() {
  const group = document.createElement("section");
  group.className = "page-group";

  const groupTitle = document.createElement("h3");
  groupTitle.className = "novel-group-title";
  groupTitle.textContent = isNovelListOpen
    ? "▼ 小説本文"
    : "▶ 小説本文";

  groupTitle.addEventListener("click", () => {
    // 小説本文一覧の開閉状態を反転する。
    // trueならfalseへ、falseならtrueへ切り替わる。
    isNovelListOpen = !isNovelListOpen;

    renderPageList();
  });

group.appendChild(groupTitle);

if (!isNovelListOpen) {
  pageList.appendChild(group);
  return;
}

novels.forEach((novel) => {
    const button = document.createElement("button");
    button.className = "page-button";
    button.textContent = novel.title;
    button.dataset.id = novel.id;

    if (novel.id === currentNovelId) {
      button.classList.add("active");
    }

    button.addEventListener("click", () => {
      showNovel(novel.id);
      renderPageList();
    });

    group.appendChild(button);
  });

  pageList.appendChild(group);
}

// 時系列タブにイベント一覧を表示する
// イベントのタイトル・本文・関連フラグ・上下移動・削除ボタンもここで作る
function renderTimeline() {
  if (timelineViewMode === "detail") {
    timelineDetailLayout.classList.remove("hidden");
    timelineOverviewPanel.classList.add("hidden");

    renderTimelineList();
    renderTimelineDetail(currentEventId);
  } else {
    timelineDetailLayout.classList.add("hidden");
    timelineOverviewPanel.classList.remove("hidden");

    renderTimelineOverview();
  }
}

function renderTimelineList() {
  const work = getCurrentWork();
  if (!work) return;

  if (!work.events) {
    work.events = [];
  }

  timelineList.innerHTML = "";

  const sortedEvents = [...work.events].sort((a, b) => {
    return a.order - b.order;
  });

  sortedEvents.forEach((event, index) => {
    const button = document.createElement("button");
    button.className = "timeline-list-button";

    const displayNumber =
      String(index + 1).padStart(4, "0");

    button.textContent =
      event.id === currentEventId
      ? `▶ ${displayNumber}　${event.title}`
      : `${displayNumber}　${event.title}`;

    if (event.id === currentEventId) {
      button.classList.add("active");
    }

    button.addEventListener("click", () => {
      currentEventId = event.id;

      renderTimelineList();
      renderTimelineDetail(event.id);
    });

    timelineList.appendChild(button);
  });
}

function renderTimelineDetail(eventId) {
  const work = getCurrentWork();
  if (!work) return;

  const event = work.events.find((event) => {
    return event.id === eventId;
  });

  if (!event) {
    timelineDetailPanel.innerHTML =
      `<p class="empty-message">イベントが見つかりません。</p>`;
    return;
  }

  if (!event.relatedPageIds) {
    event.relatedPageIds = [];
  }

  if (!event.flags) {
    event.flags = [];
  }

  const selectedPages = event.relatedPageIds
  .map((pageId) => pages.find((page) => page.id === pageId))
  .filter((page) => page);

const selectedPageChips =
  selectedPages.length > 0
    ? selectedPages.map((page) => {
        return `
    <div
      class="related-chip open-related-page"
      data-page-id="${page.id}"
      >
      🏷️ ${page.title}

    <button
      type="button"
      class="remove-related-page"
      data-page-id="${page.id}"
      >
        ×
      </button>
    </div>
      `;
      }).join("")
    : "<p class='empty-message'>関連設定資料はまだありません。</p>";

  const flagCheckboxes = work.flags.map((flag) => {
    const checked =
      event.flags.includes(flag.id)
        ? "checked"
        : "";

    return `
      <label class="event-flag-label">
        <input
          type="checkbox"
          class="event-flag-checkbox"
          value="${flag.id}"
          ${checked}
        >
        ${flag.title}
      </label>
    `;
  }).join("");

  timelineDetailPanel.innerHTML = `
    <input class="timeline-title" value="${event.title}">

    <div id="timeline-editor"></div>

    <div class="event-pages">
      <div class="event-pages-title">📖 関連設定資料</div>

      <div class="related-chip-list">
      ${selectedPageChips}
    </div>

  <input
    class="timeline-page-search"
    placeholder="設定資料を検索して追加"
  >

  <div class="timeline-page-search-results"></div>
</div>

    <div class="event-flags">
      <div class="event-flags-title">🚩 関連フラグ</div>
      ${flagCheckboxes || "<p class='empty-message'>フラグがまだありません。</p>"}
    </div>

    <div class="side-button-row">
      <button class="side-button move-event-up">↑</button>
      <button class="side-button move-event-down">↓</button>
      <button class="side-button delete-event">削除</button>
    </div>
  `;

  setupTimelineDetailEvents(event);
}

function setupTimelineDetailEvents(event) {
  const titleInput =
    timelineDetailPanel.querySelector(".timeline-title");

  const upButton =
    timelineDetailPanel.querySelector(".move-event-up");

  const downButton =
    timelineDetailPanel.querySelector(".move-event-down");

  const deleteButton =
    timelineDetailPanel.querySelector(".delete-event");

    initTimelineEditor(event);


  const flagCheckboxInputs =
    timelineDetailPanel.querySelectorAll(".event-flag-checkbox");

  titleInput.addEventListener("input", () => {
    event.title = titleInput.value;

    saveData();
    renderTimelineList();
  });

  const pageSearchInput =
  timelineDetailPanel.querySelector(".timeline-page-search");

const pageSearchResults =
  timelineDetailPanel.querySelector(".timeline-page-search-results");

const removePageButtons =
  timelineDetailPanel.querySelectorAll(".remove-related-page");

const openPageChips =
  timelineDetailPanel.querySelectorAll(".open-related-page");

openPageChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    const pageId = chip.dataset.pageId;

    showPage(pageId);
  });
});

removePageButtons.forEach((button) => {
  button.addEventListener("click", (eventObject) => {
    eventObject.stopPropagation();

    const pageId = button.dataset.pageId;

    event.relatedPageIds =
      event.relatedPageIds.filter((id) => id !== pageId);

    saveData();
    renderTimelineDetail(event.id);
  });
});

function renderTimelinePageSearchResults() {
  if (!pageSearchInput || !pageSearchResults) return;

  const keyword =
    pageSearchInput.value.trim().toLowerCase();

  pageSearchResults.innerHTML = "";

  if (!keyword) return;

  const matchedPages = pages
    .filter((page) => {
      if (event.relatedPageIds.includes(page.id)) {
        return false;
      }

      return (
        page.title.toLowerCase().includes(keyword) ||
        page.body.toLowerCase().includes(keyword) ||
        page.tags.join(" ").toLowerCase().includes(keyword)
      );
    })
    .slice(0, 10);

  if (matchedPages.length === 0) {
    pageSearchResults.innerHTML =
      "<p class='empty-message'>見つかりませんでした。</p>";
    return;
  }

  matchedPages.forEach((page) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "search-result-button";
    button.textContent = page.title;

    button.addEventListener("click", () => {
      if (!event.relatedPageIds.includes(page.id)) {
        event.relatedPageIds.push(page.id);
      }

      saveData();
      renderTimelineDetail(event.id);
    });

    pageSearchResults.appendChild(button);
  });
}

if (pageSearchInput) {
  pageSearchInput.addEventListener("input", () => {
    renderTimelinePageSearchResults();
  });
}

  flagCheckboxInputs.forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const flagId = checkbox.value;

      if (!event.flags) {
        event.flags = [];
      }

      if (checkbox.checked) {
        if (!event.flags.includes(flagId)) {
          event.flags.push(flagId);
        }
      } else {
        event.flags =
          event.flags.filter((id) => id !== flagId);
      }

      saveData();
    });
  });

  upButton.addEventListener("click", () => {
    moveEvent(event, -1);
  });

  downButton.addEventListener("click", () => {
    moveEvent(event, 1);
  });

  deleteButton.addEventListener("click", () => {
    const ok = confirm(`「${event.title}」を削除しますか？`);
    if (!ok) return;

    const work = getCurrentWork();
    if (!work) return;

    work.events =
      work.events.filter((item) => item.id !== event.id);

    currentEventId = null;

    saveData();
    renderTimeline();
  });
}

// フラグタブにフラグ一覧を表示する
// フラグのタイトル・状態・メモ・削除ボタン・関連イベント一覧もここで作る
function renderFlags() {
  const work = getCurrentWork();
  if (!work) return;

  if (!work.flags) {
    work.flags = [];
  }

  flagList.innerHTML = "";

  const sortedFlags = [...work.flags].sort((a, b) => {
  return (a.order ?? 999) - (b.order ?? 999);
  });

  sortedFlags.forEach((flag, index) => {
    if (flag.order === undefined) {
    flag.order = index + 1;
    }
    if (flag.collapsed === undefined) {
      flag.collapsed = true;
    }
    const flagCard = document.createElement("div");
    flagCard.className = "flag-card";
    flagCard.dataset.flagId = flag.id;

    if (flag.id === focusFlagId) {
      flagCard.classList.add("focused-flag");
    }

    const relatedEvents = work.events.filter((event) => {
      if (!event.flags) {
        event.flags = [];
      }

      return event.flags.includes(flag.id);
    });

    const relatedEventsHtml =
      relatedEvents.length > 0
        ? relatedEvents.map((event) => {
            return `
              <button
                class="related-chip flag-related-event-chip"
                data-event-id="${event.id}"
              >
                🏷 ${event.title}
              </button>
            `;
          }).join("")
        : `<p class="empty-message">関連イベントなし</p>`;

    const isChecked =
      flag.status === "resolved" || flag.status === "done";

    flagCard.innerHTML = `
  <div class="flag-header">
  <button
    class="flag-collapse-toggle"
    title="${flag.collapsed ? "開く" : "閉じる"}"
  >
    ${flag.collapsed ? "▶" : "▼"}
  </button>

  <input
    class="flag-check"
    type="checkbox"
    ${isChecked ? "checked" : ""}
  >

    <input
      class="flag-title"
      type="text"
      value="${flag.title}"
    >

  </div>

<div class="flag-body ${flag.collapsed ? "hidden" : ""}">

  <textarea
    class="flag-memo"
    placeholder="TODO・メモを書く"
  >${flag.memo || ""}</textarea>

      <div class="flag-related-events">
        <strong>関連イベント</strong>

        <div class="related-chip-list">
          ${relatedEventsHtml}
        </div>

    <div class="flag-actions">

  <button
    class="flag-move-up"
    title="上へ"
  >
    ↑
  </button>

  <button
    class="flag-move-down"
    title="下へ"
  >
    ↓
  </button>

  <button
    class="flag-delete-icon delete-flag"
    title="削除"
  >
    🗑
  </button>

</div>
    
      </div>
      </div>
    `;

    const collapseToggle =
      flagCard.querySelector(".flag-collapse-toggle");
    const checkInput = flagCard.querySelector(".flag-check");
    const titleInput = flagCard.querySelector(".flag-title");
    const memoInput = flagCard.querySelector(".flag-memo");
    const deleteButton = flagCard.querySelector(".delete-flag");
    const header =
      flagCard.querySelector(".flag-header");
    const eventChips =
      flagCard.querySelectorAll(".flag-related-event-chip");
    const body =
      flagCard.querySelector(".flag-body");
    const moveUpButton =
      flagCard.querySelector(".flag-move-up");
    const moveDownButton =
      flagCard.querySelector(".flag-move-down");
      

    checkInput.addEventListener("change", () => {
      flag.status = checkInput.checked
        ? "resolved"
        : "unresolved";

      saveData();
      renderFlags();
    });

    titleInput.addEventListener("input", () => {
      flag.title = titleInput.value;
      saveData();
    });

    memoInput.addEventListener("input", () => {
      flag.memo = memoInput.value;
      saveData();
    });

    eventChips.forEach((chip) => {
      chip.addEventListener("click", () => {
        currentEventId = chip.dataset.eventId;
        timelineViewMode = "detail";

        switchMainTab("timeline");

        detailButton.classList.add("active");
        overviewButton.classList.remove("active");

        renderTimeline();
      });
    });

    deleteButton.addEventListener("click", () => {
      const ok = confirm(`「${flag.title}」を削除しますか？`);
      if (!ok) return;

      work.flags = work.flags.filter((f) => f.id !== flag.id);

      work.events.forEach((event) => {
        if (!event.flags) {
          event.flags = [];
        }

        event.flags = event.flags.filter((id) => id !== flag.id);
      });

      saveData();
      renderFlags();
    });

    collapseToggle.addEventListener("click", () => {
      flag.collapsed = !flag.collapsed;

      saveData();
      renderFlags();
    });

    moveUpButton.addEventListener("click", () => {
      moveFlag(flag, -1);
    });

    moveDownButton.addEventListener("click", () => {
      moveFlag(flag, 1);
    });

    flagList.appendChild(flagCard);
  });

  if (focusFlagId) {
    const focusedCard =
      flagList.querySelector(`[data-flag-id="${focusFlagId}"]`);

    if (focusedCard) {
      focusedCard.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    }

    focusFlagId = null;
  }
}

// 中央タブを切り替える
// relation はまだ仮画面なので、今は追加処理なし
function switchMainTab(tabName) {
  currentMainTab = tabName;

  updatePaneMenu();

  mainTabs.forEach((t) => {
    t.classList.remove("active");
  });

  const activeTab =
    document.querySelector(`[data-tab="${tabName}"]`);

  if (activeTab) {
    activeTab.classList.add("active");
  }

  tabPanels.forEach((panel) => {
    panel.classList.add("hidden");
  });

  const targetPanel =
    document.getElementById(`${tabName}-panel`);

  if (targetPanel) {
    targetPanel.classList.remove("hidden");
  }

  //タブごとに、必要な内容だけ再描画する
  if (tabName === "timeline") {
    renderTimeline();
  }

  if (tabName === "flags") {
    renderFlags();
  }

  if (tabName === "progress") {
  updateWritingStats();
  }

  if (tabName === "profile") {
  updateWritingStats();
  }
}


// 現在の中央タブに合わせて、上部メニューのボタン表示を切り替える
function updatePaneMenu() {
  if (currentMainTab === "novel") {
    deleteNovelButton.classList.remove("hidden");
  } else {
    deleteNovelButton.classList.add("hidden");
  }
}

//文字数カウント
function updateNovelCharCount() {
  const novel = getCurrentNovel();

  if (!novel) {
    novelCharCount.textContent = "0文字";
    updateWritingStats();
    return;
  }

  novelCharCount.textContent = `${novel.body.length}文字`;

  updateWritingStats();
}

//文字数カウント関数
function updateWritingStats() {
  const currentNovelCharCount =
    document.getElementById("current-novel-char-count");

  const totalWorkCharCount =
    document.getElementById("total-work-char-count");

  if (!currentNovelCharCount || !totalWorkCharCount) return;

  const novel = getCurrentNovel();
  const work = getCurrentWork();

  const currentCount = novel ? novel.body.length : 0;

  const totalCount = work
    ? work.novels.reduce((sum, novel) => {
        return sum + novel.body.length;
      }, 0)
    : 0;

    const launchCount =
    document.getElementById("launch-count");

    if (launchCount) {
      launchCount.textContent =
      userData.stats.launchCount.toLocaleString();
    }

  currentNovelCharCount.textContent = currentCount.toLocaleString();
  totalWorkCharCount.textContent = totalCount.toLocaleString();

  renderNovelCharList();
  updateGoalProgress();
  updateTodayWritingStats();
  renderWritingLogList();
  renderWritingChart();
  renderActivityGrass(); 
}

//目標文字数達成率計算
function updateGoalProgress() {
  const work = getCurrentWork();
  if (!work) return;

  if (!work.progress) {
    work.progress = {
      useGoal: false,
      goalChars: 0
    };
  }

  const useGoalCheckbox =
    document.getElementById("use-goal-checkbox");

  const goalSettings =
    document.getElementById("goal-settings");

  const goalCharInput =
    document.getElementById("goal-char-input");

  const goalProgressPercent =
    document.getElementById("goal-progress-percent");

  const goalBarFill =
    document.getElementById("goal-bar-fill");

  const goalRemainingChars =
    document.getElementById("goal-remaining-chars");

  if (
    !useGoalCheckbox ||
    !goalSettings ||
    !goalCharInput ||
    !goalProgressPercent ||
    !goalBarFill ||
    !goalRemainingChars 
  )
   {
    return;
  }

  const totalCount = work.novels.reduce((sum, novel) => {
    return sum + novel.body.length;
  }, 0);

  useGoalCheckbox.checked = work.progress.useGoal;
  goalCharInput.value =
    work.progress.goalChars > 0 ? work.progress.goalChars : "";

  if (work.progress.useGoal) {
    goalSettings.classList.remove("hidden");
  } else {
    goalSettings.classList.add("hidden");
  }

const goal = Number(work.progress.goalChars) || 0;

const rawPercent =
  goal > 0 ? Math.floor((totalCount / goal) * 100) : 0;

const displayPercent =
  goal > 0 ? rawPercent : 0;

const barPercent =
  Math.min(100, displayPercent);

const remaining =
  goal > 0 ? Math.max(0, goal - totalCount) : 0;

goalProgressPercent.textContent = displayPercent.toString();
goalRemainingChars.textContent = remaining.toLocaleString();
goalBarFill.style.width = `${barPercent}%`;
}

//文字数カウント更新関数
function updateTodayWritingStats() {
  const addedElement =
    document.getElementById("today-added-chars");

  const deletedElement =
    document.getElementById("today-deleted-chars");

  const netElement =
    document.getElementById("today-net-chars");

  if (!addedElement || !deletedElement || !netElement) return;

  const log = getTodayWritingLog();

  const netChars =
    log.addedChars - log.deletedChars;

  addedElement.textContent =
    log.addedChars.toLocaleString();

  deletedElement.textContent =
    log.deletedChars.toLocaleString();

  netElement.textContent =
    netChars.toLocaleString();
}

//ログ一覧表示関数
function renderWritingLogList() {
  const listElement =
    document.getElementById("writing-log-list");

  if (!listElement) return;

  const recentDateKeys = getWritingChartDateKeys();

  listElement.innerHTML = "";

  recentDateKeys.forEach((dateKey) => {
    const log =
      userData.writingLogs.find((log) => log.date === dateKey);

    const addedChars = log ? log.addedChars : 0;
    const deletedChars = log ? log.deletedChars : 0;
    const netChars = addedChars - deletedChars;

    const row = document.createElement("div");
    row.className = "writing-log-row";

    row.innerHTML = `
      <span class="writing-log-date">${dateKey}</span>
      <span>追加：${addedChars.toLocaleString()}文字</span>
      <span>削除：${deletedChars.toLocaleString()}文字</span>
      <span>増減：${netChars.toLocaleString()}文字</span>
    `;

    listElement.appendChild(row);
  });
}

//グラフ描画関数
function renderWritingChart() {
  const chartCanvas =
    document.getElementById("writing-chart");

  if (!chartCanvas) return;

  const dateKeys = getWritingChartDateKeys();

  let cumulativeChars = 0;

  const chartData = dateKeys.map((dateKey) => {
    const log = userData.writingLogs.find((log) => {
      return log.date === dateKey;
    });

    const addedChars = log ? log.addedChars : 0;
    const deletedChars = log ? log.deletedChars : 0;
    const netChars = addedChars - deletedChars;

    cumulativeChars += netChars;

    return {
      date: dateKey.slice(5),
      addedChars,
      cumulativeChars
    };
  });

  if (writingChartInstance) {
    writingChartInstance.destroy();
  }

  writingChartInstance = new Chart(chartCanvas, {
    type: "bar",
    data: {
      labels: chartData.map((data) => data.date),
      datasets: [
        {
          type: "bar",
          label: "累計文字数",
          data: chartData.map((data) => data.cumulativeChars),
          yAxisID: "y"
        },
        {
          type: "line",
          label: "今日の追加",
          data: chartData.map((data) => data.addedChars),
          yAxisID: "y1",
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      scales: {
        y: {
          beginAtZero: true,
          position: "left"
        },
        y1: {
          beginAtZero: true,
          position: "right",
          grid: {
            drawOnChartArea: false
          }
        }
      }
    }
  });
}

function renderActivityGrass() {
  const grassElement =
    document.getElementById("activity-grass");

  if (!grassElement) return;

  const year = activityDisplayMonth.getFullYear();
  const month = activityDisplayMonth.getMonth();

  if (activityMonthLabel) {
    activityMonthLabel.textContent =
      `${year}年${month + 1}月`;
  }

  if (activityNextMonthButton) {
  const nextMonth = new Date(
    year,
    month + 1,
    1
  );

  activityNextMonthButton.disabled =
    isFutureMonth(nextMonth);
  }

  const dateKeys = getMonthDateKeys(activityDisplayMonth);

  grassElement.innerHTML = "";

  const weekdayHeader = document.createElement("div");
  weekdayHeader.className = "activity-weekday-header";

  ["日", "月", "火", "水", "木", "金", "土"].forEach((day) => {
    const dayElement = document.createElement("div");
    dayElement.className = "activity-weekday";
    dayElement.textContent = day;

    weekdayHeader.appendChild(dayElement);
  });

  grassElement.appendChild(weekdayHeader);

  const grid = document.createElement("div");
  grid.className = "activity-grass-grid";

  const firstDate = new Date(year, month, 1);
  const firstDay = firstDate.getDay();

  for (let i = 0; i < firstDay; i++) {
    const emptyCell = document.createElement("div");
    emptyCell.className = "grass-cell grass-cell-empty";

    grid.appendChild(emptyCell);
  }

  dateKeys.forEach((dateKey) => {
    const log = userData.writingLogs.find((log) => {
      return log.date === dateKey;
    });

    const score = calculateGrassScore(log);
    const level = getGrassLevel(score);

    const cell = document.createElement("button");
    cell.className = `grass-cell level-${level}`;
    cell.title = `${dateKey} / ${score}点`;
    cell.textContent = String(Number(dateKey.slice(-2)));

    if (dateKey === getTodayKey()) {
      cell.classList.add("grass-cell-today");
    }

    if (dateKey === currentReceiptDateKey) {
      cell.classList.add("grass-cell-selected");
    }

    cell.addEventListener("click", () => {
      renderActivityReceipt(dateKey);
      renderActivityGrass();
    });

    grid.appendChild(cell);
  });

  grassElement.appendChild(grid);
}

function renderActivityReceipt(dateKey) {
  currentReceiptDateKey = dateKey;

  const receiptElement =
    document.getElementById("activity-receipt");

  if (!receiptElement) return;

  const log = userData.writingLogs.find((log) => {
    return log.date === dateKey;
  });

  if (!log) {
    receiptElement.innerHTML = `
      <div class="receipt-card">
        <h3>${dateKey}</h3>
        <p>この日の記録はありません。</p>
      </div>
    `;
    return;
  }

  const netChars =
    (log.addedChars || 0) - (log.deletedChars || 0);

  const items = [];

  if (log.launch) {
    items.push(["起動", "○"]);
  }

  if (log.addedChars > 0) {
    items.push(["本文追加", `+${log.addedChars.toLocaleString()}文字`]);
  }

  if (log.deletedChars > 0) {
    items.push(["本文削除", `-${log.deletedChars.toLocaleString()}文字`]);
  }

  if (netChars !== 0) {
    const sign = netChars > 0 ? "+" : "";
    items.push(["本文増減", `${sign}${netChars.toLocaleString()}文字`]);
  }

  if (log.dictionaryEdits > 0) {
    items.push(["辞書編集", `${log.dictionaryEdits}回`]);
  }

  if (log.timelineEdits > 0) {
    items.push(["時系列編集", `${log.timelineEdits}回`]);
  }

  if (log.flagEdits > 0) {
    items.push(["フラグ編集", `${log.flagEdits}回`]);
  }

  if (log.relationEdits > 0) {
    items.push(["相関図編集", `${log.relationEdits}回`]);
  }

  if (log.pomodoro > 0) {
    items.push(["ポモドーロ", `${log.pomodoro}回`]);
  }

  const score = calculateGrassScore(log);

  receiptElement.innerHTML = `
    <div class="receipt-card">
      <div class="receipt-header">
        <h3>Fanfic Studio 活動レシート</h3>
        <span>${dateKey}</span>
      </div>

      <div class="receipt-items">
        ${items
          .map((item) => {
            return `
              <div class="receipt-row">
                <span>${item[0]}</span>
                <strong>${item[1]}</strong>
              </div>
            `;
          })
          .join("")}
      </div>

      <div class="receipt-footer">
        今日の活動スコア：${score}点
      </div>
    </div>
  `;
}

function renderNovelCharList() {
  const listElement =
    document.getElementById("novel-char-list");

  if (!listElement) return;

  const work = getCurrentWork();

  if (!work || !work.novels || work.novels.length === 0) {
    listElement.innerHTML = "<p>本文がありません。</p>";
    return;
  }

  listElement.innerHTML = "";

  work.novels.forEach((novel) => {
    const row = document.createElement("div");
    row.className = "novel-char-row";

    const title = document.createElement("span");
    title.className = "novel-char-title";
    title.textContent = novel.title;

    const count = document.createElement("span");
    count.className = "novel-char-count";
    count.textContent = `${novel.body.length.toLocaleString()}文字`;

    row.appendChild(title);
    row.appendChild(count);

    listElement.appendChild(row);
  });
}


function showModal(title, html, onOk) {

  modalTitle.innerHTML = title;
  modalBody.innerHTML = html;

  modalOverlay.classList.remove("hidden");

  modalOk.onclick = () => {

    modalOverlay.classList.add("hidden");

    if(onOk){
      onOk();
    }

  };

  modalCancel.onclick = () => {

    modalOverlay.classList.add("hidden");

  };

}

function showInputModal(title, labelText, defaultValue, onOk) {
  modalTitle.textContent = title;

  modalBody.innerHTML = `
    <label class="modal-input-label">
      ${labelText}
    </label>

    <input
      id="modal-input"
      class="modal-input"
      type="text"
      value="${defaultValue || ""}"
    >
  `;

  modalOverlay.classList.remove("hidden");

  const input =
    document.getElementById("modal-input");

  input.focus();
  input.select();

  modalOk.onclick = () => {
    const value = input.value.trim();

    if (!value) {
      alert("名前を入力してください。");
      return;
    }

    modalOverlay.classList.add("hidden");

    onOk(value);
  };

  modalCancel.onclick = () => {
    modalOverlay.classList.add("hidden");
  };
}

function renderTimelineOverview() {
  const work = getCurrentWork();
  if (!work) return;

  if (!work.events || work.events.length === 0) {
    timelineOverviewPanel.innerHTML =
      `<p class="empty-message">時系列イベントがまだありません。</p>`;
    return;
  }

  const sortedEvents = [...work.events].sort((a, b) => {
    return a.order - b.order;
  });

  timelineOverviewPanel.innerHTML = "";

  sortedEvents.forEach((event, index) => {
    const card = document.createElement("article");
    card.className = "timeline-overview-card";

    const displayNumber = String(index + 1).padStart(3, "0");

    const titleRow = document.createElement("div");
titleRow.className = "timeline-overview-title-row";

const titleButton = document.createElement("button");
titleButton.className = "timeline-overview-title";
titleButton.textContent = `${displayNumber}　${event.title}`;

const editButton = document.createElement("button");
editButton.className = "timeline-overview-edit-button";
editButton.textContent = "🖊️";
editButton.title = "詳細で編集";

editButton.addEventListener("click", () => {
  currentEventId = event.id;
  timelineViewMode = "detail";

  detailButton.classList.add("active");
  overviewButton.classList.remove("active");

  renderTimeline();
});

titleRow.appendChild(titleButton);
titleRow.appendChild(editButton);

    const body = document.createElement("div");
    body.className = "timeline-overview-body";
    body.textContent = event.body || "本文なし";

    const info = document.createElement("div");
    info.className = "timeline-overview-info";

    const relatedPages = (event.relatedPageIds || [])
      .map((pageId) => pages.find((page) => page.id === pageId))
      .filter((page) => page);

    const relatedFlags = (event.flags || [])
      .map((flagId) => work.flags.find((flag) => flag.id === flagId))
      .filter((flag) => flag);

    const pageToggle = document.createElement("button");
    pageToggle.className = "timeline-overview-info-button";
    pageToggle.textContent = `📖 ${relatedPages.length}件 ▼`;

    const flagToggle = document.createElement("button");
    flagToggle.className = "timeline-overview-info-button";
    flagToggle.textContent = `🚩 ${relatedFlags.length}件 ▼`;

    const detailArea = document.createElement("div");
    detailArea.className = "timeline-overview-related hidden";

    pageToggle.addEventListener("click", () => {
  const isPageOpen =
    detailArea.dataset.openType === "pages" &&
    !detailArea.classList.contains("hidden");

  if (isPageOpen) {
    detailArea.classList.add("hidden");
    detailArea.dataset.openType = "";

    pageToggle.textContent = `📖 ${relatedPages.length}件 ▼`;
    return;
  }

  detailArea.classList.remove("hidden");
  detailArea.dataset.openType = "pages";

  pageToggle.textContent = `📖 ${relatedPages.length}件 ▲`;
  flagToggle.textContent = `🚩 ${relatedFlags.length}件 ▼`;

  detailArea.innerHTML =
    relatedPages.length > 0
      ? relatedPages.map((page) => {
          return `
            <button
              class="timeline-overview-related-item timeline-overview-link"
              data-page-id="${page.id}"
            >
              📖 ${page.title}
            </button>
          `;
        }).join("")
      : `<div class="timeline-overview-related-item">関連辞書なし</div>`;
});

    flagToggle.addEventListener("click", () => {
  const isFlagOpen =
    detailArea.dataset.openType === "flags" &&
    !detailArea.classList.contains("hidden");

  if (isFlagOpen) {
    detailArea.classList.add("hidden");
    detailArea.dataset.openType = "";

    flagToggle.textContent = `🚩 ${relatedFlags.length}件 ▼`;
    return;
  }

  detailArea.classList.remove("hidden");
  detailArea.dataset.openType = "flags";

  flagToggle.textContent = `🚩 ${relatedFlags.length}件 ▲`;
  pageToggle.textContent = `📖 ${relatedPages.length}件 ▼`;

  detailArea.innerHTML =
    relatedFlags.length > 0
      ? relatedFlags.map((flag) => {
          return `
            <button
              class="timeline-overview-related-item timeline-overview-flag-link"
              data-flag-id="${flag.id}"
            >
              🚩 ${flag.title}
            </button>
          `;
        }).join("")
      : `<div class="timeline-overview-related-item">関連フラグなし</div>`;
});

    detailArea.addEventListener("click", (eventObject) => {
  const target = eventObject.target;

  if (!(target instanceof HTMLElement)) return;

  const pageButton =
    target.closest(".timeline-overview-link");

  if (pageButton) {
    const pageId = pageButton.dataset.pageId;

    showPage(pageId);
    return;
  }

  const flagButton =
    target.closest(".timeline-overview-flag-link");

  if (flagButton) {
    focusFlagId = flagButton.dataset.flagId;
    switchMainTab("flags");
    return;
  }
});

    info.appendChild(pageToggle);
    info.appendChild(flagToggle);

    card.appendChild(titleRow);
    card.appendChild(body);
    
    card.appendChild(info);
    card.appendChild(detailArea);

    timelineOverviewPanel.appendChild(card);
  });
}

function renderStartupScreen() {
  const lastWork =
    works.find((work) => work.id === currentWorkId);

  if (!startupLastWorkTitle || !continueWorkButton) return;

  if (!lastWork) {
    startupLastWorkTitle.textContent = "作品なし";
    continueWorkButton.disabled = true;
    return;
  }

  startupLastWorkTitle.textContent = lastWork.title;
  continueWorkButton.disabled = false;
}

// 起動画面右側に、選択中の作品情報を表示する。
function renderStartupSelectedWork() {
  const selectedWork =
    works.find((work) => work.id === selectedStartupWorkId);

  if (!startupLastWorkTitle || !continueWorkButton) return;

  if (!selectedWork) {
    startupLastWorkTitle.textContent = "作品なし";
    continueWorkButton.disabled = true;
    return;
  }

  startupLastWorkTitle.textContent = selectedWork.title;
  continueWorkButton.disabled = false;

  // 選択中作品に入っている本文の文字数を合計する。
  // 起動画面で「この作品がどれくらい書かれているか」を見るため。
  const totalChars = selectedWork.novels.reduce((sum, novel) => {
  return sum + novel.body.length;
}, 0);

  startupWorkTotalChars.textContent =
    totalChars.toLocaleString();

  startupWorkUpdatedAt.textContent =
    selectedWork.updatedAt || "未記録";
} // function renderStartupSelectedWork を閉じる


// 起動画面に作品一覧を表示する。
function renderStartupWorkList() {
  if (!startupWorkList) return;

  startupWorkList.innerHTML = "";

  // 最終更新日時が新しい作品ほど上に表示する。
  const sortedWorks = [...works].sort((a, b) => {
    return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
  });

    // 作品ボタンと削除ボタンを横並びにするための1行を作る。
  sortedWorks.forEach((work) => {
    //作品1件分の横一列の箱を作る
    const row = document.createElement("div");
    row.className = "startup-work-row";

    //作品名を表示するボタンを作る
    const button = document.createElement("button");
    button.className = "startup-work-button";
    button.textContent = work.title;

    if (work.id === selectedStartupWorkId) {
      button.classList.add("active");
    }

    button.addEventListener("click", () => {
      selectedStartupWorkId = work.id;

      renderStartupWorkList();
      renderStartupSelectedWork();
    });

    //削除用のゴミ箱ボタンを作る
    const deleteButton = document.createElement("button");
    deleteButton.className = "startup-work-delete-button";
    deleteButton.textContent = "🗑";
    deleteButton.title = "この作品を削除";

    deleteButton.addEventListener("click", (event) => {
      event.stopPropagation();

      const ok = confirm(`「${work.title}」を削除しますか？`);
      if (!ok) return;

      works = works.filter((item) => item.id !== work.id);

      if (selectedStartupWorkId === work.id) {
        selectedStartupWorkId = works.length > 0 ? works[0].id : null;
      }

      if (currentWorkId === work.id) {
        currentWorkId = works.length > 0 ? works[0].id : null;
        novels = currentWorkId ? getCurrentWork().novels : [];
      }

      saveData();
      renderStartupWorkList();
      renderStartupSelectedWork();
    });

    // 作ったボタンを1行の中へ入れる。
    // 最後にrowごと一覧へ追加する。
    row.appendChild(button);
    row.appendChild(deleteButton);

    startupWorkList.appendChild(row);
  });
} // function renderStartupWorkList を閉じる


// ==============================
// 6. 移動系関数
// ==============================
// 辞書ページを同じフォルダ内で上下に移動する
function movePage(page, direction) {
  const sameFolderPages = pages
    .filter((p) => p.folderId === page.folderId)
    .sort((a, b) => a.order - b.order);

  const index = sameFolderPages.findIndex((p) => p.id === page.id);
  const targetIndex = index + direction;

  if (targetIndex < 0 || targetIndex >= sameFolderPages.length) {
    return;
  }

  const targetPage = sameFolderPages[targetIndex];

  const tempOrder = page.order;
  page.order = targetPage.order;
  targetPage.order = tempOrder;

  saveData();
  renderPageList();
}

// 時系列イベントを上下に移動する
function moveEvent(event, direction) {
  const work = getCurrentWork();

  const sortedEvents = [...work.events].sort((a, b) => a.order - b.order);
  const index = sortedEvents.findIndex((e) => e.id === event.id);
  const targetIndex = index + direction;

  if (targetIndex < 0 || targetIndex >= sortedEvents.length) {
    return;
  }

  const targetEvent = sortedEvents[targetIndex];

  const tempOrder = event.order;
  event.order = targetEvent.order;
  targetEvent.order = tempOrder;

  saveData();
  renderTimeline();
}

function moveFlag(flag, direction) {
  const work = getCurrentWork();
  if (!work) return;

  if (!work.flags) {
    work.flags = [];
  }

  const sortedFlags = [...work.flags].sort((a, b) => {
    return (a.order ?? 999) - (b.order ?? 999);
  });

  sortedFlags.forEach((item, index) => {
    if (item.order === undefined) {
      item.order = index + 1;
    }
  });

  const index = sortedFlags.findIndex((item) => item.id === flag.id);
  const targetIndex = index + direction;

  if (targetIndex < 0 || targetIndex >= sortedFlags.length) {
    return;
  }

  const targetFlag = sortedFlags[targetIndex];

  const tempOrder = flag.order;
  flag.order = targetFlag.order;
  targetFlag.order = tempOrder;

  saveData();
  renderFlags();
}

//幅ドラッグ関係の変数定義
let isDraggingLeft = false;
let isDraggingRight = false;

//gridを更新する関数
//左ペイン・中央本文・右ペインは、常にこの5列で考える。
//ペインを閉じている時も列の数は変えず、閉じた側だけ 0px にする。
function updatePaneGrid() {
  document.documentElement.style.setProperty(
    "--left-pane-width",
    `${leftPaneWidth}px`
  );

  document.documentElement.style.setProperty(
    "--right-pane-width",
    `${rightPaneWidth}px`
  );

  const isLeftCollapsed =
    appLayout.classList.contains("left-collapsed");

  const isRightCollapsed =
    appLayout.classList.contains("right-collapsed");

  const leftColumns = isLeftCollapsed
    ? "0px 0px"
    : `${leftPaneWidth}px 6px`;

  const rightColumns = isRightCollapsed
    ? "0px 0px"
    : `6px ${rightPaneWidth}px`;

  appLayout.style.gridTemplateColumns =
    `${leftColumns} 1fr ${rightColumns}`;
}

//左サイドバーのサイズ変更箇所のドラッグを検知する
leftResizer.addEventListener("mousedown", () => {
  if (appLayout.classList.contains("left-collapsed")) return;

  isDraggingLeft = true;
  console.log("左ドラッグ開始！");
});

//右サイドバーのサイズ変更箇所のドラッグを検知する
rightResizer.addEventListener("mousedown", () => {
  if (appLayout.classList.contains("right-collapsed")) return;

  isDraggingRight = true;
  console.log("右ドラッグ開始！");
});

//サイドバーを掴んでドラッグしている間だけ座標を見る
document.addEventListener("mousemove", (event) => {
  if (isDraggingLeft) {
    leftPaneWidth = event.clientX;

    if (leftPaneWidth < 120) leftPaneWidth = 120;
    if (leftPaneWidth > 500) leftPaneWidth = 500;

    updatePaneGrid();
  }

  if (isDraggingRight) {
    rightPaneWidth =
      window.innerWidth - event.clientX;

    if (rightPaneWidth < 160) rightPaneWidth = 160;
    if (rightPaneWidth > 600) rightPaneWidth = 600;

    updatePaneGrid();
  }
});

//サイドバーのドラッグを離した時止める
document.addEventListener("mouseup", () => {
  if (isDraggingLeft) {
    isDraggingLeft = false;
    console.log("左ドラッグ終了！");
    saveData();
  }

  if (isDraggingRight) {
    isDraggingRight = false;
    console.log("右ドラッグ終了！");
    saveData();
  }
});




// ==============================
// 7. Wikiリンク系
// ==============================
// [[ページ名]] という文字を、クリックできるHTMLボタンに変換する
function convertLinksToHtml(text) {
  return text
    .replace(/\n/g, "<br>")
    .replace(/\[\[([^\]]+)\]\]/g, (match, pageTitle) => {
      return `<button class="wiki-link" data-title="${pageTitle}">${pageTitle}</button>`;
    });
}

// 変換されたWikiリンクボタンをクリックした時、対応する辞書ページを表示する
function setupWikiLinkClicks(area) {
  const links = area.querySelectorAll(".wiki-link");

  links.forEach((link) => {
    link.addEventListener("click", () => {
      const title = link.dataset.title;
      const targetPage = pages.find((page) => page.title === title);

      if (targetPage) {
        showPage(targetPage.id);
      } else {
        alert(`「${title}」のページはまだありません`);
      }
    });
  });
}



// ==============================
// 8. ボタン・入力イベント登録
// ==============================
//辞書作成ボタン
newPageButton.addEventListener("click", () => {
  const newPage = {
    id: createPageId(),
    title: "新規ページ",
    folderId: "other",
    order: pages.length + 1,
    tags: [],
    body: "",
    sources: [],
    lineIds: [createPageId()]
};

  pages.push(newPage);
  saveData();
  renderPageList();
  showPage(newPage.id);
});

//小説本文作成ボタン
newNovelButton.addEventListener("click", () => {
  const newNovel = {
    id: createPageId(),
    title: "新規小説本文",
    body: ""
  };

  novels.push(newNovel);
  saveData();
  renderPageList();
  showNovel(newNovel.id);
});

//辞書削除ボタン
deletePageButton.addEventListener("click", () => {
  const page = getCurrentPage();
  if (!page) return;

  const ok = confirm(`「${page.title}」を削除しますか？`);
  if (!ok) return;

  pages = pages.filter((p) => p.id !== page.id);
  currentPageId = null;

  saveData();
  renderPageList();

  sideInfo.innerHTML = "辞書ページを選択してください。";
});

//小説削除ボタン
deleteNovelButton.addEventListener("click", () => {
  const novel = getCurrentNovel();
  if (!novel) return;

  const ok = confirm(`「${novel.title}」を削除しますか？`);

  if (!ok) return;

  novels = novels.filter((n) => n.id !== novel.id);

  saveData();
  renderPageList();

  if (novels.length > 0) {
    showNovel(novels[0].id);
  } else {
    currentNovelId = null;
    titleInput.value = "";
    typeArea.textContent = "種類：本文";
    bodyInput.value = "";
  }
});

//小説タイトル入力枠
titleInput.addEventListener("input", () => {
  const novel = getCurrentNovel();
  if (!novel) return;

  novel.title = titleInput.value;
  saveData();
  renderPageList();
});

//小説本文入力枠
bodyInput.addEventListener("input", () => {
  const novel = getCurrentNovel();
  if (!novel) return;

  //本文保存　textareaの中身をnovel.bodyに保存
  novel.body = bodyInput.value;
  saveData();
});

//フォルダ作成ボタン
newFolderButton.addEventListener("click", () => {
  showInputModal(
    "新しいフォルダを作る",
    "フォルダ名",
    "",
    (folderTitle) => {
      const newFolder = {
        id: createPageId(),
        title: folderTitle,
        order: folders.length + 1,
        collapsed: false
      };

      folders.push(newFolder);
      saveData();
      renderPageList();
    }
  );
});

searchInput.addEventListener("input", () => {
  renderPageList();
});

//中央タブ切り替えボタン
mainTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    switchMainTab(tab.dataset.tab);
  });
});

//時系列イベント作成ボタン
newEventButton.addEventListener("click", () => {
  const work = getCurrentWork();

  const newEvent = {
    id: createPageId(),
    title: "新規イベント",
    order: work.events.length + 1,
    body: "",
    relatedPageIds: [],
    flags: []
  };

  work.events.push(newEvent);

  currentEventId = newEvent.id;

  saveData();
  renderTimeline();
});

//フラグ作成ボタン
newFlagButton.addEventListener("click", () => {
  const work = getCurrentWork();

  const newFlag = {
    id: createPageId(),
    title: "新規フラグ",
    status: "unresolved",
    memo: ""
  };

  work.flags.push(newFlag);
  saveData();
  renderFlags();
});


// 辞書ページの表示モードを切り替えるボタン
layerToggleButton.addEventListener("click", () => {
  if (dictionaryLayerMode === "base") {
    dictionaryLayerMode = "overlay";
    layerToggleButton.textContent = "設定資料＋作品注釈";
  } else {
    dictionaryLayerMode = "base";
    layerToggleButton.textContent = "設定資料のみ";
  }

  const page = getCurrentPage();
  if (page) {
    updateSideInfo(page);
  }

  renderPageList();

});

// 設定資料データのJSONファイルを読み込む
importBaseFile.addEventListener("change", () => {
  const file = importBaseFile.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.addEventListener("load", () => {
    const importedData = JSON.parse(reader.result);

    if (importedData.type !== "base") {
      alert("設定資料データではありません。");
      return;
    }

    folders = importedData.folders || folders;
    basePages = importedData.basePages || [];

    pages = basePages;

    saveData();
    renderPageList();
    const page = getCurrentPage();
      if (page) {
      updateSideInfo(page);
      }

  renderPageList();

    sideInfo.innerHTML = "辞書ページを選択してください。";

    alert("設定資料データを読み込みました。");
  });

  reader.readAsText(file);
});

// 作品データのJSONファイルを読み込む
importWorkFile.addEventListener("change", () => {
  const file = importWorkFile.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.addEventListener("load", () => {
    const importedData = JSON.parse(reader.result);

    if (importedData.type !== "work") {
      alert("作品データではありません。");
      return;
    }

    const importedWork = importedData.work;
    if (!importedWork) {
      alert("作品データの中身が見つかりません。");
      return;
    }

    const existingWorkIndex = works.findIndex(
      (work) => work.id === importedWork.id
    );

    if (existingWorkIndex >= 0) {
      works[existingWorkIndex] = importedWork;
    } else {
      works.push(importedWork);
    }

    currentWorkId = importedWork.id;
    novels = importedWork.novels || [];

    saveData();
    renderPageList();

    if (novels.length > 0) {
      showNovel(novels[0].id);
    }

    const page = getCurrentPage();
    if (page) {
      updateSideInfo(page);
    }

    alert("作品データを読み込みました。");
  });

  reader.readAsText(file);
});

// 読み込みメニューを開閉する
importButton.addEventListener("click", () => {
  importMenu.classList.toggle("hidden");
  exportMenu.classList.add("hidden");
});

// 書き出しメニューを開閉する
exportButton.addEventListener("click", () => {
  exportMenu.classList.toggle("hidden");
  importMenu.classList.add("hidden");
});

startupMenuButton.addEventListener("click", () => {
  startupMenu.classList.toggle("hidden");
});

exportFullBackupButton.addEventListener("click", () => {
  startupMenu.classList.add("hidden");

  downloadJson(
    "fanfic-studio-backup.json",
    buildFullBackupData()
  );
});

appMenuButton.addEventListener("click", () => {
  appMenu.classList.toggle("hidden");
});

appImportToggleButton.addEventListener("click", () => {
  appImportSection.classList.toggle("hidden");

  appImportToggleButton.textContent =
    appImportSection.classList.contains("hidden")
      ? "読み込み ▼"
      : "読み込み ▲";
});

appExportToggleButton.addEventListener("click", () => {
  appExportSection.classList.toggle("hidden");

  appExportToggleButton.textContent =
    appExportSection.classList.contains("hidden")
      ? "書き出し ▼"
      : "書き出し ▲";
});

backToStartupButton.addEventListener("click", () => {
  appMenu.classList.add("hidden");

  appShell.classList.add("hidden");
  startupScreen.classList.remove("hidden");

  selectedStartupWorkId = currentWorkId;

  renderStartupWorkList();
  renderStartupSelectedWork();
});

appImportBaseButton.addEventListener("click", () => {
  appMenu.classList.add("hidden");
  importBaseButton.click();
});

appImportWorkButton.addEventListener("click", () => {
  appMenu.classList.add("hidden");
  importWorkButton.click();
});

appExportBaseButton.addEventListener("click", () => {
  appMenu.classList.add("hidden");
  exportBaseButton.click();
});

appExportWorkButton.addEventListener("click", () => {
  appMenu.classList.add("hidden");
  exportWorkButton.click();
});

appExportCurrentNovelTextButton.addEventListener("click", () => {
  appMenu.classList.add("hidden");
  exportCurrentNovelTextButton.click();
});

appExportAllNovelsTextButton.addEventListener("click", () => {
  appMenu.classList.add("hidden");
  exportAllNovelsTextButton.click();
});

importFullBackupButton.addEventListener("click", () => {
  startupMenu.classList.add("hidden");

  const ok = confirm(
    "バックアップから復元すると、現在のデータが上書きされます。続行しますか？"
  );

  if (!ok) return;

  importFullBackupFile.value = "";
  importFullBackupFile.click();
});

importFullBackupFile.addEventListener("change", () => {
  const file = importFullBackupFile.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.addEventListener("load", () => {
    let backupData;

    try {
      backupData = JSON.parse(reader.result);
    } catch (error) {
      alert("バックアップファイルを読み込めませんでした。");
      importFullBackupFile.value = "";
      return;
    }

    restoreFullBackupData(backupData);
    importFullBackupFile.value = "";
  });

  reader.readAsText(file);
});

// 設定資料読み込み
importBaseButton.addEventListener("click", () => {
  importMenu.classList.add("hidden");

  showModal(
    "設定資料を読み込みます",
    `
    <p>
      Fanfic Studioは個人用設定資料を保存・復元するためのツールです。
    </p>

    <p>
      他の人が作成した設定資料には、
      権利者の許可なく公開・共有されたデータが含まれている可能性があります。
    </p>

    <p>
      信頼できるデータのみ読み込んでください。
    </p>
    `,
    () => {
      importBaseFile.click();
    }
  );
});

// 作品読み込み
importWorkButton.addEventListener("click", () => {
  importMenu.classList.add("hidden");
  importWorkFile.click();
});

// 設定資料書き出し
// 設定資料書き出し
exportBaseButton.addEventListener("click", () => {
  exportMenu.classList.add("hidden");

  showModal(
    "設定資料を書き出します",
    `
    <p>
      Fanfic Studioは個人用設定資料を保存・復元するためのツールです。
    </p>

    <p>
      公式作品本文や有料コンテンツ等を含むデータを、
      権利者の許可なく共有・公開することは推奨していません。
    </p>

    <p>
      個人利用の範囲や権利者の利用条件を確認した上で書き出してください。
    </p>
    `,
    () => {
      downloadJson("reference-data.json", {
        type: "base",
        folders,
        basePages
      });
    }
  );
});

// 作品書き出し
exportWorkButton.addEventListener("click", () => {
  exportMenu.classList.add("hidden");

  const work = getCurrentWork();
  if (!work) return;

  downloadJson("work-data.json", {
    type: "work",
    work
  });
});

// 現在開いている小説本文をtxt書き出し
exportCurrentNovelTextButton.addEventListener("click", () => {
  exportMenu.classList.add("hidden");

  const novel = getCurrentNovel();

  if (!novel) {
    alert("書き出す本文がありません。");
    return;
  }

  downloadText(
    `${novel.title}.txt`,
    novel.body
  );
});

//小説本文全文書き出し
exportAllNovelsTextButton.addEventListener("click", () => {
  exportMenu.classList.add("hidden");

  if (novels.length === 0) {
    alert("書き出す本文がありません。");
    return;
  }

  const work = getCurrentWork();
  const workTitle = work ? work.title : "novels";

  downloadText(
    `${workTitle}_本文まとめ.txt`,
    buildAllNovelsText()
  );
});

// アンドゥボタン
undoButton.addEventListener("click", () => {
  if (!novelEditor) return;

  undo({
    state: novelEditor.state,
    dispatch: novelEditor.dispatch
  });

  novelEditor.focus();
});

//リドゥボタン
redoButton.addEventListener("click", () => {
  if (!novelEditor) return;

  redo({
    state: novelEditor.state,
    dispatch: novelEditor.dispatch
  });

  novelEditor.focus();
});

//左パネル閉じ開きボタン
toggleLeftPaneButton.addEventListener("click", () => {
  appLayout.classList.toggle("left-collapsed");
  document.body.classList.toggle("left-collapsed");
  updatePaneGrid();

  if (appLayout.classList.contains("left-collapsed")) {
    toggleLeftPaneButton.textContent = "▶";
  } else {
    toggleLeftPaneButton.textContent = "◀";
  }
});

//右パネル閉じ開きボタン
toggleRightPaneButton.addEventListener("click", () => {
  appLayout.classList.toggle("right-collapsed");
  document.body.classList.toggle("right-collapsed");
  updatePaneGrid();

  if (appLayout.classList.contains("right-collapsed")) {
    toggleRightPaneButton.textContent = "◀";
  } else {
    toggleRightPaneButton.textContent = "▶";
  }
});

//辞書本文を編集したときにlineIDが足りなくならないようにする関数
function ensurePageLineIds(page) {
  const lines = page.body.split("\n");

  if (!page.lineIds) {
    page.lineIds = [];
  }

  while (page.lineIds.length < lines.length) {
    page.lineIds.push(createPageId());
  }

  if (page.lineIds.length > lines.length) {
    page.lineIds = page.lineIds.slice(0, lines.length);
  }
}

function setupProgressEvents() {
  const useGoalCheckbox =
    document.getElementById("use-goal-checkbox");

  const goalCharInput =
    document.getElementById("goal-char-input");

  if (!useGoalCheckbox || !goalCharInput) return;

  useGoalCheckbox.addEventListener("change", () => {
    const work = getCurrentWork();
    if (!work) return;

    if (!work.progress) {
      work.progress = {
        useGoal: false,
        goalChars: 0
      };
    }

    work.progress.useGoal = useGoalCheckbox.checked;

    saveData();
    updateGoalProgress();
  });

  goalCharInput.addEventListener("input", () => {
    const work = getCurrentWork();
    if (!work) return;

    if (!work.progress) {
      work.progress = {
        useGoal: false,
        goalChars: 0
      };
    }

    work.progress.goalChars = Number(goalCharInput.value) || 0;

    saveData();
    updateGoalProgress();
  });

  const chartRangeSelect =
  document.getElementById("writing-chart-range");

  if (chartRangeSelect) {
    chartRangeSelect.addEventListener("change", () => {
      renderWritingChart();
    });
  }
}

//開閉ボタン
toggleTimelineSideButton.addEventListener("click", () => {
  timelinePanel.classList.toggle("timeline-side-collapsed");

  if (timelinePanel.classList.contains("timeline-side-collapsed")) {

    timelineDetailLayout.classList.add("list-collapsed");

    toggleTimelineSideButton.textContent = "▶";

  } else {

    timelineDetailLayout.classList.remove("list-collapsed");

    toggleTimelineSideButton.textContent = "◀";
  }
});

const detailButton =
document.getElementById("timeline-detail-view-button");

const overviewButton =
document.getElementById("timeline-overview-view-button");

detailButton.addEventListener("click",()=>{

    timelineViewMode="detail";

    detailButton.classList.add("active");
    overviewButton.classList.remove("active");

    renderTimeline();

});

overviewButton.addEventListener("click",()=>{

    timelineViewMode="overview";

    overviewButton.classList.add("active");
    detailButton.classList.remove("active");

    renderTimeline();

});

saveReceiptImageButton.addEventListener("click", () => {
  downloadReceiptImage();
});

activityPrevMonthButton.addEventListener("click", () => {
  activityDisplayMonth = new Date(
    activityDisplayMonth.getFullYear(),
    activityDisplayMonth.getMonth() - 1,
    1
  );

  currentReceiptDateKey = null;

  activityReceipt.innerHTML =
    "草をクリックすると、その日の記録が表示されます。";

  renderActivityGrass();
});

activityNextMonthButton.addEventListener("click", () => {
  activityDisplayMonth = new Date(
    activityDisplayMonth.getFullYear(),
    activityDisplayMonth.getMonth() + 1,
    1
  );

  currentReceiptDateKey = null;

  activityReceipt.innerHTML =
    "草をクリックすると、その日の記録が表示されます。";

  renderActivityGrass();
});

// 以前の「作品を選ぶ」ボタン用の処理。
// 起動画面を左右レイアウトに変更して、このボタンは使わなくなったため停止中。
// openAppButton.addEventListener("click", () => {
//   startupScreen.classList.add("hidden");
//   appShell.classList.remove("hidden");
//
//   updatePaneGrid();
//   updateWritingStats();
// });

// 起動画面で選択している作品を、本体画面で開く。
// 作品を開くために必要な処理を、1か所にまとめておく。
function openSelectedWork() {
  if (!selectedStartupWorkId) return;

  // 起動画面で選んでいた作品を、実際の作業対象にする。
  currentWorkId = selectedStartupWorkId;

  // 作業対象の作品に合わせて、本文一覧も切り替える。
  novels = getCurrentWork().novels;

  saveData();

  startupScreen.classList.add("hidden");
  appShell.classList.remove("hidden");

  updatePaneGrid();
  renderPageList();

  if (novels.length > 0) {
    showNovel(novels[0].id);
  }

  updateWritingStats();
} // function openSelectedWork を閉じる


continueWorkButton.addEventListener("click", () => {
  openSelectedWork();
});

newWorkButton.addEventListener("click", () => {
  showInputModal(
    "新しい作品を作る",
    "作品名",
    "",
    (title) => {
      const nowText = new Date().toLocaleString();

      const newWork = {
        id: createPageId(),
        title,    // 新しく作った作品には、空の小説本文を1本入れておく。
    // 本体を開いたときに「何も選ばれていない空画面」にならないようにするため。
    novels: [
      {
      id: createPageId(),
      title: "新規小説本文",
      body: ""
      }
    ],
    events: [],
    flags: [],
    pages: [],
    annotations: [],
    // 作品を作成した日時を、最終更新日時として保存する。
    // まだ本文を書いていない作品でも、起動画面に作成時刻を表示できるようにする。
    updatedAt: nowText
  };

  works.push(newWork);

  selectedStartupWorkId = newWork.id;

  saveData();
  renderStartupWorkList();
  renderStartupSelectedWork();
});
});





// ==============================
// 9. codeMirror系
// ==============================
// 辞書CodeMirrorの中身を、現在の辞書ページデータに反映する
function syncDictionaryEditorToPage() {
  if (!dictionaryEditor) return;
  if (!currentDictionaryPage) return;

  currentDictionaryPage.body =
    dictionaryEditor.state.doc.toString();

  ensurePageLineIds(currentDictionaryPage);

  saveData();
  renderPageList();
}

//小説本文用
function initNovelEditor() {
  novelEditor = new EditorView({
    doc: "",
    parent: editorElement,
    extensions: [
      history(),

      keymap.of([
      ...historyKeymap,
    {
      key: "Ctrl-Shift-z",
      run: redo
    },
    {
      key: "Mod-Shift-z",
      run: redo
    }
  ]),

    EditorView.lineWrapping
  ],

    dispatch: (transaction) => {
      novelEditor.update([transaction]);

      if (transaction.docChanged) {
        const novel = getCurrentNovel();
        if (!novel) return;

        const beforeLength = novel.body.length;

        novel.body = novelEditor.state.doc.toString();

        const afterLength = novel.body.length;

        recordWritingChange(beforeLength, afterLength);

        bodyInput.value = novel.body;

        saveData();
        updateNovelCharCount();
      }
    }
  });
}

function initTimelineEditor(event) {
  const timelineEditorElement =
    document.getElementById("timeline-editor");

  if (!timelineEditorElement) return;

  if (timelineEditor) {
    timelineEditor.destroy();
    timelineEditor = null;
  }

  currentTimelineEvent = event;

  timelineEditor = new EditorView({
    doc: event.body || "",
    parent: timelineEditorElement,
    extensions: [
      history(),

      keymap.of([
        ...historyKeymap,
        {
          key: "Ctrl-Shift-z",
          run: redo
        },
        {
          key: "Mod-Shift-z",
          run: redo
        }
      ]),

      EditorView.lineWrapping
    ],

    dispatch: (transaction) => {
      timelineEditor.update([transaction]);

      if (transaction.docChanged) {
        currentTimelineEvent.body =
          timelineEditor.state.doc.toString();

        saveData();
      }
    }
  });
}

//辞書ページ用
function initDictionaryEditor(page) {
  const dictionaryEditorElement =
    document.getElementById("dictionary-editor");

  if (!dictionaryEditorElement) return;

  if (dictionaryEditor) {
    dictionaryEditor.destroy();
    dictionaryEditor = null;
  }

  currentDictionaryPage = page;

  dictionaryEditor = new EditorView({
  doc: page.body,
  parent: dictionaryEditorElement,
  extensions: [
  history(),

  keymap.of([
    ...historyKeymap,
    {
      key: "Ctrl-Shift-z",
      run: redo
    },
    {
      key: "Mod-Shift-z",
      run: redo
    }
  ]),

    EditorView.lineWrapping
  ,

  EditorView.decorations.compute(
    ["doc"],
    (state) => {
      return buildWikiLinkDecorations(state);
    }
  ),

  EditorView.decorations.compute(
    ["doc"],
    (state) => {
      return buildDictionaryDecorations({
        state
      });
    }
  ),
  EditorView.domEventHandlers({
  click: (event, view) => {
    const target = event.target;

    if (!(target instanceof HTMLElement)) {
      return false;
    }

    const link = target.closest(".cm-wiki-link");

    if (!link) {
      return false;
    }

    const pageTitle = link.dataset.title;
    if (!pageTitle) return false;

    const targetPage =
      pages.find((page) => page.title === pageTitle);

    if (!targetPage) {
      alert(`「${pageTitle}」のページはまだありません`);
      return true;
    }

    showPage(targetPage.id);
    return true;
  }
})
],

  dispatch: (transaction) => {
    dictionaryEditor.update([transaction]);

    if (transaction.docChanged) {
      syncDictionaryEditorToPage();
    }
  }
  });
}

// CodeMirrorの行間に表示する「注釈っぽい箱」
class AnnotationWidget extends WidgetType {
  constructor(annotation) {
    super();
    this.annotation = annotation;
  }

  toDOM() {
    const wrapper = document.createElement("div");
    wrapper.className = "cm-annotation-widget";

    const body = document.createElement("div");
    body.className = "cm-annotation-body";
    body.textContent = this.annotation.body;

    const actions = document.createElement("div");
    actions.className = "cm-annotation-actions";

    const editButton = document.createElement("button");
    editButton.className = "cm-annotation-button";
    editButton.textContent = "✎";
    editButton.title = "注釈を編集";

    editButton.addEventListener("click", () => {
      editAnnotation(this.annotation.id);
    });

    const deleteButton = document.createElement("button");
    deleteButton.className = "cm-annotation-button";
    deleteButton.textContent = "×";
    deleteButton.title = "注釈を削除";

    deleteButton.addEventListener("click", () => {
      deleteAnnotation(this.annotation.id);
    });

    actions.appendChild(editButton);
    actions.appendChild(deleteButton);

    wrapper.appendChild(body);
    wrapper.appendChild(actions);

    return wrapper;
  }
  
}

class SourceWidget extends WidgetType {
  constructor(sourceItem) {
    super();
    this.sourceItem = sourceItem;
  }

  toDOM() {
    const wrapper = document.createElement("div");
    wrapper.className = "cm-source-widget";

    const body = document.createElement("div");
    body.className = "cm-source-body";
    body.textContent = `出典：${this.sourceItem.source}`;

    const actions = document.createElement("div");
    actions.className = "cm-source-actions";

    const editButton = document.createElement("button");
    editButton.className = "cm-source-button";
    editButton.textContent = "✎";
    editButton.title = "出典を編集";

    editButton.addEventListener("click", () => {
      editSource(this.sourceItem.id);
    });

    const deleteButton = document.createElement("button");
    deleteButton.className = "cm-source-button";
    deleteButton.textContent = "×";
    deleteButton.title = "出典を削除";

    deleteButton.addEventListener("click", () => {
      deleteSource(this.sourceItem.id);
    });

    actions.appendChild(editButton);
    actions.appendChild(deleteButton);

    wrapper.appendChild(body);
    wrapper.appendChild(actions);

    return wrapper;
  }
}

class AddLineActionWidget extends WidgetType {
  constructor(page, lineIndex, lineId) {
    super();
    this.page = page;
    this.lineIndex = lineIndex;
    this.lineId = lineId;
  }

toDOM() {
  const wrapper = document.createElement("div");
  wrapper.className = "cm-line-action-widget";
  wrapper.contentEditable = "false";

  const addButton = document.createElement("button");
  addButton.className = "cm-line-action-button";
  addButton.type = "button";
  addButton.tabIndex = -1;
  addButton.textContent = "＋";
  addButton.title = "この行に追加";

  addButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();

    activeLineMenu = {
      lineIndex: this.lineIndex,
      lineId: this.lineId
    };

    updateSideInfo(this.page);
  });

  wrapper.appendChild(addButton);

  return wrapper;
}
}

class LineActionMenuWidget extends WidgetType {
  constructor(page, lineIndex, lineId) {
    super();
    this.page = page;
    this.lineIndex = lineIndex;
    this.lineId = lineId;
  }

  toDOM() {
    const wrapper = document.createElement("div");
    wrapper.className = "cm-line-menu-widget";

    const annotationButton = document.createElement("button");
    annotationButton.className = "cm-line-menu-button";
    annotationButton.textContent = "作品注釈";

    annotationButton.addEventListener("click", () => {
      showAnnotationForm(this.page, {
        lineIndex: this.lineIndex,
        lineId: this.lineId
      });
    });

    const sourceButton = document.createElement("button");
    sourceButton.className = "cm-line-menu-button";
    sourceButton.textContent = "設定資料出典";

    sourceButton.addEventListener("click", () => {
      showSourceForm(this.page, {
        lineIndex: this.lineIndex,
        lineId: this.lineId
      });
    });

const cancelButton = document.createElement("button");
cancelButton.className = "cm-line-menu-button";
cancelButton.textContent = "キャンセル";

cancelButton.addEventListener("click", () => {
  activeLineMenu = null;
  updateSideInfo(this.page);
});

wrapper.appendChild(annotationButton);
wrapper.appendChild(sourceButton);
wrapper.appendChild(cancelButton);

return wrapper;
  }
}

//注釈編集ボタン
function editAnnotation(annotationId) {
  const work = getCurrentWork();
  const page = currentDictionaryPage;

  if (!work) return;
  if (!page) return;
  if (!work.annotations) return;

  const annotation =
    work.annotations.find((a) => a.id === annotationId);

  if (!annotation) return;

  showEditAnnotationForm(page, annotation);
}

//注釈削除ボタン
function deleteAnnotation(annotationId) {
  const work = getCurrentWork();
  const page = currentDictionaryPage;

  if (!work) return;
  if (!page) return;
  if (!work.annotations) return;

  const ok = confirm("この注釈を削除しますか？");
  if (!ok) return;

  work.annotations =
    work.annotations.filter((a) => a.id !== annotationId);

  saveData();
  updateSideInfo(page);
}

//出典編集
function editSource(sourceId) {
  const page = currentDictionaryPage;

  if (!page) return;
  if (!page.sources) return;

  const sourceItem =
    page.sources.find((s) => s.id === sourceId);

  if (!sourceItem) return;

  showEditSourceForm(page, sourceItem);
}

//出典削除
function deleteSource(sourceId) {
  const page = currentDictionaryPage;

  if (!page) return;
  if (!page.sources) return;

  const ok = confirm("この出典を削除しますか？");
  if (!ok) return;

  page.sources =
    page.sources.filter((s) => s.id !== sourceId);

  saveData();
  updateSideInfo(page);
}

//wikiリンクに.cm-wiiki-linkを作る
function buildWikiLinkDecorations(state) {
  const widgets = [];
  const text = state.doc.toString();

  const wikiPattern = /\[\[([^\]]+)\]\]/g;
  let match;

  while ((match = wikiPattern.exec(text)) !== null) {
    const fullText = match[0];
    const pageTitle = match[1];

    const from = match.index;
    const to = match.index + fullText.length;

    widgets.push(
      Decoration.mark({
        class: "cm-wiki-link",
        attributes: {
          "data-title": pageTitle
        }
      }).range(from, to)
    );
  }

  return Decoration.set(widgets);
}

// 辞書CodeMirrorに表示するDecorationを作る
function buildDictionaryDecorations(view) {
  const widgets = [];

  const page = currentDictionaryPage;
  const work = getCurrentWork();

  if (!page) return Decoration.none;
  if (!work) return Decoration.none;

  if (!work.annotations) {
    work.annotations = [];
  }

  if (!page.sources) {
    page.sources = [];
  }

  ensurePageLineIds(page);
  console.log("page.sources", page.sources);

  const lines =
  view.state.doc.toString().split("\n");

  lines.forEach((line, index) => {
  const lineId = page.lineIds[index];
  const cmLine = view.state.doc.line(index + 1);

if (
  activeLineMenu &&
  activeLineMenu.lineId === lineId
) {
  widgets.push(
    Decoration.widget({
      widget: new LineActionMenuWidget(page, index, lineId),
      side: 1,
      block: true
    }).range(cmLine.to)
  );
} else {
  widgets.push(
    Decoration.widget({
      widget: new AddLineActionWidget(page, index, lineId),
      side: 1,
      block: true
    }).range(cmLine.to)
  );
}

  const sources = page.sources || [];

  const lineSources = sources.filter((sourceItem) => {
    return (
      sourceItem.lineId === lineId ||
      sourceItem.lineIndex === index
    );
  });

  const annotations =
  dictionaryLayerMode === "overlay"
    ? work.annotations.filter((annotation) => {
        return (
          annotation.pageId === page.id &&
          (
            annotation.lineId === lineId ||
            annotation.lineIndex === index
          )
        );
      })
    : [];

lineSources.forEach((sourceItem) => {
  widgets.push(
    Decoration.widget({
      widget: new SourceWidget(sourceItem),
      side: 1,
      block: true
    }).range(cmLine.to)
  );
});

annotations.forEach((annotation) => {
  widgets.push(
    Decoration.widget({
      widget: new AnnotationWidget(annotation),
      side: 1,
      block: true
    }).range(cmLine.to)
  );
});
});

  return Decoration.set(widgets);
}

// 辞書CodeMirrorで、今カーソルがある行番号を取得する
function getCurrentDictionaryLineInfo() {
  if (!dictionaryEditor) return null;
  if (!currentDictionaryPage) return null;

  //今カーソルがある位置
  const cursorPosition =
    dictionaryEditor.state.selection.main.head;

  //その位置が何行目かを調べる
  const cmLine =
    dictionaryEditor.state.doc.lineAt(cursorPosition);

  //codemirrorは1行目を1と数えるが、配列は0から始まる
  //そのズレを調整するためcodemirror側の行数-1
  const lineIndex =
    cmLine.number - 1;

  ensurePageLineIds(currentDictionaryPage);

  const lineId =
    currentDictionaryPage.lineIds[lineIndex];

  return {
    lineIndex,
    lineId
  };
}



// ==============================
// 99. 初期表示
// ==============================
// localStorage.removeItem("fanficStudioData");

initNovelEditor();
updatePaneGrid();

renderPageList();

if (novels.length > 0) {
  showNovel(novels[0].id);
}

updatePaneMenu();

userData.stats.launchCount += 1;
recordTodayLaunch();
saveUserData();
setupProgressEvents();

renderStartupScreen();
// 起動画面に、保存されている作品一覧を表示する。
renderStartupWorkList();
renderStartupSelectedWork();

console.log("Fanfic Studio 起動！");
