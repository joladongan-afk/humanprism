/**
 * RAG 벡터 DB 구축 스크립트
 * 지침 문서들을 로드하고 벡터 DB에 저장
 */

import fs from "fs";
import path from "path";
import { invokeLLM } from "./_core/llm";

interface Document {
  id: string;
  title: string;
  content: string;
  category: string;
  chunks: Chunk[];
}

interface Chunk {
  id: string;
  text: string;
  embedding?: number[];
  metadata: {
    docId: string;
    docTitle: string;
    category: string;
    chunkIndex: number;
  };
}

// 문서 로드
async function loadDocuments(): Promise<Document[]> {
  const uploadDir = "/home/ubuntu/upload";
  const documents: Document[] = [];

  const files = [
    {
      path: "지침1_사고프레임_훈련적용사례.txt.txt",
      title: "지침1: 사고 프레임",
      category: "thinking_framework",
    },
    {
      path: "지침2_사주풀이_룰셋백과.txt.txt",
      title: "지침2: 룰셋백과 (43개 규칙)",
      category: "rule_core",
    },
    {
      path: "지침3_사주풀이_관법지침.txt.txt",
      title: "지침3: 관법지침 (700개 관법)",
      category: "gwanbeop_seasonal",
    },
    {
      path: "지침4_마스터_추출본.txt.txt",
      title: "지침4: 마스터 추출본",
      category: "rule_core",
    },
  ];

  for (const file of files) {
    const filePath = path.join(uploadDir, file.path);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      documents.push({
        id: file.category,
        title: file.title,
        content,
        category: file.category,
        chunks: [],
      });
      console.log(`✓ 로드: ${file.title} (${content.length} bytes)`);
    } else {
      console.warn(`✗ 파일 없음: ${filePath}`);
    }
  }

  return documents;
}

// 문서를 청크로 분할
function chunkDocument(doc: Document, chunkSize: number = 1000): Chunk[] {
  const chunks: Chunk[] = [];
  const text = doc.content;
  const lines = text.split("\n");
  let currentChunk = "";
  let chunkIndex = 0;

  for (const line of lines) {
    if ((currentChunk + line).length > chunkSize && currentChunk.length > 0) {
      chunks.push({
        id: `${doc.id}_chunk_${chunkIndex}`,
        text: currentChunk.trim(),
        metadata: {
          docId: doc.id,
          docTitle: doc.title,
          category: doc.category,
          chunkIndex,
        },
      });
      currentChunk = line;
      chunkIndex++;
    } else {
      currentChunk += (currentChunk ? "\n" : "") + line;
    }
  }

  if (currentChunk.trim()) {
    chunks.push({
      id: `${doc.id}_chunk_${chunkIndex}`,
      text: currentChunk.trim(),
      metadata: {
        docId: doc.id,
        docTitle: doc.title,
        category: doc.category,
        chunkIndex,
      },
    });
  }

  return chunks;
}

// 임베딩 생성 (배치 처리)
async function generateEmbeddings(chunks: Chunk[]): Promise<Chunk[]> {
  console.log(`\n임베딩 생성 중... (${chunks.length}개 청크)`);

  // 배치 크기 설정 (API 제한 고려)
  const batchSize = 10;
  const totalBatches = Math.ceil(chunks.length / batchSize);

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;

    console.log(`배치 ${batchNum}/${totalBatches} 처리 중...`);

    for (const chunk of batch) {
      try {
        // 간단한 임베딩 생성 (실제로는 벡터 임베딩 API 사용)
        // 여기서는 텍스트의 해시 기반 간단한 벡터 생성
        const embedding = generateSimpleEmbedding(chunk.text);
        chunk.embedding = embedding;
      } catch (error) {
        console.error(`임베딩 생성 실패: ${chunk.id}`, error);
      }
    }

    // API 레이트 제한 회피
    if (batchNum < totalBatches) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return chunks;
}

// 간단한 임베딩 생성 (해시 기반)
function generateSimpleEmbedding(text: string): number[] {
  // 실제 구현에서는 LLM의 임베딩 API 사용
  // 여기서는 텍스트의 문자 코드 기반 간단한 벡터 생성
  const embedding: number[] = [];
  const words = text.split(/\s+/).slice(0, 100); // 처음 100개 단어만 사용

  for (let i = 0; i < 384; i++) {
    // 384차원 벡터
    let value = 0;
    for (const word of words) {
      value +=
        word.charCodeAt(i % word.length) *
        Math.sin((i + 1) * (word.length + 1));
    }
    embedding.push(value / (words.length || 1));
  }

  return embedding;
}

// 벡터 DB 저장 (JSON 형식)
function saveVectorDB(chunks: Chunk[], outputPath: string): void {
  const db = {
    version: "1.0",
    createdAt: new Date().toISOString(),
    totalChunks: chunks.length,
    chunks,
  };

  fs.writeFileSync(outputPath, JSON.stringify(db, null, 2));
  console.log(`\n✓ 벡터 DB 저장: ${outputPath}`);
}

// 메인 실행
async function main() {
  console.log("=== RAG 벡터 DB 1차 구축 시작 ===\n");

  try {
    // 1. 문서 로드
    console.log("[1/4] 문서 로드 중...");
    const documents = await loadDocuments();
    console.log(`총 ${documents.length}개 문서 로드됨\n`);

    // 2. 청크 분할
    console.log("[2/4] 문서 청크 분할 중...");
    let totalChunks = 0;
    const allChunks: Chunk[] = [];

    for (const doc of documents) {
      const chunks = chunkDocument(doc, 1000);
      doc.chunks = chunks;
      allChunks.push(...chunks);
      totalChunks += chunks.length;
      console.log(`  ${doc.title}: ${chunks.length}개 청크`);
    }
    console.log(`총 ${totalChunks}개 청크 생성됨\n`);

    // 3. 임베딩 생성
    console.log("[3/4] 임베딩 생성 중...");
    const chunksWithEmbeddings = await generateEmbeddings(allChunks);
    console.log(`✓ 임베딩 생성 완료\n`);

    // 4. 벡터 DB 저장
    console.log("[4/4] 벡터 DB 저장 중...");
    const outputPath = path.join(
      process.cwd(),
      "server",
      "rag-db.json"
    );
    saveVectorDB(chunksWithEmbeddings, outputPath);

    console.log("\n=== RAG 벡터 DB 1차 구축 완료 ===");
    console.log(`총 ${chunksWithEmbeddings.length}개 청크 저장됨`);
  } catch (error) {
    console.error("RAG 구축 중 오류:", error);
    process.exit(1);
  }
}

main();
