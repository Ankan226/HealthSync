const Doctor = require("../models/doctor");
const { generateAgentResponse } = require("./ollamaService");
const { checkMedicalSafety } = require("./medicalSafetyService");

const SPECIALTY_SYSTEM_PROMPT = `
You are HealthSync's medical specialty recommendation assistant.

YOUR TASK:
Suggest an appropriate medical specialty for an initial consultation
based on the patient's symptoms and the specialties available in HealthSync.

STRICT RULES:
- You are NOT a doctor and must not diagnose.
- Recommend a specialty only when the symptoms reasonably match it.
- Never recommend a specialty merely because it is the only available option.
- Never force a recommendation.
- Recommend only specialties from the provided list.
- Never invent a specialty.
- Do not recommend medication or treatment.
- Symptoms may have multiple possible causes.
- If symptoms are vague, insufficient, or do not reasonably match any available specialty, return null.
- If symptoms suggest a medical emergency, do not recommend an ordinary appointment.
- When symptoms could reasonably be assessed initially by a General Physician,
  General Medicine, or Internal Medicine specialist, prefer that option if available.
- Keep the explanation short, simple, and patient-friendly.
- Do not claim that a specialty treats a condition unless that is medically reasonable.
- This recommendation is informational and must not replace professional medical advice.

OUTPUT:
Return ONLY valid JSON.
Do not use Markdown or code fences.

Required format:
{
  "specialization": "exact specialty from the provided list, or null",
  "reason": "short explanation in simple language"
}
`;

function extractJSON(text) {
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Qwen returned an empty response.");
  }

  // Try parsing the complete response first
  try {
    return JSON.parse(text.trim());
  } catch (error) {
    // Extract JSON if the model included extra text
    const match = text.match(/\{[\s\S]*\}/);

    if (!match) {
      throw new Error("Could not find valid JSON in Qwen response.");
    }

    return JSON.parse(match[0]);
  }
}

async function recommendDoctorSpecialty(symptoms) {
  if (typeof symptoms !== "string" || !symptoms.trim()) {
    throw new Error("A valid symptom description is required.");
  }

  const userSymptoms = symptoms.trim();

  // 1. Check emergency safety before AI recommendation
  const safetyResult = checkMedicalSafety(userSymptoms);

  if (safetyResult.emergencyDetected) {
    return {
      success: true,
      emergencyDetected: true,
      riskLevel: "emergency",
      detectedFlags: safetyResult.detectedFlags,
      message: safetyResult.message,
      specialization: null,
      reason: null,
    };
  }

  // 2. Get actual specialties from approved doctors
  const availableSpecialties = await Doctor.distinct("specialization", {
    verificationStatus: "approved",
  });

  const cleanSpecialties = availableSpecialties
    .filter(
      (specialty) =>
        typeof specialty === "string" && specialty.trim()
    )
    .map((specialty) => specialty.trim());

  // 3. If no approved specialties exist, do not ask AI to invent one
  if (cleanSpecialties.length === 0) {
    return {
      success: true,
      emergencyDetected: false,
      riskLevel: "normal",
      specialization: null,
      reason:
        "There are currently no approved doctor specialties available in HealthSync.",
      availableSpecialties: [],
    };
  }

  // 4. Build prompt using actual database specialties
  const prompt = `
PATIENT'S SYMPTOMS:
${userSymptoms}

SPECIALTIES CURRENTLY AVAILABLE IN HEALTHSYNC:
${cleanSpecialties
    .map((specialty, index) => `${index + 1}. ${specialty}`)
    .join("\n")}

TASK:
Suggest the most appropriate specialty for an initial consultation,
based on the symptoms and the available specialties above.

IMPORTANT:
- Do not select a specialty simply because it is the only option.
- Evaluate whether the symptoms reasonably match the specialty.
- If no available specialty is reasonably suitable, return null.
- If General Physician, General Medicine, or Internal Medicine is available
  and appropriate for these symptoms, prefer it for an initial assessment.
- Use the exact spelling of a specialty from the available list.
- Do not diagnose the patient.

Return only the required JSON format.
`;

  // 5. Ask Qwen3 to recommend a specialty
  const agentResult = await generateAgentResponse(
    prompt,
    SPECIALTY_SYSTEM_PROMPT
  );

  // 6. Parse the model response
  const parsedResult = extractJSON(agentResult.response);

  // 7. Validate the recommendation against the actual database list
  const recommendedSpecialty =
    typeof parsedResult.specialization === "string"
      ? parsedResult.specialization.trim()
      : null;

  const validatedSpecialty = cleanSpecialties.find(
    (specialty) =>
      specialty.toLowerCase() ===
      recommendedSpecialty?.toLowerCase()
  );

  // 8. Return no recommendation if it cannot be validated
  if (!validatedSpecialty) {
    return {
      success: true,
      emergencyDetected: false,
      riskLevel: "normal",
      specialization: null,
      reason:
        "I couldn't confidently match your symptoms to an available specialty. You may consult a general physician for an initial assessment.",
      availableSpecialties: cleanSpecialties,
      model: agentResult.model,
    };
  }

  // 9. Return the verified specialty
  return {
    success: true,
    emergencyDetected: false,
    riskLevel: "normal",
    specialization: validatedSpecialty,
    reason:
      typeof parsedResult.reason === "string" &&
      parsedResult.reason.trim()
        ? parsedResult.reason.trim()
        : "This specialty may be suitable for an initial consultation based on your symptoms.",
    availableSpecialties: cleanSpecialties,
    model: agentResult.model,
  };
}

module.exports = {
  recommendDoctorSpecialty,
};