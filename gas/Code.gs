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

  // action=counts → 出欠の集計をJSONで返す（サイトの「現在の出欠状況」用）
  if (p.action === 'counts') {
    return countRsvp();
  }

  // action=sync → フォーム回答を台帳へ手動同期（結果は件数のみ返す・名前は返さない）
  if (p.action === 'sync') {
    var r = syncLedger();
    return json({ status: 'ok', updates: r.updates, unmatched: r.unmatched.length });
  }

  return saveEntry(p);
}

// --- 出欠の集計（フォーム生回答ベース）---------------------------------
// 出欠登録シートを氏名で名寄せ（最新回答を採用）して、一次会の出席/欠席/未定を数える。
// 台帳の照合有無に関係なく、回答した人は全員カウントされる。
function countRsvp() {
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) return json({ status: 'ok', attend: 0, absent: 0, undecided: 0, responded: 0 });

    // 出欠登録: タイムスタンプ, お名前, クラス, 一次会, 二次会, ...
    // 「何度でも送信OK」なので重複回答が来る。氏名で名寄せし、後の行（新しい回答）を採用。
    var vals = sheet.getDataRange().getValues();
    var latest = {}; // 正規化氏名 → 一次会の値
    for (var i = 1; i < vals.length; i++) {
      var nm = canonName_(vals[i][1]);
      if (!nm) continue;                 // 無名（空送信）は除外
      latest[nm] = String(vals[i][3] || '');
    }

    var a = 0, x = 0, u = 0;
    for (var k in latest) {
      var v = latest[k];
      if (v.indexOf('出') !== -1)      a++;
      else if (v.indexOf('欠') !== -1) x++;
      else if (v.indexOf('未') !== -1) u++;
    }
    return json({ status: 'ok', attend: a, absent: x, undecided: u, responded: a + x + u });
  } catch (err) {
    return json({ status: 'error', message: err.toString() });
  }
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
  if (!ledger || !form) return { updates: 0, unmatched: [] };

  var last = ledger.getLastRow();
  if (last < 2) return { updates: 0, unmatched: [] };
  var n = last - 1;
  var names = ledger.getRange(2, 2, n, 3).getValues(); // B:D フリガナ・氏名・旧姓

  // 台帳キー → 行index（0始まり）。氏名・旧姓・旧姓フルネーム・フリガナを索引。先勝ち。
  var keyToRow = {};
  for (var r = 0; r < n; r++) {
    var kName = normName_(names[r][1]);                 // 現姓フルネーム
    // 旧姓フルネーム ＝ 旧姓 ＋ 氏名の「名」部分（例: 本城 洋子/旧姓松岡 → 松岡洋子）
    var kMaiden = '';
    if (names[r][2]) {
      var parts = String(names[r][1]).split(/[\s　]+/).filter(String);
      var given = parts.length > 1 ? parts[parts.length - 1] : '';
      if (given) kMaiden = normName_(names[r][2] + given);
    }
    var kKana = kanaKey_(names[r][0]);                  // フリガナ（半角カナ→全角カナ）
    // 注: 旧姓「姓のみ」は同姓の別人に誤爆しうるためキーにしない（フルネーム復元のみ）
    [kName, kMaiden, kKana].forEach(function (k) {
      if (k && !(k in keyToRow)) keyToRow[k] = r;
    });
  }

  // 出欠登録: タイムスタンプ, お名前, クラス, 一次会, 二次会, コメント名, 近況, 思い出
  var block = ledger.getRange(2, 7, n, 5).getValues();  // G:K
  var fvals = form.getDataRange().getValues();
  var updates = 0;
  var unmatched = [];
  for (var i = 1; i < fvals.length; i++) {
    var raw = String(fvals[i][1] || '').trim();
    if (!raw) continue;                                  // 無名（空送信）はスキップ

    // お名前の表記ゆれから照合候補を生成し、最初に台帳と一致したものを採用
    var cands = matchCandidates_(raw);
    var row = -1;
    for (var c = 0; c < cands.length; c++) {
      if (cands[c] in keyToRow) { row = keyToRow[cands[c]]; break; }
    }
    if (row < 0) { unmatched.push(raw); continue; }

    // フォームは時系列昇順なので、同一人物の再送信は後勝ち（＝最新回答）で上書き
    block[row][0] = mark_(fvals[i][3]);   // 出欠
    block[row][1] = mark_(fvals[i][4]);   // 二次会
    block[row][2] = fvals[i][0];          // 回答日時
    block[row][3] = 'Web';                // 経路
    var note = [
      fvals[i][5] ? '表示名:' + fvals[i][5] : '',
      String(fvals[i][6] || '').trim(),
      String(fvals[i][7] || '').trim()
    ].filter(String).join(' / ');
    if (note) block[row][4] = note;       // 備考
    updates++;
  }
  ledger.getRange(2, 7, n, 5).setValues(block);

  var msg = 'Web回答を台帳に反映：' + updates + '件';
  if (unmatched.length) {
    msg += '\n名簿と一致しなかった回答（要手動確認）: ' + unmatched.length + '件\n' + unmatched.join('、');
  }
  try { ss.toast(msg, '出欠台帳の更新', 12); } catch (e) {}
  Logger.log(msg);
  return { updates: updates, unmatched: unmatched };
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

// 氏名を照合用に正規化（全角・半角スペース除去＋旧字体→新字体）
function normName_(s) {
  if (!s) return '';
  return normKanji_(String(s).replace(/[\s　]/g, '').trim());
}

// 旧字体→新字体の正規化（偶数位置=旧字体、次の文字=新字体のペア列）
// 名簿・回答の双方に適用するので「三好將介」↔「三好将介」等が一致する
var KYU_SHIN_ = '將将壽寿齊斉齋斎邊辺邉辺澤沢濱浜髙高﨑崎嶋島嶌島國国廣広惠恵榮栄眞真淺浅瀨瀬龍竜瀧滝豐豊圓円關関與与萬万內内德徳櫻桜靜静縣県稻稲綠緑應応澁渋鹽塩爲為';
function normKanji_(s) {
  var out = '';
  for (var i = 0; i < s.length; i++) {
    var idx = KYU_SHIN_.indexOf(s.charAt(i));
    out += (idx !== -1 && idx % 2 === 0) ? KYU_SHIN_.charAt(idx + 1) : s.charAt(i);
  }
  return out;
}

// カナ照合キー: 半角カナ→全角カナ・ひらがな→カタカナに揃え、
// 純カタカナ文字列になった場合のみキーとして返す（漢字混在は '' ）
var HW_KANA_ = 'ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ';
var FW_KANA_ = 'ヲァィゥェォャュョッーアイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワン';
function toKatakana_(s) {
  var out = '';
  for (var i = 0; i < s.length; i++) {
    var c = s.charAt(i), next = s.charAt(i + 1), code = s.charCodeAt(i);
    if (next === 'ﾞ' || next === 'ﾟ') {          // 半角の濁点・半濁点を合成
      if (c === 'ｳ' && next === 'ﾞ') { out += 'ヴ'; i++; continue; }
      var b = HW_KANA_.indexOf(c);
      if (b !== -1) {
        out += String.fromCharCode(FW_KANA_.charCodeAt(b) + (next === 'ﾞ' ? 1 : 2));
        i++; continue;
      }
    }
    var idx = HW_KANA_.indexOf(c);
    if (idx !== -1) { out += FW_KANA_.charAt(idx); continue; }
    if (code >= 0x3041 && code <= 0x3096) {      // ひらがな→カタカナ
      out += String.fromCharCode(code + 0x60); continue;
    }
    out += c;
  }
  return out;
}
function kanaKey_(s) {
  var k = toKatakana_(String(s || '').replace(/[\s　]/g, ''));
  return /^[ァ-ヶー]+$/.test(k) ? k : '';
}

// 集計の名寄せ用キー。括弧注記（旧姓◯◯）やスペース差、スラッシュ別名で
// 表記がぶれても同一人物としてまとめるため、括弧を除きスラッシュ前だけを取る。
// 例: 「山下陽介」「山下　陽介」「山下陽介（旧姓◯◯）」→ すべて "山下陽介"
function canonName_(s) {
  return normName_(String(s || '').replace(/[（(].*?[）)]/g, '').split(/[\/／]/)[0]);
}

// フォームのお名前欄から照合候補キーを生成する。
// 旧姓・スラッシュ・「現姓（旧姓◯◯）」「A/B」などの表記ゆれに対応。
// 例:「阪口悠子/旧姓齊藤」→ …,'阪口悠子','齊藤悠子','齊藤',…（台帳が齊藤悠子なら一致）
//   「畑千咲 井内千咲」→ '畑千咲','井内千咲',…（各トークンを氏名候補に）
//   「柿内裕香(旧姓 毛利)」→ …,'毛利裕香',…（旧姓＋名で復元）
function matchCandidates_(raw) {
  raw = String(raw || '');
  var out = [];
  function add(k) { k = normName_(k); if (k && out.indexOf(k) === -1) out.push(k); }

  add(raw);                                              // 生（正規化）

  // 「旧姓 X」「旧姓/X」「旧姓：X」の X（姓）を抽出
  var m = raw.match(/旧姓[\s　:：\/／]*([^）)\/／\s　]+)/);
  var oldSurname = m ? m[1] : '';

  // 括弧内・「旧姓…」の語を除いた本体を、スラッシュ／スペースで分割
  var base = raw.replace(/[（(].*?[）)]/g, '')
                .replace(/旧姓[\s　:：\/／]*[^\/／\s　]+/g, '');
  var tokens = base.split(/[\/／\s　]+/).map(function (s) { return s.trim(); }).filter(Boolean);
  tokens.forEach(add);                                   // 各トークンを氏名候補に
  add(base);                                             // 分割前の本体も

  // 旧姓 ＋ 名 で旧姓フルネームを復元（台帳が旧姓名で登録されているケース）
  // 注: 旧姓「姓のみ」は候補にしない（同姓の別人への誤爆防止・フルネーム復元のみ）
  if (oldSurname) {
    // スペース区切りの各トークンを「名」とみなす（例: 柿内 裕香 → 毛利＋裕香）
    tokens.forEach(function (t) { add(oldSurname + normName_(t)); });
    // 姓名が続き書きの場合、姓を1〜3文字外した末尾を「名」とみなす（例: 阪口悠子 → 齊藤＋悠子）
    var core = normName_(base).replace(/[\/／]/g, '');
    for (var s = 1; s <= 3; s++) { if (core.length > s) add(oldSurname + core.slice(s)); }
  }

  // カナ回答（カガワタツヤ・おだがき あきら 等）→ 台帳フリガナとの照合キー
  var kana = kanaKey_(raw.replace(/[（(].*?[）)]/g, ''));
  if (kana && out.indexOf(kana) === -1) out.push(kana);
  return out;
}

// 出席/欠席/未定 → ○/✗/△
function mark_(v) {
  v = String(v || '');
  if (v.indexOf('出') !== -1 || v.indexOf('参加') !== -1) return '○';
  if (v.indexOf('欠') !== -1 || v.indexOf('不参加') !== -1) return '✗';
  if (v.indexOf('未') !== -1 || v.indexOf('保留') !== -1) return '△';
  return v;
}
