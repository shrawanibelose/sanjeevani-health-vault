import React, { useState } from 'react';
import { supabase } from './utils/supabaseClient';

/**
 * 🔐 PROFESSIONAL LOGIN COMPONENT
 * Implements theme-aware styling and high-contrast SVG toggles.
 */
const LoginPage = ({ theme, onShowSignUp }) => {
  const [identifier, setIdentifier] = useState(''); // Email or Phone
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true); 
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    const isEmail = identifier.includes('@');
    const loginData = isEmail 
      ? { email: identifier, password } 
      : { phone: identifier.startsWith('+') ? identifier : `+91${identifier}`, password };

    try {
      const { error } = await supabase.auth.signInWithPassword({
        ...loginData,
        options: {
          // 🛡️ Persistence ensures session remains based on user preference
          persistSession: rememberMe 
        }
      });

      if (error) throw error;
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    /* 🛡️ Background and text color now follow the Slate-Blue theme */
    <div style={{...authContainer, backgroundColor: theme?.bg || '#f0fdfa', minHeight: '100vh'}}>
      <h2 style={{color: theme?.text || '#1a535c'}}>🩺 Sanjeevani</h2>
      <p style={{fontSize: '13px', color: theme?.subText || '#888', marginBottom: '20px'}}>
        Access Your Health Vault
      </p>
      
      <form onSubmit={handleLogin} style={formStyle}>
        <input 
          type="text" 
          placeholder="Email or Phone Number" 
          value={identifier} 
          onChange={(e) => setIdentifier(e.target.value)} 
          style={{
            ...inputStyle, 
            backgroundColor: theme?.card || '#f8f9fa', 
            color: theme?.text || '#333',
            border: `1px solid ${theme?.border || '#eef2f3'}`
          }} 
          required 
        />
        
        <div style={{ position: 'relative', width: '100%' }}>
          <input 
            type={showPassword ? "text" : "password"} 
            style={{
              ...inputStyle, 
              backgroundColor: theme?.card || '#f8f9fa', 
              color: theme?.text || '#333',
              border: `1px solid ${theme?.border || '#eef2f3'}`
            }} 
            placeholder="Enter Password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          
          {/* 👁️ Professional Eye Toggle (Rule 8: No Emojis) */}
          <button 
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: 'absolute',
              right: '15px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: theme?.subText || '#666',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            {showPassword ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
              </svg>
            )}
          </button>
        </div>

        <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginTop: '5px'}}>
          <input 
            type="checkbox" 
            id="remember" 
            checked={rememberMe} 
            onChange={(e) => setRememberMe(e.target.checked)} 
            style={{cursor: 'pointer'}}
          />
          <label htmlFor="remember" style={{fontSize: '12px', color: theme?.subText || '#666'}}>
            Remember me on this device
          </label>
        </div>

        <button type="submit" disabled={loading} style={btnStyle}>
          {loading ? 'VERIFYING...' : 'SECURE LOGIN'}
        </button>
      </form>

      <div style={{marginTop: '20px'}}>
        <button onClick={onShowSignUp} style={linkBtn}>Create a new Health ID</button>
        <p style={{fontSize: '11px', color: theme?.subText || '#bbb', marginTop: '10px', cursor: 'pointer'}}>
          Forgot Password?
        </p>
      </div>
    </div>
  );
};

// --- STYLES ---
const authContainer = { 
  padding: '60px 20px', 
  maxWidth: '100%', 
  margin: 'auto', 
  textAlign: 'center', 
  fontFamily: 'Segoe UI, sans-serif',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center'
};

const formStyle = { 
  display: 'flex', 
  flexDirection: 'column', 
  gap: '15px', 
  maxWidth: '400px', 
  margin: '0 auto', 
  width: '100%' 
};

const inputStyle = { 
  padding: '14px', 
  borderRadius: '12px', 
  fontSize: '14px', 
  width: '100%', 
  boxSizing: 'border-box',
  transition: '0.3s'
};

const btnStyle = { 
  background: '#1a535c', 
  color: 'white', 
  padding: '16px', 
  borderRadius: '12px', 
  border: 'none', 
  cursor: 'pointer', 
  fontWeight: 'bold', 
  marginTop: '10px',
  boxShadow: '0 4px 12px rgba(26, 83, 92, 0.2)'
};

const linkBtn = { 
  background: 'none', 
  border: 'none', 
  color: '#4ecdc4', 
  textDecoration: 'underline', 
  cursor: 'pointer', 
  fontWeight: 'bold' 
};

export default LoginPage;