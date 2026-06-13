import { useState } from 'react';
import { Package, XCircle } from 'lucide-react';

export default function Signup({ supabase }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [authErr, setAuthErr] = useState('');
  const [authBusy, setAuthBusy] = useState(false);

  // Style tokens
  const G = '#106db9', GD = '#31ade6', S = '#0f172a', G4 = '#94a3b8', BD = '#e2e8f0';

  const handleAuth = async () => {
    setAuthBusy(true);
    setAuthErr('');

    let error;
    if (isSignUp) {
      // Create new account
      const res = await supabase.auth.signUp({ email, password: pass });
      error = res.error;
      if (!error) {
        alert("Account created successfully! You are now logged in.");
      }
    } else {
      // Log into existing account
      const res = await supabase.auth.signInWithPassword({ email, password: pass });
      error = res.error;
    }

    setAuthBusy(false);
    if (error) setAuthErr(error.message);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '28px 24px', minHeight: '100vh' }}>
      <div style={{ width: 84, height: 84, background: `linear-gradient(140deg, ${G} 0%, ${GD} 100%)`, borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 22, boxShadow: '0 16px 48px rgba(16,185,129,.38)' }}>
        <Package size={42} color="white" strokeWidth={1.8} />
      </div>
      
      <h1 style={{ margin: '0 0 4px', fontSize: 30, fontWeight: 800, color: S, letterSpacing: '-.5px' }}>StockScan</h1>
      <p style={{ margin: '0 0 38px', color: G4, fontSize: 15 }}>
        {isSignUp ? 'Create a new account' : 'Sports Inventory System'}
      </p>
      
      <div style={{ width: '100%', maxWidth: 330 }}>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 6 }}>Email</label>
          <input 
            type="email" value={email} onChange={e => setEmail(e.target.value)} 
            placeholder="your@email.com" 
            style={{ width: '100%', padding: '11px 14px', border: `1.5px solid ${BD}`, borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} 
          />
        </div>
        
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 6 }}>Password</label>
          <input 
            type="password" value={pass} onChange={e => setPass(e.target.value)} 
            placeholder="••••••••" 
            onKeyDown={e => e.key === 'Enter' && handleAuth()}
            style={{ width: '100%', padding: '11px 14px', border: `1.5px solid ${BD}`, borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} 
          />
        </div>

        {authErr && (
          <div style={{ display: 'flex', gap: 8, background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#dc2626', alignItems: 'center' }}>
            <XCircle size={15} />{authErr}
          </div>
        )}

        <button onClick={handleAuth} disabled={authBusy} style={{ width: '100%', padding: '14px 20px', background: `linear-gradient(140deg,${G},${GD})`, color: 'white', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: authBusy ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: authBusy ? .7 : 1 }}>
          {authBusy ? (
            <><div style={{ width: 18, height: 18, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .8s linear infinite' }} /> Processing…</>
          ) : (
            isSignUp ? 'Sign Up →' : 'Sign In →'
          )}
        </button>

        <div style={{ marginTop: 18, textAlign: 'center' }}>
          <button 
            onClick={() => { setIsSignUp(!isSignUp); setAuthErr(''); }} 
            style={{ background: 'none', border: 'none', color: G, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            {isSignUp ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
}