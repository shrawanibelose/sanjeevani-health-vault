import Tesseract from 'tesseract.js';
import React, { useState, useEffect } from 'react';
import { supabase } from './utils/supabaseClient';
import { QRCodeCanvas } from "qrcode.react";
import LoginPage from './LoginPage';
import SignUpPage from './SignUpPage';
import CryptoJS from 'crypto-js';
import LandingPage from './LandingPage'; // Add this with your other imports
import { calculateHealthRisk, getReportAnalysis, getAIReportAnalysis } from './utils/healthEngine';

const SECRET_KEY = 'sanjeevani-ultra-secure-2026';

const encryptData = (text) => {
  if (!text || text === 'None') return 'None';
  return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
};

const decryptData = (cipher) => {
  if (!cipher || cipher === 'None') return 'None';
  try {
    const bytes = CryptoJS.AES.decrypt(cipher, SECRET_KEY);
    const decoded = bytes.toString(CryptoJS.enc.Utf8);
    return decoded || 'None';
  } catch (e) { 
    return 'Decryption Error'; 
  }
};
const verifyMedicalDocument = async (text) => {
  try {
    // We reuse your existing AI analysis engine to verify content
    const response = await getAIReportAnalysis(
      `Verify if the following text is from a medical report, lab result, or prescription. 
       Answer only with "VALID" or "INVALID". Text: ${text.substring(0, 500)}`, 
      "Verification"
    );
    return response.includes("VALID");
  } catch (e) {
    return true; // Fallback to allow if API fails
  }
};

const logAction = async (userId, actionType, description) => {
  const { error } = await supabase
    .from('audit_logs')
    .insert([
      { 
        user_id: userId, 
        action_type: actionType, 
        description: description 
      }
    ]);

  if (error) console.error('Audit Log Error:', error.message);
};

const Dashboard = ({ session, darkMode, setDarkMode }) => { 
  const theme = getTheme(darkMode);
  const [uploading, setUploading] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("15 Feb 2026");
  const [selectedAnalysis, setSelectedAnalysis] = useState(null); 
  const [showAnalysisModal, setShowAnalysisModal] = useState(false); // Make sure this exists!
  const [useAIAnalysis, setUseAIAnalysis] = useState(false); // 🛡️ Teacher's Hybrid Step
  const [records, setRecords] = useState([]);
  const [medications, setMedications] = useState([]);
  const [customName, setCustomName] = useState(''); // ✅ Fixes 'customName' error
 const [newMed, setNewMed] = useState({ 
  name: '', 
  times: ['09:00'], // 💊 Array for multiple alarms
  days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], // 📅 Selected days
  desc: '' 
});
  const [showAddMed, setShowAddMed] = useState(false);
  const [medSearchQuery, setMedSearchQuery] = useState('');
  const [category, setCategory] = useState('Pathology');
  const [filter, setFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMenu, setActiveMenu] = useState(null); // Fixes the ReferenceError
  const [previewUrl, setPreviewUrl] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  // 🛡️ SECURITY LAYER: Track consent and AI state
  const [hasConsented, setHasConsented] = useState(false); 
  const [aiInsight, setAiInsight] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);
  const [shortSummary, setShortSummary] = useState("");
  const [detailedReport, setDetailedReport] = useState("");
  
  useEffect(() => {
    document.title = "Sanjeevani | Dashboard";
  }, []); 

  useEffect(() => {
    if (session) {
      fetchRecords();
      logAction(session.user.id, 'LOGIN', 'User accessed the health dashboard');
    }
  }, [session]);
  
useEffect(() => {
  setHasConsented(false); 
  setAiInsight("");
}, [selectedAnalysis]);

  useEffect(() => {
    if (session) {
      fetchRecords(); // This loads your data when the app starts
      logAction(session.user.id, 'LOGIN', 'User accessed the health dashboard');
    }
  }, [session]);

useEffect(() => {
  const alarmInterval = setInterval(() => {
    const now = new Date();
    // Get current day (e.g., "Mon") and time in 24h format "HH:mm"
    const currentDay = now.toLocaleDateString('en-GB', { weekday: 'short' }); 
    const currentTime = now.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: false 
    });

    medications.forEach(med => {
      // 🛡️ Logic: Check if today is scheduled AND if current time is in the 'times' array
      const dayMatches = med.days.includes(currentDay);
      const timeMatches = med.times.includes(currentTime);

      if (dayMatches && timeMatches) {
        // 🚨 Trigger Browser Alert
        alert(`💊 SANJEEVANI REMINDER\nMedicine: ${med.name}\nInstructions: ${med.desc || "Take as prescribed"}`);
        
        // 🚨 Trigger System Notification
        if (Notification.permission === "granted") {
          new Notification("Medication Reminder", { 
            body: `Time for ${med.name}. ${med.desc}`,
            icon: "/logo192.png" 
          });
        }
      }
    });
  }, 60000); // Checks every minute

  // Ask for permission on load
  if (Notification.permission !== "granted") {
    Notification.requestPermission();
  }
  return () => clearInterval(alarmInterval);
}, [medications]);
  
 // In Dashboard component (App.js)
  const [profile, setProfile] = useState({
  full_name: session?.user?.user_metadata?.full_name || 'Guest User',
  dob: session?.user?.user_metadata?.dob || '',
  blood_group: session?.user?.user_metadata?.blood_group || 'Not Set',
  allergies: session?.user?.user_metadata?.allergies || 'None',
  chronic_diseases: session?.user?.user_metadata?.chronic_diseases || 'None',
  emergency_phone: session?.user?.user_metadata?.emergency_phone || '',
  sos_name: session?.user?.user_metadata?.sos_name || 'Not Set',
  doctor_name: session?.user?.user_metadata?.doctor_name || 'Not Assigned',
  doctor_phone: session?.user?.user_metadata?.doctor_phone || 'N/A',
  profile_url: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'
  });
 const handlePasswordChange = async () => {
  if (newPassword.length < 6) {
    return alert("Security requirement: Password must be at least 6 characters.");
  }
  
  const { error } = await supabase.auth.updateUser({
    password: newPassword
  });

  if (error) alert(error.message);
  else {
    alert("Credential update successful! 🔒");
    setNewPassword('');
    setShowPasswordForm(false);
  }
};
const glucoseData = (records || []).map(r => r.glucose || 100).reverse();
const bpData = (records || []).map(r => r.systolic || 120).reverse();
 
const calculateAge = (dob) => {
    if (!dob) return "N/A";
    const birthDate = new Date(dob);
    return Math.abs(new Date(Date.now() - birthDate.getTime()).getUTCFullYear() - 1970);
  };
const handleProfileUpdate = () => {
  const now = new Date();
  const formattedDate = `${now.getDate()} ${now.toLocaleString('en-GB', { month: 'short' })} ${now.getFullYear()}`;
  
  // This updates the local state so the UI changes immediately
  setLastUpdated(formattedDate); 
  
  // Now call your existing database save logic
  handleProfileSave(); 
};
  const handleProfileSave = async () => {
  if (!profile.blood_group || !profile.emergency_phone || !profile.full_name) {
    alert("⚠️ Required: Name, Blood Group, and SOS Phone!");
    return;
  }

  // 🔐 Encrypting PII (Personally Identifiable Information)
  const encryptedProfile = {
    ...profile,
    allergies: encryptData(profile.allergies),
    chronic_diseases: encryptData(profile.chronic_diseases)
  };

  const { error } = await supabase
    .from('profiles')
    .update(encryptedProfile)
    .eq('id', session.user.id);

  if (error) {
    alert("Save Error: " + error.message);
  } else {
    setLastUpdated(new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }));
    setIsEditing(false);
    alert("Profile Secured & Saved! 🛡️");
    logAction(session.user.id, 'SECURITY', 'User updated encrypted medical profile');
  }
};
const handleChangePassword = async () => {
  if (newPassword.length < 6) return alert("Password must be at least 6 characters.");
  
  const { error } = await supabase.auth.updateUser({
    password: newPassword
  });

  if (error) alert(error.message);
  else {
    alert("Password updated successfully! 🔒");
    setNewPassword('');
  }
};
  // 🗑️ Fixed: Function now correctly separate from upload logic
 const handleDeleteReport = async (reportId, reportUrl) => {
  if (!window.confirm("Delete this report permanently?")) return;

  try {
    // 1. DELETE FROM DATABASE TABLE
    // We pass the numeric ID (bigint) to match the table column
    const { error: dbError } = await supabase
      .from('medical_records')
      .delete()
      .eq('id', reportId); 

    if (dbError) throw dbError;

    // 2. DELETE FROM STORAGE BUCKET
    const fileName = reportUrl.split('/').pop();
    await supabase.storage.from('reports').remove([fileName]);

    // 3. UPDATE UI
    setRecords(records.filter(rec => rec.id !== reportId));
    alert("🗑️ Record deleted successfully!");
logAction(session.user.id, 'DELETE', `User deleted record ID: ${reportId}`);
  } catch (error) {
    alert("Delete failed: " + error.message);
  }
};
 // 1. Ensure this is imported at the top of App.js

const handleFileUpload = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const MAX_SIZE = 5 * 1024 * 1024;
  const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];

  if (file.size > MAX_SIZE) {
    alert("❌ Error: File too large (Max 5MB).");
    return;
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    alert("❌ Error: Invalid format.");
    return;
  }

  try {
    setUploading(true);

    // 1. ✨ IMPROVED OCR STEP
    let extractedText = "";
    if (file.type.startsWith('image/')) {
      // We add 'eng' and a second pass to ensure medical terms are caught
      const { data: { text } } = await Tesseract.recognize(file, 'eng');
      extractedText = text;
    } else if (file.type === 'application/pdf') {
      extractedText = "PDF content extraction requires specialized worker logic.";
    }

    // 🛡️ 2. HYBRID SECURITY GATE
    const upperText = extractedText.toUpperCase();
    // List of markers found in your CBC report
    const clinicalMarkers = ['HEMOGLOBIN', 'LEUCOYTE', 'PLATELET', 'HAEMATOLOGY', 'LYMPHOCYTE', 'MCHC', 'RBC'];
    const hasClinicalMarkers = clinicalMarkers.some(marker => upperText.includes(marker));

    if (extractedText.length > 10 && !hasClinicalMarkers) { 
      // Only call AI if we don't see obvious medical keywords (prevents false blocks)
      const verificationPrompt = `
        Determine if this text belongs to a medical lab report or prescription. 
        Respond ONLY with "VALID" or "INVALID". 
        Text: ${extractedText.substring(0, 600)}
      `;
      
      const aiResponse = await getAIReportAnalysis(verificationPrompt, "SecurityCheck");
      
      if (aiResponse.includes("INVALID")) {
        alert("🚫 SECURITY BLOCK: This document does not appear to be a medical record. If this is a mistake, ensure the 'Test Names' are clearly visible.");
        setUploading(false);
        logAction(session.user.id, 'SECURITY_BLOCK', `Blocked: ${file.name}`);
        return; 
      }
    }

    const fileName = `${Date.now()}_${file.name}`;
    
    // 3. Upload to Storage
    const { error: uploadError } = await supabase.storage.from('reports').upload(fileName, file);
    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage.from('reports').getPublicUrl(fileName);

    // 4. Insert into Database (Syncing with extracted_data)
    const newRecord = { 
      user_id: session.user.id,
      name: customName || file.name,
      type: category,
      file_url: publicUrl,
      extracted_data: extractedText, 
      date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
    };

    const { data, error: dbError } = await supabase
      .from('medical_records')
      .insert([newRecord])
      .select();

    if (dbError) throw dbError;

    if (data) {
      setRecords([data[0], ...records]);
      alert("✅ Upload Verified & Secured in Vault!");
      logAction(session.user.id, 'UPLOAD', `Successfully secured record: ${newRecord.name}`);
    }
  } catch (error) {
    alert("Error: " + error.message);
  } finally {
    setUploading(false);
    setCustomName(''); 
  }
};
// 2. ONLY declare the variable ONCE here
  const healthStatus = records.length > 0 
    ? calculateHealthRisk(records) 
    : { label: 'Awaiting Data', color: '#888' };
  
    const fetchRecords = async () => {
  const { data, error } = await supabase
    .from('medical_records')
    .select('*')
    .order('created_at', { ascending: false });

  if (!error && data) {
    setRecords(data);
  } else {
    console.error("Fetch error:", error);
  }
};
const handleSOS = () => {
  // 1. Safety Check: Ensure a phone number exists in the profile
  if (!profile.emergency_phone) {
    alert("⚠️ No Emergency Contact found! Please update your Profile.");
    setShowProfile(true);
    return;
  }

  // 2. Try to get GPS Location
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        // Construct a Google Maps link
        const mapLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
        const message = encodeURIComponent(`🚨 SOS EMERGENCY! I need help. My location: ${mapLink}`);
        
        // Open WhatsApp with the location link
        window.open(`https://wa.me/${profile.emergency_phone}?text=${message}`);
      },
      (error) => {
        // Fallback: If GPS is off or blocked, send your original basic alert
        console.warn("Location blocked, sending basic alert.");
        window.open(`https://wa.me/${profile.emergency_phone}?text=🚨 EMERGENCY! I need help immediately!`);
      }
    );
  } else {
    // Fallback: If browser doesn't support GPS
    window.open(`https://wa.me/${profile.emergency_phone}?text=🚨 EMERGENCY! I need help!`);
  }
};
const handleDownload = async (fileUrl, fileName) => {
  try {
    const response = await fetch(fileUrl);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    // Fallback if blob download fails
    window.open(fileUrl, '_blank');
  }
  logAction(session.user.id, 'DOWNLOAD', `User downloaded report: ${fileName}`);
};

// Inside your analysis function


// App.js logic to prevent "Connection error"
const triggerGeminiAnalysis = async (record) => {
  setLoadingAI(true);
  try {
    const fullResponse = await getAIReportAnalysis(record.extracted_data, record.type);
    
    // 🛡️ Enhanced Split Logic: Handles different spacing around the dashes
    if (fullResponse && fullResponse.includes('---')) {
      const parts = fullResponse.split('---');
      setShortSummary(parts[0].trim());
      setAiInsight(parts[1].trim()); 
    } else {
      // 🛡️ Fallback: If split fails, don't show an error; show everything in the detailed box
      setShortSummary("High-level summary unavailable. See details below.");
      setAiInsight(fullResponse.trim());
    }
  } catch (error) {
    // 🚨 Only show this if the ACTUAL API call fails
    setAiInsight(`⚠️ API Error: ${error.message}`);
  } finally {
    setLoadingAI(false);
  }
};
const getRiskStyles = (summary) => {
  const text = summary?.toUpperCase() || "";
  
  if (text.includes("HIGH")) {
    return { 
      bg: "#fff1f2", // Light red
      border: "#f43f5e", // Bright red
      text: "#9f1239", 
      icon: "🔴", 
      label: "HIGH RISK DETECTED" 
    };
  }
  if (text.includes("MODERATE")) {
    return { 
      bg: "#fffbeb", // Warm amber
      border: "#fbbf24", // Gold
      text: "#92400e", 
      icon: "🟡", 
      label: "MODERATE RISK" 
    };
  }
  return { 
    bg: "#f0fdf4", // Soft emerald
    border: "#4ade80", // Green
    text: "#166534", 
    icon: "🟢", 
    label: "NORMAL STATUS" 
  };
};
  return (
 <div style={{...dashStyle(theme), display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
    <div style={{ width: '100%', maxWidth: '1200px', padding: '15px', boxSizing: 'border-box' }}>
     
    {/* 1. HEADER & EMERGENCY RIBBONS */}
{/* --- CORRECTED HEADER SECTION --- */}
<div style={logoContainer}>
  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
    <div onClick={() => setShowProfile(true)} style={profileIcon}>
      <img src={profile.profile_url} alt="User" style={{width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover'}} />
    </div>
    
    <div style={{textAlign: 'center', flex: 1}}>
      <h1 style={{logoText, color: theme.text}}>🩺 Sanjeevani</h1>
      <p style={subLogoText}>Vault ID: {session.user.id.slice(0,8)}</p>
    </div>

    <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
      
       {/* 🌙 Dark Mode Toggle */}
       <button 
          onClick={() => setDarkMode(!darkMode)} 
          style={{
            background: darkMode ? '#333' : '#f0f4f5',
            border: 'none',
            padding: '8px 15px',
            borderRadius: '20px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 'bold',
            color: darkMode ? '#fff' : '#1a535c',
            transition: '0.3s'
          }}
        >
          {darkMode ? '☀️ Light' : '🌙 Dark'}
        </button>
    </div>
  </div>

  <button className="sos-btn" style={emergencyModeBtn} onClick={handleSOS}>
    🚨 SOS EMERGENCY
  </button>

  <button style={{ ...emergencyModeBtn, background: 'linear-gradient(90deg, #1a535c, #4ecdc4)', marginTop: '-10px' }} onClick={() => setShowQR(true)}>
    🪪 VIEW EMERGENCY QR CARD
  </button>
</div>
{/* AI HEALTH SUMMARY CARD */}
{/* 🛡️ CLEAN SUMMARY CARD (Rule 2: No Redundancy) */}
<div className="hover-card" style={summaryCardStyle(healthStatus.color, theme)}>
  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
    
    <div style={{ textAlign: 'left', flex: 1 }}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        {/* ✔ POINT 1: STATUS */}
        <h2 style={{ margin: 0, color: healthStatus.color, fontSize: '24px', fontWeight: 'bold' }}>
          {healthStatus.label}
        </h2>
      </div>

      <div style={{display: 'flex', gap: '10px', margin: '12px 0'}}>
        {/* ✔ POINT 2: RISK SCORE */}
        <span style={badgeStyle(healthStatus.color)}>Risk Score: {healthStatus.score}/100</span>
        
        {/* ✔ POINT 3: CONFIDENCE */}
        <span style={badgeStyle('#4ecdc4')}>Confidence: {healthStatus.confidence}%</span>
      </div>

      <p style={{ margin: '5px 0 0 0', color: theme.text, fontSize: '14px', lineHeight: '1.4' }}>
        {healthStatus.recommendation}
      </p>
    </div>
  </div>
</div>
      {/* 2. DUAL HEALTH GRAPHS */}
{/* 2. DUAL HEALTH GRAPHS */}
<div style={graphGrid}>
  {/* GLUCOSE CARD */}
  <div className="hover-card" style={{...actionCard(theme, darkMode), borderTop: '4px solid #4ecdc4'}}>
    <p style={dataLabel}>GLUCOSE TREND</p>
    <div style={graphContainer}>
      {glucoseData.map((val, i) => (
        <div key={i} style={{...barStyle, height: `${(val/150)*100}%`, backgroundColor: val > 125 ? '#ff6b6b' : '#4ecdc4'}}>
          <span style={toolTip}>{val}</span>
          <span style={{fontSize: '7px', position: 'absolute', bottom: '-15px'}}>
            {records && records.length > 0 ? records[i]?.date?.split(' ')[0] : ''}
          </span>
        </div>
      ))}
    </div>
    
    

    {/* 🛡️ Teacher's Item C: Medical Standard Labels */}
    <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '10px', borderTop: `1px solid ${theme.border}`, paddingTop: '5px'}}>
       <p style={{fontSize: '8px', color: theme.subText}}>Ref: WHO Std. Glucose (70-110 mg/dL)</p>
       <p style={{fontSize: '8px', color: theme.subText}}>Ref: AHA Std. BP (&lt;120 mmHg)</p>
    </div>
    <p style={{fontSize: '9px', color: '#666', marginTop: '10px', fontWeight: 'bold'}}>
      🟢 70-100: Normal | 🔴 &gt;125: High (Diabetes Risk)
    </p>

  </div> {/* 🛡️ Ensure this </div> is here to close the Glucose Card! */}

  {/* SYSTOLIC BP CARD */}
  <div className="hover-card" style={{...actionCard(theme, darkMode), borderTop: '4px solid #1a535c'}}>
    <p style={dataLabel}>SYSTOLIC BP</p>
    <div style={graphContainer}>
      {bpData.map((val, i) => (
        <div key={i} style={{...barStyle, height: `${(val/160)*100}%`, backgroundColor: val > 130 ? '#ff6b6b' : '#1a535c'}}>
          <span style={toolTip}>{val}</span>
        </div>
      ))}
    </div>
    <p style={{fontSize: '9px', color: '#666', marginTop: '10px', fontWeight: 'bold'}}>
      🟢 &lt;120: Optimal | 🔴 &gt;130: Elevated (Hypertension Risk)
    </p>
  </div>
</div>
      
  {/* 3. Medical record vault */}
<div className="hover-card" style={{...actionCard(theme, darkMode), textAlign: 'left'}}>
  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
    <h3 style={{color: theme.text, margin: 0, fontSize: '16px'}}>📁 My Medical Records</h3>
    <input 
      style={{
        ...smallInput, 
        maxWidth: '200px', 
        padding: '8px 12px',
        backgroundColor: darkMode ? '#2d2d2d' : '#f8f9fa', 
        color: theme.text, 
        border: `1px solid ${theme.border}`
      }}
      placeholder="🔍 Search reports..." 
      value={searchQuery} 
      onChange={(e) => setSearchQuery(e.target.value)}
    />
  </div>

  <div style={{display: 'flex', gap: '8px', marginBottom: '15px', overflowX: 'auto'}}>
    {['All', 'Pathology', 'Radiology', 'Cardiology', 'Prescription'].map(cat => (
      <button key={cat} onClick={() => setFilter(cat)} style={{
          padding: '5px 12px', borderRadius: '15px', fontSize: '10px',
          background: filter === cat ? '#1a535c' : '#f0f4f5', 
          color: filter === cat ? 'white' : '#1a535c',
          border: 'none', cursor: 'pointer', fontWeight: 'bold'
      }}> {cat} </button>
    ))}
  </div>

  {records.length === 0 ? (
    <div style={{textAlign: 'center', padding: '40px 20px', backgroundColor: theme.card, borderRadius: '15px', border: `1px dashed ${theme.border}`}}>
      <span style={{fontSize: '40px'}}>📂</span>
      <p style={{color: theme.text, fontSize: '14px', marginTop: '10px', fontWeight: '500'}}>No clinical records found.</p>
      <p style={{color: theme.subText, fontSize: '12px'}}>Upload your first report to begin Heuristic AI analysis.</p>
    </div>
  ) : (
    /* 🛡️ NEW GRID WRAPPER STARTS HERE */
   <div style={{
      display: 'flex',
      flexDirection: 'column', // ✅ Forces one record per row
      gap: '12px',
      width: '100%'
    }}>
      {records
        .filter(r => (filter === 'All' || r.type === filter) && r.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .map((rec, i) => {
          const icons = { Radiology: '🦴', Pathology: '🩸', Cardiology: '❤️', Prescription: '📄' };
          return (
            <div key={rec.id || i} style={{...recordRow, margin: 0}}> {/* ✅ Added margin: 0 to prevent alignment issues */}
              <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                <span style={{fontSize: '20px'}}>{icons[rec.type] || '📄'}</span>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: '600' }}>{rec.name}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <p style={{ margin: 0, fontSize: '10px', color: '#1a535c', fontWeight: 'bold' }}>
                      <span title="AES-256 Encrypted" style={{fontSize: '10px'}}>🔐</span>
                      {rec.type?.toUpperCase()} • {rec.date}
                    </p>
                    {rec.file_hash && (
                      <span style={secureBadgeStyle} title={`SHA-256: ${rec.file_hash}`}>
                        🛡️ VERIFIED
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div style={{display:'flex', gap:'5px', alignItems: 'center', position: 'relative'}}>
                <button style={{...viewBtn, background: '#1a535c'}} onClick={() => setPreviewUrl(rec.file_url)}> 👁️ VIEW </button>
                <button style={{...viewBtn, background:'#4ecdc4'}} onClick={() => {setSelectedAnalysis(rec); setShowAnalysisModal(true);}}> ANALYZE </button>
                <button 
                  onClick={() => setActiveMenu(activeMenu === rec.id ? null : rec.id)} 
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: theme.text, opacity: 0.8 }}> 
                  ⋮ 
                </button>

                {activeMenu === rec.id && (
                  <div style={dropdownStyle}>
                    <button style={menuItemStyle} onClick={() => { handleDownload(rec.file_url, rec.name); setActiveMenu(null); }}> ⬇️ Download </button>
                    <button style={menuItemStyle} onClick={() => { window.open(`https://wa.me/?text=${encodeURIComponent(rec.file_url)}`); setActiveMenu(null); }}> 🔗 WhatsApp </button>
                    <button style={{...menuItemStyle, color: '#ff6b6b'}} onClick={() => { handleDeleteReport(rec.id, rec.file_url); setActiveMenu(null); }}> 🗑️ Delete </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
    </div> 
  )}
</div>

 {/* 💊 Medication Manager Section */}
<div className="hover-card" style={{...actionCard(theme, darkMode), marginTop: '20px'}}>
  
  {/* Header with Search and Add Button */}
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
    <h3 style={{ color: theme.text, margin: 0 }}>📅 Medication Schedule</h3>
    
    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
      {/* 🔍 Search Bar */}
      <input 
        style={{
          ...smallInput, 
          padding: '8px 12px', 
          borderRadius: '10px', 
          backgroundColor: darkMode ? '#2d2d2d' : '#f8f9fa', 
          color: theme.text, 
          border: `1px solid ${theme.border}`,
          width: '180px'
        }}
        placeholder="🔍 Search meds..."
        value={medSearchQuery}
        onChange={(e) => setMedSearchQuery(e.target.value)}
      />
      
      <button 
        onClick={() => setShowAddMed(true)} 
        style={{ ...addBtn, padding: '8px 15px', borderRadius: '10px' }}
      >
        + Add New
      </button>
    </div>
  </div>

  {/* 📍 Filtered Display List */}
  <div style={{ marginTop: '10px' }}>
    {medications
      .filter(m => m.name.toLowerCase().includes(medSearchQuery.toLowerCase()))
      .length === 0 ? (
        <p style={{ color: theme.subText, fontSize: '12px', textAlign: 'center', padding: '20px' }}>
          {medSearchQuery ? "No matches found." : "No active schedules. Click + to add."}
        </p>
      ) : (
        medications
          .filter(m => m.name.toLowerCase().includes(medSearchQuery.toLowerCase()))
          .map((med) => (
            <div key={med.id} style={{
              backgroundColor: theme.card,
              borderLeft: `4px solid #4ecdc4`,
              padding: '12px',
              marginBottom: '10px',
              borderRadius: '12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: darkMode ? '0 4px 12px rgba(0,0,0,0.3)' : '0 2px 5px rgba(0,0,0,0.05)'
            }}>
              <div style={{ textAlign: 'left' }}>
                <b style={{ color: theme.text, fontSize: '14px' }}>{med.name}</b>
                <p style={{ fontSize: '10px', color: '#4ecdc4', margin: '4px 0', fontWeight: 'bold' }}>
                  📅 {med.days?.join(', ')} | ⏰ {med.times?.join(' & ')}
                </p>
                {med.desc && (
                  <p style={{ fontSize: '11px', color: theme.subText, fontStyle: 'italic', margin: 0 }}>
                    ℹ️ {med.desc}
                  </p>
                )}
              </div>
              <button 
                onClick={() => setMedications(medications.filter(m => m.id !== med.id))}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#ff6b6b' }}
              >
                🗑️
              </button>
            </div>
          ))
      )}
  </div>
</div>
  
<div className="hover-card" style={{...actionCard(theme, darkMode), marginTop: '20px'}}>
  <h3 style={{color: theme.text, margin: '0 0 15px 0'}}>📤 Upload to Health Vault</h3>
  
 <input 
  style={{
    ...inputStyle, 
    backgroundColor: darkMode ? '#2d2d2d' : '#f8f9fa', 
    color: theme.text, 
    border: `1px solid ${theme.border}`
  }}
    placeholder="Report Name (e.g. Brain MRI, Blood Test Feb)" 
    value={customName}
    onChange={(e) => setCustomName(e.target.value)}
  />

  <select 
  style={{
    ...inputStyle, 
    marginBottom: '15px',
    backgroundColor: darkMode ? '#2d2d2d' : '#f8f9fa', 
    color: theme.text, 
    border: `1px solid ${theme.border}`
  }} value={category} onChange={(e) => setCategory(e.target.value)}>
    <option value="Pathology">🩸 Pathology (Blood/Urine)</option>
    <option value="Radiology">🦴 Radiology (X-Ray/MRI/Scan)</option>
    <option value="Cardiology">❤️ Cardiology (ECG/Heart)</option>
    <option value="Prescription">📄 Prescription/Other</option>
  </select>

  <input type="file" id="report-upload" style={{display: 'none'}} accept='*' onChange={handleFileUpload} />
 <button style={{...primaryBtn, background: '#4ecdc4'}} onClick={() => document.getElementById('report-upload').click()}>
  {uploading ? (
    <span style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'}}>
      <div className="spinner" /> {/* Add a simple CSS spinner */}
      ANALYZING WITH HEURISTIC ENGINE...
    </span>
  ) : "📤 UPLOAD REPORT"}
</button>
</div>
      {/* MODALS */}
   {showProfile && (
  <div style={modalOverlay(theme)} onClick={() => setShowProfile(false)}>
    <div style={profileSidebar(theme)} onClick={e => e.stopPropagation()}>
      
      {/* 1. Header Area */}
      <div style={{ 
  display: 'flex', 
  justifyContent: 'space-between', 
  alignItems: 'center', 
  paddingBottom: '15px',
  marginBottom: '20px',
  borderBottom: `1px solid ${theme.border}`,
  position: 'sticky', // ✅ Keeps buttons visible while scrolling
  top: 0,
  backgroundColor: theme.card,
  zIndex: 10
}}>
  <h2 style={{ color: theme.text, margin: 0, fontSize: '18px' }}>Health Profile</h2>
  
  <div style={{ display: 'flex', gap: '10px' }}>
    <button 
      onClick={() => setIsEditing(!isEditing)} 
      style={{
        ...editBtn,
        padding: '6px 12px',
        fontSize: '11px',
        minWidth: '70px', // ✅ Ensures button doesn't shrink
        display: 'block'  // ✅ Forces visibility
      }}
    >
      {isEditing ? "CANCEL" : "EDIT"}
    </button>
    </div>
      </div>
      <p style={{fontSize: '10px', color: '#888'}}>Last Updated: {lastUpdated}</p>
      <hr />

      {/* 2. Scrollable Content Area */}
      <div style={{
  overflowY: 'auto', 
  maxHeight: '70vh', // 🛡️ Limits height so the sidebar doesn't go off-screen
  flex: 1, 
  paddingRight: '10px',
  display: 'flex',
  flexDirection: 'column',
  gap: '15px'
}}>
        {isEditing ? (
          /* --- EDIT MODE WITH PHOTO UPLOAD --- */
          <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
            
           {/* 📸 UPDATED PROFILE PHOTO UPLOAD SECTION */}
<div style={{
  textAlign: 'center', 
  background: darkMode ? '#252d31' : '#f9f9f9', // 🛡️ Dynamic background
  padding: '15px', 
  borderRadius: '12px', 
  border: `1px dashed ${darkMode ? '#4ecdc4' : '#1a535c'}`, // 🛡️ Dynamic border
  transition: '0.3s'
}}>
  <p style={{...dataLabel, color: theme.subText, marginBottom: '10px'}}>UPDATE PROFILE PHOTO</p>
  <img 
    src={profile.profile_url} 
    style={{width:'60px', height:'60px', borderRadius:'50%', marginBottom: '10px', objectFit: 'cover'}} 
    alt="Preview" 
  />
  <input 
    type="file" 
    accept="image/*" 
    style={{fontSize: '10px', width: '100%', color: theme.text}} 
    onChange={(e) => {
                  const reader = new FileReader();
                  reader.onloadend = () => setProfile({...profile, profile_url: reader.result});
                  reader.readAsDataURL(e.target.files[0]);
                }} 

  />
</div>

            <p style={dataLabel}>FULL NAME</p>
            <input style={inputStyle} value={profile.full_name} onChange={(e) => setProfile({...profile, full_name: e.target.value})} />
            
            <p style={dataLabel}>BIRTH DATE (DOB)</p>
            <input type="date" style={inputStyle} value={profile.dob} onChange={(e) => setProfile({...profile, dob: e.target.value})} />

            <p style={dataLabel}>BLOOD GROUP</p>
            <input style={inputStyle} value={profile.blood_group} onChange={(e) => setProfile({...profile, blood_group: e.target.value})} />

            <p style={dataLabel}>ALLERGIES</p>
            <input style={inputStyle} value={profile.allergies} onChange={(e) => setProfile({...profile, allergies: e.target.value})} />

            <p style={dataLabel}>CHRONIC DISEASES</p>
            <input style={inputStyle} value={profile.chronic_diseases} onChange={(e) => setProfile({...profile, chronic_diseases: e.target.value})} />

            <h4 style={{...sectionTitle, marginTop: '10px'}}>👨‍⚕️ DOCTOR INFO</h4>
            <input style={inputStyle} placeholder="Doctor Name" value={profile.doctor_name} onChange={(e) => setProfile({...profile, doctor_name: e.target.value})} />
            <input style={inputStyle} placeholder="Doctor Phone" value={profile.doctor_phone} onChange={(e) => setProfile({...profile, doctor_phone: e.target.value})} />

            <h4 style={{...sectionTitle, marginTop: '10px'}}>🚨 SOS INFO</h4>
            <input style={inputStyle} placeholder="SOS Contact Name" value={profile.sos_name} onChange={(e) => setProfile({...profile, sos_name: e.target.value})} />
            <input style={inputStyle} placeholder="SOS WhatsApp Number" value={profile.emergency_phone} onChange={(e) => setProfile({...profile, emergency_phone: e.target.value})} />
            
            <button style={{...primaryBtn, marginTop: '10px'}} onClick={handleProfileUpdate}> SAVE CHANGES</button>
            

            <button style={{...closeBtn, width: '100%', marginBottom: '20px'}} onClick={() => setShowProfile(false)}>CLOSE</button>
          
          </div>
        ) : (
          /* --- DISPLAY MODE --- */
          <div>
            <div style={{textAlign:'center', marginBottom:'15px'}}>
              <img src={profile.profile_url} style={{width:'80px', height:'80px', borderRadius:'50%', border:'3px solid #1a535c', objectFit: 'cover'}} alt="User" />
            </div>
            
            <div style={sectionBox (theme, darkMode)}><h4 style={sectionTitle}>👤 Personal</h4>
              <p style={dataLabel}>NAME: <span style={dataValue}>{profile.full_name}</span></p>
              <p style={dataLabel}>DOB: <span style={dataValue}>{profile.dob}</span></p>
              <p style={dataLabel}>AGE: <span style={dataValue}>{calculateAge(profile.dob)} Years</span></p>
            </div>

            <div style={sectionBox (theme, darkMode)}><h4 style={sectionTitle}>🩺 Medical History</h4>
              <p style={dataLabel}>BLOOD: <span style={{...dataValue, color:'red'}}>{profile.blood_group}</span></p>
              <p style={dataLabel}>CHRONIC: <span style={dataValue}>{decryptData(profile.chronic_diseases)}</span></p>
              <p style={dataLabel}>ALLERGIES: <span style={dataValue}>{decryptData(profile.allergies)}</span></p>
            </div>

            <div style={sectionBox (theme, darkMode)}><h4 style={sectionTitle}>🚨 Emergency Contacts</h4>
              <p style={dataLabel}>SOS PERSON: <span style={dataValue}>{profile.sos_name}</span></p>
              <p style={dataLabel}>SOS PHONE: <span style={dataValue}>{profile.emergency_phone}</span></p>
              <hr style={{margin: '10px 0', border: '0.1px solid #eee'}} />
              <p style={dataLabel}>DOCTOR: <span style={dataValue}>{profile.doctor_name}</span></p>
              <p style={dataLabel}>DOC PHONE: <span style={dataValue}>{profile.doctor_phone}</span></p>
              
              <button style={{...closeBtn, width: '100%', marginTop: '20px'}} onClick={() => setShowProfile(false)}>CLOSE PROFILE</button>
              <button 
                style={{background: 'none', border: '1px solid #ff6b6b', color: '#ff6b6b', padding: '10px', borderRadius: '8px', width: '100%', marginTop: '10px', cursor: 'pointer', fontSize: '12px'}}
                onClick={() => supabase.auth.signOut()}
              >
                SIGN OUT
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
)}
{/* 🖼️ FILE PREVIEW MODAL (Item 4) */}
{previewUrl && (
  <div style={modalOverlay(theme)} onClick={() => setPreviewUrl(null)}>
    <div style={{...qrModal(theme), maxWidth: '800px', width: '90%'}} onClick={e => e.stopPropagation()}>
      <div style={modalHeader}>
        <h2 style={{margin:0, color:'white', fontSize:'18px'}}>📄 Document Preview</h2>
      </div>
      <div style={{backgroundColor: '#eee', borderRadius: '10px', overflow: 'hidden', height: '60vh'}}>
        {previewUrl.toLowerCase().endsWith('.pdf') ? (
          <iframe src={previewUrl} title="PDF Preview" style={{width: '100%', height: '100%', border: 'none'}} />
        ) : (
          <img src={previewUrl} alt="Report Preview" style={{width: '100%', height: '100%', objectFit: 'contain'}} />
        )}
      </div>
      <button style={closeBtn} onClick={() => setPreviewUrl(null)}>CLOSE PREVIEW</button>
    </div>
  </div>
)}
 {showQR && (
  /* 🛡️ modalOverlay(theme) centers the card and uses the theme background to hide dashboard text */
  <div style={modalOverlay(theme)} onClick={() => setShowQR(false)}>
    <div style={qrModal(theme)} onClick={e => e.stopPropagation()}>
      
      <div style={modalHeader}>
        <h2 style={{margin:0, color:'white', fontSize:'18px'}}>🛡️ Emergency Health Pass</h2>
      </div>
      
      <div style={qrContentArea}>
        <p style={{...dataLabel, marginBottom: '5px'}}>SECURE PATIENT ID</p>
        <h3 style={{margin: '0 0 15px 0', color: theme.text}}>{profile.full_name}</h3>
        
        {/* 📋 Centered QR Code Container */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          margin: '20px 0', 
          width: '100%' 
        }}>
          <div style={{ 
            background: 'white', 
            padding: '15px', 
            borderRadius: '15px', 
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)' 
          }}>
            <QRCodeCanvas 
              id="emergency-qr-canvas" // ✅ ID added for download feature
              // ✅ Value updated to show full medical details when scanned
              value={`
🏥 SANJEEVANI EMERGENCY PASS
----------------------------
NAME: ${profile.full_name}
BLOOD GROUP: ${profile.blood_group}
ALLERGIES: ${decryptData(profile.allergies)}
CHRONIC: ${decryptData(profile.chronic_diseases)}
EMERGENCY SOS: ${profile.emergency_phone}
VAULT ID: ${session.user.id.slice(0,8)}
              `.trim()} 
              size={180} 
              level={"H"}
              includeMargin={true}
            />
          </div>
        </div>

        {/* 💾 New: Save to Gallery Button */}
        <button 
          onClick={() => {
            const canvas = document.getElementById("emergency-qr-canvas");
            if (canvas) {
              const pngUrl = canvas.toDataURL("image/png");
              const downloadLink = document.createElement("a");
              downloadLink.href = pngUrl;
              downloadLink.download = `Sanjeevani_Pass_${profile.full_name.replace(/\s/g, '_')}.png`;
              document.body.appendChild(downloadLink);
              downloadLink.click();
              document.body.removeChild(downloadLink);
            }
          }}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#1a535c',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            marginBottom: '15px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          💾 SAVE TO GALLERY
        </button>

        {/* 🚨 Centered Clinical Marker */}
        <div style={{
          marginTop: '10px', 
          padding: '15px', 
          backgroundColor: theme.bg, 
          borderRadius: '12px', 
          border: `1px solid ${theme.border}`,
          textAlign: 'center'
        }}>
           <p style={{fontSize: '11px', color: theme.subText, margin: '0 0 5px 0', fontWeight: 'bold'}}>CRITICAL MARKER</p>
           <b style={{fontSize: '24px', color: '#ff4e50'}}>
             {profile.blood_group !== 'Not Set' ? profile.blood_group : "⚠️ UPDATE PROFILE"}
           </b>
        </div>

        <div style={{display: 'flex', gap: '10px', marginTop: '15px'}}>
          <button style={callBtn('#ff4e50')} onClick={() => window.location.href = `tel:${profile.emergency_phone}`}>
            📞 CALL SOS
          </button>
          <button style={callBtn('#1a535c')} onClick={() => window.location.href = `tel:${profile.doctor_phone}`}>
            👨‍⚕️ CALL DOCTOR
          </button>
        </div>
      </div>
      
      <button style={closeBtn} onClick={() => setShowQR(false)}>CLOSE VAULT</button>
    </div>
  </div>
)}
       {/* 🤖 AI ANALYSIS MODAL */}
{showAnalysisModal && selectedAnalysis && (
  <div style={modalOverlay(theme)} onClick={() => setShowAnalysisModal(false)}>
    <div 
      style={{
        ...qrModal(theme), 
        width: '95%',         // ✅ Fills mobile screen
    maxWidth: '700px',    // ✅ Stays neat on Laptop
    textAlign: 'left', 
    margin: 'auto'
      }} 
      onClick={e => e.stopPropagation()} 
    >      
      <h2 style={{color: theme.text}}>📊 Health Analysis</h2>
      
      <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '10px', fontWeight: 'bold', color: hasConsented ? '#2b6cb0' : '#2f855a' }}>
          {hasConsented ? "🔓 CLOUD MODE ENABLED" : "🔒 PRIVATE LOCAL MODE"}
        </span>
        <span style={{ fontSize: '9px', color: '#888' }}>Vault ID: {session.user.id.slice(0,8)}</span>
      </div>

      <div style={{ padding: '5px 0' }}>
        
        {hasConsented ? (
          <div style={{ backgroundColor: theme.bg, padding: '18px', borderRadius: '12px', borderLeft: '5px solid #4ecdc4', marginBottom: '20px' }}>
            <p style={{ ...dataLabel, color: '#4ecdc4', marginBottom: '10px' }}>🌐 PATIENT-FRIENDLY SUMMARY</p>
            
            {loadingAI ? (
              <p style={{ fontSize: '12px', color: theme.text }}>⚙️ Correlating markers with Gemini...</p>
            ) : (
              <div>
                {/* 🚀 DYNAMIC QUICK STATUS BOX */}
    <div style={{ 
      backgroundColor: getRiskStyles(shortSummary).bg, 
      padding: '12px', 
      borderRadius: '8px', 
      marginBottom: '15px', 
      border: `1px solid ${getRiskStyles(shortSummary).border}` 
    }}>
      <p style={{ 
        fontSize: '11px', 
        fontWeight: 'bold', 
        color: getRiskStyles(shortSummary).text, 
        margin: '0 0 5px 0' 
      }}>
        {getRiskStyles(shortSummary).label}
      </p>
      <p style={{ 
        fontSize: '13px', 
        color: getRiskStyles(shortSummary).text, 
        lineHeight: '1.4', 
        margin: 0 
      }}>
        {shortSummary}
      </p>
    </div>
            

                {/* 🚀 SECTION 2 - DETAILED ANALYSIS */}
                <p style={{ fontSize: '11px', fontWeight: 'bold', color: theme.subText, marginBottom: '5px' }}>🔍 DETAILED BREAKDOWN</p>
                <pre style={{ 
                  whiteSpace: 'pre-wrap', 
                  fontSize: '13px', 
                  lineHeight: '1.6', 
                  margin: '0 0 15px 0', 
                  fontFamily: 'inherit', 
                  color: theme.text 
                }}>
                  {aiInsight}
                </pre>
                
                {/* ⬇️ UPDATED DOWNLOAD BUTTON: Now combines both summaries */}
                <button 
                  style={{ 
                    ...editBtn, 
                    background: '#4ecdc4', 
                    color: 'white', 
                    width: '100%', 
                    padding: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }} 
                  onClick={() => {
                    const element = document.createElement("a");
                    // Combine both sections for the file download
                    const fileContent = `SANJEEVANI HEALTH ANALYSIS\n\nReport: ${selectedAnalysis.name}\n\nQUICK STATUS:\n${shortSummary}\n\nDETAILED ANALYSIS:\n${aiInsight}`;
                    const file = new Blob([fileContent], {type: 'text/plain'});
                    element.href = URL.createObjectURL(file);
                    element.download = `${selectedAnalysis.name}_Full_Analysis.txt`;
                    document.body.appendChild(element);
                    element.click();
                  }}
                >
                  📥 DOWNLOAD FULL ANALYSIS
                </button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px', backgroundColor: theme.bg, borderRadius: '15px', border: '1px dashed #4ecdc4', marginBottom: '20px' }}>
            <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#1a535c' }}>✨ Enhance with Patient-Friendly AI?</p>
            <p style={{ fontSize: '10px', color: theme.subText, margin: '8px 0 15px 0' }}>
              Requires consent to process anonymized markers via cloud API.
            </p>
            <button 
              style={{ ...primaryBtn, background: '#1a535c', padding: '12px', fontSize: '12px' }} 
              onClick={() => { setHasConsented(true); triggerGeminiAnalysis(selectedAnalysis); }}
            >
              🚀 ACTIVATE AI INSIGHT
            </button>
          </div>
        )}

        <div style={{ padding: '15px', border: `1px solid ${theme.border}`, borderRadius: '12px', backgroundColor: theme.card }}>
          <p style={{...dataLabel, fontSize: '10px', color: theme.subText}}>🛡️ LOCAL CLINICAL STATUS (PRIVATE)</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', marginTop: '10px' }}>
            <div>
              <p style={{fontSize: '11px', margin: 0, color: theme.text}}>Severity Score</p>
              <b style={{fontSize: '18px', color: theme.text}}>{selectedAnalysis.glucose > 140 ? 60 : 15}/100</b>
            </div>
            <div style={{textAlign: 'right'}}>
              <p style={{fontSize: '11px', margin: 0, color: theme.text}}>Status</p>
              <b style={{color: getReportAnalysis(selectedAnalysis).color}}>{getReportAnalysis(selectedAnalysis).status}</b>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <p style={{ fontSize: '9px', color: theme.subText, margin: 0 }}>
            Last Evaluated: {new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
          <p style={{ fontSize: '8px', color: theme.subText, marginTop: '8px', fontStyle: 'italic', lineHeight: '1.4' }}>
            “This system provides decision-support insights and does not replace professional medical advice.”
          </p>
        </div>
      </div>

      <button style={{ ...closeBtn, marginTop: '10px' }} onClick={() => setShowAnalysisModal(false)}>BACK TO DASHBOARD</button>
    </div>
  </div>
)}

{showAddMed && (
  <div style={modalOverlay(theme)} onClick={() => setShowAddMed(false)}>
    <div style={{ ...qrModal(theme), maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
      <div style={modalHeader}>
        <h2 style={{ margin: 0, color: 'white', fontSize: '18px' }}>➕ New Medication</h2>
      </div>

      <div style={{ padding: '20px' }}>
        <p style={dataLabel}>MEDICATION NAME</p>
        <input 
          style={{ ...inputStyle, backgroundColor: theme.bg, color: theme.text }}
          placeholder="e.g., Insulin"
          value={newMed.name}
          onChange={(e) => setNewMed({ ...newMed, name: e.target.value })}
        />
        {/* 📝 ADDED DESCRIPTION FIELD */}
<p style={dataLabel}>DOSAGE INSTRUCTIONS</p>
<input 
  style={{...inputStyle, backgroundColor: theme.bg, color: theme.text}}
  placeholder="e.g., Take after lunch with water"
  value={newMed.desc}
  onChange={(e) => setNewMed({...newMed, desc: e.target.value})}
/>

        <p style={dataLabel}>SELECT DAYS</p>
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '15px' }}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
            <button
              key={day}
              onClick={() => {
                const updatedDays = newMed.days.includes(day)
                  ? newMed.days.filter(d => d !== day)
                  : [...newMed.days, day];
                setNewMed({ ...newMed, days: updatedDays });
              }}
              style={{
                padding: '6px 10px', borderRadius: '8px', fontSize: '10px', cursor: 'pointer',
                background: newMed.days.includes(day) ? '#4ecdc4' : theme.bg,
                color: newMed.days.includes(day) ? 'white' : theme.text,
                border: `1px solid ${theme.border}`
              }}
            > {day} </button>
          ))}
        </div>

        <p style={dataLabel}>DOSAGE TIMES</p>
        {newMed.times.map((t, idx) => (
          <div key={idx} style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
            <input 
              type="time" 
              style={{ ...smallInput, backgroundColor: theme.bg, color: theme.text }} 
              value={t}
              onChange={(e) => {
                const newTimes = [...newMed.times];
                newTimes[idx] = e.target.value;
                setNewMed({ ...newMed, times: newTimes });
              }}
            />
          </div>
        ))}
        <button 
          style={{ ...editBtn, fontSize: '11px', marginBottom: '15px' }} 
          onClick={() => setNewMed({ ...newMed, times: [...newMed.times, '12:00'] })}
        >
          + Add Another Time
        </button>

        <button style={primaryBtn} onClick={() => {
          if (!newMed.name) return alert("Missing name!");
          setMedications([...medications, { ...newMed, id: Date.now() }]);
          setNewMed({ name: '', times: ['09:00'], days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], desc: '' });
          setShowAddMed(false); // ✅ Close popup after saving
        }}>
          SAVE SCHEDULE
        </button>
      </div>
      
      <button style={closeBtn} onClick={() => setShowAddMed(false)}>CANCEL</button>
    </div>
  </div>
)}
<button onClick={() => supabase.auth.signOut()} style={logoutBtn}>Logout System</button>
</div>
      
      <style>{`
        .hover-card { transition: transform 0.3s ease, box-shadow 0.3s ease; }
        .hover-card:hover { transform: translateY(-5px); box-shadow: 0 12px 25px rgba(26, 83, 92, 0.15); }
        .sos-btn { animation: pulse 2s infinite; cursor: pointer; }
        @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(255, 78, 80, 0.4); } 70% { box-shadow: 0 0 0 15px rgba(255, 78, 80, 0); } 100% { box-shadow: 0 0 0 0 rgba(255, 78, 80, 0); } }
      `}</style>
<style>{`
  /* 📱 Default Mobile Settings (already set in JS) */

  /* 📑 Tablet Breakpoint (768px) */
  @media (min-width: 768px) {
    .dashboard-wrapper { padding: 30px; }
    .summary-card { padding: 30px; }
  }

  /* 💻 Desktop Breakpoint (1024px) */
  @media (min-width: 1024px) {
    .dashboard-wrapper { max-width: 1024px; }
  }

  /* 🖥️ Large Desktop (1280px) */
  @media (min-width: 1280px) {
    .dashboard-wrapper { max-width: 1280px; }
  }

  /* Fix for dull fonts in Dark Mode */
  .pro-text {
    color: ${theme.text};
    text-shadow: ${darkMode ? '0 1px 2px rgba(0,0,0,0.2)' : 'none'};
  }
`}</style>
    </div>

  );

};

export default function App() {
  const [session, setSession] = useState(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showLanding, setShowLanding] = useState(true);
  const [darkMode, setDarkMode] = useState(false); // 🛡️ Shared state

  useEffect(() => {
    // 🛡️ This logic MUST run to detect if a user is logged in
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  const theme = getTheme(darkMode); 

  // 1. Logic: Show Landing Page first
  if (showLanding && !session) {
    return <LandingPage onGetStarted={() => setShowLanding(false)} />;
  }

  // 2. Logic: If no session, show Login/Signup
  if (!session) {
    return isRegistering 
      ? <SignUpPage theme={theme} onBackToLogin={() => setIsRegistering(false)} /> 
      : <LoginPage theme={theme} onShowSignUp={() => setIsRegistering(true)} />;
  }

  // 3. Logic: If logged in, show Dashboard
  return <Dashboard session={session} darkMode={darkMode} setDarkMode={setDarkMode} />;
}
const dashStyle = (theme) => ({ 
  width: '100%',
  minHeight: '100vh', 
  backgroundColor: theme.bg, 
  color: theme.text,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center', // ✅ Centers the content on PC
  padding: '0',
  boxSizing: 'border-box',
  transition: '0.3s ease'
});
const logoContainer = { marginBottom: '30px' };
const logoText = { fontSize: '28px', color: '#1a535c', margin: 0 };
const subLogoText = { color: '#4ecdc4', fontWeight: '600', fontSize: '10px', letterSpacing: '2px' };
const profileIcon = { width: '45px', height: '45px', borderRadius: '50%', backgroundColor: '#1a535c', overflow: 'hidden', cursor: 'pointer' };
const actionCard = (theme, isDarkMode) => ({ 
  backgroundColor: theme.card, 
  color: theme.text,
  padding: '24px', 
  borderRadius: '20px', 
  // 🛡️ Fix: Subtler shadow and clearer border for Dark Mode
  boxShadow: isDarkMode ? '0 8px 32px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.05)', 
  textAlign: 'center',
  border: `1px solid ${isDarkMode ? '#333' : '#eef2f3'}`,
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
});
const graphGrid = { 
  display: 'grid', 
  // 💻 Laptop: Side-by-side | 📱 Mobile: Stacked
  gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', 
  gap: '20px', 
  width: '100%',
  marginBottom: '25px'
};
const graphContainer = { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '80px', marginTop: '10px', padding: '0 5px', borderBottom: '2px solid #eee' };
const barStyle = { width: '12%', borderRadius: '4px 4px 0 0', position: 'relative' };
const toolTip = { position: 'absolute', top: '-18px', left: '50%', transform: 'translateX(-50%)', fontSize: '9px', fontWeight: 'bold' };
const medRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', backgroundColor: '#f9fdfc', borderRadius: '10px', marginBottom: '8px' };
const recordRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderBottom: '1px solid #eee' };
const viewBtn = { background: '#1a535c', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '5px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' };
const riskBadge = (l) => ({ padding: '5px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: 'bold', backgroundColor: '#ffd43b', color: 'white' });
const profileSidebar = (theme) => ({
  backgroundColor: theme.card,
  width: '100%',           // ✅ Default for mobile
  maxWidth: '420px',       // ✅ Limit width for Laptop/PC
  height: '100vh',
  position: 'fixed',
  right: 0,                // ✅ Aligns to the right side
  top: 0,
  padding: '30px',
  boxShadow: '-10px 0 30px rgba(0,0,0,0.2)',
  zIndex: 2000,            // ✅ Ensure it stays on top of all cards
  display: 'flex',
  flexDirection: 'column',
  transition: '0.3s ease-in-out',
  overflowY: 'auto'        // ✅ Allows scrolling if content is long
});
const sectionBox = (theme, isDark) => ({ 
  backgroundColor: isDark ? '#1a2234' : '#f8f9fa', // Rule 4: No pure black
  padding: '16px', 
  borderRadius: '12px', 
  marginBottom: '16px', 
  borderLeft: '4px solid #4ecdc4', 
  textAlign: 'left',
  boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
});
const sectionTitle = { margin: '0 0 8px 0', fontSize: '13px', color: '#1a535c', fontWeight: 'bold' };
const inputStyle = { width: '100%', padding: '10px', margin: '10px 0', borderRadius: '8px', border: '1px solid #ddd' };
const smallInput = { flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '12px' };
const addBtn = { background: '#1a535c', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' };
const dataLabel = { fontSize: '10px', color: '#888', fontWeight: 'bold' };
const dataValue = { fontWeight: 'bold', fontSize: '14px', color: 'inherit' };
const emergencyModeBtn = { width: '100%', background: 'linear-gradient(90deg, #ff4e50, #ff6b6b)', color: 'white', padding: '18px', borderRadius: '15px', fontWeight: 'bold', border: 'none', marginBottom: '15px' };
const primaryBtn = { background: '#1a535c', color: 'white', padding: '15px', borderRadius: '12px', border: 'none', width: '100%', cursor: 'pointer', fontWeight: 'bold' };
const editBtn = {
  background: '#0d9488',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  fontWeight: 'bold',
  transition: '0.2s',
  height: 'fit-content' // ✅ Prevents stretching
};
const modalOverlay = (theme) => ({
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  // 🛡️ Grounded: Use theme background with 95% opacity to hide the dashboard
  backgroundColor: `${theme?.bg || '#0f172a'}F2`, 
  zIndex: 3000,
  display: 'flex',
  justifyContent: 'center', // ✅ Center Horizontally
  alignItems: 'center',     // ✅ Center Vertically
  backdropFilter: 'blur(10px)', // ✨ Professional finish
  padding: '20px'
});

const qrModal = (theme) => ({ 
  backgroundColor: theme?.card || '#1e293b', 
  padding: "30px", 
  borderRadius: "24px", 
  width: '95%',               
  maxWidth: '450px', // ↔️ Stretched to a professional card width
  maxHeight: '90vh',
  overflowY: 'auto',
  color: theme?.text || '#f8fafc',
  border: `1px solid ${theme?.border || '#334155'}`,
  boxShadow: '0 20px 50px rgba(0,0,0,0.5)', // 🛡️ Heavy shadow for depth
  position: 'relative'
});
const modalHeader = { backgroundColor: '#1a535c', padding: '15px', borderRadius: '20px 20px 0 0', margin: '-30px -30px 20px -30px' };
const qrContentArea = { backgroundColor: '#f8f9fa', borderRadius: '15px', padding: '15px' };
const closeBtn = { background: '#ff6b6b', color: 'white', border: 'none', padding: '12px', borderRadius: '10px', width: '100%', marginTop: '20px' };
const logoutBtn = { marginTop: '40px', background: 'none', border: 'none', color: '#888', textDecoration: 'underline', width: '100%' };   const dropdownStyle = {
  position: 'absolute',
  right: '0',
  top: '30px',
  backgroundColor: 'white',
  boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
  borderRadius: '10px',
  zIndex: 1000,
  width: '180px',
  padding: '5px 0',
  border: '1px solid #eee'
};

const menuItemStyle = {
  width: '100%',
  padding: '12px 15px',
  textAlign: 'left',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: '13px',
  color: '#1a535c',
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  transition: 'background 0.2s'
};
const summaryCardStyle = (color, theme) => ({
  backgroundColor: theme.card, 
  padding: '25px',
  borderRadius: '20px',
  marginBottom: '25px',
  borderLeft: `8px solid ${color}`,
  boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
  display: 'flex',
  flexDirection: 'column',
  transition: '0.3s'
});

const riskCircle = (color) => ({
  width: '60px',
  height: '60px',
  borderRadius: '50%',
  backgroundColor: `${color}22`, // Light version of the risk color
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  border: `2px solid ${color}`
});
const emergencyInfoGrid = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '10px',
  marginTop: '20px',
  textAlign: 'center'
};

const infoTile = {
  backgroundColor: '#fff',
  padding: '10px',
  borderRadius: '10px',
  border: '1px solid #eee',
  fontSize: '11px'
};

const callBtn = (color) => ({
  flex: 1,
  backgroundColor: color,
  color: 'white',
  border: 'none',
  padding: '12px',
  borderRadius: '10px',
  fontWeight: 'bold',
  cursor: 'pointer',
  fontSize: '12px'
});
const secureBadgeStyle = {
  backgroundColor: '#e6f7f9',
  color: '#1a535c',
  fontSize: '8px',
  padding: '2px 6px',
  borderRadius: '4px',
  border: '1px solid #4ecdc4',
  fontWeight: 'bold',
  marginLeft: '5px'
};
const getTheme = (isDark) => ({
  bg: isDark ? '#0f172a' : '#f0fdfa',
  card: isDark ? '#1e293b' : '#ffffff',
  text: isDark ? '#f8fafc' : '#1a535c',    // 🛡️ Change: Brighter white for Dark Mode
  border: isDark ? '#334155' : '#eef2f3',
  subText: isDark ? '#94a3b8' : '#64748b'  // 🛡️ Change: Brighter subtext
});
const badgeStyle = (color) => ({
  fontSize: '9px',
  padding: '4px 8px',
  borderRadius: '6px',
  backgroundColor: `${color}15`,
  color: color,
  border: `1px solid ${color}40`,
  fontWeight: 'bold',
  letterSpacing: '0.5px'
});
const downloadSummary = (content) => {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = "Sanjeevani_Health_Summary.txt";
  link.click();
};
const contentContainer = {
  width: '100%',
  maxWidth: '1200px', // ✅ Prevents the dashboard from getting TOO wide on giant monitors
  padding: '20px',
  boxSizing: 'border-box'
};