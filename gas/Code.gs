// Google Apps Script — フォーム受信→スプレッドシート書き込み
// デプロイ方法: 拡張機能 > Apps Script > デプロイ > 新しいデプロイ
//   種類: ウェブアプリ / 実行ユーザー: 自分 / アクセス: 全員
// デプロイ後のURLを VITE_GAS_ENDPOINT に設定する

var SHEET_ID = 'YOUR_SPREADSHEET_ID'; // ← スプレッドシートIDに変更
var SHEET_NAME = '出欠登録';

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow(['タイムスタンプ', 'お名前', 'クラス', '一次会', '二次会', 'コメント名', '近況', '思い出']);
    }

    sheet.appendRow([
      new Date(),
      data.name || '',
      data.classOf || '',
      data.party1 || '',
      data.party2 || '',
      data.commentName || '',
      data.now || '',
      data.memory || ''
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
