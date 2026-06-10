// Google Apps Script — フォーム受信→スプレッドシート書き込み
// ブラウザからのfetchはGASの302リダイレクトでPOST→GETに変わるため doGet で受け取る

var SHEET_ID = 'YOUR_SPREADSHEET_ID'; // ← スプレッドシートIDに変更
var SHEET_NAME = '出欠登録';

function doGet(e) {
  try {
    var p = e.parameter;
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

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
