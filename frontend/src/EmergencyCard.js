import React from 'react';

const EmergencyCard = ({ session, onBack }) => {
  // In a real app, these would come from a 'Profile' table in Supabase
  const patientInfo = {
    name: "Shrawani",
    bloodGroup: "B+ Positive",
    allergies: "None",
    emergencyContact: "+91 98765 43210 (Sister)",
    primaryDoctor: "Dr. Asthana - 022 1234 5678"
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#fdfdfd', minHeight: '100vh' }}>
      <button onClick={onBack} style={backBtnStyle}>← Back</button>
      
      <div style={cardContainer}>
        <div style={headerStyle}>
          <h2 style={{ color: 'white', margin: 0 }}>EMERGENCY MEDICAL CARD</h2>
        </div>
        
        <div style={infoSection}>
          <h1 style={{ fontSize: '36px', color: '#d90429' }}>{patientInfo.name}</h1>
          <hr />
          
          <div style={gridItem}>
            <span style={labelStyle}>BLOOD GROUP</span>
            <span style={valueStyle}>{patientInfo.bloodGroup}</span>
          </div>

          <div style={gridItem}>
            <span style={labelStyle}>EMERGENCY CONTACT</span>
            <span style={valueStyle}>{patientInfo.emergencyContact}</span>
          </div>

          <div style={gridItem}>
            <span style={labelStyle}>ALLERGIES</span>
            <span style={valueStyle}>{patientInfo.allergies}</span>
          </div>
        </div>

        <div style={{ textAlign: 'center', padding: '20px' }}>
          <p style={{ color: '#888' }}>Show this to Medical Personnel</p>
          {/* We will add a QR code here later! */}
        </div>
      </div>
    </div>
  );
};

// Senior-friendly styling
const cardContainer = { border: '4px solid #d90429', borderRadius: '20px', overflow: 'hidden', backgroundColor: 'white', boxShadow: '0 10px 20px rgba(0,0,0,0.2)' };
const headerStyle = { backgroundColor: '#d90429', padding: '15px', textAlign: 'center' };
const infoSection = { padding: '30px' };
const gridItem = { marginBottom: '25px', display: 'flex', flexDirection: 'column' };
const labelStyle = { fontSize: '16px', fontWeight: 'bold', color: '#555' };
const valueStyle = { fontSize: '28px', fontWeight: 'bold', color: '#000' };
const backBtnStyle = { padding: '10px 20px', fontSize: '18px', borderRadius: '8px', cursor: 'pointer', marginBottom: '20px' };

export default EmergencyCard;