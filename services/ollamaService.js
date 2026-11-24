const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_DEFAULT_MODEL = process.env.GROQ_MODEL || "qwen/qwen3.8-27b";

const MODELS = {
  medical: process.env.MEDGEMMA_MODEL || "medgemma:4b",
  agent: process.env.QWEN_MODEL || "Qwen3:latest",
  embedding: process.env.EMBEDDING_MODEL || "embeddinggemma:latest",
};

// Groq Cloud API implementation (Ultra-fast cloud inference, ~0.5s - 1.5s)
async function generateGroqResponse({
  prompt,
  system,
  temperature = 0.1,
  timeout = 45000,
  format = undefined,
  num_predict = undefined,
}) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured.");
  }

  const messages = [];
  if (system) {
    messages.push({ role: "system", content: system });
  }
  messages.push({ role: "user", content: prompt });

  const payload = {
    model: GROQ_DEFAULT_MODEL,
    messages,
    temperature: typeof temperature === "number" ? temperature : 0.1,
  };

  if (format === "json") {
    payload.response_format = { type: "json_object" };
  }

  if (num_predict && typeof num_predict === "number") {
    payload.max_tokens = num_predict;
  }

  const startTime = Date.now();
  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(timeout),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const choice = data.choices && data.choices[0];
  const responseContent = choice ? choice.message?.content || "" : "";
  const durationNs = (Date.now() - startTime) * 1000000;

  return {
    model: data.model || GROQ_DEFAULT_MODEL,
    response: responseContent,
    totalDuration: durationNs,
    promptTokens: data.usage?.prompt_tokens,
    responseTokens: data.usage?.completion_tokens,
  };
}

// Reusable function to send prompts to an LLM (Groq Cloud if key present, else local Ollama)
async function generateResponse({
  model,
  prompt,
  system,
  think = false,
  temperature = 0.2,
  timeout = 60000,
  format = undefined,
  num_predict = undefined,
}) {
  // If GROQ_API_KEY is provided in environment, use fast Cloud API
  if (process.env.GROQ_API_KEY) {
    return generateGroqResponse({
      prompt,
      system,
      temperature,
      timeout,
      format,
      num_predict,
    });
  }

  // Fallback to local Ollama
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
        `AI request timed out after ${timeout / 1000} seconds.`
      );
    }

    throw new Error(`AI generation failed: ${error.message}`);
  }
}

// Generate medical explanations
async function generateMedicalResponse(prompt, system) {
  return generateResponse({
    model: MODELS.medical,
    prompt,
    system,
    temperature: 0.2,
    num_predict: 1000,
    timeout: 45000,
  });
}

// Generate agent responses
async function generateAgentResponse(prompt, system) {
  return generateResponse({
    model: MODELS.agent,
    prompt,
    system,
    temperature: 0.1,
    format: "json",
    num_predict: 300,
    timeout: 30000,
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