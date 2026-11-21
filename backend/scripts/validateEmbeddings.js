const fs = require("fs");
const path = require("path");

const filePath = path.join(
  __dirname,
  "../data/healthsync_medlineplus_chunks_with_embeddings.json"
);

console.log("\n========== HEALTHSYNC EMBEDDING VALIDATION ==========\n");

// 1. Check whether output file exists
if (!fs.existsSync(filePath)) {
  console.error("❌ Embeddings file not found!");
  process.exit(1);
}

// 2. Load saved data
const dataset = JSON.parse(fs.readFileSync(filePath, "utf8"));

const chunks = dataset.chunks;

if (!Array.isArray(chunks)) {
  console.error("❌ Chunks array is missing!");
  process.exit(1);
}

console.log("File loaded successfully.");
console.log(`Total chunks: ${chunks.length}`);
console.log(`Embedding model: ${dataset.embeddingModel || "Not specified"}`);
console.log(`Expected dimensions: ${dataset.dimensions || 768}\n`);

// 3. Validation counters
let errors = 0;
let validChunks = 0;
const chunkIds = new Set();
const dimensionsSet = new Set();

console.log("Validating individual chunks...\n");

// 4. Check every chunk
chunks.forEach((chunk, index) => {
  const chunkNumber = index + 1;

  // Check chunk ID
  if (!chunk.chunkId) {
    console.error(`[${chunkNumber}] ❌ Missing chunkId`);
    errors++;
  } else if (chunkIds.has(chunk.chunkId)) {
    console.error(`[${chunkNumber}] ❌ Duplicate chunkId: ${chunk.chunkId}`);
    errors++;
  } else {
    chunkIds.add(chunk.chunkId);
  }

  // Check topic ID
  if (!chunk.topicId) {
    console.error(`[${chunkNumber}] ❌ Missing topicId`);
    errors++;
  }

  // Check text
  if (!chunk.text || chunk.text.trim().length === 0) {
    console.error(`[${chunkNumber}] ❌ Missing or empty text`);
    errors++;
  }

  // Check embedding
  const embedding = chunk.embedding || chunk.vector || chunk.embeddings;

  if (!Array.isArray(embedding)) {
    console.error(`[${chunkNumber}] ❌ Embedding is missing or not an array`);
    errors++;
    return;
  }

  // Check dimensions
  if (embedding.length !== 768) {
    console.error(
      `[${chunkNumber}] ❌ Wrong dimensions: ${embedding.length}`
    );
    errors++;
  } else {
    dimensionsSet.add(embedding.length);
  }

  // Check values are valid numbers
  const invalidValues = embedding.filter(
    (value) => typeof value !== "number" || !Number.isFinite(value)
  );

  if (invalidValues.length > 0) {
    console.error(
      `[${chunkNumber}] ❌ Invalid numeric values: ${invalidValues.length}`
    );
    errors++;
  }

  // Check vector is not empty/zero
  const magnitude = Math.sqrt(
    embedding.reduce((sum, value) => sum + value * value, 0)
  );

  if (magnitude === 0) {
    console.error(`[${chunkNumber}] ❌ Zero vector detected`);
    errors++;
  }

  if (
    chunk.chunkId &&
    chunk.topicId &&
    chunk.text &&
    embedding.length === 768 &&
    invalidValues.length === 0 &&
    magnitude > 0
  ) {
    validChunks++;
  }
});

// 5. Final report
console.log("\n========== VALIDATION REPORT ==========\n");

console.log(`Total chunks: ${chunks.length}`);
console.log(`Valid chunks: ${validChunks}`);
console.log(`Unique chunk IDs: ${chunkIds.size}`);
console.log(`Vector dimensions found: ${[...dimensionsSet].join(", ")}`);
console.log(`Errors found: ${errors}`);

if (errors === 0 && validChunks === chunks.length && chunks.length === 36) {
  console.log("\n✅ ALL EMBEDDINGS PASSED VALIDATION!");
  console.log("✅ All 36 chunks have valid 768-dimensional vectors.");
  console.log("✅ Data is ready for the next stage.");
} else {
  console.log("\n❌ VALIDATION FAILED.");
  console.log("Please fix the reported issues before proceeding.");
}

console.log("\n=====================================\n");