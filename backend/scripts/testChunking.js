
const fs = require("fs");
const path = require("path");

const { chunkDataset } = require("../services/chunkingService");

// Dataset file location
const datasetPath = path.join(
  __dirname,
  "../data/healthsync_medlineplus_pilot_topics.json"
);

console.log("\n========== HEALTHSYNC CHUNKING TEST ==========\n");

if (!fs.existsSync(datasetPath)) {
  console.error("Dataset file not found!");
  console.error("Expected location:", datasetPath);
  process.exit(1);
}

try {
  // Load the dataset
  const dataset = JSON.parse(fs.readFileSync(datasetPath, "utf8"));

  console.log("Dataset loaded successfully.");
  console.log("Topics found:", dataset.topics.length);

  // Generate chunks
  const chunks = chunkDataset(dataset);

  console.log("\nChunking completed successfully.");
  console.log("Total chunks generated:", chunks.length);

  // Calculate statistics
  const wordCounts = chunks.map((chunk) => chunk.wordCount);

  const totalWords = wordCounts.reduce((sum, count) => sum + count, 0);

  const averageWords =
    chunks.length > 0 ? Math.round(totalWords / chunks.length) : 0;

  const smallestChunk = chunks.length > 0 ? Math.min(...wordCounts) : 0;
  const largestChunk = chunks.length > 0 ? Math.max(...wordCounts) : 0;

  console.log("\n========== CHUNK STATISTICS ==========");
  console.log("Total chunks:", chunks.length);
  console.log("Total words across chunks:", totalWords);
  console.log("Average words per chunk:", averageWords);
  console.log("Smallest chunk:", smallestChunk, "words");
  console.log("Largest chunk:", largestChunk, "words");

  // Check size limits
  const oversizedChunks = chunks.filter(
    (chunk) => chunk.wordCount > 300
  );

  const smallChunks = chunks.filter(
    (chunk) => chunk.wordCount < 50
  );

  console.log("\n========== SIZE CHECK ==========");
  console.log("Chunks over 300 words:", oversizedChunks.length);
  console.log("Chunks under 50 words:", smallChunks.length);

  // Per-topic statistics
  console.log("\n========== PER-TOPIC RESULTS ==========");

  const topicStats = {};

  for (const chunk of chunks) {
    if (!topicStats[chunk.topicTitle]) {
      topicStats[chunk.topicTitle] = {
        chunks: 0,
        words: 0,
      };
    }

    topicStats[chunk.topicTitle].chunks++;
    topicStats[chunk.topicTitle].words += chunk.wordCount;
  }

  for (const [topic, stats] of Object.entries(topicStats)) {
    console.log(
      `${topic}: ${stats.chunks} chunks, ${stats.words} words`
    );
  }

  // Display sample chunks
  console.log("\n========== SAMPLE CHUNKS ==========");

  const samples = chunks.slice(0, 3);

  for (const chunk of samples) {
    console.log("\n-----------------------------------");
    console.log("Chunk ID:", chunk.chunkId);
    console.log("Topic:", chunk.topicTitle);
    console.log("Chunk index:", chunk.chunkIndex);
    console.log("Word count:", chunk.wordCount);
    console.log("Source URL:", chunk.sourceUrl);
    console.log("Text preview:\n", chunk.text.slice(0, 700));
  }

  // Verify overlap for Diabetes topic
  console.log("\n========== OVERLAP VERIFICATION (DIABETES) ==========");

  const diabetesChunks = chunks.filter(
    (chunk) => chunk.topicTitle === "Diabetes"
  );

  for (const chunk of diabetesChunks) {
    console.log("\nChunk:", chunk.chunkIndex + 1);
    console.log("Words:", chunk.wordCount);

    console.log(
      "First 50 words:\n",
      chunk.content.split(/\s+/).slice(0, 50).join(" ")
    );
  }

  console.log("\n========== TEST FINISHED ==========\n");
} catch (error) {
  console.error("\nChunking test failed:");
  console.error(error.message);
  process.exit(1);
}
