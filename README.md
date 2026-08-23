# Creator Studio

유튜브 트렌드 조사, AI 기획·대본·음악 제작, 브라우저 음원 마스터링과 자막 추출을 한 화면에서 진행하는 Next.js 앱입니다.

## 주요 기능

- 유튜브 인기 영상 검색과 실제 상위 댓글·참여율·상승 영상 분석
- Gemini, OpenAI, Groq를 이용한 영상 기획안과 숏츠/롱폼 대본 생성
- 장르·보컬·가사 언어를 반영한 음악 기획, 가사 및 뮤직비디오 씬 프롬프트 생성
- 로컬 Web Audio 기반 마스터링
  - 7밴드 EQ, 컴프레션, 새추레이션, 고역 제어
  - 미드·사이드 방식의 스테레오 폭 조정과 원본/마스터 A/B 비교
  - 16-bit/24-bit WAV, 선택적 −1 dBFS 피크 정규화
- 일반 영상, Shorts, `youtu.be` 링크 자막 추출
- 다크 모드, 탭/AI 설정/스크랩 브라우저 저장

음원 마스터링은 파일을 서버로 전송하지 않고 현재 브라우저에서 처리합니다. AI API 키도 애플리케이션 DB에는 저장하지 않지만, 편의를 위해 사용 중인 브라우저의 로컬 저장소에 보관됩니다.

## 시작하기

Node.js와 npm을 준비한 뒤 의존성을 설치합니다.

```bash
npm install
```

프로젝트 루트에 `.env.local`을 만들고 YouTube Data API v3 키를 설정합니다.

```dotenv
YOUTUBE_API_KEY=your_youtube_data_api_key
```

개발 서버를 실행합니다.

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열고, 화면의 AI 환경 설정에서 사용할 제공자와 API 키를 입력합니다.

## 검증 명령

```bash
npm run lint
npm run typecheck
npm run build
```

세 검증을 순서대로 실행하려면 다음 명령을 사용합니다.

```bash
npm run check
```

## 기술 구성

- Next.js 16 App Router
- React 19, TypeScript 5, Tailwind CSS 4
- Vercel AI SDK와 Google/OpenAI 제공자
- Google APIs, `youtube-transcript`
- Web Audio API, OfflineAudioContext
