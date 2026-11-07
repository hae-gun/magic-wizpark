#!/usr/bin/env bash
# src/page.html 을 고친 뒤 실행하면 public/index.html 이 만들어집니다.
cd "$(dirname "$0")"
v=$(git rev-parse --short HEAD 2>/dev/null || date +%s)
{ printf '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'; sed "s/__BUILD__/$v$(date +%s)/" src/page.html; printf '</html>'; } > public/index.html
cp src/train.js public/train.js
cp public/index.html index.html
cp src/train.js train.js
