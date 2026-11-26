@echo off
rem Необов'язковий запуск через локальний сервер (потрібен Python 3).
rem Для звичайної роботи достатньо відкрити index.html подвійним кліком.
cd /d "%~dp0"
start "" http://localhost:8080/index.html
python -m http.server 8080
