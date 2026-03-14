import axios from "axios";
import { sql } from "drizzle-orm";

import { db } from "../lib/db";

type CheckResult = {
  name: string;
  ok: boolean;
  details?: string;
};

const green = "\x1b[32m";
const red = "\x1b[31m";
const reset = "\x1b[0m";

function logResult(result: CheckResult) {
  if (result.ok) {
    console.log(`${green}[OK]${reset} ${result.name}`);
  } else {
    console.error(`${red}[X]${reset} ${result.name}${result.details ? ` - ${result.details}` : ""}`);
  }
}

function hasEnv(name: string) {
  return Boolean(process.env[name] && process.env[name]!.trim().length > 0);
}

async function checkDatabase(): Promise<CheckResult> {
  try {
    await db.execute(sql`select 1`);
    return { name: "NeonDB connection", ok: true };
  } catch (error) {
    return { name: "NeonDB connection", ok: false, details: String(error) };
  }
}

async function checkChroma(): Promise<CheckResult> {
  try {
    const url = process.env.CHROMA_URL || "http://localhost:8000";
    const response = await axios.get(`${url}/api/v1/heartbeat`, { timeout: 10000 });
    return {
      name: "ChromaDB connection",
      ok: response.status >= 200 && response.status < 300,
      details: `status=${response.status}`,
    };
  } catch (error) {
    return { name: "ChromaDB connection", ok: false, details: String(error) };
  }
}

async function checkGroq(): Promise<CheckResult> {
  if (!hasEnv("GROQ_API_KEY")) {
    return { name: "Groq API key", ok: false, details: "GROQ_API_KEY missing" };
  }

  try {
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: "health-check" }],
        max_tokens: 1,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      },
    );

    return { name: "Groq API key", ok: response.status >= 200 && response.status < 300 };
  } catch (error) {
    return { name: "Groq API key", ok: false, details: String(error) };
  }
}

async function checkCloudinary(): Promise<CheckResult> {
  const required = [
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
  ];
  const missing = required.filter((item) => !hasEnv(item));

  return {
    name: "Cloudinary credentials",
    ok: missing.length === 0,
    details: missing.length > 0 ? `missing: ${missing.join(", ")}` : undefined,
  };
}

async function checkClerk(): Promise<CheckResult> {
  const required = ["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY"];
  const missing = required.filter((item) => !hasEnv(item));

  return {
    name: "Clerk credentials",
    ok: missing.length === 0,
    details: missing.length > 0 ? `missing: ${missing.join(", ")}` : undefined,
  };
}

async function checkEnvPresence(): Promise<CheckResult> {
  const required = [
    "DATABASE_URL",
    "GROQ_API_KEY",
    "GROQ_MODEL",
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    "CLERK_SECRET_KEY",
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
    "CHROMA_URL",
    "ADMIN_SECRET_KEY",
    "NEXT_PUBLIC_APP_URL",
  ];

  const missing = required.filter((item) => !hasEnv(item));

  return {
    name: "Required environment variables",
    ok: missing.length === 0,
    details: missing.length > 0 ? `missing: ${missing.join(", ")}` : undefined,
  };
}

async function main() {
  console.log("Running pre-deploy checks...\n");

  const checks: CheckResult[] = [];
  checks.push(await checkEnvPresence());
  checks.push(await checkDatabase());
  checks.push(await checkChroma());
  checks.push(await checkGroq());
  checks.push(await checkCloudinary());
  checks.push(await checkClerk());

  checks.forEach(logResult);

  const failed = checks.filter((check) => !check.ok);

  if (failed.length > 0) {
    console.error(`\n${red}${failed.length} checks failed. Deployment aborted.${reset}`);
    process.exit(1);
  }

  console.log(`\n${green}All checks passed. Ready to deploy.${reset}`);
}

void main();
