import React, { useState } from 'react';
import { supabase } from './utils/supabaseClient';

const LoginPage = ({ theme, onShowSignUp }) => {
  const [identifier, setIdentifier] = useState(''); 
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true); 
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showReset, setShowReset] = useState(false); 

  // ✅ PRESERVED: Your original Email/Phone identifier logic
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
        options: { persistSession: rememberMe }
      });
      if (error) throw error;
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ PRESERVED: OTP Reset logic for Forgot Password
  const handleResetRequest = async (e) => {
    e.preventDefault();
    if (!identifier.includes('@')) return alert("Please enter your email to receive an OTP link.");
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(identifier, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      alert(`🔐 Reset link sent to ${identifier}!`);
      setShowReset(false);
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={authContainer}>
      {/* 🏥 BRANDING AREA */}
      <div style={{ marginBottom: '30px' }}>
        <span style={{ fontSize: '45px' }}>🏥</span>
        <h2 style={{ color: '#1a535c', margin: '10px 0 5px 0', fontSize: '24px', fontWeight: '900' }}>Sanjeevani</h2>
        <div style={securityBadge}>SECURE HEALTH VAULT</div>
      </div>
      
      <div style={compactFormCard}>
        {!showReset ? (
          <form onSubmit={handleLogin} style={formStyle}>
            <div style={{ textAlign: 'left' }}>
              <label style={labelStyle}>VAULT IDENTIFIER</label>
              <input 
                type="text" placeholder="Email or Phone" 
                value={identifier} onChange={(e) => setIdentifier(e.target.value)} 
                style={inputStyle} required 
              />
            </div>
            
            <div style={{ textAlign: 'left' }}>
              <label style={labelStyle}>MASTER ACCESS KEY</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showPassword ? "text" : "password"} 
                  style={inputStyle} placeholder="••••••••" 
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={eyeBtnStyle}>
                  {showPassword ? "👁️" : "🔒"}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px' }}>
              <input type="checkbox" id="remember" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} style={{ accentColor: '#1a535c', cursor: 'pointer' }} />
              <label htmlFor="remember" style={{ fontSize: '12px', color: '#666', fontWeight: '600', cursor: 'pointer' }}>Remember me</label>
            </div>

            <button type="submit" disabled={loading} style={btnStyle}>
              {loading ? 'VERIFYING...' : 'UNLOCK VAULT'}
            </button>

            <p onClick={() => setShowReset(true)} style={forgotLinkStyle}>Forgot Master Key? Reset via OTP 📲</p>
          </form>
        ) : (
          <form onSubmit={handleResetRequest} style={formStyle}>
            <h3 style={{ color: '#1a535c', fontSize: '18px', margin: '0 0 10px 0' }}>Vault Recovery</h3>
            <p style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>Enter email to receive a secure access link.</p>
            <div style={{ textAlign: 'left' }}>
              <label style={labelStyle}>REGISTERED EMAIL</label>
              <input type="email" placeholder="name@email.com" value={identifier} onChange={(e) => setIdentifier(e.target.value)} style={inputStyle} required />
            </div>
            <button type="submit" disabled={loading} style={btnStyle}>SEND OTP LINK</button>
            <button type="button" onClick={() => setShowReset(false)} style={linkBtn}>Back to Login</button>
          </form>
        )}
      </div>

      <div style={{ marginTop: '25px' }}>
        <button onClick={onShowSignUp} style={linkBtn}>Register New Health Identity</button>
      </div>

      <div style={footerStyle}>AES-256 END-TO-END ENCRYPTED SYSTEM</div>
    </div>
  );
};

// --- STYLES (Light Theme) ---
const authContainer = { 
  padding: '40px 20px', 
  textAlign: 'center', 
  fontFamily: 'Inter, sans-serif', 
  display: 'flex', 
  flexDirection: 'column', 
  justifyContent: 'center', 
  alignItems: 'center',
  backgroundColor: '#f0fdfa', // Light mint-water background
  minHeight: '100vh'
};

const compactFormCard = { 
  width: '100%', 
  maxWidth: '380px', 
  backgroundColor: '#ffffff', 
  padding: '30px', 
  borderRadius: '24px', 
  border: '1px solid #e2e8f0', 
  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.05)' 
};

const formStyle = { display: 'flex', flexDirection: 'column', gap: '15px' };

const labelStyle = { 
  fontSize: '10px', 
  fontWeight: '800', 
  color: '#64748b', 
  marginLeft: '10px', 
  marginBottom: '5px', 
  display: 'block', 
  letterSpacing: '0.5px' 
};

const inputStyle = { 
  padding: '12px 18px', 
  borderRadius: '12px', 
  fontSize: '14px', 
  width: '100%', 
  boxSizing: 'border-box', 
  backgroundColor: '#f8fafc', 
  border: '1px solid #e2e8f0', 
  color: '#1e293b', 
  outline: 'none' 
};

const btnStyle = { 
  background: '#1a535c', 
  color: 'white', 
  padding: '15px', 
  borderRadius: '12px', 
  border: 'none', 
  cursor: 'pointer', 
  fontWeight: '900', 
  fontSize: '14px',
  marginTop: '5px',
  transition: '0.2s'
};

const securityBadge = { 
  display: 'inline-block', 
  padding: '4px 12px', 
  borderRadius: '20px', 
  backgroundColor: '#ccfbf1', 
  border: '1px solid #2dd4bf', 
  fontSize: '9px', 
  fontWeight: '800', 
  color: '#0d9488' 
};

const forgotLinkStyle = { 
  fontSize: '11px', 
  color: '#64748b', 
  cursor: 'pointer', 
  marginTop: '10px', 
  textDecoration: 'underline' 
};

const linkBtn = { 
  background: 'none', 
  border: 'none', 
  color: '#1a535c', 
  cursor: 'pointer', 
  fontWeight: '800', 
  fontSize: '13px',
  textDecoration: 'underline'
};

const eyeBtnStyle = { 
  position: 'absolute', 
  right: '15px', 
  top: '50%', 
  transform: 'translateY(-50%)', 
  background: 'none', 
  border: 'none', 
  cursor: 'pointer', 
  color: '#94a3b8' 
};

const footerStyle = { 
  marginTop: 'auto', 
  paddingBottom: '20px', 
  fontSize: '9px', 
  color: '#94a3b8', 
  fontWeight: '800',
  letterSpacing: '1px'
};

export default LoginPage;