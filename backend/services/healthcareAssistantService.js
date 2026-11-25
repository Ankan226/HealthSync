const { checkMedicalSafety } = require("./medicalSafetyService");
const { searchMedicalKnowledge } = require("./medicalSearchService");
const { buildRAGContext } = require("./ragContextService");
const { generateRAGAnswer } = require("./ragAnswerService");

/**
 * Complete HealthSync Healthcare Assistant pipeline.
 *
 * Flow:
 * 1. Validate user question
 * 2. Check medical safety
 * 3. Stop immediately if emergency is detected
 * 4. Search medical knowledge
 * 5. Build RAG context
 * 6. Generate answer using MedGemma
 * 7. Return unified response
 */
async function askHealthcareAssistant(question) {
  // 1. Validate question
  if (typeof question !== "string" || !question.trim()) {
    throw new Error("A valid question is required.");
  }

  const userQuestion = question.trim();
  const startTime = Date.now();

  // 2. Medical safety check FIRST
  const safetyResult = checkMedicalSafety(userQuestion);

  // 3. Emergency: stop before vector search and AI generation
  if (safetyResult.emergencyDetected) {
    return {
      success: true,
      flow: "emergency",
      riskLevel: safetyResult.riskLevel,
      emergencyDetected: true,
      detectedFlags: safetyResult.detectedFlags,
      answer: safetyResult.message,
      sources: [],
      chunksUsed: 0,
      hasContext: false,
      model: null,
      processingTimeMs: Date.now() - startTime,
    };
  }

  // 4. Search relevant medical knowledge
  const searchResults = await searchMedicalKnowledge(
    userQuestion,
    5
  );

  // 5. Build RAG context
  const ragContext = buildRAGContext(
    userQuestion,
    searchResults
  );

  // 6. Generate answer using MedGemma
  const answerResult = await generateRAGAnswer(
    userQuestion,
    ragContext
  );

  // 7. Return unified response
  return {
    success: true,
    flow: "normal",
    riskLevel: safetyResult.riskLevel,
    emergencyDetected: false,
    detectedFlags: [],
    answer: answerResult.answer,
    sources: answerResult.sources,
    chunksUsed: answerResult.chunksUsed,
    hasContext: answerResult.hasContext,
    model: answerResult.model,
    generationStats: answerResult.generationStats || null,
    processingTimeMs: Date.now() - startTime,
  };
}

module.exports = {
  askHealthcareAssistant,
};