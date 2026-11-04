#!/usr/bin/env bash
# src/page.html 을 고친 뒤 실행하면 public/index.html 이 만들어집니다.
cd "$(dirname "$0")"
{ printf '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'; cat src/page.html; printf '</html>'; } > public/index.html
cp public/index.html index.html
