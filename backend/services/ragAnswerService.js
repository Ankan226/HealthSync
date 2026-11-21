
const { generateMedicalResponse } = require("./ollamaService");

const MEDICAL_SYSTEM_PROMPT = `
You are HealthSync, a healthcare information assistant.

YOUR ROLE:
- Explain medical information in simple, clear, patient-friendly language.
- Help users understand symptoms, medical conditions, tests, and general healthcare information.
- You are an informational assistant, not a doctor.

MEDICAL SAFETY RULES:
- Never diagnose a user or claim that they definitely have a disease.
- Never prescribe medicines or recommend changing medication doses.
- Never replace a healthcare professional's advice.
- Do not invent medical facts, test results, or treatment recommendations.
- If the provided medical context does not contain enough information, clearly say so.
- Explain uncertainty honestly.
- Encourage consultation with a qualified healthcare professional when appropriate.
- If the user describes potentially life-threatening symptoms, advise immediate emergency medical care.
- Do not falsely reassure someone experiencing potentially serious symptoms.

RAG RULES:
- Use the provided medical context as the primary source for medical facts.
- Do not pretend that information was found in the context if it was not.
- Cite provided sources using their source IDs, such as [Source 1].
- Only use source IDs that actually exist in the provided context.
- If the context is insufficient, acknowledge the limitation instead of guessing.

RESPONSE STYLE:
- Use simple language.
- Be concise but helpful.
- Use bullet points when they improve readability.
- Avoid unnecessary medical jargon.
- Do not overwhelm the user with unrelated information.

Remember: You provide educational information, not medical diagnosis or treatment.
`;

async function generateRAGAnswer(question, ragResult) {
  if (typeof question !== "string" || !question.trim()) {
    throw new Error("A valid question is required.");
  }

  if (!ragResult || typeof ragResult !== "object") {
    throw new Error("A valid RAG context result is required.");
  }

  if (!ragResult.hasContext || !ragResult.context) {
    return {
      answer:
        "I could not find enough relevant medical information to answer this question reliably. Please consult a qualified healthcare professional for guidance.",
      model: null,
      sources: [],
      chunksUsed: 0,
      hasContext: false,
    };
  }

  const prompt = `
PATIENT QUESTION:
${question.trim()}

RETRIEVED MEDICAL CONTEXT:
${ragResult.context}

INSTRUCTIONS:
Answer the patient's question using the retrieved medical context.

1. Answer the question directly.
2. Explain the information in simple language.
3. Do not diagnose the patient.
4. Do not invent information not supported by the context.
5. Include source citations such as [Source 1] where appropriate.
6. If the context does not fully answer the question, clearly mention this.
7. Include appropriate medical safety guidance.
8. Do not prescribe medicines or change treatment plans.

PATIENT-FRIENDLY ANSWER:
`;

  const generationResult = await generateMedicalResponse(
    prompt,
    MEDICAL_SYSTEM_PROMPT
  );

  return {
    answer: generationResult.response,
    model: generationResult.model,
    sources: ragResult.sources || [],
    chunksUsed: ragResult.chunksUsed || 0,
    hasContext: true,
    generationStats: {
      totalDuration: generationResult.totalDuration,
      promptTokens: generationResult.promptTokens,
      responseTokens: generationResult.responseTokens,
    },
  };
}

module.exports = {
  generateRAGAnswer,
};
