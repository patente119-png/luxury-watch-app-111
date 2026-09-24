# Luxury Smartwatch v1.5 AI Narrator

## 배포 파일
- `index.html` : 앱 본체
- `api/tts.js` : Vercel Serverless AI TTS API
- `package.json` : 프로젝트 정보

## Vercel 필수 설정
Vercel Project → Settings → Environment Variables에서 아래 변수를 추가하세요.

`OPENAI_API_KEY` = 본인의 OpenAI API key

적용 환경은 Production / Preview / Development 중 필요한 환경을 선택하고,
환경변수 저장 후 반드시 새로 Redeploy 하세요.

## 중요
- API key를 `index.html` 안에 직접 넣지 마세요.
- AI 내레이터 음성은 사용자에게 "AI로 생성된 음성"이라고 표시됩니다.
- 남자/여자 AI 음성 생성이 실패하면 기존 브라우저 TTS로 자동 fallback 합니다.
- 공유 시 생성된 AI 내레이터 MP3도 Firebase Storage에 저장되어 받는 사람에게 동일하게 재생됩니다.
- 기존 `assets` 폴더를 사용 중이라면 현재 프로젝트의 assets 폴더는 그대로 유지하세요.
