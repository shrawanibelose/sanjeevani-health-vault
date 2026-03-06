import React, { useState } from 'react';
import { supabase } from './utils/supabaseClient';

const SignUpPage = ({ onBackToLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    dob: '',
    gender: 'Male', 
    bloodGroup: '',
    allergies: '', 
    chronicDiseases: '', 
    doctorName: '', 
    doctorPhone: '', 
    sosName: '', 
    emergencyPhone: '' 
  });

  const handleSignUp = async (e) => {
    e.preventDefault();
  
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
            gender: formData.gender, 
            blood_group: formData.bloodGroup,
            allergies: formData.allergies,
            chronic_diseases: formData.chronicDiseases,
            doctor_name: formData.doctorName || 'Not Assigned',
            doctor_phone: formData.doctorPhone || 'N/A',
            sos_name: formData.sosName,
            emergency_phone: formData.emergencyPhone,
            profile_url: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'
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
        <div style={{ textAlign: 'center', marginBottom: '25px' }}>
          <span style={{ fontSize: '40px' }}>🏥</span>
          <h2 style={{ color: '#0d9488', margin: '10px 0 0 0', fontWeight: '900' }}>Sanjeevani Vault</h2>
          <p style={{ fontSize: '11px', color: '#64748b', marginTop: '5px' }}>
              Fields with <span style={{ color: '#f43f5e' }}>*</span> are required for Emergency QR.
          </p>
        </div>

        <form onSubmit={handleSignUp} style={formStyle}>
          <label style={labelStyle}>ACCOUNT SECURITY <span style={redStar}>*</span></label>
          <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} required />
          <input type="password" placeholder="Min. 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} required />
          
          <hr style={divider} />
          
          <label style={labelStyle}>FULL NAME <span style={redStar}>*</span></label>
          <input placeholder="e.g. Shrawani Patil" value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} style={inputStyle} />
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={labelStyle}>BLOOD GROUP <span style={redStar}>*</span></label>
              <select value={formData.bloodGroup} onChange={(e) => setFormData({...formData, bloodGroup: e.target.value})} style={inputStyle}>
                <option value="">Select</option>
                <option value="A+">A+</option><option value="B+">B+</option><option value="O+">O+</option><option value="AB+">AB+</option>
                <option value="A-">A-</option><option value="B-">B-</option><option value="O-">O-</option><option value="AB-">AB-</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>BIOLOGICAL SEX <span style={redStar}>*</span></label>
              <select value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value})} style={inputStyle}>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
             <div>
                <label style={labelStyle}>BIRTH DATE <span style={redStar}>*</span></label>
                <input type="date" value={formData.dob} onChange={(e) => setFormData({...formData, dob: e.target.value})} style={inputStyle} />
             </div>
             <div>
                <label style={labelStyle}>PHONE</label>
                <input placeholder="Personal Phone" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} style={inputStyle} />
             </div>
          </div>

          <label style={labelStyle}>MEDICAL HISTORY <span style={redStar}>*</span></label>
          <input placeholder="Allergies (or 'None')" value={formData.allergies} onChange={(e) => setFormData({...formData, allergies: e.target.value})} style={inputStyle} />
          <input placeholder="Chronic Diseases (or 'None')" value={formData.chronicDiseases} onChange={(e) => setFormData({...formData, chronicDiseases: e.target.value})} style={inputStyle} />
          
          <hr style={divider} />

          <label style={labelStyle}>EMERGENCY CONTACT (SOS) <span style={redStar}>*</span></label>
          <input placeholder="Contact Person's Name" value={formData.sosName} onChange={(e) => setFormData({...formData, sosName: e.target.value})} style={inputStyle} />
          <input placeholder="WhatsApp Number (e.g. 91987...)" value={formData.emergencyPhone} onChange={(e) => setFormData({...formData, emergencyPhone: e.target.value})} style={inputStyle} />

          <hr style={divider} />

          <label style={labelStyle}>DOCTOR INFORMATION (OPTIONAL)</label>
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

// --- ✨ CLINICAL LIGHT THEME STYLES ---
const authContainer = { 
  padding: '40px 20px', 
  background: '#f8fafc', // Light slate background
  minHeight: '100vh', 
  display: 'flex', 
  justifyContent: 'center', 
  alignItems: 'center' 
};

const cardStyle = { 
  backgroundColor: '#ffffff', 
  padding: '35px', 
  borderRadius: '32px', 
  border: '1px solid #e2e8f0', 
  boxShadow: '0 10px 25px rgba(0,0,0,0.05)', 
  width: '100%', 
  maxWidth: '480px' 
};

const formStyle = { display: 'flex', flexDirection: 'column', gap: '10px' };

const labelStyle = { 
  fontSize: '10px', 
  fontWeight: '800', 
  color: '#64748b', // Subtle slate for labels
  textAlign: 'left', 
  letterSpacing: '0.5px' 
};

const redStar = { color: '#f43f5e' };

const inputStyle = { 
  padding: '12px 16px', 
  borderRadius: '12px', 
  border: '1px solid #e2e8f0', 
  backgroundColor: '#f8fafc', 
  color: '#1e293b', // Dark slate text
  fontSize: '14px', 
  width: '100%', 
  boxSizing: 'border-box', 
  outline: 'none' 
};

const divider = { 
  width: '100%', 
  border: 'none', 
  borderTop: '1px solid #f1f5f9', 
  margin: '12px 0' 
};

const btnStyle = { 
  background: '#0d9488', // Solid professional teal
  color: 'white', 
  padding: '16px', 
  borderRadius: '14px', 
  border: 'none', 
  cursor: 'pointer', 
  fontWeight: '900', 
  fontSize: '15px', 
  marginTop: '10px' 
};

const linkBtn = { 
  background: 'none', 
  border: 'none', 
  color: '#0d9488', 
  textDecoration: 'none', 
  fontWeight: '700', 
  marginTop: '20px', 
  cursor: 'pointer', 
  fontSize: '13px', 
  width: '100%' 
};

export default SignUpPage;