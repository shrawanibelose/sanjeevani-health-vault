import React, { useState } from 'react';
import { supabase } from './utils/supabaseClient';

const ProfileSetup = ({ session, onComplete }) => {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
    full_name: '',
    blood_group: '',
    emergency_contact: '',
    doctor_name: '',
    doctor_phone: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .upsert({ 
        id: session.user.id, 
        ...profile, 
        updated_at: new Date() 
      });

    if (error) alert(error.message);
    else onComplete();
    setLoading(false);
  };

  return (
    <div style={containerStyle}>
      <h2 style={{ color: '#1a535c' }}>Set Up Your Health Profile</h2>
      <p>This information is used for your Emergency Card.</p>
      <form onSubmit={handleSubmit} style={formStyle}>
        <input style={inputStyle} placeholder="Full Name" onChange={e => setProfile({...profile, full_name: e.target.value})} required />
        <select style={inputStyle} onChange={e => setProfile({...profile, blood_group: e.target.value})} required>
          <option value="">Select Blood Group</option>
          <option value="A+">A+</option><option value="A-">A-</option>
          <option value="B+">B+</option><option value="B-">B-</option>
          <option value="O+">O+</option><option value="O-">O-</option>
          <option value="AB+">AB+</option><option value="AB-">AB-</option>
        </select>
        <input style={inputStyle} placeholder="Emergency Contact (Sister/Brother)" onChange={e => setProfile({...profile, emergency_contact: e.target.value})} required />
        <input style={inputStyle} placeholder="Doctor's Name" onChange={e => setProfile({...profile, doctor_name: e.target.value})} />
        <button type="submit" disabled={loading} style={btnStyle}>
          {loading ? "Saving..." : "Save Profile"}
        </button>
      </form>
    </div>
  );
};

const containerStyle = { padding: '30px', textAlign: 'center', backgroundColor: 'white', borderRadius: '20px', margin: '20px' };
const formStyle = { display: 'flex', flexDirection: 'column', gap: '15px' };
const inputStyle = { padding: '15px', fontSize: '18px', borderRadius: '10px', border: '1px solid #ddd' };
const btnStyle = { padding: '20px', fontSize: '20px', backgroundColor: '#4ecdc4', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold' };

export default ProfileSetup;