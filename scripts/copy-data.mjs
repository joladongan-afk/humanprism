/**
 * 빌드 후 런타임 데이터 파일을 dist/로 복사하는 크로스플랫폼 스크립트.
 *
 * 배경:
 * - 빌드는 `esbuild --packages=external`로 server 코드만 번들링하므로
 *   런타임에 fs로 읽는 데이터 파일(rag-db.json, calendar_data.csv 등)은
 *   dist/에 포함되지 않는다.
 * - 게시본에서 마스터 상담(RAG)과 만세력 계산이 이 파일들을 찾지 못하면 실패한다.
 * - 쉘의 `cp`는 배포 환경에 따라 없을 수 있어 빌드가 깨질 위험이 있으므로
 *   모든 환경에 존재하는 Node fs API로 안전하게 복사한다.
 *
 * 복사 대상은 "있으면 복사, 없으면 조용히 skip"으로 처리해
 * 일부 파일이 없어도 빌드가 실패하지 않게 한다.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const dist = path.join(root, "dist");
const distData = path.join(dist, "data");

// dist/ 와 dist/data/ 보장
fs.mkdirSync(dist, { recursive: true });
fs.mkdirSync(distData, { recursive: true });

/**
 * @param {string} src  복사할 원본 (root 기준 상대경로)
 * @param {string} dest 대상 (dist 기준 상대경로)
 */
function copyIfExists(src, dest) {
  const from = path.join(root, src);
  const to = path.join(dist, dest);
  if (!fs.existsSync(from)) {
    console.warn(`[copy-data] skip (not found): ${src}`);
    return;
  }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
  const size = fs.statSync(to).size;
  console.log(`[copy-data] copied: ${src} -> dist/${dest} (${size} bytes)`);
}

// RAG 상담 데이터 (개인/궁합 상담 공통)
copyIfExists("server/rag-db.json", "rag-db.json");
// 과거 잔재이지만 안전하게 함께 복사 (현재 런타임 미사용)
copyIfExists("server/rag-compat-chunks.json", "rag-compat-chunks.json");
// 만세력 계산 데이터
copyIfExists("server/data/calendar_data.csv", "data/calendar_data.csv");

console.log("[copy-data] done.");
