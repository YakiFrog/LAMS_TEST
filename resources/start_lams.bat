:loop
echo LAMSをフルスクリーンで起動します...
REM "start /wait" でEXEが終了するまで待機します
start /wait "" "LAMS_TEST.exe"
echo LAMSが終了しました。5秒後に再起動します...
timeout /t 5 /nobreak >nul
goto loop