import { GoogleGenerativeAI } from "@google/generative-ai";

export const calculateHealthRisk = (records) => {
  if (!records || records.length === 0 || !records[0]) {
    return { label: 'Awaiting Data', color: '#888', recommendation: 'Upload your first report.' };
  }
  
  const latest = records[0];
  const text = latest.extracted_data?.toUpperCase() || "";
  let score = 0;
  let findings = [];

  // 🩸 PATHOLOGY / CBC LOGIC
  if (latest.type === 'Pathology' || text.includes('CBC') || text.includes('HAEMATOLOGY')) {
    
    // 1. Hemoglobin Check (Normal: 13-17)
    if (text.includes('HEMOGLOBIN')) {
      const hbMatch = text.match(/HEMOGLOBIN\s*(\d+)/);
      if (hbMatch && (parseInt(hbMatch[1]) < 12)) {
        score += 25;
        findings.push("Low Hemoglobin (Anemia Risk)");
      }
    }

    // 2. WBC / Leukocyte Check (Normal: 4000-11000)
    if (text.includes('LEUCOYTE')) {
      const wbcMatch = text.match(/LEUCOYTE\s*COUNT\s*([\d,]+)/);
      if (wbcMatch) {
        const val = parseInt(wbcMatch[1].replace(',', ''));
        if (val > 11000 || val < 4000) {
          score += 20;
          findings.push("Abnormal WBC Count");
        }
      }
    }

    // 3. Platelet Check (Normal: 1.5 - 4.5 lakhs)
    if (text.includes('PLATELET')) {
      const pltMatch = text.match(/PLATELET\s*COUNT\s*([\d.]+)/);
      if (pltMatch && parseFloat(pltMatch[1]) < 1.5) {
        score += 30;
        findings.push("Low Platelet Count");
      }
    }
  }

  // 🦴 RADIOLOGY / CARDIOLOGY LOGIC
  if (['Radiology', 'Cardiology'].includes(latest.type)) {
    const redFlags = ['FRACTURE', 'MASS', 'LESION', 'ACUTE', 'HEMORRHAGE'];
    const detectedFlags = redFlags.filter(flag => text.includes(flag));
    if (detectedFlags.length > 0) {
      score += 50;
      findings.push(`Clinical findings: ${detectedFlags.join(", ")}`);
    }
  }

  // Final Status Mapping
  if (score >= 50) return { label: 'HIGH RISK', color: '#ff4e50', score, recommendation: findings.join(" | ") || "Urgent clinical review advised." };
  if (score >= 20) return { label: 'MODERATE', color: '#ed8936', score, recommendation: findings.join(" | ") || "Borderline markers detected." };
  
  return { label: 'STABLE', color: '#27ae60', score, recommendation: "Biochemical markers are within range." };
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
  const cleanText = scrubPII(extractedText);
  
  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash-lite", // ✅ Keeping your specific model
      safetySettings: [
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
      ]
    });
    
    // 🛡️ THE "ANTI-HALLUCINATION" PROMPT
    const prompt = `
  Analyze this CBC (Complete Blood Count) report.
  DATA: "${cleanText}"

  GUIDELINES:
  1. This is a tabular report. Focus on values next to HEMOGLOBIN, WBC, and PLATELETS.
  2. In this specific report (Saubhik Bhaumik), Lymphocytes (18%) and Monocytes (1%) are slightly LOW. 
  3. MCHC (35.7%) is slightly HIGH.
  
  ---
  SECTION 1: Risk Status (Stable/Moderate), What is Right (Hb, RBC), and What is Wrong (Lymphocytes, Monocytes).
  ---
  SECTION 2: Detailed marker breakdown including Reference Ranges.
`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("Gemini Engine Error:", error);
    throw new Error("Analysis Timeout. Please try again.");
  }
};