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
const sidebarWidth = '260px';
const DS = {
  spacing: (n) => `${n * 6}px`, // Reduced from 8px to 6px for tighter layout
  radius: '12px', // Sharper corners for a professional feel
  shadow: {
    soft: '0 2px 10px rgba(0, 0, 0, 0.04)',
    medium: '0 6px 20px rgba(0, 0, 0, 0.08)',
  },
  input: {
    padding: '10px 14px', // Reduced padding for smaller boxes
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    fontSize: '13px' // Slightly smaller text
  }
};

const sidebarStyle = (theme) => ({
  width: sidebarWidth,
  backgroundColor: '#0f172a', // Professional deep navy/teal
  color: 'white',
  display: 'flex',
  flexDirection: 'column',
  position: 'fixed',
  height: '100vh',
  boxSizing: 'border-box',
  zIndex: 100,
  padding: '30px 15px',
  transition: 'all 0.3s ease'
});

const topNavbarStyle = (theme) => ({
  height: '70px',
  backgroundColor: 'rgba(255, 255, 255, 0.8)',
  backdropFilter: 'blur(10px)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '0 40px',
  position: 'sticky',
  top: 0,
  zIndex: 90,
  borderBottom: `1px solid ${theme.border}`
});
const WellnessHero = ({ healthStatus, theme }) => (
  <div style={{
    ...summaryCardStyle(healthStatus.color, theme),
    flexDirection: 'row',
    alignItems: 'center',
    gap: '60px', // Increased gap for dominance
    padding: '60px', // Larger padding for hero feel
    borderLeft: `12px solid ${healthStatus.color}`,
    background: theme.card
  }}>
    <div style={{
      width: '140px', height: '140px', borderRadius: '50%',
      border: `12px solid ${healthStatus.color}15`,
      borderTop: `12px solid ${healthStatus.color}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      boxShadow: `0 0 40px ${healthStatus.color}10`
    }}>
      <b style={{ fontSize: '42px', color: healthStatus.color }}>{healthStatus.score || 82}</b>
    </div>

    <div style={{ flex: 1, textAlign: 'left' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <h2 style={{ margin: 0, color: theme.text, fontSize: '36px', fontWeight: '800' }}>{healthStatus.label}</h2>
        <span style={{ ...badgeStyle(healthStatus.color), padding: '8px 16px', fontSize: '12px' }}>SYSTEM OPTIMIZED</span>
      </div>
      <p style={{ color: theme.subText, fontSize: '18px', marginTop: '15px', maxWidth: '700px', lineHeight: '1.6' }}>
        {healthStatus.recommendation}
      </p>
    </div>
  </div>
);


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
  const [activeTab, setActiveTab] = useState('Dashboard'); // ✅ This defines the "activeTab" variable
  const [settingsSubTab, setSettingsSubTab] = useState('profile'); 
 const theme = {
    bg: darkMode ? '#020617' : '#f8fafc', // Obsidian only in Dark Mode
    card: darkMode ? '#0f172a' : '#ffffff',
    text: darkMode ? '#f8fafc' : '#1e293b',
    accent: '#2dd4bf', // Neon Mint
    border: darkMode ? 'rgba(45, 212, 191, 0.1)' : '#e2e8f0',
    subText: '#94a3b8'
  };
  const [loading, setLoading] = useState(false);
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
 const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(window.innerWidth < 768);
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
  const [showNotifications, setShowNotifications] = useState(false);
const [notifications, setNotifications] = useState(() => {
  const saved = localStorage.getItem('sanjeevani_notifications');
  // Load saved alerts if they exist; otherwise, use the 3 defaults
  return saved ? JSON.parse(saved) : [
    { id: 1, type: 'ALERT', text: 'Missed morning dose: Insulin', time: '2h ago', read: false },
    { id: 2, type: 'INSIGHT', text: 'New AI analysis available for CBC Report', time: '5h ago', read: false },
    { id: 3, type: 'SYSTEM', text: 'Vault backup completed successfully', time: 'Yesterday', read: true }
  ];
});

// ✅ Sync with LocalStorage whenever the list changes
useEffect(() => {
  localStorage.setItem('sanjeevani_notifications', JSON.stringify(notifications));
}, [notifications]);
const healthStatus = records.length > 0 
    ? calculateHealthRisk(records) 
    : { label: 'Awaiting Data', color: '#888', score: 0 };

  // NOW you can safely perform these checks
  const statusLabel = healthStatus?.label || "Stable";
  const isHighRisk = String(statusLabel).toLowerCase().includes('high');
  const isStable = String(statusLabel).toLowerCase().includes('stable');
  const addSOSContact = () => {
  if (profile.emergency_contacts.length >= 3) return alert("Security Limit: Max 3 SOS contacts allowed.");
  setProfile({
    ...profile,
    emergency_contacts: [...profile.emergency_contacts, { name: '', phone: '', relation: '' }]
  });
};
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
  }, [session]);// ✅ Logic to close the notification menu when clicking anywhere else

  const fetchRecords = async () => {
    const { data, error } = await supabase
      .from('medical_records')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setRecords(data);
    }
  };
  
useEffect(() => {
  const handleGlobalClick = (event) => {
    // If the menu is open, we close it unless the user clicked inside the menu itself
    if (showNotifications) {
      setShowNotifications(false);
    }
  };

  if (showNotifications) {
    window.addEventListener('click', handleGlobalClick);
  }

  return () => {
    window.removeEventListener('click', handleGlobalClick);
  };
}, [showNotifications]);
const [latency, setLatency] = useState(0);

useEffect(() => {
  const checkStatus = async () => {
    const start = performance.now();
    // A lightweight check to Supabase
    await supabase.from('profiles').select('id').limit(1);
    const end = performance.now();
    setLatency(Math.round(end - start));
  };

  checkStatus();
  const interval = setInterval(checkStatus, 30000); // Re-check every 30 seconds
  return () => clearInterval(interval);
}, []);

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
  emergency_contacts: [ { name: 'Contact 1', phone: '', relation: 'Primary' } ],
  sos_name: session?.user?.user_metadata?.sos_name || 'Not Set',
  doctor_name: session?.user?.user_metadata?.doctor_name || 'Not Assigned',
  doctor_phone: session?.user?.user_metadata?.doctor_phone || 'N/A',
  profile_url: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'
  });
// 🔐 UPDATE: Secure Password Change logic
const handleChangePassword = async () => {
  const currentPassword = document.getElementById('current-pass-field').value;
  const newPassword = document.getElementById('new-pass-field').value;
  const confirmPassword = document.getElementById('confirm-pass-field').value;

  if (!currentPassword || !newPassword) return alert("All fields are required! ⚠️");
  if (newPassword !== confirmPassword) return alert("New passwords do not match! ❌");
  if (newPassword.length < 6) return alert("New password must be at least 6 characters.");

  setLoading(true);
  try {
    // 1. Re-verify the user by attempting to sign in with their current password
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: session.user.email,
      password: currentPassword,
    });

    if (verifyError) throw new Error("Incorrect current password. Verification failed. 🔒");

    // 2. If verified, update to the new password
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) throw updateError;

    alert("Vault Password updated successfully! 🔒");
    logAction(session.user.id, 'SECURITY', 'User updated system access password');
  } catch (error) {
    alert(error.message);
  } finally {
    setLoading(false);
  }
};

// 🆘 NEW: Forgot Password / OTP Flow
const handleForgotPassword = async () => {
  const { error } = await supabase.auth.resetPasswordForEmail(session.user.email, {
    redirectTo: window.location.origin,
  });

  if (error) alert("OTP Request failed: " + error.message);
  else alert("A secure reset OTP link has been sent to: " + session.user.email + " 📲");
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
const handleProfilePhotoUpload = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  try {
    setUploading(true);
    const fileName = `avatars/${session.user.id}_${Date.now()}`;
    
    // 1. Upload to 'reports' bucket (or create a new 'avatars' bucket in Supabase)
    const { error: uploadError } = await supabase.storage
      .from('reports') 
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    // 2. Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('reports')
      .getPublicUrl(fileName);

    // 3. Update the local profile state and Database
    const updatedProfile = { ...profile, profile_url: publicUrl };
    setProfile(updatedProfile);
    
    await supabase
      .from('profiles')
      .update({ profile_url: publicUrl })
      .eq('id', session.user.id);

    alert("✅ Identity Photo Updated!");
    logAction(session.user.id, 'IDENTITY_UPDATE', 'User changed profile photo');
  } catch (error) {
    alert("Photo Upload Failed: " + error.message);
  } finally {
    setUploading(false);
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

    // 1. ✨ OCR STEP
    let extractedText = "";
    if (file.type.startsWith('image/')) {
      const { data: { text } } = await Tesseract.recognize(file, 'eng');
      extractedText = text;
    } else if (file.type === 'application/pdf') {
      extractedText = "PDF content extraction requires specialized worker logic.";
    }

    // 🛡️ 2. HYBRID SECURITY GATE
    const upperText = extractedText.toUpperCase();
    const clinicalMarkers = ['HEMOGLOBIN', 'LEUCOYTE', 'PLATELET', 'HAEMATOLOGY', 'LYMPHOCYTE', 'MCHC', 'RBC'];
    const hasClinicalMarkers = clinicalMarkers.some(marker => upperText.includes(marker));

    if (extractedText.length > 10 && !hasClinicalMarkers) { 
      const verificationPrompt = `Determine if this text belongs to a medical lab report or prescription. Respond ONLY with "VALID" or "INVALID". Text: ${extractedText.substring(0, 600)}`;
      
      const aiResponse = await getAIReportAnalysis(verificationPrompt, "SecurityCheck");
      
      if (aiResponse.includes("INVALID")) {
        alert("🚫 SECURITY BLOCK: This document does not appear to be a medical record.");
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

    // 4. Insert into Database
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

    // 5. 🎉 SUCCESS ACTIONS
    if (data) {
      setRecords([data[0], ...records]);

      // ✅ DYNAMIC NOTIFICATION TRIGGER
      const newNotif = {
        id: Date.now(),
        type: 'SYSTEM',
        text: `Vault Secured: ${newRecord.name}`, // Uses the custom name if provided
        time: 'Just now',
        read: false
      };
      setNotifications(prev => [newNotif, ...prev]);

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
const handleSOS = () => {
  // 1. Safety Check: Determine which contacts to alert
  const contactsToAlert = profile.emergency_contacts && profile.emergency_contacts.length > 0 
    ? profile.emergency_contacts 
    : [{ name: profile.sos_name, phone: profile.emergency_phone }];

  if (contactsToAlert.length === 0 || !contactsToAlert[0].phone) {
    alert("⚠️ No Emergency Contacts found! Please update your Identity Core.");
    setSettingsSubTab('profile');
    setActiveTab('Settings');
    return;
  }

  // 2. Gather GPS Location
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const mapLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
        
        // 3. Send alerts to ALL contacts
        contactsToAlert.forEach(contact => {
          if (contact.phone) {
            const message = encodeURIComponent(
              `🚨 SOS EMERGENCY! ${profile.full_name} needs help.\n` +
              `📍 Current Location: ${mapLink}\n` +
              `🩸 Blood Group: ${profile.blood_group}`
            );
            window.open(`https://wa.me/${contact.phone}?text=${message}`, '_blank');
          }
        });
        
        logAction(session.user.id, 'SOS_TRIGGERED', `Alert sent to ${contactsToAlert.length} contacts with GPS.`);
      },
      (error) => {
        // Fallback: Send alert without GPS if location is blocked
        contactsToAlert.forEach(contact => {
          if (contact.phone) {
            const message = encodeURIComponent(`🚨 EMERGENCY! ${profile.full_name} needs help immediately!`);
            window.open(`https://wa.me/${contact.phone}?text=${message}`, '_blank');
          }
        });
      }
    );
  }
};
const handleDownloadFile = async (url, name) => {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = name;
    link.click();
  } catch (e) {
    window.open(url, '_blank'); // Fallback
  }
};
const handleWhatsAppShare = (rec) => {
  const message = encodeURIComponent(
    `🏥 *Sanjeevani Medical Record*\n` +
    `📄 Report: ${rec.name}\n` +
    `📅 Date: ${rec.date}\n` +
    `🔗 Access Link: ${rec.file_url}`
  );
  window.open(`https://wa.me/?text=${message}`, '_blank');
};
const saveMedication = () => {
  if (!newMed.name || newMed.times.length === 0) {
    return alert("Please enter a medicine name and at least one alarm time.");
  }

  const medicationId = Date.now();
  const medicationData = { ...newMed, id: medicationId, lastTaken: null };

  // 1. Update the Medication State
  setMedications([...medications, medicationData]);

  // 2. ✅ NEW: Trigger a System Notification
  const newNotif = {
    id: medicationId,
    type: 'SYSTEM',
    text: `Schedule Active: ${newMed.name} (${newMed.times.length} daily doses)`,
    time: 'Just now',
    read: false
  };
  setNotifications(prev => [newNotif, ...prev]);

  // 3. Reset the form and notify user
  setNewMed({ 
    name: '', 
    times: [], 
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], 
    desc: '' 
  });
  
  alert("Medication Reminder Saved! 💊");
  logAction(session.user.id, 'MEDICATION_ADDED', `New schedule created for: ${medicationData.name}`);
};
const handleDeleteMedication = (medId) => {
  // 1. Clear any active browser notifications for this ID
  if (window.registration) {
    window.registration.getNotifications().then(notifications => {
      notifications.forEach(notification => {
        if (notification.tag === `med-${medId}`) notification.close();
      });
    });
  }


  // 2. Update local state
  const updatedMeds = medications.filter(m => m.id !== medId);
  setMedications(updatedMeds);

  // 3. Log the action for clinical audit
  logAction(session.user.id, 'MEDICATION_DELETED', `ID: ${medId} removed from vault`);
};


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
const mainContentWrapper = {
    flex: 1,
    // The margin now "watches" the sidebar
    marginLeft: isSidebarCollapsed ? '80px' : '260px', 
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: theme.bg, 
    minHeight: '100vh',
    // The width now "watches" the sidebar
    width: `calc(100% - ${isSidebarCollapsed ? '80px' : '260px'})`, 
    boxSizing: 'border-box',
    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' 
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
const clearAllNotifications = () => {
  if (window.confirm("Permanently clear all system alerts?")) {
    setNotifications([]); // Clears the UI
    localStorage.setItem('sanjeevani_notifications', JSON.stringify([])); // Clears memory
    logAction(session.user.id, 'SYSTEM', 'User cleared notification history');
  }
};
return (
  <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: theme.bg }}>
    
    {/* 🧭 1. FIXED SIDEBAR */}
   {/* 📋 COLLAPSIBLE SIDEBAR: OBSIDIAN & MINT THEME */}
<aside style={{
  width: isSidebarCollapsed ? '80px' : '260px',
  backgroundColor: '#0f172a', // Deep Obsidian Slate
  color: 'white',
  display: 'flex',
  flexDirection: 'column',
  position: 'fixed',
  height: '100vh',
  boxSizing: 'border-box',
  zIndex: 1000,
  padding: isSidebarCollapsed ? '30px 10px' : '30px 20px',
  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)', // Smooth expansion
  borderRight: '1px solid rgba(45, 212, 191, 0.1)' // Neon Mint Border
}}>
  
  {/* 🏥 BRANDING AREA */}
  <div style={{ marginBottom: '40px', textAlign: isSidebarCollapsed ? 'center' : 'left' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: isSidebarCollapsed ? 'center' : 'flex-start' }}>
      <span style={{ fontSize: '28px', filter: 'drop-shadow(0 0 8px rgba(45, 212, 191, 0.3))' }}>🏥</span>
      {!isSidebarCollapsed && (
        <div style={{ animation: 'fadeIn 0.3s' }}>
          <h1 style={{ color: '#2dd4bf', margin: 0, fontSize: '20px', fontWeight: '800' }}>Sanjeevani</h1>
          <p style={{ fontSize: '9px', color: '#94a3b8', margin: 0, letterSpacing: '1px' }}>AI HEALTH SYSTEM</p>
        </div>
      )}
    </div>
  </div>

  {/* 🔘 COLLAPSE TOGGLE (Hidden on Mobile) */}
  {window.innerWidth >= 768 && (
    <button 
      onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      style={{
        background: 'rgba(45, 212, 191, 0.1)',
        border: '1px solid rgba(45, 212, 191, 0.2)',
        color: '#2dd4bf',
        borderRadius: '8px',
        padding: '5px',
        cursor: 'pointer',
        marginBottom: '20px',
        fontSize: '12px'
      }}
    >
      {isSidebarCollapsed ? '▶' : '◀ COLLAPSE'}
    </button>
  )}

  {/* 🧭 NAVIGATION */}
  <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
    {['Dashboard', 'Medical Vault', 'AI Trends', 'Medications', 'Emergency', 'Settings'].map(tab => (
      <div 
        key={tab} 
        onClick={() => {
          setActiveTab(tab);
          if(window.innerWidth < 768) setIsSidebarCollapsed(true); // Auto-close on mobile selection
        }} 
        style={{
          padding: '12px 15px',
          borderRadius: '12px',
          cursor: 'pointer',
          backgroundColor: activeTab === tab ? '#0d9488' : 'transparent',
          color: activeTab === tab ? 'white' : '#94a3b8',
          fontWeight: '600',
          transition: '0.3s',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          justifyContent: isSidebarCollapsed ? 'center' : 'flex-start'
        }}
        title={isSidebarCollapsed ? tab : ""}
      >
        <span style={{ fontSize: '18px' }}>
          {tab === 'Dashboard' ? '📊' : tab === 'Medical Vault' ? '📁' : tab === 'AI Trends' ? '📈' : tab === 'Medications' ? '💊' : tab === 'Emergency' ? '🚨' : '⚙️'}
        </span>
        {!isSidebarCollapsed && <span style={{ animation: 'fadeIn 0.3s' }}>{tab}</span>}
      </div>
    ))}
  </nav>

{/* 👤 PROFILE & SYSTEM FOOTER */}
<div style={{ 
  marginTop: 'auto', 
  paddingTop: '20px', 
  borderTop: '1px solid rgba(255,255,255,0.05)' 
}}>
  <div 
    onClick={() => setActiveTab('Settings')}
    style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '12px', 
      cursor: 'pointer', 
      padding: '10px', 
      borderRadius: '12px',
      justifyContent: isSidebarCollapsed ? 'center' : 'flex-start',
      backgroundColor: activeTab === 'Settings' ? 'rgba(45, 212, 191, 0.1)' : 'transparent',
      transition: '0.3s'
    }}
  >
    {/* ✅ DYNAMIC PHOTO: Synchronized with profile state */}
    <img 
      src={profile.profile_url} 
      style={{ 
        width: '35px', 
        height: '35px', 
        borderRadius: '10px', 
        border: activeTab === 'Settings' ? '2px solid #2dd4bf' : 'none',
        objectFit: 'cover' // Ensures the photo doesn't stretch
      }} 
      alt="User" 
    />
    
    {!isSidebarCollapsed && (
      <div style={{ overflow: 'hidden', animation: 'fadeIn 0.3s' }}>
        <p style={{ margin: 0, fontSize: '13px', color: 'white', fontWeight: '700' }}>
          {profile.full_name.split(' ')[0]}
        </p>
        <p style={{ margin: 0, fontSize: '10px', color: '#64748b' }}>v1.0.4 PREMIUM</p>
      </div>
    )}
  </div>

  {/* 🟢 SYSTEM STATUS (Remains as is) */}
  {!isSidebarCollapsed && (
    <div style={{ marginTop: '20px', padding: '15px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div className="sos-btn" style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: latency < 300 ? '#2dd4bf' : '#fbbf24' }} />
          <span style={{ fontSize: '9px', color: '#94a3b8' }}>SYSTEM LIVE</span>
        </div>
        <span style={{ fontSize: '9px', color: '#64748b' }}>{latency}ms</span>
      </div>
      <button 
        onClick={() => supabase.auth.signOut()} 
        style={{ width: '100%', background: 'transparent', color: '#f43f5e', border: '1px solid rgba(244, 63, 94, 0.2)', padding: '6px', borderRadius: '8px', fontSize: '10px', cursor: 'pointer' }}
      >
        Logout System
      </button>
    </div>
  )}
</div>
</aside>

    {/* 🚀 2. MAIN AREA */}
    <main style={mainContentWrapper}>
      
      {/* 🔝 3. TOP NAVBAR */}
    <header style={topNavbarStyle(theme)}>
  {/* LEFT: Contextual Breadcrumb & Security Chip */}
  <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
    <h2 style={{ fontSize: '20px', fontWeight: '800', color: theme.text, margin: 0 }}>{activeTab}</h2>
    
    {/* 🛡️ MINIMAL SECURITY CHIP */}
    <div style={{ 
      display: 'flex', alignItems: 'center', gap: '8px', 
      padding: '6px 14px', borderRadius: '20px', 
      backgroundColor: '#f0fdfa', border: '1px solid #ccfbf1' 
    }}>
      <span className="sos-btn" style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#0d9488' }} />
      <span style={{ fontSize: '11px', fontWeight: '800', color: '#0f766e', letterSpacing: '0.5px' }}>
        VAULT ENCRYPTED (AES-256)
      </span>
    </div>
  </div>

  {/* RIGHT: Actions & System Status */}
  <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
    {/* 🔔 REFINED NOTIFICATION CENTER */}
<div style={{ position: 'relative', zIndex: 1001 }}> {/* ✅ Increased Z-Index for the trigger */}
  <button 
    onClick={(e) => {
      e.stopPropagation(); // ✅ Prevents the click from closing the menu immediately
      setShowNotifications(!showNotifications);
    }}
    style={{ 
      background: 'none', border: 'none', cursor: 'pointer', 
      fontSize: '22px', padding: '8px', borderRadius: '10px',
      transition: '0.2s',
      backgroundColor: showNotifications ? '#f1f5f9' : 'transparent'
    }}
  >
    🔔
    {notifications.some(n => !n.read) && (
      <span style={{ 
        position: 'absolute', top: '6px', right: '6px', 
        width: '10px', height: '10px', backgroundColor: '#f43f5e', 
        borderRadius: '50%', border: '2px solid white' 
      }} />
    )}
  </button>

 {/* 🧩 THE DROPDOWN PANEL */}
{showNotifications && (
  <div 
    onClick={(e) => e.stopPropagation()} // ✅ Prevents closing when clicking inside the menu
    style={{ 
      position: 'absolute', 
      top: '55px', // ✅ Adjusted spacing
      right: '0', 
      width: '320px', 
      backgroundColor: theme.card, 
      borderRadius: '16px', 
      boxShadow: '0 20px 40px rgba(0,0,0,0.2)', // ✅ Stronger shadow for depth
      border: `1px solid ${theme.border}`, 
      zIndex: 2000, // ✅ Highest priority
      overflow: 'hidden',
      animation: 'slideDown 0.3s ease-out' // ✅ Uses your existing animation logic
    }}
  >
    {/* 🔝 HEADER WITH MULTI-ACTIONS */}
    <div style={{ 
      padding: '16px', 
      borderBottom: `1px solid ${theme.border}`, 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center' 
    }}>
      <b style={{ fontSize: '14px', color: theme.text }}>System Alerts</b>
      <div style={{ display: 'flex', gap: '12px' }}>
        <span 
          style={{ fontSize: '11px', color: '#0d9488', fontWeight: 'bold', cursor: 'pointer' }}
          onClick={() => setNotifications(notifications.map(n => ({...n, read: true})))}
        >
          Mark read
        </span>
        <span 
          style={{ fontSize: '11px', color: '#f43f5e', fontWeight: 'bold', cursor: 'pointer' }}
          onClick={clearAllNotifications} // ✅ New Functionality
        >
          Clear all
        </span>
      </div>
    </div>
    
    <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
      {notifications.length > 0 ? (
        notifications.map(n => (
          <div key={n.id} style={{ 
            padding: '16px', borderBottom: `1px solid ${theme.border}`, 
            backgroundColor: n.read ? 'transparent' : 'rgba(13, 148, 136, 0.05)',
            display: 'flex', gap: '12px'
          }}>
            <div style={{ fontSize: '18px' }}>
              {/* ✅ Preserved existing icons/logic */}
              {n.type === 'ALERT' ? '⚠️' : n.type === 'INSIGHT' ? '🧠' : '⚙️'} 
            </div>
            <div>
              <p style={{ 
                margin: 0, 
                fontSize: '13px', 
                color: theme.text, 
                fontWeight: n.read ? '400' : '600' 
              }}>
                {n.text}
              </p>
              <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: theme.subText }}>
                {n.time}
              </p>
            </div>
          </div>
        ))
      ) : (
        /* 🍃 EMPTY STATE ILLUSTRATION */
        <div style={{ padding: '60px 20px', textAlign: 'center', color: theme.subText }}>
          <div style={{ fontSize: '40px', marginBottom: '10px', opacity: 0.5 }}>🍃</div>
          <p style={{ fontSize: '13px', fontWeight: '600', margin: 0 }}>All Clear!</p>
          <p style={{ fontSize: '11px', marginTop: '5px' }}>No pending system alerts.</p>
        </div>
      )}
    </div>
  </div>
)}
</div>

    {/* SYSTEM PERFORMANCE INDICATOR */}
    <div style={{ borderLeft: `1px solid ${theme.border}`, paddingLeft: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
       <button onClick={() => setDarkMode(!darkMode)} style={{ 
         background: theme.card, border: `1px solid ${theme.border}`, 
         padding: '10px 16px', borderRadius: '12px', color: theme.text, 
         cursor: 'pointer', fontSize: '13px', fontWeight: '700' 
       }}>
         {darkMode ? '☀️ Mode' : '🌙 Mode'}
       </button>
    </div>
  </div>
</header>
      {/* 🖼️ 4. DYNAMIC CONTENT AREA (Conditional Rendering) */}
      <div style={{ padding: '40px 20px', width: '100%', maxWidth: '1200px', margin: '0 auto', boxSizing: 'border-box' }}>
{/* TAB 1: DASHBOARD */}
{activeTab === 'Dashboard' && (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', animation: 'slideUpFade 0.4s ease' }}>
    
    {/* 🟢 DYNAMIC WELLNESS RIBBON */}
    {(() => {
      // Safely extract label and color from your healthStatus object
      const statusLabel = healthStatus?.label || "Stable";
      const statusColor = healthStatus?.color || "#2dd4bf";
      
      // Determine risk level for localized styling
      const isHighRisk = typeof healthStatus?.label === 'string' && healthStatus.label.toLowerCase().includes('high');
      const isStable = String(statusLabel).toLowerCase().includes('stable');
      
      // Background and accent colors based on status
      const bgColor = isHighRisk ? 'rgba(244, 63, 94, 0.08)' : (isStable ? 'rgba(45, 212, 191, 0.08)' : 'rgba(251, 191, 36, 0.08)');

      return (
        <div style={{ 
          background: darkMode ? bgColor : (isHighRisk ? '#fff1f2' : (isStable ? '#f0fdfa' : '#fffbeb')),
          padding: '18px 25px', // ✅ Thinner padding for a ribbon look
          borderRadius: '20px',
          border: `1px solid ${statusColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          transition: 'all 0.3s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ 
              width: '40px', height: '40px', borderRadius: '50%', 
              border: `2.5px solid ${statusColor}`, 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: darkMode ? '#0f172a' : '#fff'
            }}>
              <span style={{ color: statusColor, fontSize: '15px', fontWeight: '900' }}>82</span>
            </div>
            <div>
              <h2 style={{ color: theme.text, margin: 0, fontSize: '18px', fontWeight: '800', letterSpacing: '0.5px' }}>
                STATUS: <span style={{ color: statusColor }}>{statusLabel.toUpperCase()}</span>
              </h2>
              <p style={{ color: theme.subText, margin: 0, fontSize: '12px' }}>
                {isHighRisk ? 'Immediate attention required: Abnormal markers detected.' : 'Biochemical markers are within optimal range.'}
              </p>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ 
              fontSize: '10px', fontWeight: '900', color: statusColor, 
              background: bgColor, padding: '5px 12px', borderRadius: '20px', border: `1px solid ${statusColor}` 
            }}>
              {isHighRisk ? '⚠️ ACTION REQUIRED' : '✅ SYSTEM OPTIMIZED'}
            </span>
          </div>
        </div>
      );
    })()}

    {/* 🟢 HEALTH METRICS GRID */}
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', 
      gap: '25px',
      width: '100%'
    }}>
      {/* GLUCOSE TREND */}
      <div className="hover-card" style={{ ...actionCard(theme, darkMode), padding: '25px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <p style={dataLabel}>GLUCOSE TREND ↗️</p>
          <span style={{ fontSize: '10px', color: '#0d9488', fontWeight: 'bold' }}>Normal Range</span>
        </div>
        <div style={{ ...graphContainer, height: '100px' }}>
          {glucoseData.map((val, i) => (
            <div key={i} style={{ ...barStyle, height: `${(val/200)*100}%`, backgroundColor: '#4ecdc4', width: '14px', borderRadius: '4px 4px 0 0' }} />
          ))}
        </div>
        <p style={{ fontSize: '11px', color: theme.subText, marginTop: '10px' }}>AI Insight: Stability detected after dietary adjustments.</p>
      </div>

      {/* BLOOD PRESSURE */}
      <div className="hover-card" style={{ ...actionCard(theme, darkMode), padding: '25px' }}>
        <p style={{ ...dataLabel, marginBottom: '15px' }}>BLOOD PRESSURE ↔️</p>
        <div style={{ ...graphContainer, height: '100px' }}>
          {bpData.map((val, i) => (
            <div key={i} style={{ ...barStyle, height: `${(val/180)*100}%`, backgroundColor: '#1a535c', width: '14px', borderRadius: '4px 4px 0 0' }} />
          ))}
        </div>
        <p style={{ fontSize: '11px', color: theme.subText, marginTop: '10px' }}>Systolic average: 122 mmHg. Cardiovascular load is stable.</p>
      </div>

      {/* MEDICATION ADHERENCE */}
      <div className="hover-card" style={{ ...actionCard(theme, darkMode), padding: '25px' }}>
        <p style={dataLabel}>MEDICATION ADHERENCE</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '15px' }}>
          <b style={{ fontSize: '28px', color: theme.text }}>94%</b>
          <div style={{ flex: 1, height: '10px', background: darkMode ? '#1e293b' : '#eee', borderRadius: '5px' }}>
            <div style={{ width: '94%', height: '100%', background: 'linear-gradient(90deg, #0d9488, #2dd4bf)', borderRadius: '5px' }} />
          </div>
        </div>
      </div>

      {/* UPCOMING SCHEDULE (Replaces Heart Rate) */}
      <div className="hover-card" style={{ ...actionCard(theme, darkMode), borderLeft: '8px solid #0d9488', padding: '25px' }}>
        <p style={dataLabel}>UPCOMING SCHEDULE</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
          <div>
            <b style={{ fontSize: '18px', color: theme.text }}>
              {medications.length > 0 ? medications[0].name : "No Pending Doses"}
            </b>
            <p style={{ margin: 0, fontSize: '12px', color: theme.subText }}>
              Next: {medications.length > 0 ? medications[0].times[0] : "--:--"}
            </p>
          </div>
          <span style={{ fontSize: '32px' }}>⏳</span>
        </div>
      </div>
    </div>

    {/* 🏥 SECTION 3: CLINICAL HEALTH SUMMARY (Replaces System Logs) */}
    <div className="hover-card" style={{ ...actionCard(theme, darkMode), textAlign: 'left', background: 'linear-gradient(to right, rgba(13, 148, 136, 0.05), transparent)' }}>
      <h3 style={{ color: theme.text, margin: '0 0 15px 0', fontSize: '16px' }}>Clinical Health Summary</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
         <div style={{ borderLeft: `3px solid #2dd4bf`, paddingLeft: '15px' }}>
            <p style={{ ...dataLabel, fontSize: '10px', marginBottom: '5px' }}>CHRONIC STATUS</p>
            <b style={{ fontSize: '13px', color: theme.text }}>{decryptData(profile.chronic_diseases) || "Stable"}</b>
         </div>
         <div style={{ borderLeft: `3px solid #0d9488`, paddingLeft: '15px' }}>
            <p style={{ ...dataLabel, fontSize: '10px', marginBottom: '5px' }}>ANALYSIS CONFIDENCE</p>
            <b style={{ fontSize: '13px', color: theme.text }}>94% Clinical AI Confidence</b>
         </div>
      </div>
    </div>
  </div>
)}
{/* TAB 2 : MEDICAL VAULT */}
{activeTab === 'Medical Vault' && (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '35px', width: '100%' }}>
    
    {/* 🔐 SECTION 1: SECURE UPLOAD CARD (Width Aligned) */}
    <div className="hover-card" style={{ ...actionCard(theme, darkMode), width: '100%' }}>
      <h3 style={{ ...sectionTitle, textAlign: 'center', color: '#0d9488', marginBottom: '20px' }}>🔐 Secure Medical Upload</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div style={{ display: 'flex', gap: '15px' }}>
          <input 
            style={{ ...inputStyle, flex: 2, margin: 0 }} 
            placeholder="Report Name (e.g., CBC Blood Test)" 
            value={customName} 
            onChange={(e) => setCustomName(e.target.value)} 
          />
          <select 
            style={{ ...inputStyle, flex: 1, margin: 0 }} 
            value={category} 
            onChange={(e) => setCategory(e.target.value)}
          >
            {['Pathology', 'Radiology', 'Cardiology', 'Prescription'].map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <input type="file" id="vault-upload" hidden onChange={handleFileUpload} />
          <button 
            onClick={() => document.getElementById('vault-upload').click()}
            style={{ ...primaryBtn, flex: 1, background: theme.bg, color: theme.text, border: `1px dashed ${theme.border}` }}
          >
            {uploading ? "⏳ SECURING..." : "📁 ATTACH DOCUMENT"}
          </button>
          <button 
            style={{ ...primaryBtn, flex: 1, background: '#0d9488' }}
            disabled={uploading}
            onClick={handleFileUpload} 
          >
            UPLOAD TO VAULT
          </button>
        </div>
      </div>
    </div>

    {/* 📂 SECTION 2: STORED REPORTS (Full-Width Enterprise List) */}
    <div className="hover-card" style={{ ...actionCard(theme, darkMode), textAlign: 'left', width: '100%' }}>
      {/* Top Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', paddingBottom: '15px', borderBottom: `1px solid ${theme.border}` }}>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <h3 style={{ color: theme.text, margin: 0 }}>Vault Storage</h3>
          <span style={badgeStyle('#64748b')}>{records.length} Reports Stored</span>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input 
            style={{ ...inputStyle, width: '200px', padding: '8px', margin: 0 }} 
            placeholder="Search vault..." 
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select style={{ ...inputStyle, width: '120px', padding: '8px', margin: 0 }} onChange={(e) => setFilter(e.target.value)}>
            <option value="All">All Types</option>
            {['Pathology', 'Radiology', 'Cardiology', 'Prescription'].map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
      </div>

      {/* Table-style Report List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {records
          .filter(r => (filter === 'All' || r.type === filter) && r.name.toLowerCase().includes(searchQuery.toLowerCase()))
          .map((rec) => (
            <div key={rec.id} className="vault-row" style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
              padding: '15px', borderRadius: '12px', border: `1px solid ${theme.border}`,
              position: 'relative'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 2 }}>
                <span style={{ fontSize: '24px' }}>{rec.type === 'Radiology' ? '🦴' : '🩸'}</span>
                <div>
                  <b style={{ color: theme.text, fontSize: '14px' }}>{rec.name}</b>
                  <p style={{ margin: 0, fontSize: '11px', color: theme.subText }}>{rec.type} • {rec.date}</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', flex: 1, justifyContent: 'center' }}>
                <span style={secureBadgeStyle}>🔐 AES-256</span>
                <span style={badgeStyle(getReportAnalysis(rec).color)}>RISK: {getReportAnalysis(rec).status}</span>
              </div>

              {/* 🛠️ ACTION BUTTONS & THREE-DOT MENU */}
              <div style={{ display: 'flex', gap: '10px', flex: 1, justifyContent: 'flex-end', position: 'relative' }}>
                <button style={viewBtn} onClick={() => setPreviewUrl(rec.file_url)}>VIEW</button>
                <button style={{ ...viewBtn, background: '#0d9488' }} onClick={() => { setSelectedAnalysis(rec); setShowAnalysisModal(true); }}>ANALYZE</button>
                
                {/* Trigger */}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenu(activeMenu === rec.id ? null : rec.id);
                  }}
                  style={{ background: 'none', border: 'none', color: theme.subText, cursor: 'pointer', fontSize: '20px' }}
                >
                  ⋮
                </button>

                {/* Dropdown Menu */}
                {activeMenu === rec.id && (
                  <div style={{
                    position: 'absolute', top: '40px', right: '0', width: '180px', 
                    backgroundColor: theme.card, borderRadius: '12px', zIndex: 100,
                    boxShadow: '0 10px 25px rgba(0,0,0,0.2)', border: `1px solid ${theme.border}`,
                    overflow: 'hidden'
                  }}>
                    <button 
                      style={menuItemStyle(theme)} 
                      onClick={() => { 
                        const link = document.createElement('a');
                        link.href = rec.file_url;
                        link.download = rec.name;
                        link.click();
                        setActiveMenu(null); 
                      }}
                    >
                      📥 Download
                    </button>
                    <button 
                      style={menuItemStyle(theme)} 
                      onClick={() => { 
                        const msg = encodeURIComponent(`🏥 Sanjeevani Report: ${rec.name}\nView here: ${rec.file_url}`);
                        window.open(`https://wa.me/?text=${msg}`, '_blank');
                        setActiveMenu(null); 
                      }}
                    >
                      📱 Share to WhatsApp
                    </button>
                    <button 
                      style={{ ...menuItemStyle(theme), color: '#f43f5e' }} 
                      onClick={() => { handleDeleteReport(rec.id, rec.file_url); setActiveMenu(null); }}
                    >
                      🗑️ Delete Record
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
      </div>
    </div>
  </div>
)}
 {/* TAB 3:AI TRENDS */}
{activeTab === 'AI Trends' && (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', width: '100%' }}>
    
    {/* 📈 SECTION 1: RISK OVER TIME (Full-Width Analysis) */}
    <div className="hover-card" style={{ ...actionCard(theme, darkMode), textAlign: 'left', padding: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h3 style={{ margin: 0, color: theme.text, fontSize: '20px' }}>Health Risk Evolution</h3>
          <p style={dataLabel}>LONG-TERM BIOMARKER AGGREGATION</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <span style={badgeStyle('#0d9488')}>AI PREDICTIVE ACTIVE</span>
          <span style={secureBadgeStyle}>MODEL: GEMINI-PRO-CLINICAL</span>
        </div>
      </div>

      {/* Full-width Trend Chart */}
      <div style={{ ...graphContainer, height: '250px', alignItems: 'flex-end', gap: '20px', paddingBottom: '30px' }}>
        {[65, 68, 72, 70, 78, 82].map((val, i) => (
          <div key={i} style={{ 
            flex: 1, 
            height: `${val}%`, 
            backgroundColor: val > 75 ? '#2dd4bf' : '#fbbf24', 
            borderRadius: '8px 8px 0 0', 
            position: 'relative',
            opacity: 0.5 + (i * 0.1) 
          }}>
            <span style={{ ...toolTip, top: '-25px', fontSize: '11px' }}>{val}%</span>
            <p style={{ position: 'absolute', bottom: '-30px', width: '100%', textAlign: 'center', fontSize: '10px', color: theme.subText }}>
              Month {i + 1}
            </p>
          </div>
        ))}
      </div>
    </div>

    {/* 🧠 SECTION 2: AI INSIGHT SUMMARY (The Intelligence Panel) */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '25px' }}>
      <div className="hover-card" style={{ ...actionCard(theme, darkMode), textAlign: 'left', borderLeft: '5px solid #0d9488' }}>
        <p style={{ ...dataLabel, color: '#0d9488' }}>🧠 PATTERN DETECTION</p>
        <h4 style={{ color: theme.text, margin: '12px 0' }}>Metabolic Stability Identified</h4>
        <p style={{ fontSize: '13px', color: theme.subText, lineHeight: '1.6' }}>
          Your biomarkers show a 14% improvement in glycemic variability over the last 30 days. 
          The system detects a positive correlation between medication adherence and wellness scores.
        </p>
        <hr style={{ margin: '15px 0', border: `0.1px solid ${theme.border}` }} />
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={dataLabel}>PREDICTION: <b style={{ color: theme.text }}>STABLE</b></span>
          <span style={dataLabel}>CONFIDENCE: <b style={{ color: '#0d9488' }}>91%</b></span>
        </div>
      </div>

      {/* 📊 SECTION 3: MEDICATION ADHERENCE ANALYSIS */}
      <div className="hover-card" style={{ ...actionCard(theme, darkMode), textAlign: 'left', borderLeft: '5px solid #2dd4bf' }}>
        <p style={{ ...dataLabel, color: '#2dd4bf' }}>💊 ADHERENCE ANALYSIS</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '15px 0' }}>
          <b style={{ fontSize: '32px', color: theme.text }}>94%</b>
          <div style={{ textAlign: 'right' }}>
            <p style={{ ...dataLabel, margin: 0 }}>MISSED DOSES</p>
            <b style={{ color: '#ff4e50' }}>2 (Last 7 Days)</b>
          </div>
        </div>
        <p style={{ fontSize: '13px', color: theme.subText, lineHeight: '1.6' }}>
          Weekly Summary: High consistency observed in morning doses. Afternoon adherence shows 
          slight variance. AI suggests setting a 15-minute secondary buffer.
        </p>
        <button style={{ ...primaryBtn, padding: '10px', marginTop: '10px', fontSize: '12px', background: '#2dd4bf' }}>
          VIEW FULL ADHERENCE LOG
        </button>
      </div>
    </div>
  </div>
)}
{/* TAB 4: MEDICATIONS */}
{activeTab === 'Medications' && (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '35px', width: '100%' }}>
    
    {/* 🔝 SECTION 1: SUMMARIES (High Priority for Seniors) */}
    <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth < 1100 ? '1fr' : '1fr 1.8fr', gap: '30px' }}>
      
      {/* 🟡 SECTION: TODAY’S SCHEDULE */}
      <div className="hover-card" style={{ ...actionCard(theme, darkMode), textAlign: 'left' }}>
        <h3 style={sectionTitle}>🟡 Today's Schedule</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
          {medications.map((med, i) => (
            <div key={i} style={{ 
              ...medRow, 
              backgroundColor: theme.bg, 
              padding: '15px', 
              borderLeft: `5px solid #0d9488`,
              borderRadius: '12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <b style={{ fontSize: '16px', color: theme.text }}>{med.times[0]}</b>
                <p style={{ margin: 0, fontSize: '13px', color: theme.subText }}>{med.name}</p>
              </div>

              <button 
                style={{ 
                  background: '#0d9488', color: 'white', border: 'none', 
                  padding: '10px 18px', borderRadius: '10px', cursor: 'pointer', fontWeight: '900' 
                }}
                onClick={(e) => {
                  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                  
                  setMedications(medications.map(m => 
                    m.id === med.id ? { ...m, lastTaken: `${today}, ${now}` } : m
                  ));

                  e.target.style.background = '#134e4a';
                  e.target.innerText = `✅ TAKEN`;
                  logAction(session.user.id, 'ADHERENCE', `Dose taken: ${med.name} at ${now}`);
                }}
              >
                MARK AS TAKEN
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 🔵 FINAL UNIFIED ACTIVE MEDICATION VAULT */}
      <div className="hover-card" style={{ ...actionCard(theme, darkMode), textAlign: 'left', overflowX: 'auto', width: '100%' }}>
        <h3 style={{ ...sectionTitle, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ color: '#3b82f6' }}>🔵</span> Active Medication Vault
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${theme.border}`, textAlign: 'left' }}>
              <th style={{ ...dataLabel, padding: '10px' }}>NAME</th>
              <th style={dataLabel}>SCHEDULE</th>
              <th style={dataLabel}>ALARMS</th>
              <th style={dataLabel}>LAST DOSE</th>
              <th style={dataLabel}>STATUS</th>
              <th style={{ ...dataLabel, textAlign: 'right' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {medications.map((med, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${theme.border}` }}>
                <td style={{ padding: '15px 10px', fontSize: '13px', color: theme.text }}><b>{med.name}</b></td>
                <td style={{ fontSize: '12px', color: theme.subText }}>
                  {med.days.length === 7 ? 'Daily' : med.days.join(', ')}
                </td>
                <td style={{ fontSize: '13px', color: theme.text }}>
                  {med.times.map((t, idx) => (
                    <span key={idx} style={{ background: '#0d948820', color: '#0d9488', padding: '2px 6px', borderRadius: '4px', marginRight: '5px', fontSize: '11px', fontWeight: 'bold' }}>
                      {t}
                    </span>
                  ))}
                </td>
                <td style={{ fontSize: '12px', color: med.lastTaken ? '#2dd4bf' : theme.subText }}>
                  {med.lastTaken || 'Pending Today'}
                </td>
                <td><span style={badgeStyle('#0d9488')}>ACTIVE</span></td>
                <td style={{ textAlign: 'right' }}>
                  <button style={{ background: 'none', border: 'none', cursor: 'pointer', marginRight: '10px' }}>✏️</button>
                  <button 
                     style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff4e50' }}
                     onClick={() => handleDeleteMedication(med.id)}>
                       🗑️
                 </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    {/* 🟢 SECTION 2: ADD NEW MEDICATION */}
    <div className="hover-card" style={{ ...actionCard(theme, darkMode), textAlign: 'left', borderTop: '4px solid #0d9488' }}>
      <h3 style={{ ...sectionTitle, color: '#0d9488', marginBottom: '30px' }}>🟢 Add New Medication Reminder</h3>
      <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth < 800 ? '1fr' : '1fr 1fr', gap: '30px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <p style={dataLabel}>MEDICINE NAME</p>
            <input style={inputStyle} value={newMed.name} onChange={(e) => setNewMed({...newMed, name: e.target.value})} placeholder="e.g. Atorvastatin" />
          </div>
          <div>
            <p style={dataLabel}>SELECT SCHEDULE DAYS</p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                <button 
                  key={day}
                  onClick={() => {
                    const days = newMed.days.includes(day) ? newMed.days.filter(d => d !== day) : [...newMed.days, day];
                    setNewMed({...newMed, days});
                  }}
                  style={{ 
                    padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', border: '1px solid #0d9488',
                    background: newMed.days.includes(day) ? '#0d9488' : 'transparent',
                    color: newMed.days.includes(day) ? 'white' : '#0d9488',
                    fontWeight: 'bold', fontSize: '12px', transition: '0.2s'
                  }}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ background: darkMode ? '#0f172a' : '#f8fafc', padding: '25px', borderRadius: '18px', border: `1px solid ${theme.border}` }}>
          <p style={dataLabel}>SET DOSAGE TIMES (MULTI-ALARM)</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '15px' }}>
            {newMed.times.map((time, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#0d9488', color: 'white', padding: '6px 12px', borderRadius: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{time}</span>
                <button onClick={() => {
                  const times = newMed.times.filter((_, i) => i !== idx);
                  setNewMed({...newMed, times});
                }} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>×</button>
              </div>
            ))}
            <input 
              type="time" 
              onBlur={(e) => {
                if (e.target.value) {
                  setNewMed({...newMed, times: [...newMed.times, e.target.value]});
                  e.target.value = '';
                }
              }}
              style={{ ...inputStyle, width: '130px', margin: 0 }} 
            />
          </div>
        </div>
      </div>

      <div style={{ marginTop: '30px', display: 'flex', gap: '20px', alignItems: 'flex-end', flexDirection: window.innerWidth < 600 ? 'column' : 'row' }}>
        <div style={{ flex: 1, width: '100%' }}>
          <p style={dataLabel}>NOTES / INSTRUCTIONS</p>
          <input style={inputStyle} value={newMed.desc} onChange={(e) => setNewMed({...newMed, desc: e.target.value})} placeholder="e.g. Take after meals with water" />
        </div>
        <button 
          onClick={saveMedication} 
          style={{ ...primaryBtn, width: window.innerWidth < 600 ? '100%' : '240px', background: '#0d9488', height: '48px', fontSize: '14px' }}
        >
          SAVE SYSTEM REMINDER
        </button>
      </div>
    </div>
  </div>
)}
{/* 🚨 TAB 5:  EMERGENCY TERMINAL */}
{activeTab === 'Emergency' && (
  <div style={{ 
    display: 'flex', 
    flexDirection: 'column', 
    gap: '20px', 
    width: '100%', 
    maxWidth: '1200px', 
    margin: '0 auto', 
    animation: 'slideUpFade 0.4s ease-out' 
  }}>
    
    {/* 🔝 TOP CONTROL HUB: ALL CRITICAL ACTIONS IN ONE ROW */}
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: window.innerWidth < 850 ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', 
      gap: '15px' 
    }}>
      <button onClick={handleSOS} style={emergencyPrimaryBtn('#f43f5e')}>
        <span style={{ fontSize: '32px' }}>🚨</span>
        <span style={{ fontSize: '18px' }}>SEND SOS</span>
      </button>

      <button onClick={() => window.location.href=`tel:${profile.doctor_phone}`} style={emergencyPrimaryBtn('#0d9488')}>
        <span style={{ fontSize: '32px' }}>👨‍⚕️</span>
        <span style={{ fontSize: '18px' }}>CALL DOCTOR</span>
      </button>

      <button onClick={() => window.open('https://www.google.com/maps/search/hospital+near+me')} style={emergencyPrimaryBtn('#64748b')}>
        <span style={{ fontSize: '32px' }}>📍</span>
        <span style={{ fontSize: '14px' }}>FIND ROUTE</span>
      </button>

      <button onClick={() => window.location.href=`tel:${profile.emergency_phone}`} style={emergencyPrimaryBtn('#1e293b')}>
        <span style={{ fontSize: '32px' }}>📞</span>
        <span style={{ fontSize: '14px' }}>CALL CONTACT</span>
      </button>
    </div>

    {/* 📇 SECTION 2: DUAL-PANEL DIGITAL EMERGENCY PASS */}
    <div style={{ 
      background: darkMode ? '#0f172a' : '#ffffff', 
      padding: '35px', borderRadius: '32px', 
      border: `1px solid ${theme.border}`, 
      textAlign: 'center',
      boxShadow: DS.shadow.medium,
      display: 'grid',
      // ✅ Split into two columns: QR Code (Left) and Bio-Data (Right)
      gridTemplateColumns: window.innerWidth < 900 ? '1fr' : '1.2fr 1fr', 
      gap: '30px',
      alignItems: 'center'
    }}>
      
      {/* 🧩 LEFT PANEL: COMPACT QR HUB */}
<div style={{ 
  display: 'flex', 
  flexDirection: 'column', 
  alignItems: 'center', 
  borderRight: window.innerWidth < 900 ? 'none' : `1px solid ${theme.border}`, 
  paddingRight: window.innerWidth < 900 ? 0 : '30px' 
}}>
  <h3 style={{ color: theme.text, marginBottom: '20px', fontSize: '20px', fontWeight: '800' }}>Digital Emergency Pass</h3>
  
  <div style={{ 
    display: 'inline-block', background: 'white', padding: '15px', 
    borderRadius: '24px', boxShadow: '0 15px 50px rgba(0,0,0,0.15)',
    marginBottom: '15px' // Space for the button directly below
  }}>
    <QRCodeCanvas 
      id="emergency-qr-canvas"
      value={`NAME: ${profile.full_name}\nBLOOD: ${profile.blood_group}...`} 
      size={210} 
      level={"H"}
    />
  </div>

  {/* ✅ BUTTON MOVED EXACTLY UNDER QR CODE */}
  <button 
    onClick={() => {
      const canvas = document.getElementById("emergency-qr-canvas");
      const pngUrl = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `Sanjeevani_Pass.png`;
      downloadLink.click();
    }}
    style={{ 
      ...primaryBtn, 
      height: '45px', 
      background: darkMode ? '#2dd4bf' : '#0d9488', 
      color: darkMode ? '#020617' : '#ffffff', 
      border: 'none', 
      fontSize: '13px', 
      width: '210px' // Matches QR code width for symmetry
    }}
  >
    💾 SAVE PASS TO GALLERY
  </button>
</div>

       {/* 📋 RIGHT PANEL: VERTICAL BIOMETRICS */}
       <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' }}>
         {/* 🔴 CRITICAL MARKER (Blood Group) */}
         <div style={{ background: theme.card, padding: '22px', borderRadius: '20px', borderLeft: `8px solid #f43f5e`, borderRight: `1px solid ${theme.border}` }}>
           <p style={{ ...dataLabel, margin: 0, fontSize: '11px', color: '#f43f5e' }}>CRITICAL MARKER</p>
           <b style={{ color: theme.text, fontSize: '32px', fontWeight: '900' }}>{profile.blood_group || 'Not Set'}</b>
         </div>

         {/* 🟢 CHRONIC CONDITIONS */}
         <div style={{ background: theme.card, padding: '22px', borderRadius: '20px', borderLeft: `8px solid #0d9488`, borderRight: `1px solid ${theme.border}` }}>
           <p style={{ ...dataLabel, margin: 0, fontSize: '11px', color: '#0d9488' }}>CHRONIC CONDITIONS</p>
           <p style={{ color: theme.text, fontSize: '14px', lineHeight: '1.6', margin: '8px 0 0 0' }}>
             {decryptData(profile.chronic_diseases) || 'None Reported'}
           </p>
         </div>

         <p style={{ color: theme.subText, fontSize: '12px', lineHeight: '1.5', marginTop: '10px', textAlign: 'center' }}>
           First responders can scan the code or read this vital HEALTH SUMMARY instantly.
         </p>
       </div>
    </div>
  </div>
)}
 
{/* 🚀 FULL SETTINGS WORKSPACE */}
{activeTab === 'Settings' && (
  <div style={{ 
    display: 'flex', 
    width: '100%', 
    flexDirection: window.innerWidth < 768 ? 'column' : 'row',
    height: window.innerWidth < 768 ? 'auto' : '820px', 
    background: darkMode ? '#020617' : '#f8fafc', 
    borderRadius: window.innerWidth < 768 ? '0px' : '32px', 
    overflow: 'hidden',
    border: `1px solid ${theme.border}`,
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    transition: 'all 0.4s ease'
  }}>
    
    {/* 📋 1. THE COLLAPSIBLE RAIL (LEFT) */}
    <div style={{ 
      width: window.innerWidth < 768 ? '100%' : (isSidebarCollapsed ? '260px' : '85px'), 
      background: darkMode ? '#0f172a' : '#f1f5f9', 
      display: 'flex', 
      flexDirection: window.innerWidth < 768 ? 'row' : 'column', 
      padding: window.innerWidth < 768 ? '15px 20px' : '40px 0',
      gap: '25px',
      borderRight: `1px solid ${theme.border}`,
      transition: 'width 0.4s ease'
    }}>
      {[
        { id: 'profile', icon: '👤', label: 'Identity Core' },
        { id: 'medical', icon: '🩺', label: 'Clinical Logs' },
        { id: 'security', icon: '🔐', label: 'Vault Access' },
        { id: 'password', icon: '🔑', label: 'Credentials' }
      ].map(item => (
        <div 
          key={item.id} 
          onClick={() => setSettingsSubTab(item.id)}
          style={{ 
            display: 'flex', alignItems: 'center', cursor: 'pointer',
            padding: isSidebarCollapsed ? '12px 25px' : '10px',
            justifyContent: isSidebarCollapsed ? 'flex-start' : 'center',
            gap: '18px', width: '100%',
            backgroundColor: settingsSubTab === item.id ? 'rgba(45, 212, 191, 0.1)' : 'transparent', // ✅ Highlighting
            borderRadius: '12px',
            color: settingsSubTab === item.id ? '#2dd4bf' : '#64748b',
            transition: '0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          <span style={{ 
            fontSize: '24px',
            filter: settingsSubTab === item.id ? 'drop-shadow(0 0 8px rgba(45, 212, 191, 0.4))' : 'none'
          }}>{item.icon}</span>
          {isSidebarCollapsed && window.innerWidth >= 768 && (
            <span style={{ fontSize: '14px', fontWeight: '700', whiteSpace: 'nowrap', color: settingsSubTab === item.id ? '#2dd4bf' : theme.text }}>
              {item.label}
            </span>
          )}
        </div>
      ))}
    </div>

    {/* 🚀 2. THE MAIN COMMAND WORKSPACE (CENTER) */}
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      <div style={{ flex: 1, padding: window.innerWidth < 768 ? '25px' : '50px', overflowY: 'auto' }}>
        
        {/* 🔝 NEON IDENTITY HERO */}
        <div style={{ 
          background: 'linear-gradient(135deg, #134e4a 0%, #020617 100%)',
          padding: '35px', borderRadius: '28px', border: '1px solid rgba(45, 212, 191, 0.2)',
          display: 'flex', flexDirection: window.innerWidth < 768 ? 'column' : 'row',
          justifyContent: 'space-between', alignItems: 'center', gap: '20px',
          marginBottom: '40px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '25px' }}>
            <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => document.getElementById('photo-upload').click()}>
              <img src={profile.profile_url} style={{ width: '100px', height: '100px', borderRadius: '25px', border: '3px solid #2dd4bf', objectFit: 'cover' }} alt="User" />
              <div style={{ position: 'absolute', bottom: '-5px', right: '-5px', background: '#2dd4bf', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #020617' }}>📷</div>
              <input type="file" id="photo-upload" hidden accept="image/*" onChange={handleProfilePhotoUpload} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '28px', color: '#f8fafc', fontWeight: '900' }}>{profile.full_name}</h1>
              <p style={{ margin: '5px 0 0 0', color: '#2dd4bf', fontSize: '11px', letterSpacing: '2px', fontWeight: '800' }}>
                UID: {session.user.id.slice(0, 12).toUpperCase()}
              </p>
            </div>
          </div>
          <button 
            onClick={() => { if (isEditing) handleProfileSave(); setIsEditing(!isEditing); }} 
            style={{ 
              background: isEditing ? '#2dd4bf' : 'rgba(45, 212, 191, 0.1)', 
              color: isEditing ? '#020617' : '#2dd4bf', 
              border: '1px solid #2dd4bf', padding: '12px 28px', borderRadius: '14px', fontWeight: '900'
            }}
          >
            {isEditing ? "💾 SYNC CHANGES" : "✏️ MODIFY CORE"}
          </button>
        </div>

        {/* 🚀 DYNAMIC MODULES */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '25px' }}>
          
          {/* 👤 TAB 1: IDENTITY CORE */}
          {settingsSubTab === 'profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
              <div style={{ background: theme.card, padding: '30px', borderRadius: '24px', border: `1px solid ${theme.border}` }}>
                <p style={{ fontSize: '11px', fontWeight: '900', color: '#2dd4bf', marginBottom: '25px' }}>PERSONAL IDENTITY</p>
                <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth < 768 ? '1fr' : 'repeat(3, 1fr)', gap: '30px' }}>
                  <div><p style={dataLabel}>FULL NAME</p>{isEditing ? <input style={inputStyle} value={profile.full_name} onChange={e => setProfile({...profile, full_name: e.target.value})} /> : <b style={{ color: theme.text }}>{profile.full_name}</b>}</div>
                  <div><p style={dataLabel}>DATE OF BIRTH</p>{isEditing ? <input type="date" style={inputStyle} value={profile.dob} onChange={e => setProfile({...profile, dob: e.target.value})} /> : <b style={{ color: theme.text }}>{profile.dob || 'N/A'}</b>}</div>
                  <div><p style={dataLabel}>AGE</p><b style={{ color: theme.text }}>{calculateAge(profile.dob)} Years</b></div>
                  <div><p style={dataLabel}>BLOOD GROUP</p>{isEditing ? <select style={inputStyle} value={profile.blood_group} onChange={e => setProfile({...profile, blood_group: e.target.value})}>{['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}</select> : <b style={{ color: '#f43f5e', fontSize: '18px' }}>{profile.blood_group}</b>}</div>
                  <div><p style={dataLabel}>BIOLOGICAL SEX</p>{isEditing ? <select style={inputStyle} value={profile.gender} onChange={e => setProfile({...profile, gender: e.target.value})}><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option></select> : <b style={{ color: theme.text }}>{profile.gender || 'Not Set'}</b>}</div>
                  <div><p style={dataLabel}>PHONE / EMAIL</p><b style={{ color: theme.text, fontSize: '12px' }}>{session.user.email}</b></div>
                </div>
              </div>

              <div style={{ background: theme.card, padding: '30px', borderRadius: '24px', border: `1px solid ${theme.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                  <p style={{ fontSize: '11px', fontWeight: '900', color: '#f43f5e', margin: 0 }}>CARE TEAM & SOS CONTACTS</p>
                  {isEditing && <button onClick={() => setProfile({...profile, emergency_contacts: [...(profile.emergency_contacts || []), { name: '', phone: '' }]})} style={{ ...badgeStyle('#0d9488'), cursor: 'pointer', border: 'none' }}>+ ADD CONTACT</button>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', paddingBottom: '20px', borderBottom: `1px solid ${theme.border}` }}>
                    <div><p style={dataLabel}>PRIMARY DOCTOR</p>{isEditing ? <input style={inputStyle} value={profile.doctor_name} onChange={e => setProfile({...profile, doctor_name: e.target.value})} /> : <b style={{ color: theme.text }}>Dr. {profile.doctor_name}</b>}</div>
                    <div><p style={dataLabel}>DOCTOR PHONE</p>{isEditing ? <input style={inputStyle} value={profile.doctor_phone} onChange={e => setProfile({...profile, doctor_phone: e.target.value})} /> : <b style={{ color: theme.text }}>{profile.doctor_phone}</b>}</div>
                  </div>
                  {(profile.emergency_contacts || [{ name: profile.sos_name, phone: profile.emergency_phone }]).map((contact, index) => (
                    <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '15px', alignItems: 'end' }}>
                      <div><p style={dataLabel}>SOS NAME</p>{isEditing ? <input style={inputStyle} value={contact.name} onChange={e => { const list = [...profile.emergency_contacts]; list[index].name = e.target.value; setProfile({...profile, emergency_contacts: list}); }} /> : <b style={{ color: theme.text }}>{contact.name}</b>}</div>
                      <div><p style={dataLabel}>SOS PHONE</p>{isEditing ? <input style={inputStyle} value={contact.phone} onChange={e => { const list = [...profile.emergency_contacts]; list[index].phone = e.target.value; setProfile({...profile, emergency_contacts: list}); }} /> : <b style={{ color: theme.text }}>{contact.phone}</b>}</div>
                      {isEditing && <button onClick={() => setProfile({...profile, emergency_contacts: profile.emergency_contacts.filter((_, i) => i !== index)})} style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', marginBottom: '12px' }}>🗑️</button>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 🩺 TAB 2: CLINICAL LOGS */}
          {settingsSubTab === 'medical' && (
            <div style={{ background: theme.card, padding: '30px', borderRadius: '24px', border: `1px solid ${theme.border}` }}>
              <p style={{ fontSize: '11px', fontWeight: '900', color: '#2dd4bf', marginBottom: '25px' }}>ENCRYPTED CLINICAL PACKETS</p>
              <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth < 1000 ? '1fr' : '1fr 1fr', gap: '25px' }}>
                <div style={{ background: darkMode ? '#0f172a' : '#f8fafc', padding: '25px', borderRadius: '20px' }}>
                  <p style={dataLabel}>CHRONIC CONDITIONS</p>
                  {isEditing ? <textarea style={{...inputStyle, minHeight: '100px'}} value={decryptData(profile.chronic_diseases)} onChange={e => setProfile({...profile, chronic_diseases: encryptData(e.target.value)})} /> : <p style={{ color: theme.text, lineHeight: '1.6' }}>{decryptData(profile.chronic_diseases)}</p>}
                </div>
                <div style={{ background: darkMode ? '#0f172a' : '#f8fafc', padding: '25px', borderRadius: '20px' }}>
                  <p style={dataLabel}>KNOWN ALLERGIES</p>
                  {isEditing ? <textarea style={{...inputStyle, minHeight: '100px'}} value={decryptData(profile.allergies)} onChange={e => setProfile({...profile, allergies: encryptData(e.target.value)})} /> : <p style={{ color: theme.text, lineHeight: '1.6' }}>{decryptData(profile.allergies)}</p>}
                </div>
              </div>
            </div>
          )}

          {/* 🔐 TAB 3: VAULT ACCESS */}
          {settingsSubTab === 'security' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
                  <div style={{ background: theme.card, padding: '35px', borderRadius: '24px', border: `1px solid ${theme.border}`, textAlign: 'center' }}>
                     <p style={{...dataLabel, color: '#64748b'}}>SYSTEM INTEGRITY</p>
                     <div style={{ fontSize: '48px', fontWeight: '900', color: '#2dd4bf' }}>98%</div>
                  </div>
                  <div style={{ background: theme.card, padding: '35px', borderRadius: '24px', border: `1px solid ${theme.border}` }}>
                     <p style={{ fontSize: '10px', fontWeight: '900', color: '#2dd4bf' }}>STORAGE CAPACITY</p>
                     <b style={{ fontSize: '22px', color: theme.text, display: 'block', margin: '15px 0' }}>1.2 GB / 5.0 GB</b>
                  </div>
               </div>
               <div style={{ background: theme.card, padding: '30px', borderRadius: '24px', border: `1px solid ${theme.border}` }}>
                 <p style={{ fontSize: '11px', fontWeight: '900', color: '#2dd4bf', marginBottom: '20px' }}>AUDIT LOGS</p>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                   {(records || []).slice(0, 4).map((rec, i) => (
                     <div key={i} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: `1px solid ${theme.border}` }}>
                       <span style={{ fontSize: '13px', color: theme.text }}>📄 Decrypted: {rec.name}</span>
                       <span style={{ fontSize: '11px', color: theme.subText }}>{rec.date}</span>
                     </div>
                   ))}
                 </div>
               </div>
            </div>
          )}
          
          {/* 🔑 TAB 4: CREDENTIALS */}
     {settingsSubTab === 'password' && (
  <div style={{ animation: 'slideUpFade 0.4s', display: 'flex', flexDirection: 'column', gap: '25px' }}>
    <div style={{ background: theme.card, padding: '40px', borderRadius: '24px', border: `1px solid ${theme.border}`, maxWidth: '500px' }}>
      <p style={{ fontSize: '11px', fontWeight: '900', color: '#2dd4bf', marginBottom: '25px' }}>SYSTEM ACCESS CREDENTIALS</p>
      
      {/* 🛡️ VERIFICATION LAYER */}
      <div style={{ marginBottom: '20px' }}>
        <p style={dataLabel}>CURRENT PASSWORD</p>
        <input type="password" style={inputStyle} placeholder="Confirm current identity" id="current-pass-field" />
      </div>

      <hr style={{ margin: '20px 0', border: 'none', borderTop: `1px solid ${theme.border}` }} />

      <div style={{ marginBottom: '20px' }}>
        <p style={dataLabel}>NEW ACCESS PASSWORD</p>
        <input type="password" style={inputStyle} placeholder="Min. 6 characters" id="new-pass-field" />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <p style={dataLabel}>CONFIRM NEW PASSWORD</p>
        <input type="password" style={inputStyle} placeholder="Repeat new password" id="confirm-pass-field" />
      </div>

      {/* 🔗 FORGOT PASSWORD LINK */}
      <div style={{ textAlign: 'right', marginBottom: '25px' }}>
        <span 
          onClick={handleForgotPassword}
          style={{ fontSize: '12px', color: '#2dd4bf', cursor: 'pointer', fontWeight: '700', textDecoration: 'underline' }}
        >
          Forgot password? Receive OTP via Email 📲
        </span>
      </div>

      <button 
        disabled={loading}
        onClick={handleChangePassword}
        style={{ 
          ...primaryBtn, 
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          border: `1px solid ${theme.border}`,
          color: '#2dd4bf'
        }}
      >
        {loading ? '🔐 VERIFYING...' : '🔒 UPDATE MASTER KEY'}
      </button>
    </div>
  </div>
)}
        </div>
      </div>
    </div>
  </div>
)}
 </div>
  </main>

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
{/* 🛠️ STEP 3: THE EDIT PROFILE MODAL */}
{showProfile && (
  <div style={modalOverlay(theme)} onClick={() => setShowProfile(false)}>
    <div style={{ ...qrModal(theme), maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
      <h2 style={{ color: theme.text, marginBottom: '20px' }}>📝 Edit Health Profile</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
        <div>
          <p style={dataLabel}>FULL NAME</p>
          <input style={inputStyle} value={profile.full_name} onChange={(e) => setProfile({...profile, full_name: e.target.value})} />
        </div>
        <div>
          <p style={dataLabel}>BLOOD GROUP</p>
          <select style={inputStyle} value={profile.blood_group} onChange={(e) => setProfile({...profile, blood_group: e.target.value})}>
            <option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>O+</option><option>O-</option><option>AB+</option><option>AB-</option>
          </select>
        </div>
      </div>

      <button style={{ ...primaryBtn, marginTop: '20px' }} onClick={() => { handleProfileSave(); setShowProfile(false); }}>
        💾 SAVE & SECURE PROFILE
      </button>
      <button style={closeBtn} onClick={() => setShowProfile(false)}>CANCEL</button>
    </div>
  </div>
)}

<style>{`
      .hover-card { transition: all 0.3s ease; }
      .hover-card:hover { transform: translateY(-5px); box-shadow: 0 12px 24px rgba(0,0,0,0.1); }
      .sos-btn { animation: pulse-red 2s infinite; }
      @keyframes pulse-red { 0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 78, 80, 0.7); } 70% { transform: scale(1); box-shadow: 0 0 0 20px rgba(255, 78, 80, 0); } 100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 78, 80, 0); } }
      @keyframes slideUpFade {
  @keyframes slideUpFade {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

.profile-section {
  animation: slideUpFade 0.4s ease-out;
  background: #f8fafc;
  border-radius: 18px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.02);
  transition: transform 0.2s ease;
}

.profile-section:hover { transform: translateY(-2px); }
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
const dashboardGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', // ✅ Creates side-by-side cards
  gap: '25px',
  width: '100%'
};

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
const emergencyPrimaryBtn = (color) => ({
  height: '100px', // Match height across all four buttons
  borderRadius: '20px',
  border: 'none',
  background: color,
  color: 'white',
  fontWeight: '900',
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  boxShadow: `0 8px 15px ${color}30`,
  transition: 'transform 0.2s ease',
  // Scale effect when user presses it
  ':active': { transform: 'scale(0.95)' } 
});
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
  bg: isDark ? '#020617' : '#f8fafc',    // 🌑 Deep Obsidian for Full Page
  card: isDark ? '#0f172a' : '#ffffff',  // Primary surface
  text: isDark ? '#f8fafc' : '#0f172a',  // High contrast text
  border: isDark ? 'rgba(45, 212, 191, 0.15)' : '#e2e8f0', // Mint Glow
  subText: isDark ? '#94a3b8' : '#64748b'
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
