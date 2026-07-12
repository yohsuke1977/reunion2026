// Google Apps Script — フォーム受信→スプレッドシート書き込み ＆ コメント一覧の配信
// ブラウザからのfetchはGASの302リダイレクトでPOST→GETに変わるため doGet で受け取る

var SHEET_ID = 'YOUR_SPREADSHEET_ID'; // ← 「同窓会2026出欠管理」スプレッドシートIDに変更
var SHEET_NAME = '出欠登録';           // フォーム回答の受信シート

// 出欠台帳（マスター名簿）関連
var LEDGER_NAME = 'シート1';           // 台帳シート名
var ROSTER_ID = 'YOUR_ROSTER_ID';     // ← コピー元の学年名簿スプレッドシートIDに変更
var LEDGER_HEADERS = ['No.', 'フリガナ', '氏名', '旧姓', '性別', '組', '出欠', '二次会', '回答日時', '経路', '備考'];

function doGet(e) {
  var p = (e && e.parameter) || {};

  // action=comments → コメント一覧をJSONで返す（サイトの「みんなの近況」用）
  if (p.action === 'comments') {
    return listComments();
  }

  return saveEntry(p);
}

// --- 出欠フォームの保存 -------------------------------------------------
function saveEntry(p) {
  try {
    // 名前も出欠もコメントも無い「空リクエスト」は保存しない（空行防止）
    var hasContent = (p.name || p.party1 || p.party2 || p.commentName || p.now || p.memory);
    if (!hasContent) return json({ status: 'ignored' });

    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow(['タイムスタンプ', 'お名前', 'クラス', '一次会', '二次会', 'コメント名', '近況', '思い出']);
    }

    sheet.appendRow([
      new Date(),
      p.name        || '',
      p.classOf     || '',
      p.party1      || '',
      p.party2      || '',
      p.commentName || '',
      p.now         || '',
      p.memory      || ''
    ]);

    // フォーム回答を出欠台帳（シート1）にも反映（失敗しても送信は成功扱い）
    try { syncLedger(); } catch (e) {}

    return json({ status: 'ok' });
  } catch (err) {
    return json({ status: 'error', message: err.toString() });
  }
}

// --- コメント一覧の配信 -------------------------------------------------
// 近況または思い出が書かれている行だけを、表示名・本文に絞って返す。
// お名前・クラス・出欠などの個人情報は返さない（プライバシー保護）。
function listComments() {
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) return json({ status: 'ok', comments: [] });

    var values = sheet.getDataRange().getValues();
    var out = [];
    for (var i = 1; i < values.length; i++) {   // 0行目はヘッダー
      var row = values[i];
      var commentName = String(row[5] || '').trim();
      var now         = String(row[6] || '').trim();
      var memory      = String(row[7] || '').trim();
      if (!now && !memory) continue;             // 近況も思い出も無ければ表示しない

      out.push({
        name:   commentName || '匿名',
        now:    now,
        memory: memory
      });
    }
    out.reverse();  // 新しい投稿を先頭に

    return json({ status: 'ok', comments: out });
  } catch (err) {
    return json({ status: 'error', message: err.toString() });
  }
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ======================================================================
// 出欠台帳（シート1）
// ======================================================================

// スプレッドシートを開いたときにメニューを追加（コンテナバインド時のみ有効）
function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('同窓会台帳')
      .addItem('① 名簿を取り込む / 更新', 'importRoster')
      .addItem('② フォーム回答を反映', 'syncLedger')
      .addToUi();
  } catch (e) {}
}

// --- ① 元名簿 → シート1台帳を（再）構築 --------------------------------
// コピーするのは フリガナ・氏名・旧姓・性別・組 の5項目のみ。
// 元名簿の「出欠」（10年前の前回分）は取り込まない。
// 既に台帳に入力済みの出欠（G〜K列）は氏名で照合して保持する。
function importRoster() {
  var src = SpreadsheetApp.openById(ROSTER_ID).getSheets()[0]; // 先頭シート
  var rows = src.getDataRange().getValues();

  // ヘッダー行（「氏名」を含む行）を探す
  var h = -1;
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].indexOf('氏名') !== -1) { h = i; break; }
  }
  if (h === -1) throw new Error('元名簿のヘッダー行（氏名）が見つかりません');

  var head = rows[h];
  var cFuri = idxOf_(head, ['ﾌﾘｶﾞﾅ', 'フリガナ']);
  var cName = idxOf_(head, ['氏名']);
  var cOld  = idxOf_(head, ['旧姓等', '旧姓']);
  var cSex  = idxOf_(head, ['性別']);
  var cCls  = idxOf_(head, ['組']);
  if (cName === -1) throw new Error('元名簿に「氏名」列がありません');

  var roster = [];
  for (var r = h + 1; r < rows.length; r++) {
    var name = String(rows[r][cName] || '').trim();
    if (!name) continue; // 氏名が無い行はスキップ
    roster.push([
      cFuri >= 0 ? rows[r][cFuri] : '',
      name,
      cOld  >= 0 ? rows[r][cOld]  : '',
      cSex  >= 0 ? rows[r][cSex]  : '',
      cCls  >= 0 ? rows[r][cCls]  : ''
    ]);
  }

  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(LEDGER_NAME) || ss.insertSheet(LEDGER_NAME);

  // 既存の出欠入力（G〜K）を氏名キーで退避
  var prev = readLedgerInputs_(sheet);

  sheet.clear();
  sheet.getRange(1, 1, 1, LEDGER_HEADERS.length).setValues([LEDGER_HEADERS]);

  var out = [];
  for (var k = 0; k < roster.length; k++) {
    var keep = prev[normName_(roster[k][1])] || ['', '', '', '', ''];
    out.push([k + 1].concat(roster[k], keep));
  }
  if (out.length) {
    sheet.getRange(2, 1, out.length, LEDGER_HEADERS.length).setValues(out);
  }

  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, LEDGER_HEADERS.length).setFontWeight('bold');

  syncLedger(); // 取り込み直後にフォーム回答を反映
  return out.length;
}

// --- ② フォーム回答（出欠登録）→ 台帳へ突き合わせ ----------------------
// 氏名（スペース無視）で照合し、G〜K列を埋める。
// 照合しなかった行の既存入力（LINE・口コミ分の手入力など）は保持する。
function syncLedger() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var ledger = ss.getSheetByName(LEDGER_NAME);
  var form = ss.getSheetByName(SHEET_NAME);
  if (!ledger || !form) return 0;

  // 出欠登録: タイムスタンプ, お名前, クラス, 一次会, 二次会, コメント名, 近況, 思い出
  // 「氏名（旧姓◯◯）」のような表記に備え、複数のキーで索引する。
  var fvals = form.getDataRange().getValues();
  var latest = {};             // 照合キー → 最新回答
  var respondents = {};        // 回答者（重複排除）→ {raw, keys}
  for (var i = 1; i < fvals.length; i++) {
    var keys = formKeys_(fvals[i][1]);
    if (!keys.length) continue;
    var rec = { // 同名の再送信は後の行（新しい回答）で上書き
      ts: fvals[i][0], party1: fvals[i][3], party2: fvals[i][4],
      cname: fvals[i][5], now: fvals[i][6], memory: fvals[i][7]
    };
    for (var kk = 0; kk < keys.length; kk++) latest[keys[kk]] = rec;
    respondents[keys[0]] = { raw: String(fvals[i][1] || '').trim(), keys: keys };
  }

  var last = ledger.getLastRow();
  if (last < 2) return 0;
  var n = last - 1;
  var names = ledger.getRange(2, 3, n, 2).getValues(); // C:D 氏名・旧姓
  var block = ledger.getRange(2, 7, n, 5).getValues();  // G:K 出欠・二次会・回答日時・経路・備考

  var ledgerKeys = {};         // 台帳側の氏名・旧姓キー集合（未照合判定用）
  var updates = 0;
  for (var r = 0; r < n; r++) {
    var kName = normName_(names[r][0]);         // 現姓フルネーム
    var kOld  = normName_(names[r][1]);         // 旧姓（多くは姓のみ）
    // 旧姓フルネーム候補 ＝ 旧姓 ＋ 氏名の「名」部分（例: 本城 洋子/旧姓松岡 → 松岡洋子）
    var kMaiden = '';
    if (names[r][1]) {
      var parts = String(names[r][0]).split(/[\s　]+/).filter(String);
      var given = parts.length > 1 ? parts[parts.length - 1] : '';
      if (given) kMaiden = normName_(names[r][1] + given);
    }
    if (kName)   ledgerKeys[kName]   = 1;
    if (kOld)    ledgerKeys[kOld]    = 1;
    if (kMaiden) ledgerKeys[kMaiden] = 1;

    var hit = latest[kName] || (kMaiden ? latest[kMaiden] : null) || (kOld ? latest[kOld] : null);
    if (!hit) continue;

    block[r][0] = mark_(hit.party1);   // 出欠
    block[r][1] = mark_(hit.party2);   // 二次会
    block[r][2] = hit.ts;              // 回答日時
    block[r][3] = 'Web';               // 経路
    var note = [
      hit.cname ? '表示名:' + hit.cname : '',
      String(hit.now || '').trim(),
      String(hit.memory || '').trim()
    ].filter(String).join(' / ');
    if (note) block[r][4] = note;      // 備考
    updates++;
  }
  ledger.getRange(2, 7, n, 5).setValues(block);

  // 名簿に見つからなかった回答者（旧姓が違う・新規参加など）を洗い出す
  var unmatched = [];
  for (var full in respondents) {
    var rp = respondents[full];
    var ok = false;
    for (var j = 0; j < rp.keys.length; j++) { if (ledgerKeys[rp.keys[j]]) { ok = true; break; } }
    if (!ok) unmatched.push(rp.raw);
  }

  var msg = 'Web回答 ' + updates + '件を台帳に反映しました。';
  if (unmatched.length) msg += '\n名簿に未照合: ' + unmatched.length + '件（' + unmatched.join('、') + '）';
  try { ss.toast(msg, '出欠台帳の更新', 8); } catch (e) {}
  return updates;
}

// --- ヘルパー ----------------------------------------------------------
function idxOf_(head, labels) {
  for (var i = 0; i < labels.length; i++) {
    var idx = head.indexOf(labels[i]);
    if (idx !== -1) return idx;
  }
  return -1;
}

// 台帳の既存入力（氏名 → [出欠,二次会,回答日時,経路,備考]）を読み出す
function readLedgerInputs_(sheet) {
  var map = {};
  var last = sheet.getLastRow();
  if (last < 2) return map;
  var vals = sheet.getRange(2, 3, last - 1, 9).getValues(); // C..K
  for (var i = 0; i < vals.length; i++) {
    var nm = normName_(vals[i][0]); // C=氏名
    if (!nm) continue;
    map[nm] = vals[i].slice(4);     // G..K
  }
  return map;
}

// 氏名を照合用に正規化（全角・半角スペース除去）
function normName_(s) {
  if (!s) return '';
  return String(s).replace(/[\s　]/g, '').trim();
}

// フォームのお名前欄から照合キー候補を作る。
// 「森下 ひとみ（旧姓 辰井）」→ ['森下ひとみ（旧姓辰井）', '森下ひとみ', '辰井']
function formKeys_(raw) {
  raw = String(raw || '');
  var keys = [];
  function add(k) { if (k && keys.indexOf(k) === -1) keys.push(k); }

  add(normName_(raw));                                   // 丸ごと
  add(normName_(raw.replace(/[（(].*?[）)]/g, '')));      // 括弧内を除いた本体
  var m = raw.match(/旧姓[\s　]*([^）)\s　]+)/);           // 「旧姓 X」の X
  if (m) add(normName_(m[1]));
  return keys;
}

// 出席/欠席/未定 → ○/✗/△
function mark_(v) {
  v = String(v || '');
  if (v.indexOf('出') !== -1 || v.indexOf('参加') !== -1) return '○';
  if (v.indexOf('欠') !== -1 || v.indexOf('不参加') !== -1) return '✗';
  if (v.indexOf('未') !== -1 || v.indexOf('保留') !== -1) return '△';
  return v;
}
