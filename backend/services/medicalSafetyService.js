
const EMERGENCY_MESSAGE =
  "Your symptoms may indicate a medical emergency. Please seek emergency medical care immediately. Do not wait for an AI response or an online appointment. In India, call 112 for emergency assistance or 108 for ambulance services if available. If possible, ask someone nearby to help you.";

const RED_FLAG_RULES = [
  {
    category: "breathing_emergency",
    patterns: [
      /\b(severe|sudden|extreme)\s+(difficulty|trouble|problem)\s+(breathing|in breathing)\b/i,
      /\b(can't|cannot|unable to)\s+breathe\b/i,
      /\b(gasping for air|not breathing|stopped breathing)\b/i,
      /\bsevere shortness of breath\b/i,
      /\b(difficulty breathing|trouble breathing|shortness of breath|breathlessness)\b/i,
    ],
  },
  {
    category: "chest_emergency",
    patterns: [
      /\b(severe|crushing|heavy|tight)\s+(chest pain|chest pressure|pain in (my|the) chest)\b/i,
      /\b(chest pain|chest pressure)\b/i,
      /\b(chest pain|chest pressure)\b.{0,60}\b(sweating|fainting|shortness of breath|breathlessness)\b/i,
      /\b(sweating|fainting|shortness of breath|breathlessness)\b.{0,60}\b(chest pain|chest pressure)\b/i,
    ],
  },
  {
    category: "stroke_warning",
    patterns: [
      /\b(sudden|new)\s+(face drooping|facial drooping|weakness|numbness)\b/i,
      /\b(face drooping|facial drooping)\b/i,
      /\b(suddenly|sudden)\s+(can't|cannot|unable to)\s+(speak|talk)\b/i,
      /\b(slurred speech|speech difficulty|difficulty speaking)\b/i,
      /\b(sudden weakness|sudden numbness)\b/i,
    ],
  },
  {
    category: "loss_of_consciousness",
    patterns: [
      /\b(unconscious|unresponsive|not responding)\b/i,
      /\b(difficult|hard)\s+to\s+(wake|awaken)\b/i,
      /\b(fainted|passing out|passed out)\b/i,
    ],
  },
  {
    category: "severe_bleeding",
    patterns: [
      /\b(uncontrolled|severe|heavy)\s+(bleeding|blood loss)\b/i,
      /\b(bleeding|blood loss)\b.{0,40}\b(won't|will not|doesn't)\s+stop\b/i,
    ],
  },
  {
    category: "severe_allergic_reaction",
    patterns: [
      /\b(swelling of (the )?(tongue|throat))\b/i,
      /\b(throat closing|tongue swelling)\b/i,
      /\b(severe allergic reaction|anaphylaxis)\b/i,
    ],
  },
  {
    category: "seizure_emergency",
    patterns: [
      /\b(seizure|convulsion)\b.{0,50}\b(ongoing|won't stop|not stopping|5 minutes|five minutes)\b/i,
      /\b(repeated seizures|multiple seizures)\b/i,
      /\b(first time seizure|first seizure)\b/i,
    ],
  },
  {
    category: "poisoning_or_overdose",
    patterns: [
      /\b(overdose|poisoning|poisoned)\b/i,
      /\b(swallowed|ingested)\b.{0,50}\b(poison|toxic|chemical|too many pills)\b/i,
    ],
  },
];

function checkMedicalSafety(userMessage) {
  if (typeof userMessage !== "string" || !userMessage.trim()) {
    throw new Error("A valid patient message is required.");
  }

  const message = userMessage.trim();
  const detectedFlags = [];

  for (const rule of RED_FLAG_RULES) {
    const detected = rule.patterns.some((pattern) =>
      pattern.test(message)
    );

    if (detected) {
      detectedFlags.push(rule.category);
    }
  }

  if (detectedFlags.length > 0) {
    return {
      riskLevel: "emergency",
      emergencyDetected: true,
      detectedFlags,
      message: EMERGENCY_MESSAGE,
      shouldContinueToRAG: false,
    };
  }

  return {
    riskLevel: "normal",
    emergencyDetected: false,
    detectedFlags: [],
    message: null,
    shouldContinueToRAG: true,
  };
}

module.exports = {
  checkMedicalSafety,
};
