import "dotenv/config";
import { Client } from "pg";

async function testSupabase() {
  const connectionString = process.env.DATABASE_URL;
  console.log("Testing connection string in .env...");

  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log("🎉 SUCCESS! Connected to Supabase PostgreSQL Database!");
    const res = await client.query("SELECT NOW()");
    console.log("DB Time:", res.rows[0]);
    await client.end();
  } catch (err: any) {
    console.error("Connection failed:", err.message);
  }
}

testSupabase();
