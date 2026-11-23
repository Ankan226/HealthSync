
const path = require("path");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config({
  path: path.join(__dirname, "../.env"),
});

const { checkMedicalSafety } = require("../services/medicalSafetyService");
const { searchMedicalKnowledge } = require("../services/medicalSearchService");
const { buildRAGContext } = require("../services/ragContextService");
const { generateRAGAnswer } = require("../services/ragAnswerService");

const safetyTestCases = [
  {
    message: "I have severe chest pain",
    expected: "emergency",
  },
  {
    message: "I can't breathe",
    expected: "emergency",
  },
  {
    message: "Sudden weakness on one side of my body",
    expected: "emergency",
  },
  {
    message: "I fainted",
    expected: "emergency",
  },
  {
    message: "I have a mild headache",
    expected: "normal",
  },
  {
    message: "I have a cough",
    expected: "normal",
  },
];

async function runTest() {
  try {
    console.log("\n========== HEALTHSYNC AI SAFETY TEST ==========\n");

    // STEP 1: Test the rule-based safety checker
    console.log("========== SAFETY CHECK TESTS ==========\n");

    let passed = 0;
    let failed = 0;

    for (const testCase of safetyTestCases) {
      const result = checkMedicalSafety(testCase.message);

      const actual = result.riskLevel;
      const success = actual === testCase.expected;

      if (success) {
        passed++;
      } else {
        failed++;
      }

      console.log(`${success ? "PASS" : "FAIL"}`);
      console.log(`Message: ${testCase.message}`);
      console.log(`Expected: ${testCase.expected}`);
      console.log(`Actual: ${actual}`);
      console.log(`Detected flags: ${result.detectedFlags.join(", ") || "None"}`);
      console.log(`Continue to RAG: ${result.shouldContinueToRAG}`);
      console.log("------------------------------------------\n");
    }

    console.log(`Safety tests passed: ${passed}/${safetyTestCases.length}`);
    console.log(`Safety tests failed: ${failed}/${safetyTestCases.length}\n`);

    if (failed > 0) {
      throw new Error("Some medical safety tests failed.");
    }

    // STEP 2: Test that an emergency message is stopped
    console.log("========== EMERGENCY FLOW TEST ==========\n");

    const emergencyResult = checkMedicalSafety(
      "I am having severe chest pain"
    );

    console.log("Emergency detected:", emergencyResult.emergencyDetected);
    console.log("Risk level:", emergencyResult.riskLevel);
    console.log("Should continue to RAG:", emergencyResult.shouldContinueToRAG);
    console.log("Safety message:", emergencyResult.message);

    if (emergencyResult.shouldContinueToRAG) {
      throw new Error("Emergency message was incorrectly allowed to RAG.");
    }

    console.log("\nEmergency flow correctly stopped before RAG.\n");

    // STEP 3: Test the normal RAG pipeline for a non-emergency message
    console.log("========== NORMAL RAG FLOW TEST ==========\n");

    const question = "What are the common symptoms of diabetes?";

    const safetyResult = checkMedicalSafety(question);

    console.log("Question:", question);
    console.log("Risk level:", safetyResult.riskLevel);

    if (!safetyResult.shouldContinueToRAG) {
      console.log("Safety warning:", safetyResult.message);
      throw new Error("Normal question was incorrectly blocked.");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("\nMongoDB connected successfully.");

    console.log("\n[1/3] Searching medical knowledge...");
    const searchResults = await searchMedicalKnowledge(question, 5);
    console.log(`Retrieved ${searchResults.length} chunks.`);

    console.log("\n[2/3] Building RAG context...");
    const ragResult = buildRAGContext(question, searchResults);
    console.log(`Context ready: ${ragResult.hasContext}`);

    console.log("\n[3/3] Generating answer using MedGemma...");
    const answerResult = await generateRAGAnswer(question, ragResult);

    console.log("\n========== GENERATED ANSWER ==========\n");
    console.log(answerResult.answer);

    console.log("\n========== SOURCES ==========\n");

    answerResult.sources.forEach((source) => {
      console.log(`[Source ${source.id}] ${source.topic}`);
      console.log(`Name: ${source.sourceName}`);
      console.log(`URL: ${source.url}\n`);
    });

    console.log("\n========== SAFETY + RAG TEST COMPLETED ==========\n");

  } catch (error) {
    console.error("\nTEST FAILED:");
    console.error(error.message);
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log("MongoDB disconnected.");
    }
  }
}

runTest();
