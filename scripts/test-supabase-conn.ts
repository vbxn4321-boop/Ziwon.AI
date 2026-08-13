import "dotenv/config";
import { prisma } from "../src/lib/db";

async function testSupabase() {
  console.log("Testing connection string in .env...");
  try {
    const count = await prisma.supportProgram.count();
    console.log("🎉 SUCCESS! Connected to Supabase PostgreSQL Database! Total notices:", count);
  } catch (err: any) {
    console.error("Connection failed:", err.message);
  }
}

testSupabase()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
