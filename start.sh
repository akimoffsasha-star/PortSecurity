#!/usr/bin/env sh
# Необов'язковий запуск через локальний сервер (потрібен Python 3).
cd "$(dirname "$0")" || exit 1
echo "Відкрийте http://localhost:8080/index.html"
python3 -m http.server 8080
