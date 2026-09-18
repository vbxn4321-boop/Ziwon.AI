# 이 폴더는 빌드 산출물입니다 (직접 수정 금지)

`@rhwp/editor`가 쓰는 실제 편집기 UI(`rhwp-studio`)를 우리 도메인에서
직접 서빙하기 위해 자기호스팅한 빌드입니다.

## 왜 자기호스팅인가

`@rhwp/editor`의 기본 `studioUrl`은 제3자 GitHub Pages
(`https://edwardkim.github.io/rhwp/`)입니다. 그대로 쓰면 사용자가 편집하는
문서 내용(사업자등록번호·대표자 정보 등)이 iframe의 `postMessage`로 그
외부 서버와 오가게 됩니다. 이 프로젝트는 같은 이유로 공고문 개인정보를
Gemini 에도 안 보내려고 마스킹 처리를 해뒀는데, 여기서 제3자 서버로
흘려보내면 그 작업이 무의미해집니다. 그래서 `studioUrl: "/rhwp-studio/"`로
우리 자신의 오리진에 고정했고, 이 폴더가 그 실제 내용입니다.

## 어떻게 만들었나 (Docker 없이)

`rhwp-studio`(원본: https://github.com/edwardkim/rhwp)는 원래
Docker + Rust + wasm-pack 으로 자체 WASM 엔진(`pkg/`)을 빌드해서 쓰지만,
그 WASM 엔진은 우리가 이미 쓰고 있는 npm 패키지 `@rhwp/core`와 완전히
동일한 wasm-pack 산출물입니다(버전도 0.8.6으로 같음). 그래서 Docker 빌드
없이, `rhwp-studio`의 vite alias(`@wasm`)를 `node_modules/@rhwp/core`로
바꿔치기해서 빌드했습니다.

```bash
git clone --depth 1 https://github.com/edwardkim/rhwp.git rhwp-src
cd rhwp-src/rhwp-studio
npm install

# vite.config.ts 의 @wasm / @wasm/rhwp.js alias 를
#   resolve(configDir, '..', 'pkg', ...)
# 에서
#   <repo>/frontend/node_modules/@rhwp/core
# 로 바꾼다 (rhwp.js, rhwp_bg.wasm 파일 구성이 정확히 같다)

# hwpctrl 플러그인(npm/hwpctrl-ocx)은 studio 를 단독 배포할 때 빼도 되게
# 만들어져 있다 — 이 빌드에는 포함하지 않았다. studio.hwpctrl.* API
# (필드 자동화)는 이 빌드에서 못 쓰지만, 메뉴·툴바로 하는 수동 편집과
# loadFile/exportHwp/exportHwpx/getDocumentState 등 핵심 브리지 API는
# 전부 정상 동작한다.
MSYS_NO_PATHCONV=1 RHWP_WITHOUT_HWPCTRL=1 npx vite build --base=/rhwp-studio/

# dist/ 에서 samples/, sw.js, workbox-*.js, registerSW.js, manifest.webmanifest
# 를 지우고(임베드 에디터에 필요 없음, PWA 등록 스크립트가 없어도 그냥
# 조용히 404 날 뿐 동작엔 지장 없음), index.html 에서 그 참조만 빼고
# 이 폴더로 복사했다.
```

검증: Node 에서 `@rhwp/core`를 직접 초기화해 실제 바이너리 HWP 파일을
열어 페이지 수·SVG 렌더링이 정상 나오는 것까지 확인했다. 브라우저
안에서의 postMessage 브리지·메뉴 UI 자체는 이 세션에서 실제 브라우저로
띄워보지는 못했다 — 처음 통합할 때 한 번은 실제로 열어서 확인 필요.

## studioUrl 은 index.html 을 직접 가리켜야 한다

`/rhwp-studio/`(디렉터리 형태)로 주면 Next.js 가 trailingSlash 기본
설정 때문에 `/rhwp-studio` 로 308 리다이렉트하는데, `public/` 정적
서빙은 디렉터리 인덱스 파일을 자동으로 안 찾아줘서 리다이렉트 직후
404 가 난다. `RhwpEditorPanel.tsx` 에서 `studioUrl: "/rhwp-studio/index.html"`
처럼 파일을 직접 지정해야 한다. 빌드가 `--base=/rhwp-studio/` 라 에셋
참조는 전부 절대경로라, 문서 URL이 `index.html` 로 끝나도 문제없다.

## Ziwon.AI 브랜드 재스킨

`ziwon-theme.css` 와 `index.html` 안의 그 stylesheet `<link>` 태그는
빌드 산출물이 아니라 우리가 직접 얹은 파일이다. rhwp-studio 는 색상을
`:root` 커스텀 속성(디자인 토큰, `src/styles/base.css`)으로 빼놨는데,
그 값을 이 파일에서 인디고/스톤 팔레트로 덮어써서 우리 앱과 톤을
맞췄다. **studio 를 다시 빌드하면 이 폴더가 통째로 새로 생성되므로,
`ziwon-theme.css` 를 다시 복사하고 `index.html` 에 그 `<link>` 태그를
다시 추가해야 한다** — 안 하면 재스킨이 조용히 사라진다.

## 업그레이드하려면

`@rhwp/core`를 업그레이드하면 이 폴더도 같은 버전으로 다시 빌드해야
한다. 버전이 어긋나면(`rhwp-studio` 소스가 기대하는 브리지 API와
`@rhwp/core`의 실제 export가 달라지면) 조용히 깨질 수 있다 — 업그레이드
후에는 위 절차를 다시 밟고, 문서 하나를 실제로 열어 편집·저장까지
되는지 확인할 것.

## 파일 구성

- `index.html`, `assets/` — 빌드된 스튜디오 앱 (JS/CSS/WASM)
- `fonts/`, `icons/`, `images/` — 스튜디오 UI 리소스
- `rhwp.d.ts`, `rhwp_bg.wasm.d.ts` — 참고용 타입 (런타임에 안 쓰임)
