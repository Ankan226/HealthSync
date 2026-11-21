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
  timeout = 300000,
  format = undefined,
  num_predict = undefined,
}) {
  try {
    const payload = {
      model,
      prompt,
      system,
      stream: false,
      options: {
        temperature,
      },
    };

    if (format) {
      payload.format = format;
    }

    if (num_predict) {
      payload.options.num_predict = num_predict;
    }

    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeout),
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
      throw new Error(
        `Ollama request timed out after ${timeout / 1000} seconds. The model may be taking too long.`
      );
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
    temperature: 0.2,
    num_predict: 400, // Limit medical answer length to speed up CPU inference
    timeout: 300000, // 5 minutes
  });
}

// Generate agent responses using Qwen3
async function generateAgentResponse(prompt, system) {
  return generateResponse({
    model: MODELS.agent,
    prompt,
    system,
    temperature: 0.1,
    format: "json", // Forces Ollama to output direct structured JSON without thinking prologue
    num_predict: 120, // Doctor specialty JSON only needs ~30-50 tokens
    timeout: 180000, // 3 minutes max
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
      throw new Error(
        `Ollama embedding error (${response.status}): ${errorText}`
      );
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