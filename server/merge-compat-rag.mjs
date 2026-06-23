import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "rag-db.json");
const compatPath = path.join(__dirname, "rag-compat-chunks.json");

const db = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
const compat = JSON.parse(fs.readFileSync(compatPath, "utf-8"));

const existingIds = new Set(db.chunks.map((c) => c.id));
let added = 0;
for (const ch of compat) {
  if (existingIds.has(ch.id)) {
    // update existing (idempotent re-run)
    const idx = db.chunks.findIndex((c) => c.id === ch.id);
    db.chunks[idx] = ch;
  } else {
    db.chunks.push(ch);
    added++;
  }
}

// update metadata
db.metadata.total_chunks = db.chunks.length;
const section = "K.궁합_관계론";
if (!db.metadata.sections.includes(section)) {
  db.metadata.sections.push(section);
}
db.metadata.version = "1.1";

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), "utf-8");
console.log(`Merged. added=${added}, total_chunks=${db.metadata.total_chunks}`);
console.log("sections:", db.metadata.sections.join(", "));
