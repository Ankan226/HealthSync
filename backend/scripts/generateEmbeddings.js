
const fs = require("fs");
const path = require("path");

const { chunkDataset } = require("../services/chunkingService");
const { generateEmbedding } = require("../services/ollamaService");

const datasetPath = path.join(
  __dirname,
  "../data/healthsync_medlineplus_pilot_topics.json"
);

const outputPath = path.join(
  __dirname,
  "../data/healthsync_medlineplus_chunks_with_embeddings.json"
);

async function main() {
  console.log("\n========== HEALTHSYNC EMBEDDING GENERATION ==========\n");

  if (!fs.existsSync(datasetPath)) {
    throw new Error(`Dataset not found: ${datasetPath}`);
  }

  const dataset = JSON.parse(fs.readFileSync(datasetPath, "utf8"));

  console.log("Dataset loaded.");
  console.log("Topics:", dataset.topics.length);

  // Generate chunks using our approved chunking service
  const chunks = chunkDataset(dataset);

  console.log("Chunks to embed:", chunks.length);
  console.log("\nGenerating embeddings sequentially...");
  console.log("This may take some time on CPU.\n");

  const embeddedChunks = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    console.log(
      `[${i + 1}/${chunks.length}] Embedding: ${chunk.chunkId}`
    );

    // Generate embedding for this chunk's text
    const result = await generateEmbedding(chunk.text);

    // Ollama returns an array of embedding vectors
    const vector = result?.[0];

    if (!Array.isArray(vector) || vector.length === 0) {
      throw new Error(
        `Invalid embedding returned for ${chunk.chunkId}`
      );
    }

    embeddedChunks.push({
      ...chunk,
      embedding: vector,
    });

    console.log(
      `   ✓ Vector generated (${vector.length} dimensions)`
    );
  }

  // Verify that every chunk has a vector of the same dimensions
  const dimensions = embeddedChunks[0].embedding.length;

  const invalidChunks = embeddedChunks.filter(
    (chunk) => chunk.embedding.length !== dimensions
  );

  if (invalidChunks.length > 0) {
    throw new Error("Embedding dimensions do not match across chunks.");
  }

  // Save generated embeddings locally
  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        source: "MedlinePlus",
        datasetDate: dataset.datasetDate || null,
        embeddingModel: "embeddinggemma:latest",
        totalTopics: dataset.topics.length,
        totalChunks: embeddedChunks.length,
        embeddingDimensions: dimensions,
        generatedAt: new Date().toISOString(),
        chunks: embeddedChunks,
      },
      null,
      2
    ),
    "utf8"
  );

  console.log("\n========== EMBEDDING GENERATION COMPLETE ==========");
  console.log("Topics:", dataset.topics.length);
  console.log("Chunks embedded:", embeddedChunks.length);
  console.log("Vector dimensions:", dimensions);
  console.log("Output file:", outputPath);
  console.log("\nAll chunks have valid embeddings.");
}

main().catch((error) => {
  console.error("\nEmbedding generation failed:");
  console.error(error.message);
  process.exit(1);
});
