
const TARGET_CHUNK_WORDS = 250;
const MAX_CHUNK_WORDS = 300;
const OVERLAP_WORDS = 40;

// Count words in text
function countWords(text) {
  if (!text || typeof text !== "string") return 0;

  return text.trim().split(/\s+/).filter(Boolean).length;
}

// Clean extra spaces while preserving paragraph breaks
function cleanText(text) {
  if (!text || typeof text !== "string") return "";

  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Split a long sentence into smaller pieces if necessary
function splitLongSentence(sentence, maxWords = TARGET_CHUNK_WORDS) {
  const words = sentence.trim().split(/\s+/);

  if (words.length <= maxWords) {
    return [sentence.trim()];
  }

  const pieces = [];

  for (let i = 0; i < words.length; i += maxWords) {
    pieces.push(words.slice(i, i + maxWords).join(" "));
  }

  return pieces;
}

// Split text into sentence-level units while preserving paragraphs
function getTextUnits(text) {
  const cleaned = cleanText(text);

  if (!cleaned) return [];

  const paragraphs = cleaned
    .split(/\n\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const units = [];

  for (const paragraph of paragraphs) {
    // Basic sentence splitting
    const sentences = paragraph
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean);

    for (const sentence of sentences) {
      units.push(...splitLongSentence(sentence));
    }
  }

  return units;
}

// Build chunks from text units
function buildContentChunks(text) {
  const units = getTextUnits(text);

  if (units.length === 0) return [];

  const chunks = [];
  let currentUnits = [];
  let currentWordCount = 0;

  for (const unit of units) {
    const unitWordCount = countWords(unit);

    // Start a new chunk if adding this unit exceeds target size
    if (
      currentUnits.length > 0 &&
      currentWordCount + unitWordCount > TARGET_CHUNK_WORDS
    ) {
      chunks.push(currentUnits.join(" "));
      currentUnits = [];
      currentWordCount = 0;
    }

    currentUnits.push(unit);
    currentWordCount += unitWordCount;
  }

  // Add remaining text
  if (currentUnits.length > 0) {
    chunks.push(currentUnits.join(" "));
  }

  return chunks;
}

// Create overlapping chunks with metadata
function chunkTopic(topic, datasetDate) {
  if (!topic || !topic.summary) {
    return [];
  }

  const contentChunks = buildContentChunks(topic.summary);

  return contentChunks.map((content, index) => {
    // Add overlap from the previous content chunk
    let overlap = "";

    if (index > 0) {
      const previousWords = contentChunks[index - 1]
        .split(/\s+/)
        .filter(Boolean);

      overlap = previousWords
        .slice(-OVERLAP_WORDS)
        .join(" ");
    }

    const chunkContent = overlap
      ? `${overlap} ${content}`
      : content;

    const chunkText = `Topic: ${topic.title}\n\n${chunkContent}`;

    return {
      chunkId: `${topic.topicId}-chunk-${index + 1}`,
      topicId: topic.topicId,
      topicTitle: topic.title,
      chunkIndex: index,
      text: chunkText,
      content: chunkContent,
      wordCount: countWords(chunkContent),
      sourceUrl: topic.sourceUrl,
      sourceName: topic.sourceName,
      language: topic.language,
      datasetDate: datasetDate || topic.datasetDate || null,
      alternateNames: topic.alternateNames || [],
      relatedTopics: topic.relatedTopics || [],
    };
  });
}

// Chunk all topics in the dataset
function chunkDataset(dataset) {
  if (!dataset || !Array.isArray(dataset.topics)) {
    throw new Error("Invalid dataset: expected a topics array.");
  }

  const allChunks = [];

  for (const topic of dataset.topics) {
    const chunks = chunkTopic(topic, dataset.datasetDate);
    allChunks.push(...chunks);
  }

  return allChunks;
}

module.exports = {
  countWords,
  cleanText,
  getTextUnits,
  buildContentChunks,
  chunkTopic,
  chunkDataset,
};
