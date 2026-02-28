import React, { useState } from 'react';
import { supabase } from './utils/supabaseClient';

const SignUpPage = ({ onBackToLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // 📋 Updated Profile State with Contact Names and Doctor Phone
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    dob: '',
    bloodGroup: '',
    allergies: '', 
    chronicDiseases: '', 
    doctorName: '', 
    doctorPhone: '', // Added
    sosName: '', // Added
    emergencyPhone: '' 
  });

  const handleSignUp = async (e) => {
    e.preventDefault();
    
    // 🛑 Validation: Ensuring names and numbers are present
    if (!formData.fullName || !formData.bloodGroup || !formData.sosName || !formData.emergencyPhone) {
      alert("⚠️ Please fill all mandatory fields (*), especially Emergency details.");
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: formData.fullName,
            phone: formData.phone,
            dob: formData.dob,
            blood_group: formData.bloodGroup,
            allergies: formData.allergies,
            chronic_diseases: formData.chronicDiseases,
            doctor_name: formData.doctorName || 'Not Assigned',
            doctor_phone: formData.doctorPhone || 'N/A', // Mapping
            sos_name: formData.sosName, // Mapping
            emergency_phone: formData.emergencyPhone
          }
        }
      });

      if (error) throw error;
      alert('✅ Registration Successful! Please check your email.');
      onBackToLogin();
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={authContainer}>
      <div style={cardStyle}>
        <h2 style={{color: '#1a535c', marginBottom: '5px'}}>🩺 Sanjeevani Vault</h2>
        <p style={{fontSize: '11px', color: '#666', marginBottom: '20px'}}>Fields with <span style={{color:'red'}}>*</span> are required for Emergency QR.</p>

        <form onSubmit={handleSignUp} style={formStyle}>
          {/* Account Credentials */}
          <label style={labelStyle}>Account Security <span style={redStar}>*</span></label>
          <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} required />
          <input type="password" placeholder="Min. 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} required />
          
          <hr style={divider} />
          
          {/* Personal Details */}
          <label style={labelStyle}>Full Name <span style={redStar}>*</span></label>
          <input placeholder="e.g. Shrawani Patil" value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} style={inputStyle} />
          
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
            <div>
              <label style={labelStyle}>Blood Group <span style={redStar}>*</span></label>
              <select value={formData.bloodGroup} onChange={(e) => setFormData({...formData, bloodGroup: e.target.value})} style={{...inputStyle, width: '100%'}}>
                <option value="">Select</option>
                <option value="A+">A+</option><option value="B+">B+</option><option value="O+">O+</option><option value="AB+">AB+</option>
                <option value="A-">A-</option><option value="B-">B-</option><option value="O-">O-</option><option value="AB-">AB-</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Birth Date <span style={redStar}>*</span></label>
              <input type="date" value={formData.dob} onChange={(e) => setFormData({...formData, dob: e.target.value})} style={{...inputStyle, width: '100%'}} />
            </div>
          </div>

          {/* 🏥 Medical History */}
          <label style={labelStyle}>Allergies & Chronic Diseases <span style={redStar}>*</span></label>
          <input placeholder="Allergies (or 'None')" value={formData.allergies} onChange={(e) => setFormData({...formData, allergies: e.target.value})} style={inputStyle} />
          <input placeholder="Chronic Diseases (or 'None')" value={formData.chronicDiseases} onChange={(e) => setFormData({...formData, chronicDiseases: e.target.value})} style={inputStyle} />
          
          <hr style={divider} />

          {/* 🚨 EMERGENCY CONTACT (RESTORING NAME & PHONE) */}
          <label style={labelStyle}>Emergency Contact (SOS) <span style={redStar}>*</span></label>
          <input placeholder="Contact Person's Name" value={formData.sosName} onChange={(e) => setFormData({...formData, sosName: e.target.value})} style={inputStyle} />
          <input placeholder="WhatsApp Number (e.g. 91987...)" value={formData.emergencyPhone} onChange={(e) => setFormData({...formData, emergencyPhone: e.target.value})} style={inputStyle} />

          <hr style={divider} />

          {/* 👨‍⚕️ DOCTOR DETAILS (RESTORING DOCTOR PHONE) */}
          <label style={labelStyle}>Doctor Information (Optional)</label>
          <input placeholder="Doctor Name" value={formData.doctorName} onChange={(e) => setFormData({...formData, doctorName: e.target.value})} style={inputStyle} />
          <input placeholder="Doctor Phone Number" value={formData.doctorPhone} onChange={(e) => setFormData({...formData, doctorPhone: e.target.value})} style={inputStyle} />

          <button type="submit" disabled={loading} style={btnStyle}>
            {loading ? '🔐 SECURING VAULT...' : 'REGISTER HEALTH ID'}
          </button>
        </form>
        
        <button onClick={onBackToLogin} style={linkBtn}>Already have an account? Login here</button>
      </div>
    </div>
  );
};

// --- STYLES (Keep existing styles) ---
const authContainer = { padding: '40px 20px', background: '#e6f7f9', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' };
const cardStyle = { backgroundColor: 'white', padding: '30px', borderRadius: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', width: '100%', maxWidth: '420px' };
const formStyle = { display: 'flex', flexDirection: 'column', gap: '8px' };
const labelStyle = { fontSize: '12px', fontWeight: 'bold', color: '#1a535c', textAlign: 'left', marginTop: '5px' };
const redStar = { color: 'red' };
const inputStyle = { padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', width: '100%', boxSizing: 'border-box' };
const divider = { width: '100%', border: 'none', borderTop: '1px solid #eee', margin: '15px 0' };
const btnStyle = { background: '#1a535c', color: 'white', padding: '16px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px' };
const linkBtn = { background: 'none', border: 'none', color: '#1a535c', textDecoration: 'underline', marginTop: '20px', cursor: 'pointer', fontSize: '13px', width: '100%' };

export default SignUpPage;