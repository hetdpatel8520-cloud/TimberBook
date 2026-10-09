@echo off
"C:\Program Files\Google\Chrome\Application\chrome.exe" --headless=new --virtual-time-budget=5000 --user-data-dir="f:\TB\scratch\chrome_test" --enable-logging=stderr --v=1 --dump-dom http://localhost:5000/ > "f:\TB\scratch\dom.txt" 2> "f:\TB\scratch\err.txt"
