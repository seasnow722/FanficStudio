@echo off
cd /d %~dp0

echo Fanfic Studio を起動します...

if not exist node_modules (
  echo 初回起動のため、必要なファイルをインストールします。
  npm install
)

echo.
echo 起動中です。
echo ブラウザで http://localhost:5173 が開きます。
echo 終了するときはこの黒い画面を閉じてください。
echo.

npm run dev -- --host 127.0.0.1
pause