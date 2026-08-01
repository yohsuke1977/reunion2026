// Google Apps Script — フォーム受信→スプレッドシート書き込み ＆ コメント一覧の配信
// ブラウザからのfetchはGASの302リダイレクトでPOST→GETに変わるため doGet で受け取る

var SHEET_ID = 'YOUR_SPREADSHEET_ID'; // ← 「同窓会2026出欠管理」スプレッドシートIDに変更
var SHEET_NAME = '出欠登録';           // フォーム回答の受信シート

// 出欠台帳（マスター名簿）関連
var LEDGER_NAME = 'シート1';           // 台帳シート名
var ROSTER_ID = 'YOUR_ROSTER_ID';     // ← コピー元の学年名簿スプレッドシートIDに変更
var LEDGER_HEADERS = ['No.', 'フリガナ', '氏名', '旧姓', '性別', '組', '出欠', '二次会', '回答日時', '経路', '備考', '会費受領'];
var ACCOUNTING_NAME = '会計';          // 会計シート名

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
      sheet.appendRow(['タイムスタンプ', 'お名前', 'クラス', '一次会', '二次会', 'コメント名', '近況', '思い出', 'コメント掲載']);
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
      // I列「コメント掲載」は空のまま＝未掲載。幹事が内容確認後に○を付けると公開される
    ]);

    // フォーム回答を出欠台帳（シート1）にも反映（失敗しても送信は成功扱い）
    try { syncLedger(); } catch (e) {}

    // コメント付きの回答は幹事にメール通知（掲載確認を促す）。失敗しても送信は成功扱い
    if (String(p.now || '').trim() || String(p.memory || '').trim()) {
      try {
        MailApp.sendEmail(
          Session.getEffectiveUser().getEmail(),
          '【同窓会】新しいコメントが届きました',
          'お名前: ' + (p.name || '(無記入)') + '\n' +
          '表示名: ' + (p.commentName || '(無記入)') + '\n\n' +
          '近況:\n' + (p.now || '') + '\n\n' +
          '思い出:\n' + (p.memory || '') + '\n\n' +
          '内容を確認して、出欠登録シートのI列「コメント掲載」に ○ を付けるとサイトに掲載されます。'
        );
      } catch (e) {}
    }

    return json({ status: 'ok' });
  } catch (err) {
    return json({ status: 'error', message: err.toString() });
  }
}

// --- コメント一覧の配信 -------------------------------------------------
// I列「コメント掲載」に○が付いた行だけを、表示名・本文に絞って返す。
// 幹事が内容確認してから掲載する運用（未確認の新規コメントは出ない）。
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
      if (!now && !memory) continue;             // 近況も思い出も無ければ対象外
      if (!approved_(row[8])) continue;          // 掲載○が無ければ非公開（要確認）

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

// 掲載マーク判定: ○/◯/〇（見分けにくい3種の丸すべて）と OK を許容
function approved_(v) {
  return /[○◯〇]|^ok$/i.test(String(v || '').trim());
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
      .addItem('③ 会計シートを作成', 'setupAccounting')
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
    var keep = prev[normName_(roster[k][1])] || ['', '', '', '', '', ''];
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
    // 旧姓欄の注記「雨宮（現在）」「三好（現在）」等は括弧を除いて姓だけ使う
    var kMaiden = '';
    var oldCol = String(names[r][2] || '').replace(/[（(].*?[）)]/g, '');
    if (oldCol) {
      var parts = String(names[r][1]).split(/[\s　]+/).filter(String);
      var given = parts.length > 1 ? parts[parts.length - 1] : '';
      if (given) kMaiden = normName_(oldCol + given);
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
    if (row < 0) {
      if (unmatched.indexOf(raw) === -1) unmatched.push(raw); // 同一人物の再送信は1回だけ報告
      continue;
    }

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
  writeSyncLog_(ss, updates, unmatched);
  return { updates: updates, unmatched: unmatched };
}

// 同期結果を「同期ログ」シートに書き出す（トーストは見切れるため）。毎回書き直し。
function writeSyncLog_(ss, updates, unmatched) {
  try {
    var name = '同期ログ';
    var sh = ss.getSheetByName(name) || ss.insertSheet(name, 0); // 先頭タブに配置
    sh.clear();
    var rows = [
      ['最終同期', new Date()],
      ['台帳へ反映', updates + ' 件'],
      ['未照合（要手動確認）', unmatched.length + ' 件']
    ];
    unmatched.forEach(function (u, i) { rows.push(['未照合 ' + (i + 1), u]); });
    sh.getRange(1, 1, rows.length, 2).setValues(rows);
    sh.getRange(1, 1, 3, 1).setFontWeight('bold');
    sh.setColumnWidth(1, 160).setColumnWidth(2, 320);
  } catch (e) {}
}

// --- メール通知のテスト兼・権限承認用 ------------------------------------
// エディタから1回実行して「メール送信」の権限を承認すると、
// 以後フォームのコメント到着通知が届くようになる。
function testCommentMail() {
  MailApp.sendEmail(
    Session.getEffectiveUser().getEmail(),
    '【同窓会】通知テスト',
    'このメールが届いていれば、コメント到着通知は正常に動きます。'
  );
}

// --- ③ 会計シートの作成 -------------------------------------------------
// 収入（会費×受領人数を自動集計）・支出（領収書リンク付き）・残金の収支表。
// 台帳の「会費受領」列（L列）に○を付けると収入が自動計算される＝受付チェック兼用。
function setupAccounting() {
  var ss = SpreadsheetApp.openById(SHEET_ID);

  // 台帳にL列ヘッダーが無ければ追加（既存データはそのまま）
  var ledger = ss.getSheetByName(LEDGER_NAME);
  if (ledger && ledger.getRange(1, 12).getValue() !== '会費受領') {
    ledger.getRange(1, 12).setValue('会費受領').setFontWeight('bold');
  }

  if (ss.getSheetByName(ACCOUNTING_NAME)) {
    try { ss.toast('会計シートは既にあります（作り直す場合は先に削除してください）'); } catch (e) {}
    return;
  }
  var sh = ss.insertSheet(ACCOUNTING_NAME);
  var L = "'" + LEDGER_NAME + "'";  // 数式内のシート参照

  var rows = [
    ['魚崎中44回生同窓会 会計', '', '', '', ''],                                     // 1
    ['', '', '', '', ''],                                                            // 2
    ['【見込み】台帳の出席○から自動計算', '', '', '', ''],                          // 3
    ['一次会 出席見込み', '=COUNTIF(' + L + '!G2:G1000,"○")', '名', '', ''],        // 4
    ['会費単価（確定したら変更）', 10000, '円', '', ''],                             // 5
    ['見込み収入', '=B4*B5', '円', '', ''],                                          // 6
    ['', '', '', '', ''],                                                            // 7
    ['【収入】受付で台帳L列「会費受領」に○を付けると自動集計', '', '', '', ''],     // 8
    ['項目', '単価', '人数', '金額', ''],                                            // 9
    ['一次会会費', '=B5', '=COUNTIF(' + L + '!L2:L1000,"○")', '=B10*C10', ''],      // 10
    ['二次会会費（使う場合は手入力）', '', '', '', ''],                              // 11
    ['その他収入（ご祝儀など）', '', '', '', ''],                                    // 12
    ['収入合計', '', '', '=SUM(D10:D12)', ''],                                       // 13
    ['', '', '', '', ''],                                                            // 14
    ['【支出】領収書はスマホで撮影→Driveに保存してリンクを貼る', '', '', '', ''],   // 15
    ['日付', '項目', '金額', '領収書リンク', 'メモ']                                 // 16
  ];
  sh.getRange(1, 1, rows.length, 5).setValues(rows);

  var EXP_TOP = 17, EXP_ROWS = 20;                       // 支出入力欄 17〜36行
  var totalRow = EXP_TOP + EXP_ROWS;                     // 37: 支出合計
  sh.getRange(totalRow, 1).setValue('支出合計');
  sh.getRange(totalRow, 3).setFormula('=SUM(C' + EXP_TOP + ':C' + (totalRow - 1) + ')');
  sh.getRange(totalRow + 2, 1).setValue('残金（収入合計−支出合計）');
  sh.getRange(totalRow + 2, 3).setFormula('=D13-C' + totalRow);
  sh.getRange(totalRow + 3, 1).setValue('※余剰金の扱い: 検討中（二次会費用に充当 or 次回への繰越）→ 会計報告に明記する');

  // 体裁
  sh.getRange('A1').setFontWeight('bold').setFontSize(14);
  ['A3', 'A8', 'A15'].forEach(function (a) { sh.getRange(a).setFontWeight('bold'); });
  sh.getRange('A9:E9').setFontWeight('bold');
  sh.getRange('A16:E16').setFontWeight('bold');
  sh.getRange(totalRow, 1, 1, 5).setFontWeight('bold');
  sh.getRange(totalRow + 2, 1, 1, 5).setFontWeight('bold');
  ['B5', 'B6', 'B10', 'D10:D13'].forEach(function (a) { sh.getRange(a).setNumberFormat('¥#,##0'); });
  sh.getRange(EXP_TOP, 3, EXP_ROWS + 1, 1).setNumberFormat('¥#,##0');
  sh.getRange(totalRow + 2, 3).setNumberFormat('¥#,##0');
  sh.setColumnWidth(1, 240).setColumnWidth(2, 110).setColumnWidth(3, 110)
    .setColumnWidth(4, 200).setColumnWidth(5, 200);

  try { ss.toast('会計シートを作成しました。台帳L列「会費受領」が受付チェック欄です。'); } catch (e) {}
}

// --- ヘルパー ----------------------------------------------------------
function idxOf_(head, labels) {
  for (var i = 0; i < labels.length; i++) {
    var idx = head.indexOf(labels[i]);
    if (idx !== -1) return idx;
  }
  return -1;
}

// 台帳の既存入力（氏名 → [出欠,二次会,回答日時,経路,備考,会費受領]）を読み出す
function readLedgerInputs_(sheet) {
  var map = {};
  var last = sheet.getLastRow();
  if (last < 2) return map;
  var vals = sheet.getRange(2, 3, last - 1, 10).getValues(); // C..L
  for (var i = 0; i < vals.length; i++) {
    var nm = normName_(vals[i][0]); // C=氏名
    if (!nm) continue;
    map[nm] = vals[i].slice(4);     // G..L
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
var KYU_SHIN_ = '將将壽寿齊斉齋斎邊辺邉辺澤沢濱浜髙高﨑崎嶋島嶌島國国廣広惠恵榮栄眞真淺浅瀨瀬龍竜瀧滝豐豊圓円關関與与萬万內内德徳櫻桜靜静縣県稻稲綠緑應応澁渋鹽塩爲為樂楽';
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

  // 括弧内を旧姓とみなすパターン（「旧姓」と書かない書き方）:
  //   三浦悠(中村) → 中村悠 ／ 辻紗知子(松浦紗知子) → 松浦紗知子（フルネームのケース）
  var parens = raw.match(/[（(][^（()）]*[）)]/g) || [];
  parens.forEach(function (pr) {
    var inner = normName_(pr.replace(/[（()）]/g, '').replace(/旧姓[\s　:：\/／]*/g, ''));
    if (!inner) return;
    add(inner);                                              // 括弧内がフルネームのケース
    tokens.forEach(function (t) { add(inner + normName_(t)); });
    var core2 = normName_(base).replace(/[\/／]/g, '');
    for (var s2 = 1; s2 <= 3; s2++) { if (core2.length > s2) add(inner + core2.slice(s2)); }
  });

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
