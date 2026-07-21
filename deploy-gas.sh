#!/bin/bash
# GASを本番デプロイするスクリプト（URL据え置きで既存デプロイを新バージョン化）
#
# 使い方:  ./deploy-gas.sh
# 前提:    clasp login 済み / .env.local に GAS_SHEET_ID・GAS_ROSTER_ID・GAS_DEPLOYMENT_ID
# 仕組み:  gas/Code.gs のプレースホルダIDを .env.local の実IDに差し替えて
#          gas/.build/ に生成 → clasp push → 既存デプロイを新バージョンで更新
set -euo pipefail
cd "$(dirname "$0")"

# .env.local から GAS_ 変数を読む（VITE_ 変数はそのまま無視される）
source <(grep '^GAS_' .env.local)

: "${GAS_SHEET_ID:?GAS_SHEET_ID が .env.local にありません}"
: "${GAS_ROSTER_ID:?GAS_ROSTER_ID が .env.local にありません}"
: "${GAS_DEPLOYMENT_ID:?GAS_DEPLOYMENT_ID が .env.local にありません}"

# ビルド: プレースホルダ → 実ID
mkdir -p gas/.build
sed -e "s/YOUR_SPREADSHEET_ID/${GAS_SHEET_ID}/" \
    -e "s/YOUR_ROSTER_ID/${GAS_ROSTER_ID}/" \
    gas/Code.gs > gas/.build/Code.js
cp gas/appsscript.json gas/.build/appsscript.json

# 差し替え漏れチェック
if grep -q 'YOUR_' gas/.build/Code.js; then
  echo "ERROR: プレースホルダが残っています" >&2; exit 1
fi

echo "→ clasp push（コード反映）"
clasp push -f

echo "→ clasp deploy（既存デプロイ ${GAS_DEPLOYMENT_ID:0:12}… を新バージョン化＝URL据え置き）"
clasp deploy -i "$GAS_DEPLOYMENT_ID" -d "deploy $(date '+%Y-%m-%d %H:%M')"

echo "✓ 完了"
