import type { Config } from "tailwindcss";

export default {
  // src 아래를 통째로 스캔한다.
  // 예전에는 pages/components/app 세 곳만 지정했는데, 구조 변경으로 컴포넌트가
  // src/features/ 로 옮겨가면서 그쪽 클래스가 전부 생성되지 않아 화면이 깨졌다.
  // 앞으로 디렉터리가 늘어도 같은 문제가 생기지 않도록 범위로 잡는다.
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: {
          50: "#f0f7ff",
          100: "#e0effe",
          500: "#2563eb",
          600: "#1d4ed8",
          700: "#1e40af",
          900: "#0f172a",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
