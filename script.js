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
import { undo, redo } from "@codemirror/commands";
import {  Decoration,  WidgetType } from "@codemirror/view";

// 小説本文用CodeMirror本体を入れる箱を先に作る
let novelEditor = null;

// HTMLの読み込みが終わったら、CodeMirrorを作る
/*window.addEventListener("DOMContentLoaded", () => {
  const editorElement =
    document.getElementById("editor");

  novelEditor = new EditorView({
    doc: "",
    parent: editorElement
  });

  console.log("CodeMirror本文エディタ作成");
});*/



// ==============================
// 1. サンプルデータ
// ==============================
const defaultData = {
  folders: [
    { id: "world", title: "世界観", order: 1 },
    { id: "characters", title: "キャラクター", order: 2 },
    { id: "other", title: "その他", order: 99 }
  ],

  basePages: [
    {
      id: "magic",
      title: "魔法",
      folderId: "world",
      order: 1,
      tags: ["世界観", "魔法"],
      body: "この世界に存在する力。\n\n[[飛行]]と関係がある。"
    },
    {
      id: "luke",
      title: "ルーク",
      folderId: "characters",
      order: 1,
      tags: ["キャラクター", "剣士"],
      body: "一人称：俺\n二人称：君\n身長：178cm\n\n剣士。[[魔法]]に少し苦手意識がある。"
    },
    {
      id: "catherine",
      title: "キャサリン",
      folderId: "characters",
      order: 2,
      tags: ["キャラクター", "研究者"],
      body: "一人称：私\n二人称：あなた\n身長：165cm\n\n魔法研究者。"
    }
  ],

works: [
  {
    id: "work1",
    title: "二次創作作品A",
    novels: [
      {
        id: "chapter1",
        title: "第一話",
        body: `[[ルーク]]は[[魔法]]によって飛行能力を得た。
そのため幼い頃の高所恐怖症を克服している。`
      }
    ],
    events: [],
    flags:[],
    pages: []
  }
]};



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

//現在の作品、辞書、本文かを判断する
let currentWorkId = works.length > 0 ? works[0].id : null;
let currentPageId = null;
let currentNovelId = null;

// 現在扱う辞書ページ一覧。
// 今は原作辞書 basePages をそのまま使っている。
let pages = basePages;
// 現在の作品に属する小説本文一覧。
// currentWorkId が決まったあとで getCurrentWork().novels を入れる。
let novels = [];

if (currentWorkId) {
  novels = getCurrentWork().novels;
  }

// 現在開いている中央タブ
// novel / timeline / relation / flags のどれか
let currentMainTab = "novel";

// 辞書ページの表示モード
// "base" = 原作のみ
// "overlay" = 原作 + 現在の作品注釈
let dictionaryLayerMode = "base";

//ページの幅
let leftPaneWidth = data.leftPaneWidth;
let rightPaneWidth = data.rightPaneWidth;

//辞書用codemirror本体
let dictionaryEditor = null;
//今編集している辞書
let currentDictionaryPage = null;



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




// ==============================
// 4. 汎用関数
// ==============================
//何か変更したときここで保存する
function saveData() {
  localStorage.setItem(
    "fanficStudioData",
    JSON.stringify({
      folders,
      basePages,
      works,
      leftPaneWidth,
      rightPaneWidth
    })
  );

  //保存中のアイコンを変える（0.3秒保存済みアイコンは遅らせる）
  if (saveStatusTimer) {
    clearTimeout(saveStatusTimer);
  }

  saveStatusTimer = setTimeout(() => {
    updateSaveStatus("🟢 保存済み", "saved");
  }, 300);
}

//localStorageにあるデータを読み込む
function loadData() {
  const savedData = localStorage.getItem("fanficStudioData");

  if (!savedData) {
    return defaultData;
  }

  const parsedData = JSON.parse(savedData);

  if (!parsedData.basePages || !parsedData.works) {
    return defaultData;
  }

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

    // 原作本文の各行に付ける出典を保存する配列
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

    <button id="add-source-current-line-button" class="side-button">
      選択行に原作出典を追加
    </button>

    <button id="add-annotation-current-line-button" class="side-button">
      選択行に作品注釈を追加
    </button>

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

//updateSideInfo(page)で作ったHTMLにイベントを付ける
function setupSideEditor(page) {
  const sideTitle = document.getElementById("side-title");
  const sideFolder = document.getElementById("side-folder");
  const sideTags = document.getElementById("side-tags");
  //const sideBody = document.getElementById("side-body");
  const moveUpButton = document.getElementById("move-page-up");
  const moveDownButton = document.getElementById("move-page-down");
  const addAnnotationCurrentLineButton =
    document.getElementById("add-annotation-current-line-button");
  const addSourceCurrentLineButton =
  document.getElementById("add-source-current-line-button");

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

// 作品注釈追加用
if (addAnnotationCurrentLineButton) {
  addAnnotationCurrentLineButton.addEventListener("click", () => {
    const lineInfo = getCurrentDictionaryLineInfo();
    if (!lineInfo) return;

    const body = prompt("この行に追加する作品注釈を入力してください");
    if (!body) return;

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

    saveData();
    updateSideInfo(page);
  });
}

// 原作出典追加用
// 原作出典追加用
if (addSourceCurrentLineButton) {
  addSourceCurrentLineButton.addEventListener("click", () => {
    const lineInfo = getCurrentDictionaryLineInfo();
    if (!lineInfo) return;

    const source = prompt("この行の原作出典を入力してください");
    if (!source) return;

    if (!page.sources) {
      page.sources = [];
    }

    page.sources.push({
      id: createPageId(),
      lineIndex: lineInfo.lineIndex,
      lineId: lineInfo.lineId,
      source
    });

    saveData();
    updateSideInfo(page);
  });
}

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

  const sortedFolders = [...folders].sort((a, b) => a.order - b.order);

  sortedFolders.forEach((folder) => {
    const folderPages = pages
    .filter((page) => page.folderId === folder.id)
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

    //if (folderPages.length === 0) return;
    if (keyword && folderPages.length === 0) return;

    const group = document.createElement("section");
    group.className = "page-group";

const folderHeader = document.createElement("div");
folderHeader.className = "folder-header";

const collapseButton = document.createElement("button");
collapseButton.addEventListener("click", () => {
  folder.collapsed = !folder.collapsed;

  saveData();
  renderPageList();
});
collapseButton.className = "folder-action-button";
collapseButton.textContent =
  folder.collapsed ? "▶" : "▼";

const groupTitle = document.createElement("h3");
groupTitle.className = "page-group-title";
groupTitle.textContent = folder.title;

const renameButton = document.createElement("button");
renameButton.className = "folder-action-button";
renameButton.textContent = "✎";
renameButton.title = "フォルダ名を変更";

renameButton.addEventListener("click", () => {
  const newTitle = prompt("新しいフォルダ名を入力してください", folder.title);
  if (!newTitle) return;

  folder.title = newTitle;
  saveData();
  renderPageList();
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

      group.appendChild(button);
    });

    pageList.appendChild(group);
  });
}

//左サイドバーの「小説本文」一覧だけを表示する
function renderNovelList() {
  const group = document.createElement("section");
  group.className = "page-group";

  const groupTitle = document.createElement("h3");
groupTitle.className = "novel-group-title";
  groupTitle.textContent = "▼ 小説本文";

  group.appendChild(groupTitle);

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
  const work = getCurrentWork();
  if (!work) return;

  if (!work.events) {
    work.events = [];
  }

  timelineList.innerHTML = "";

  const sortedEvents = [...work.events].sort((a, b) => a.order - b.order);

sortedEvents.forEach((event) => {
  // 古いイベントデータに relatedPageIds がない場合、空配列を足す
  if (!event.relatedPageIds) {
    event.relatedPageIds = [];
  }

  // 古いイベントデータに flags がない場合、空配列を足す
  if (!event.flags) {
    event.flags = [];
  }

  const eventCard = document.createElement("div");
  eventCard.className = "timeline-card";

    const pageCheckboxes = pages.map((page) => {
      const checked =
        event.relatedPageIds.includes(page.id)
        ? "checked"
        : "";

      return `
      <label class="event-page-label">
        <input
          type="checkbox"
          class="event-page-checkbox"
          value="${page.id}"
        ${checked}
      >
      ${page.title}
    </label>
  `;
}).join("");

const flagCheckboxes = work.flags.map((flag) => {
  const checked = event.flags.includes(flag.id) ? "checked" : "";

  return `
    <label class="event-flag-label">
      <input type="checkbox" class="event-flag-checkbox" value="${flag.id}" ${checked}>
      ${flag.title}
    </label>
  `;
}).join("");

eventCard.innerHTML = `
  <input class="timeline-title" value="${event.title}">
  <textarea class="timeline-body">${event.body}</textarea>
  <div class="event-pages">
    <div class="event-pages-title">
      関連辞書ページ
    </div>

  ${pageCheckboxes}
</div>
  <div class="event-flags">
    <div class="event-flags-title">関連フラグ</div>
    ${flagCheckboxes || "<p class='empty-message'>フラグがまだありません。</p>"}
  </div>

  <div class="side-button-row">
    <button class="side-button move-event-up">↑</button>
    <button class="side-button move-event-down">↓</button>
    <button class="side-button delete-event">削除</button>
  </div>
`;
    const titleInput = eventCard.querySelector(".timeline-title");
    const bodyInput = eventCard.querySelector(".timeline-body");
    const upButton = eventCard.querySelector(".move-event-up");
    const downButton = eventCard.querySelector(".move-event-down");
    const deleteButton = eventCard.querySelector(".delete-event");
    // イベントに紐付ける辞書ページのチェックボックスを取得
    const pageCheckboxInputs = eventCard.querySelectorAll(".event-page-checkbox");
    //イベントに紐付けるフラグのチェックボックスを取得
    const flagCheckboxInputs = eventCard.querySelectorAll(".event-flag-checkbox");


    
// チェックが変わったら、event.relatedPageIds に辞書ページIDを追加・削除する
pageCheckboxInputs.forEach((checkbox) => {
  checkbox.addEventListener("change", () => {
    const pageId = checkbox.value;

    if (!event.relatedPageIds) {
      event.relatedPageIds = [];
    }

    if (checkbox.checked) {
      if (!event.relatedPageIds.includes(pageId)) {
        event.relatedPageIds.push(pageId);
      }
    } else {
      event.relatedPageIds = event.relatedPageIds.filter(
        (id) => id !== pageId
      );
    }

    saveData();
  });
});

// チェックが変わったら、event.flags にフラグIDを追加・削除する
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
      event.flags = event.flags.filter((id) => id !== flagId);
    }

    saveData();
  });
});

    titleInput.addEventListener("input", () => {
      event.title = titleInput.value;
      saveData();
    });

    bodyInput.addEventListener("input", () => {
      event.body = bodyInput.value;
      saveData();
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

      work.events = work.events.filter((e) => e.id !== event.id);
      saveData();
      renderTimeline();
    });

    timelineList.appendChild(eventCard);
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

  work.flags.forEach((flag) => {
    const flagCard = document.createElement("div");
    flagCard.className = "flag-card";

    const relatedEvents = work.events.filter(
      (event) => event.flags.includes(flag.id)
    );
    const relatedEventsHtml =
      relatedEvents.length > 0
      ? relatedEvents.map(event =>
        `<li>${event.title}</li>`
      ).join("")
    : "<li>なし</li>";

    flagCard.innerHTML = `
      <input class="flag-title" value="${flag.title}">

      <select class="flag-status">
        <option value="unresolved" ${flag.status === "unresolved" ? "selected" : ""}>未回収</option>
        <option value="resolved" ${flag.status === "resolved" ? "selected" : ""}>回収済み</option>
        <option value="pending" ${flag.status === "pending" ? "selected" : ""}>保留</option>
      </select>

      <textarea class="flag-memo">${flag.memo}</textarea>

      <button class="side-button delete-flag">削除</button>
      <div class="flag-related-events">
      <strong>関連イベント</strong>
      <ul>
      ${relatedEventsHtml}
      </ul>
      </div>
    `;

    const titleInput = flagCard.querySelector(".flag-title");
    const statusSelect = flagCard.querySelector(".flag-status");
    const memoInput = flagCard.querySelector(".flag-memo");
    const deleteButton = flagCard.querySelector(".delete-flag");


    titleInput.addEventListener("input", () => {
      flag.title = titleInput.value;
      saveData();
    });

    statusSelect.addEventListener("change", () => {
      flag.status = statusSelect.value;
      saveData();
    });

    memoInput.addEventListener("input", () => {
      flag.memo = memoInput.value;
      saveData();
    });

    deleteButton.addEventListener("click", () => {
      const ok = confirm(`「${flag.title}」を削除しますか？`);
      if (!ok) return;

      work.flags = work.flags.filter((f) => f.id !== flag.id);
      work.events.forEach((event) => {
      event.flags = event.flags.filter((id) => id !== flag.id);
      });
      
      saveData();
      renderFlags();
    });

    flagList.appendChild(flagCard);
  });
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
    return;
  }

  novelCharCount.textContent = `${novel.body.length}文字`;
}


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

//幅ドラッグ関係の変数定義
let isDraggingLeft = false;
let isDraggingRight = false;

//gridを更新する関数
//今覚えている左右幅を前提に画面の幅を作る
function updatePaneGrid() {
  appLayout.style.gridTemplateColumns =
    `${leftPaneWidth}px 6px 1fr 6px ${rightPaneWidth}px`;
}

//左サイドバーのサイズ変更箇所のドラッグを検知する
leftResizer.addEventListener("mousedown", () => {
  isDraggingLeft = true;
  console.log("左ドラッグ開始！");
});

//右サイドバーのサイズ変更箇所のドラッグを検知する
rightResizer.addEventListener("mousedown", () => {
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
  const folderTitle = prompt("フォルダ名を入力してください");

  if (!folderTitle) return;

  const newFolder = {
    id: createPageId(),
    title: folderTitle,
    order: folders.length + 1,
    collapsed: false
  };

  folders.push(newFolder);
  saveData();
  renderPageList();
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
    layerToggleButton.textContent = "原作＋作品注釈";
  } else {
    dictionaryLayerMode = "base";
    layerToggleButton.textContent = "原作のみ";
  }

  const page = getCurrentPage();
  if (page) {
    updateSideInfo(page);
  }
});

// 原作データのJSONファイルを読み込む
importBaseFile.addEventListener("change", () => {
  const file = importBaseFile.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.addEventListener("load", () => {
    const importedData = JSON.parse(reader.result);

    if (importedData.type !== "base") {
      alert("原作データではありません。");
      return;
    }

    folders = importedData.folders || folders;
    basePages = importedData.basePages || [];

    pages = basePages;

    saveData();
    renderPageList();

    sideInfo.innerHTML = "辞書ページを選択してください。";

    alert("原作データを読み込みました。");
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

// 原作読み込み
importBaseButton.addEventListener("click", () => {
  importMenu.classList.add("hidden");
  importBaseFile.click();
});

// 作品読み込み
importWorkButton.addEventListener("click", () => {
  importMenu.classList.add("hidden");
  importWorkFile.click();
});

// 原作書き出し
exportBaseButton.addEventListener("click", () => {
  exportMenu.classList.add("hidden");

  downloadJson("base-data.json", {
    type: "base",
    folders,
    basePages
  });
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

// アンドゥボタン
undoButton.addEventListener("click", () => {
  if (!novelEditor) return;
  undo(novelEditor);
});

//リドゥボタン
redoButton.addEventListener("click", () => {
  if (!novelEditor) return;
  redo(novelEditor);
});

//左パネル閉じ開きボタン
toggleLeftPaneButton.addEventListener("click", () => {
  appLayout.classList.toggle("left-collapsed");
  document.body.classList.toggle("left-collapsed");

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
      EditorView.lineWrapping
    ],

    dispatch: (transaction) => {
      novelEditor.update([transaction]);

      if (transaction.docChanged) {
        updateSaveStatus("🟡 保存中...", "saving");
        const novel = getCurrentNovel();
        if (!novel) return;

        novel.body = novelEditor.state.doc.toString();
        bodyInput.value = novel.body;

        saveData();
        updateNovelCharCount();
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
    EditorView.lineWrapping,

    EditorView.decorations.compute(
      ["doc"],
      (state) => {
        return buildDictionaryDecorations({
          state
        });
      }
    )
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

  const newBody = prompt(
    "注釈を編集してください",
    annotation.body
  );

  if (!newBody) return;

  annotation.body = newBody;

  saveData();
  updateSideInfo(page);
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

  const newSource = prompt(
    "出典を編集してください",
    sourceItem.source
  );

  if (!newSource) return;

  sourceItem.source = newSource;

  saveData();
  updateSideInfo(page);
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

  const lines = page.body.split("\n");

  lines.forEach((line, index) => {
  const lineId = page.lineIds[index];

  const sources = page.sources || [];

  const lineSources = sources.filter((sourceItem) => {
    return (
      sourceItem.lineId === lineId ||
      sourceItem.lineIndex === index
    );
  });

  const annotations = work.annotations.filter((annotation) => {
    return (
      annotation.pageId === page.id &&
      (
        annotation.lineId === lineId ||
        annotation.lineIndex === index
      )
    );
  });

  if (lineSources.length === 0 && annotations.length === 0) return;

  const cmLine = view.state.doc.line(index + 1);

  lineSources.forEach((sourceItem) => {
    widgets.push(
      Decoration.widget({
        widget: new SourceWidget(sourceItem),
        side: 1
      }).range(cmLine.to)
    );
  });

  annotations.forEach((annotation) => {
    widgets.push(
      Decoration.widget({
        widget: new AnnotationWidget(annotation),
        side: 1
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
initNovelEditor();
updatePaneGrid();

renderPageList();

if (novels.length > 0) {
  showNovel(novels[0].id);
}

updatePaneMenu();

console.log("Fanfic Studio 起動！");
