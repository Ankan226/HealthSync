
const MAX_CHUNKS = 5;
const MAX_CHUNK_LENGTH = 1500;
const MAX_CONTEXT_LENGTH = 8000;

function buildRAGContext(question, searchResults = []) {
  if (typeof question !== "string" || !question.trim()) {
    throw new Error("A valid question is required to build RAG context.");
  }

  if (!Array.isArray(searchResults)) {
    throw new Error("Search results must be an array.");
  }

  // Keep only valid results and limit the number of chunks
  const validResults = searchResults
    .filter(
      (result) =>
        result &&
        typeof result.text === "string" &&
        result.text.trim() &&
        typeof result.topicTitle === "string"
    )
    .slice(0, MAX_CHUNKS);

  if (validResults.length === 0) {
    return {
      question: question.trim(),
      context: "",
      sources: [],
      chunksUsed: 0,
      hasContext: false,
    };
  }

  const sources = [];
  const sourceMap = new Map();

  // Assign source IDs and avoid duplicate source entries
  validResults.forEach((result) => {
    const sourceUrl = result.sourceUrl || "Source URL unavailable";

    if (!sourceMap.has(sourceUrl)) {
      const sourceId = sources.length + 1;

      sourceMap.set(sourceUrl, sourceId);

      sources.push({
        id: sourceId,
        topic: result.topicTitle,
        sourceName: result.sourceName || "Medical information source",
        url: sourceUrl,
      });
    }
  });

  // Format retrieved chunks into readable context
  const formattedChunks = validResults.map((result, index) => {
    const sourceUrl = result.sourceUrl || "Source URL unavailable";
    const sourceId = sourceMap.get(sourceUrl);

    const text = result.text
      .trim()
      .substring(0, MAX_CHUNK_LENGTH);

    return `
[Medical Information ${index + 1}]
Topic: ${result.topicTitle}
Relevance Score: ${
      typeof result.score === "number"
        ? result.score.toFixed(4)
        : "Unavailable"
    }
Source ID: ${sourceId}

Information:
${text}
`;
  });

  let context = formattedChunks.join("\n");

  // Keep the total context within our size limit
  if (context.length > MAX_CONTEXT_LENGTH) {
    context = context.substring(0, MAX_CONTEXT_LENGTH);
  }

  const sourceText = sources
    .map(
      (source) =>
        `[Source ${source.id}] ${source.topic} - ${source.sourceName}\n${source.url}`
    )
    .join("\n\n");

  context += `\n\n========== SOURCES ==========\n${sourceText}`;

  return {
    question: question.trim(),
    context,
    sources,
    chunksUsed: validResults.length,
    hasContext: true,
  };
}

module.exports = {
  buildRAGContext,
};
