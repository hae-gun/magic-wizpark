# 매직 위즈파크

KT 위즈 팬이 만든 비공식 3D 응원 공간입니다. 구단 로고와 마스코트, 응원가 음원은 넣지 않았습니다.

## 구조

- `src/page.html`: 페이지 원본
- `index.html`, `public/index.html`: 배포용 페이지 (`./build.sh`로 생성, GitHub Pages는 저장소 최상위 `index.html`을 씀)
- `server/collector.mjs`: KBO 중계 수집기

## 내 컴퓨터에서 보기

    cd public && python3 -m http.server 8000

http://localhost:8000 을 엽니다. 수집 서버가 아직 없으면 시연 장면이 나옵니다.

## 공개 구성

- 페이지: 이 저장소의 GitHub Pages (`https://wiz.gohaeyaji.com/`)
- 중계: 고해야지 서버의 `wiz-relay` 컨테이너가 KBO 공식 페이지를 읽어 `https://api.gohaeyaji.com/wiz/state.json`을 만듭니다.
- `server/collector.mjs`는 `~/project/gohaeyaji/infra/app/wiz-relay/collector.mjs`와 같은 파일입니다. 고치면 두 곳을 맞춥니다.
