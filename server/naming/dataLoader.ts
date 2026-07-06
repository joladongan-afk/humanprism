/**
 * 작명 서비스 데이터 로더
 * 
 * CSV 파일들을 메모리에 로드하여 빠른 조회를 지원한다.
 * 서버 시작 시 한 번만 로드되고, 이후 메모리에서 조회된다.
 */

import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";

/**
 * 한자 데이터: { char: 한자, radical: 부수, ohaeng: 오행, huneum: 훈음, strokes: 획수 }
 */
export interface HanjaRecord {
  char: string;
  radical: string;
  ohaeng: "木" | "火" | "土" | "金" | "水";
  huneum: string;
  strokes: number;
}

/**
 * 수리사격 길흉표: { number: 1-81, gilhyung: 길흉, description: 풀이 }
 */
export interface SurisaegeonRecord {
  number: number;
  gilhyung: "吉" | "凶" | "半吉半凶";
  description: string;
}

/**
 * 불용문자: { char: 한자, huneum: 훈음, reason: 불용사유 }
 */
export interface BulmyongRecord {
  char: string;
  huneum: string;
  reason: string;
}

/**
 * 롤링 코멘트: { type: 유형, comments: 코멘트 배열 }
 */
export interface RollingCommentsData {
  all_pass: string[];
  jawon_fail: string[];
  suri_fail: string[];
  bulmyong: string[];
  all_fail: string[];
}

// 메모리 캐시
let hanjaDb: Map<string, HanjaRecord> = new Map();
let surisaegeonDb: Map<number, SurisaegeonRecord> = new Map();
let bulmyongDb: Set<string> = new Set();
let rollingComments: RollingCommentsData | null = null;

/**
 * 한자 DB 로드 (hanja_final_db.csv)
 */
export function loadHanjaDb(): Map<string, HanjaRecord> {
  if (hanjaDb.size > 0) return hanjaDb;

  try {
    const filePath = path.join(process.cwd(), "server/naming/data/hanja_final_db.csv");
    const fileContent = fs.readFileSync(filePath, "utf-8");
    
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      encoding: "utf-8",
    }) as Array<{
      char: string;
      radical: string;
      ohaeng: string;
      huneum: string;
      strokes: string;
    }>;

    records.forEach((record) => {
      hanjaDb.set(record.char, {
        char: record.char,
        radical: record.radical,
        ohaeng: record.ohaeng as "木" | "火" | "土" | "金" | "水",
        huneum: record.huneum || "",
        strokes: parseInt(record.strokes, 10) || 0,
      });
    });

    console.log(`[Naming] Loaded ${hanjaDb.size} hanja records`);
    return hanjaDb;
  } catch (error) {
    console.error("[Naming] Failed to load hanja DB:", error);
    return new Map();
  }
}

/**
 * 수리사격 길흉표 로드 (surisageon_81.csv)
 */
export function loadSurisaegeonDb(): Map<number, SurisaegeonRecord> {
  if (surisaegeonDb.size > 0) return surisaegeonDb;

  try {
    const filePath = path.join(process.cwd(), "server/naming/data/surisageon_81.csv");
    const fileContent = fs.readFileSync(filePath, "utf-8");
    
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      encoding: "utf-8",
    }) as Array<{
      number: string;
      gilhyung: string;
      description: string;
    }>;

    records.forEach((record) => {
      const num = parseInt(record.number, 10);
      surisaegeonDb.set(num, {
        number: num,
        gilhyung: record.gilhyung as "吉" | "凶" | "半吉半凶",
        description: record.description,
      });
    });

    console.log(`[Naming] Loaded ${surisaegeonDb.size} surisageon records`);
    return surisaegeonDb;
  } catch (error) {
    console.error("[Naming] Failed to load surisageon DB:", error);
    return new Map();
  }
}

/**
 * 불용문자 로드 (bulmyong.csv)
 */
export function loadBulmyongDb(): Set<string> {
  if (bulmyongDb.size > 0) return bulmyongDb;

  try {
    const filePath = path.join(process.cwd(), "server/naming/data/bulmyong.csv");
    const fileContent = fs.readFileSync(filePath, "utf-8");
    
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      encoding: "utf-8",
    }) as Array<{
      char: string;
      huneum: string;
      reason: string;
    }>;

    records.forEach((record) => {
      bulmyongDb.add(record.char);
    });

    console.log(`[Naming] Loaded ${bulmyongDb.size} bulmyong records`);
    return bulmyongDb;
  } catch (error) {
    console.error("[Naming] Failed to load bulmyong DB:", error);
    return new Set();
  }
}

/**
 * 롤링 코멘트 로드 (rolling_comments.json)
 */
export function loadRollingComments(): RollingCommentsData {
  if (rollingComments) return rollingComments;

  try {
    const filePath = path.join(process.cwd(), "server/naming/data/rolling_comments.json");
    const fileContent = fs.readFileSync(filePath, "utf-8");
    rollingComments = JSON.parse(fileContent) as RollingCommentsData;

    console.log(`[Naming] Loaded rolling comments`);
    return rollingComments;
  } catch (error) {
    console.error("[Naming] Failed to load rolling comments:", error);
    return {
      all_pass: [],
      jawon_fail: [],
      suri_fail: [],
      bulmyong: [],
      all_fail: [],
    };
  }
}

/**
 * 모든 데이터 초기화 (서버 시작 시 호출)
 */
export function initializeNamingData() {
  console.log("[Naming] Initializing naming service data...");
  loadHanjaDb();
  loadSurisaegeonDb();
  loadBulmyongDb();
  loadRollingComments();
  console.log("[Naming] Data initialization complete");
}

/**
 * 조회 함수들
 */
export function getHanja(char: string): HanjaRecord | undefined {
  return hanjaDb.get(char);
}

export function getSurisageon(number: number): SurisaegeonRecord | undefined {
  return surisaegeonDb.get(number);
}

export function isBulmyong(char: string): boolean {
  return bulmyongDb.has(char);
}

export function getRandomComment(type: keyof RollingCommentsData): string {
  if (!rollingComments || !rollingComments[type] || rollingComments[type].length === 0) {
    return "";
  }
  const comments = rollingComments[type];
  return comments[Math.floor(Math.random() * comments.length)];
}
/**
 * 한글 독음으로 한자 검색 (드롭다운용)
 * huneum 형식: "- 원" → 뒤의 독음 부분으로 검색
 */
export function searchHanjaBySound(sound: string, limit: number = 30): HanjaRecord[] {
  if (!sound || sound.trim().length === 0) return [];
  const query = sound.trim();
  const results: HanjaRecord[] = [];
  for (const record of hanjaDb.values()) {
    // huneum 예: "- 원" 또는 "근원 원" 등
    const parts = record.huneum.split(" ");
    const lastPart = parts[parts.length - 1];
    if (lastPart === query) {
      results.push(record);
    }
    if (results.length >= limit) break;
  }
  return results;
}

/**
 * 모드D 전용: 특정 한글 음절에 해당하는 한자를 DB에서 전수 탐색 (limit 없음)
 * 음절이 확정된 모드D에서 DB 순서에 의한 limit 잘림 문제를 근본 해결하기 위해 추가.
 */
export function searchHanjaBySoundAll(sound: string): HanjaRecord[] {
  if (!sound || sound.trim().length === 0) return [];
  const query = sound.trim();
  const results: HanjaRecord[] = [];
  for (const record of hanjaDb.values()) {
    const parts = record.huneum.split(" ");
    const lastPart = parts[parts.length - 1];
    if (lastPart === query) {
      results.push(record);
    }
  }
  return results;
}

/**
 * 난강망 120분면 데이터: 일간×월지 → 복덕오행
 */
export interface NangangmangRecord {
  ilgan: string;       // 天干 (甲乙丙丁戊己庚辛壬癸)
  birthMonth: string;  // 地支 (子丑寅卯辰巳午未申酉戌亥)
  primaryElement: string; // 1순위 복덕오행 (木火土金水)
}

// 오행 상생 (생하는 오행)
const OHAENG_SHENG: Record<string, string> = {
  "木": "水", "火": "木", "土": "火", "金": "土", "水": "金",
};

// 메모리 캐시
let nangangmangDb: Map<string, NangangmangRecord> = new Map();

/**
 * 난강망 120분면 로드
 */
export function loadNangangmangDb(): Map<string, NangangmangRecord> {
  if (nangangmangDb.size > 0) return nangangmangDb;

  try {
    const filePath = path.join(process.cwd(), "data/nangangmang_120_matrix.csv");
    const fileContent = fs.readFileSync(filePath, "utf-8");

    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      encoding: "utf-8",
    }) as Array<{
      ilgan: string;
      birth_month: string;
      primary_element: string;
      secondary_element: string;
      reason: string;
    }>;

    records.forEach((record) => {
      const key = `${record.ilgan}_${record.birth_month}`;
      nangangmangDb.set(key, {
        ilgan: record.ilgan,
        birthMonth: record.birth_month,
        primaryElement: record.primary_element,
      });
    });

    console.log(`[Naming] Loaded ${nangangmangDb.size} nangangmang records`);
    return nangangmangDb;
  } catch (error) {
    console.error("[Naming] Failed to load nangangmang DB:", error);
    return new Map();
  }
}

/**
 * 일간+월지로 복덕오행 조회
 * @returns { primary: 1순위오행, secondary: 1순위를 생하는 오행 }
 */
export function getRequiredOhaeng(ilgan: string, birthMonth: string): { primary: string; secondary: string } | null {
  if (nangangmangDb.size === 0) loadNangangmangDb();
  const key = `${ilgan}_${birthMonth}`;
  const record = nangangmangDb.get(key);
  if (!record) return null;
  const primary = record.primaryElement;
  const secondary = OHAENG_SHENG[primary] || "";
  return { primary, secondary };
}


