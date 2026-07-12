// Google Apps Script — フォーム受信→スプレッドシート書き込み ＆ コメント一覧の配信
// ブラウザからのfetchはGASの302リダイレクトでPOST→GETに変わるため doGet で受け取る

var SHEET_ID = 'YOUR_SPREADSHEET_ID'; // ← スプレッドシートIDに変更
var SHEET_NAME = '出欠登録';

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
