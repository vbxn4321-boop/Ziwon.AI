// pdf.min.mjs 는 타입 선언을 따로 배포하지 않는다 (pdf.mjs 쪽에만 .d.mts 가 있음).
// 압축 안 된 빌드는 이 프로젝트의 웹팩 개발 번들에서 로드 자체가 깨져서
// (RhwpEditorPanel/PdfFormFiller 참고) 압축본을 쓸 수밖에 없다 — 타입은 pdfjs-dist
// 기본 패키지 것을 그대로 재사용한다.
declare module "pdfjs-dist/legacy/build/pdf.min.mjs" {
  export * from "pdfjs-dist";
}
