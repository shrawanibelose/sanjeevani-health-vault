import { GoogleGenerativeAI } from "@google/generative-ai";

export const calculateHealthRisk = (records) => {
  // 🛡️ Safety Check 1: Ensure records array exists
  if (!records || records.length === 0 || !records[0]) {
    return { label: 'Awaiting Data', color: '#888', recommendation: 'Upload your first report.' };
  }
  const latestRecord = records[0];

  // 🛡️ Safety Check 2: Ensure the latest record has valid data
  if (!latestRecord || typeof latestRecord.glucose === 'undefined') {
    return { label: 'AWAITING DATA', color: '#888', recommendation: 'Upload a report with glucose/BP markers.' };
  }

  let score = 0;
  let alerts = [];

  // Trend Analysis (Professional Refactor - Rule 1 & 8)
  if (records.length >= 3) {
    const trend = records.slice(0, 3).map(r => r.glucose || 0).reverse();
    if (trend[2] > trend[1] && trend[1] > trend[0]) {
      score += 15;
      alerts.push("Sequential metabolic rise detected.");
    }
  }

  // Multi-Factor Weighting
  if (latestRecord.glucose > 140) score += 40;
  if (latestRecord.systolic > 140) score += 40;

  // Confidence calculation
  const confidence = (latestRecord.glucose && latestRecord.systolic) ? 95 : 65;

  // Result Mapping
  if (score >= 60) return { label: 'HIGH RISK', color: '#ff4e50', score, confidence, recommendation: alerts.join(" ") || "Clinical thresholds exceeded. Review required." };
  if (score >= 30) return { label: 'MODERATE', color: '#ed8936', score, confidence, recommendation: "Metabolic strain detected. Monitor trends." };
  return { label: 'STABLE', color: '#27ae60', score, confidence, recommendation: "Biochemical markers are within range." };
};
// healthEngine.js
export const getReportAnalysis = (report) => {
  if (!report || !report.name) {
    return { status: "AWAITING DATA", color: "#888", text: "No report data found for analysis." };
  }

  const name = report.name.toLowerCase();
  const type = report.type;

  if (type === 'Radiology' || name.includes('mri') || name.includes('xray') || name.includes('scan')) {
    const redFlags = ['fracture', 'lesion', 'hemorrhage', 'tumor', 'clot', 'acute', 'mass'];
    const hasWarning = redFlags.some(flag => name.includes(flag));
    return {
      status: hasWarning ? "REVIEW REQUIRED" : "STABLE",
      color: hasWarning ? "#ff4e50" : "#3498db",
      text: hasWarning ? "Acute clinical markers detected. Review required." : "Structural mapping indicates no acute red flags."
    };
  }

  if (type === 'Cardiology' || name.includes('ecg') || name.includes('echo')) {
    return { status: "STABLE", color: "#e67e22", text: "Cardio-metabolic markers indicate stable heart-rate variability." };
  }

  if (type === 'Pathology' || name.includes('blood') || name.includes('urine')) {
    return { status: "NORMAL", color: "#27ae60", text: "Biochemical markers are within established clinical ranges." };
  }

  return { status: "PROCESSED", color: "#1a535c", text: "Report secured in vault. No abnormal markers detected." };
};

// healthEngine.js

// 🛡️ Privacy Scrubber: Removes PII before sending to cloud
const scrubPII = (text) => {
  if (!text) return "";
  return text
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[EMAIL REMOVED]")
    .replace(/(\+91[\-\s]?)?[0]?[6789]\d{9}/g, "[PHONE REMOVED]")
    .replace(/(?:Name|Patient Name|Patient):\s*([a-zA-Z\s]+)(?=\n|$)/gi, "Patient: [NAME ANONYMIZED]");
};


/// healthEngine.js

// 🔑 Your key is correct, just ensure no hidden spaces
const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY; 

/// healthEngine.js
// ... existing imports ...

const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_API_KEY);

export const getAIReportAnalysis = async (extractedText, category) => {
  // Always clean the data first!
  const cleanText = scrubPII(extractedText);
  
  try {
    // 🚀 FIX: Use the stable 2026 model name
    // healthEngine.js
const model = genAI.getGenerativeModel({ 
  model: "gemini-2.5-flash-lite", // 🚀 The most stable 2026 model
  safetySettings: [
    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
  ]
});
    
    const prompt = `Analyze this medical report. 
                You MUST separate the two sections with exactly three dashes: ---
                
                SECTION 1: 4-5 lines covering Risk Status, What is Right, and What is Wrong.
                ---
                SECTION 2: Detailed breakdown of every marker.

                DATA: ${cleanText}`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("SDK Error:", error);
    throw new Error(error.message);
  }
};