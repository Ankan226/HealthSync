const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

// Explicitly load .env from backend root
require("dotenv").config({
  path: path.join(__dirname, "../.env"),
});

const MedicalKnowledge = require("../models/medicalKnowledge");

const filePath = path.join(
  __dirname,
  "../data/healthsync_medlineplus_chunks_with_embeddings.json"
);

async function importMedicalKnowledge() {
  try {
    console.log("\n========== MEDICAL KNOWLEDGE IMPORT ==========\n");

    // 1. Check file exists
    if (!fs.existsSync(filePath)) {
      throw new Error("Embedding JSON file not found!");
    }

    // 2. Read the generated embeddings file
    const dataset = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const chunks = dataset.chunks;

    if (!Array.isArray(chunks) || chunks.length === 0) {
      throw new Error("No chunks found in the JSON file.");
    }

    console.log(`Chunks found: ${chunks.length}`);

    // 3. Validate before connecting/inserting
    for (const chunk of chunks) {
      const embedding =
        chunk.embedding || chunk.vector || chunk.embeddings;

      const text = chunk.text || chunk.content;

      if (!chunk.chunkId) {
        throw new Error("A chunk is missing chunkId.");
      }

      if (!chunk.topicId || !chunk.topicTitle) {
        throw new Error(`Missing topic information: ${chunk.chunkId}`);
      }

      if (!text || !text.trim()) {
        throw new Error(`Missing text: ${chunk.chunkId}`);
      }

      if (!Array.isArray(embedding) || embedding.length !== 768) {
        throw new Error(`Invalid embedding: ${chunk.chunkId}`);
      }

      if (!embedding.every((value) => Number.isFinite(value))) {
        throw new Error(`Invalid vector values: ${chunk.chunkId}`);
      }

      if (!chunk.sourceUrl) {
        throw new Error(`Missing source URL: ${chunk.chunkId}`);
      }
    }

    console.log("✅ All chunks passed pre-import checks.\n");

    // 4. Connect to MongoDB Atlas
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing from your .env file.");
    }

    await mongoose.connect(process.env.MONGODB_URI);

    console.log("✅ Connected to MongoDB Atlas.\n");

    // 5. Prepare safe, duplicate-resistant import operations
    const operations = chunks.map((chunk) => {
      const embedding =
        chunk.embedding || chunk.vector || chunk.embeddings;

      return {
        updateOne: {
          filter: { chunkId: chunk.chunkId },
          update: {
            $setOnInsert: {
              chunkId: chunk.chunkId,
              topicId: String(chunk.topicId),
              topicTitle: chunk.topicTitle,
              chunkIndex: chunk.chunkIndex,
              text: chunk.text || chunk.content,
              embedding,

              sourceName: chunk.sourceName || "MedlinePlus",
              sourceUrl: chunk.sourceUrl,
              language: chunk.language || "English",
              datasetDate: chunk.datasetDate || "",

              alternateNames: chunk.alternateNames || [],
              relatedTopics: chunk.relatedTopics || [],
            },
          },
          upsert: true,
        },
      };
    });

    // 6. Insert only chunks that do not already exist
    const result = await MedicalKnowledge.bulkWrite(operations, {
      ordered: true,
    });

    // 7. Verify collection count
    const totalDocuments = await MedicalKnowledge.countDocuments();

    console.log("========== IMPORT REPORT ==========\n");
    console.log(`Chunks in source file: ${chunks.length}`);
    console.log(`New documents inserted: ${result.upsertedCount}`);
    console.log(`Existing documents matched: ${result.matchedCount}`);
    console.log(`Total documents in collection: ${totalDocuments}`);

    console.log("\n✅ IMPORT PROCESS COMPLETED!");
    console.log("=================================\n");
  } catch (error) {
    console.error("\n❌ IMPORT FAILED:");
    console.error(error.message);
  } finally {
    await mongoose.disconnect();
  }
}

importMedicalKnowledge();