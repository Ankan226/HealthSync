const MedicalKnowledge = require("../models/medicalKnowledge");
const { generateEmbedding } = require("./ollamaService");

const VECTOR_INDEX_NAME = "healthsync_medical_vector_index";
const VECTOR_FIELD = "embedding";
const VECTOR_DIMENSIONS = 768;

/**
 * Search the medical knowledge collection
 * using semantic similarity.
 *
 * @param {string} question - User's question
 * @param {number} limit - Maximum results to return
 */
async function searchMedicalKnowledge(question, limit = 5) {
  try {
    // 1. Validate the question
    if (
      typeof question !== "string" ||
      !question.trim()
    ) {
      throw new Error("A valid question is required.");
    }

    // 2. Generate the question embedding
    const embeddingResult = await generateEmbedding(
      question.trim()
    );

    // Ollama embedding service returns an array of embeddings
    const queryVector = embeddingResult?.[0];

    // 3. Validate embedding
    if (
      !Array.isArray(queryVector) ||
      queryVector.length !== VECTOR_DIMENSIONS ||
      !queryVector.every(Number.isFinite)
    ) {
      throw new Error(
        "Invalid query embedding. Expected 768 valid numbers."
      );
    }

    // 4. Safely determine result limit
    const resultLimit = Math.min(
      Math.max(Number(limit) || 5, 1),
      10
    );

    // 5. Run MongoDB Vector Search
    const results = await MedicalKnowledge.aggregate([
      {
        $vectorSearch: {
          index: VECTOR_INDEX_NAME,
          path: VECTOR_FIELD,
          queryVector: queryVector,
          numCandidates: Math.max(
            resultLimit * 20,
            100
          ),
          limit: resultLimit,
        },
      },

      // 6. Return only the fields needed
      {
        $project: {
          _id: 0,
          chunkId: 1,
          topicId: 1,
          topicTitle: 1,
          chunkIndex: 1,
          text: 1,
          sourceName: 1,
          sourceUrl: 1,
          score: {
            $meta: "vectorSearchScore",
          },
        },
      },
    ]);

    // 7. Return retrieved knowledge
    return results;
  } catch (error) {
    console.error(
      "Medical knowledge search error:",
      error.message
    );

    throw error;
  }
}

module.exports = {
  searchMedicalKnowledge,
};