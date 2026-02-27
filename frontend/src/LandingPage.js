import React from 'react';

const LandingPage = ({ onGetStarted }) => {
  return (
    <div style={landStyle.container}>
      {/* Hero Section */}
      <nav style={landStyle.nav}>
        <h2 style={{ color: '#1a535c', margin: 0 }}>🩺 Sanjeevani</h2>
        <button style={landStyle.loginBtn} onClick={onGetStarted}>Sign In</button>
      </nav>

      <header style={landStyle.hero}>
        <h1 style={landStyle.heroTitle}>Your Health, <span style={{color: '#4ecdc4'}}>AI-Secured.</span></h1>
        <p style={landStyle.heroSub}>The next-generation digital health vault with AI-powered risk monitoring and encrypted medical storage.</p>
        <button style={landStyle.ctaBtn} onClick={onGetStarted}>Get Started for Free</button>
      </header>

      {/* Features Section */}
      <section style={landStyle.features}>
        <div style={landStyle.featCard}>
          <span style={{fontSize: '30px'}}>🔒</span>
          <h3>Encrypted Vault</h3>
          <p>AES-256 bit encryption ensures your medical records are for your eyes only.</p>
        </div>
        <div style={landStyle.featCard}>
          <span style={{fontSize: '30px'}}>🤖</span>
          <h3>AI Risk Engine</h3>
          <p>Smart monitoring of glucose and BP trends with automated health insights.</p>
        </div>
        <div style={landStyle.featCard}>
          <span style={{fontSize: '30px'}}>🚨</span>
          <h3>Instant SOS</h3>
          <p>One-tap emergency location sharing with your primary doctor and family.</p>
        </div>
      </section>
    </div>
  );
};

const landStyle = {
  container: { background: '#f0fdfa', minHeight: '100vh', fontFamily: 'Poppins, sans-serif' },
  nav: { display: 'flex', justifyContent: 'space-between', padding: '20px 50px', alignItems: 'center' },
  hero: { textAlign: 'center', padding: '100px 20px', maxWidth: '800px', margin: '0 auto' },
  heroTitle: { fontSize: '48px', color: '#1a535c', marginBottom: '20px' },
  heroSub: { fontSize: '18px', color: '#555', marginBottom: '40px' },
  ctaBtn: { background: '#1a535c', color: 'white', padding: '15px 40px', borderRadius: '30px', border: 'none', fontSize: '18px', cursor: 'pointer', fontWeight: 'bold' },
  loginBtn: { background: 'none', border: '1px solid #1a535c', padding: '8px 20px', borderRadius: '20px', cursor: 'pointer' },
  features: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '30px', padding: '50px' },
  featCard: { background: 'white', padding: '30px', borderRadius: '20px', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }
};

export default LandingPage;