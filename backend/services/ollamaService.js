
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

const MODELS = {
  medical: process.env.MEDGEMMA_MODEL || "medgemma:4b",
  agent: process.env.QWEN_MODEL || "Qwen3:latest",
  embedding: process.env.EMBEDDING_MODEL || "embeddinggemma:latest",
};

// Reusable function to send prompts to an Ollama model
async function generateResponse({
  model,
  prompt,
  system,
  think = false,
  temperature = 0.2,
}) {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        prompt,
        system,
        stream: false,
        think,
        options: {
          temperature,
        },
      }),
      signal: AbortSignal.timeout(300000), // 5-minute timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama error (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    return {
      model: data.model,
      response: data.response,
      totalDuration: data.total_duration,
      promptTokens: data.prompt_eval_count,
      responseTokens: data.eval_count,
    };
  } catch (error) {
    if (error.name === "TimeoutError") {
      throw new Error("Ollama request timed out. The model may be taking too long.");
    }

    throw new Error(`AI generation failed: ${error.message}`);
  }
}

// Generate medical explanations using MedGemma
async function generateMedicalResponse(prompt, system) {
  return generateResponse({
    model: MODELS.medical,
    prompt,
    system,
    think: false,
    temperature: 0.2,
  });
}

// Generate agent responses using Qwen3
async function generateAgentResponse(prompt, system) {
  return generateResponse({
    model: MODELS.agent,
    prompt,
    system,
    think: false,
    temperature: 0.2,
  });
}

// Generate vector embeddings using EmbeddingGemma
async function generateEmbedding(input) {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/embed`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODELS.embedding,
        input,
      }),
      signal: AbortSignal.timeout(120000), // 2-minute timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama embedding error (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    return data.embeddings;
  } catch (error) {
    if (error.name === "TimeoutError") {
      throw new Error("Embedding request timed out.");
    }

    throw new Error(`Embedding generation failed: ${error.message}`);
  }
}

module.exports = {
  MODELS,
  generateResponse,
  generateMedicalResponse,
  generateAgentResponse,
  generateEmbedding,
};
