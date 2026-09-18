import crypto from "crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || "test-secret-for-verification-only-32b";

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
  console.log("=== [Phase 0-4] 에디터 저장/불러오기/수정/삭제 Baseline E2E ===");

  let testUserId: string | null = null;
  let createdDocId: string | null = null;

  try {
    const testEmail = `e2e_baseline_test_${Date.now()}@example.com`;
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        name: "E2E Baseline Tester",
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

    // Step 1: Save document
    console.log("2. 새 문서 저장 요청 (POST /api/documents/save)");
    const dummyHwpxContent = Buffer.from("PK\x03\x04Test HWPX Baseline Content").toString("base64");
    const saveRes = await fetch(`${baseUrl}/api/documents/save`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        fileName: "테스트_사업계획서_기준선.hwpx",
        format: "hwpx",
        contentBase64: dummyHwpxContent,
      }),
    });

    const saveData = await saveRes.json();
    console.log("   저장 응답 상태:", saveRes.status, saveData);
    if (!saveRes.ok || !saveData.success || !saveData.document?.id) {
      throw new Error(`저장 실패: ${JSON.stringify(saveData)}`);
    }
    createdDocId = saveData.document.id;

    // Step 2: List documents
    console.log("3. 문서 목록 조회 요청 (GET /api/documents)");
    const listRes = await fetch(`${baseUrl}/api/documents`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const listData = await listRes.json();
    console.log("   목록 응답 상태:", listRes.status, `문서 수: ${listData.documents?.length}`);
    const foundInList = listData.documents?.some((d: any) => d.id === createdDocId);
    if (!foundInList) throw new Error("목록에서 저장된 문서를 찾을 수 없습니다.");

    // Step 3: Fetch document by ID (returns raw binary)
    console.log(`4. 특정 문서 조회 요청 (GET /api/documents/${createdDocId})`);
    const getRes = await fetch(`${baseUrl}/api/documents/${createdDocId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const getBuffer = Buffer.from(await getRes.arrayBuffer());
    console.log("   단건 조회 상태:", getRes.status, "Content-Type:", getRes.headers.get("content-type"), "바이트 길이:", getBuffer.length);
    if (!getRes.ok || getBuffer.toString("base64") !== dummyHwpxContent) {
      throw new Error("문서 내용 불일치 또는 조회 실패");
    }

    // Step 4: Overwrite/update document
    console.log(`5. 문서 덮어쓰기 저장 요청 (POST /api/documents/save with id=${createdDocId})`);
    const updatedContent = Buffer.from("PK\x03\x04Updated Content").toString("base64");
    const updateRes = await fetch(`${baseUrl}/api/documents/save`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        id: createdDocId,
        fileName: "테스트_사업계획서_기준선_수정됨.hwpx",
        format: "hwpx",
        contentBase64: updatedContent,
      }),
    });
    const updateData = await updateRes.json();
    console.log("   수정 응답 상태:", updateRes.status, updateData);
    if (!updateRes.ok || updateData.document?.fileName !== "테스트_사업계획서_기준선_수정됨.hwpx") {
      throw new Error("문서 수정 실패");
    }

    // Step 5: Delete document
    console.log(`6. 문서 삭제 요청 (DELETE /api/documents/${createdDocId})`);
    const delRes = await fetch(`${baseUrl}/api/documents/${createdDocId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const delData = await delRes.json();
    console.log("   삭제 응답 상태:", delRes.status, delData);
    if (!delRes.ok || !delData.success) throw new Error("문서 삭제 실패");
    createdDocId = null;

    // Step 6: Verify deletion
    console.log("7. 삭제 확인 (GET /api/documents)");
    const listRes2 = await fetch(`${baseUrl}/api/documents`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const listData2 = await listRes2.json();
    const stillExists = listData2.documents?.some((d: any) => d.id === saveData.document.id);
    console.log("   삭제 후 목록 문서 수:", listData2.documents?.length, "존재 여부:", stillExists);
    if (stillExists) throw new Error("삭제 후에도 문서가 목록에 남아 있습니다.");

    console.log("\n>>> Phase 0-4 Baseline E2E 성공! 모든 API 정상 동작 확인. <<<");
  } finally {
    if (createdDocId) {
      await prisma.savedDocument.deleteMany({ where: { id: createdDocId } }).catch(() => {});
    }
    if (testUserId) {
      await prisma.savedDocument.deleteMany({ where: { userId: testUserId } }).catch(() => {});
      await prisma.user.deleteMany({ where: { id: testUserId } }).catch(() => {});
      console.log("8. 테스트 유저 정리 완료.");
    }
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Baseline E2E Error:", err);
  process.exitCode = 1;
});
