# 매직 위즈파크

KT 위즈 팬이 만든 비공식 3D 응원 공간입니다. 구단 로고와 마스코트, 응원가 음원은 넣지 않았습니다.

## 구조

- `src/page.html`: 페이지 원본
- `public/index.html`: 배포용 페이지 (`./build.sh`로 생성)
- `server/collector.mjs`: 네이버 중계 수집기
- `patches/wizpark-all.patch`: 고해야지 레포에 페이지와 수집기를 넣는 패치

## 내 컴퓨터에서 보기

    cd public && python3 -m http.server 8000

http://localhost:8000 을 엽니다. 수집 서버가 아직 없으면 시연 장면이 나옵니다.

## 고해야지 서버로 공개

    cd ~/project/gohaeyaji
    git pull
    git apply ../magic-wizpark/patches/wizpark-all.patch
    git add infra frontend/public/wizpark
    git commit -m "한국시리즈 임시 위즈파크 페이지와 중계 수집기 추가"
    git push
    ssh -i ~/.ssh/<서버키> rocky@<APP_IP> gohae-deploy

공개 주소는 https://gohaeyaji.com/wizpark/ , 중계 파일은 https://api.gohaeyaji.com/wiz/state.json 입니다.

이후 페이지를 고쳤다면 `./build.sh` 뒤에 `public/index.html`을 `~/project/gohaeyaji/frontend/public/wizpark/index.html`로 복사합니다.
# magic-wizpark
