import crypto from "crypto";
import path from "path";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || "2eea95e4023d11e46678c45ceb6b2ee689fb5ff496be45537b749f05630e93cd";

function b64(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj)).toString("base64url");
}

function sign(header: string, payload: string, secret = JWT_SECRET): string {
  return crypto.createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url");
}

function makeToken(payload: Record<string, unknown>, secret = JWT_SECRET): string {
  const h = b64({ alg: "HS256", typ: "JWT" });
  const p = b64(payload);
  return `${h}.${p}.${sign(h, p, secret)}`;
}

async function main() {
  console.log("=== [Phase 4-1] 최종 전체 API E2E 통합 검증 ===");

  let testUserId: string | null = null;
  let createdDocId: string | null = null;

  try {
    // 1. Create Test User
    const testEmail = `e2e_final_test_${Date.now()}@example.com`;
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        name: "Final E2E Tester",
        role: "USER",
      },
    });
    testUserId = user.id;
    console.log("1. 테스트 유저 생성:", user.id, user.email);

    const token = makeToken({
      sub: user.id,
      email: user.email,
      role: "USER",
      type: "access",
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    const baseUrl = "http://localhost:3000";

    // 2. Upload Existing Plan API
    console.log("2. 기존 사업계획서 안전 업로드 (POST /api/ai/import-plan)");
    const planContent = `
[창업아이템] AI 기반 공공 지원사업 원스톱 작성 솔루션
[대표자] 홍길동 (전화: 010-5555-6666, 이메일: ceo@teststartup.ai)
[문제인식] 중소기업과 스타트업이 정부지원사업 공고를 찾고 서식에 맞게 사업계획서를 작성하는 데 평균 40시간 이상 소요됩니다.
[해결방안] 공고문 자동 분석 엔진과 PSST 표준 맞춤 작성 도우미를 제공하여 작성 시간을 80% 단축합니다.
[성장전략] 월 39,000원의 구독형 SaaS 및 기업 맞춤형 컨설팅 패키지를 제공합니다.
[팀구성] AI 및 웹 엔지니어링 경력 10년 이상의 핵심 인력으로 구성되어 있습니다.
`;
    const formData = new FormData();
    formData.append("file", new File([Buffer.from(planContent)], "기존_사업계획서_테스트.txt", { type: "text/plain" }));

    const uploadRes = await fetch(`${baseUrl}/api/ai/import-plan`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    const uploadData = await uploadRes.json();
    console.log("   업로드 응답 상태:", uploadRes.status, "성공 여부:", uploadData.success);
    console.log("   추출 글자수:", uploadData.returnedCharacters, "마스킹 건수:", uploadData.maskedCount);
    if (!uploadRes.ok || !uploadData.success || uploadData.text.includes("010-5555-6666")) {
      throw new Error("사업계획서 업로드 및 개인정보 마스킹 실패");
    }

    // 3. Auto-Mapping API
    console.log("3. AI 항목 자동 매핑 API (POST /api/ai/import-plan/map)");
    const mapRes = await fetch(`${baseUrl}/api/ai/import-plan/map`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        text: uploadData.text,
      }),
    });
    const mapData = await mapRes.json();
    console.log("   매핑 응답 상태:", mapRes.status, "매핑 결과:", mapData.mappedPlan ? "정상 수신" : "실패");
    if (!mapRes.ok || !mapData.success) {
      throw new Error(`자동 매핑 실패: ${JSON.stringify(mapData)}`);
    }

    // 4. Save Document API
    console.log("4. 에디터 문서 저장 (POST /api/documents/save)");
    const dummyHwpx = Buffer.from("PK\x03\x04Final E2E HWPX Document Content").toString("base64");
    const saveRes = await fetch(`${baseUrl}/api/documents/save`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        fileName: "최종_사업계획서_E2E.hwpx",
        format: "hwpx",
        contentBase64: dummyHwpx,
      }),
    });
    const saveResText = await saveRes.text();
    let saveData: any;
    try {
      saveData = JSON.parse(saveResText);
    } catch (e) {
      console.error("   저장 응답 본문:", saveRes.status, saveResText.slice(0, 500));
      throw new Error(`저장 응답이 JSON이 아닙니다 (HTTP ${saveRes.status})`);
    }
    console.log("   저장 상태:", saveRes.status, "생성 ID:", saveData.document?.id);
    if (!saveRes.ok || !saveData.success || !saveData.document?.id) {
      throw new Error("문서 저장 실패");
    }
    createdDocId = saveData.document.id;

    // 5. List Documents
    console.log("5. 저장 문서 목록 조회 (GET /api/documents)");
    const listRes = await fetch(`${baseUrl}/api/documents`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const listData = await listRes.json();
    const found = listData.documents?.some((d: any) => d.id === createdDocId);
    console.log("   목록 문서 수:", listData.documents?.length, "저장 문서 포함 여부:", found);
    if (!found) throw new Error("저장 문서 목록 조회 실패");

    // 6. Fetch Document Binary
    console.log(`6. 단건 문서 바이너리 조회 (GET /api/documents/${createdDocId})`);
    const getRes = await fetch(`${baseUrl}/api/documents/${createdDocId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const getBuffer = Buffer.from(await getRes.arrayBuffer());
    console.log("   조회 상태:", getRes.status, "바이트 일치:", getBuffer.toString("base64") === dummyHwpx);
    if (!getRes.ok || getBuffer.toString("base64") !== dummyHwpx) {
      throw new Error("단건 문서 조회 불일치");
    }

    // 7. Overwrite / Update Document
    console.log(`7. 문서 덮어쓰기 저장 (POST /api/documents/save with id=${createdDocId})`);
    const updatedHwpx = Buffer.from("PK\x03\x04Final Updated HWPX").toString("base64");
    const updateRes = await fetch(`${baseUrl}/api/documents/save`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        id: createdDocId,
        fileName: "최종_사업계획서_E2E_수정본.hwpx",
        format: "hwpx",
        contentBase64: updatedHwpx,
      }),
    });
    const updateData = await updateRes.json();
    console.log("   수정 상태:", updateRes.status, "파일명:", updateData.document?.fileName);
    if (!updateRes.ok || updateData.document?.fileName !== "최종_사업계획서_E2E_수정본.hwpx") {
      throw new Error("문서 수정 실패");
    }

    // 8. Delete Document
    console.log(`8. 문서 삭제 (DELETE /api/documents/${createdDocId})`);
    const delRes = await fetch(`${baseUrl}/api/documents/${createdDocId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const delData = await delRes.json();
    console.log("   삭제 상태:", delRes.status, "성공 여부:", delData.success);
    if (!delRes.ok || !delData.success) throw new Error("문서 삭제 실패");
    createdDocId = null; // Successfully deleted

    // 9. Verify Deletion
    console.log("9. 삭제 후 목록 재확인 (GET /api/documents)");
    const listRes2 = await fetch(`${baseUrl}/api/documents`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const listData2 = await listRes2.json();
    const existsAfterDelete = listData2.documents?.some((d: any) => d.id === saveData.document.id);
    console.log("   삭제 후 목록 크기:", listData2.documents?.length, "존재 여부:", existsAfterDelete);
    if (existsAfterDelete) throw new Error("삭제 후에도 문서가 존재합니다.");

    console.log("\n=================================================");
    console.log("🎉 [Phase 4-1] 최종 전체 API E2E 통합 테스트 100% 통과! 🎉");
    console.log("=================================================");
  } finally {
    // Guaranteed cleanup regardless of error or success
    if (createdDocId) {
      await prisma.savedDocument.deleteMany({ where: { id: createdDocId } }).catch(() => {});
    }
    if (testUserId) {
      await prisma.savedDocument.deleteMany({ where: { userId: testUserId } }).catch(() => {});
      await prisma.user.deleteMany({ where: { id: testUserId } }).catch(() => {});
      console.log("10. 테스트 유저 및 잔여 문서 정리 완료.");
    }
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("최종 API E2E 검증 오류:", err);
  process.exitCode = 1;
});
