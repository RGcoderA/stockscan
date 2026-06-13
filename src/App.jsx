import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Html5Qrcode } from 'html5-qrcode';
import QRCode from 'react-qr-code'; // <-- New import
import Signup from './Signup';      // <-- New import
import {
  QrCode, Package, Settings, LogOut, Camera,
  CheckCircle, XCircle, Plus, Trash2, Edit2, X, Clock, Printer // <-- Added Printer icon
} from 'lucide-react';

// ─────────────────────────────────────────
//  Supabase Client
// ─────────────────────────────────────────
const supabase = (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
  ? createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
  : null;

// ─────────────────────────────────────────
//  Color helpers
// ─────────────────────────────────────────
const getColor = (n) => n === 0 ? '#ef4444' : n <= 5 ? '#f59e0b' : '#126eb0';
const getBg    = (n) => n === 0 ? '#fee2e2' : n <= 5 ? '#fef3c7' : '#d1fae5';
const getLabel = (n) => n === 0 ? 'OUT OF STOCK' : n <= 5 ? 'LOW STOCK' : 'in stock';

// ─────────────────────────────────────────
//  CameraScanner component (Robust Permission Flow)
// ─────────────────────────────────────────
function CameraScanner({ onScan, onClose }) {
  const [status, setStatus] = useState('Waiting for camera permission...');
  const [isError, setIsError] = useState(false);
  const scannerRef = useRef(null);
  const didScan = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const startScanner = async () => {
      try {
        const cameras = await Html5Qrcode.getCameras();
        if (!isMounted) return;

        if (cameras && cameras.length > 0) {
          setStatus('Starting camera...');
          let selectedCameraId = cameras[0].id;
          const backCamera = cameras.find(c => c.label.toLowerCase().includes('back') || c.label.toLowerCase().includes('environment'));
          if (backCamera) selectedCameraId = backCamera.id;

          scannerRef.current = new Html5Qrcode('qr-reader-container');
          await scannerRef.current.start(
            selectedCameraId,
            { fps: 10, qrbox: { width: 240, height: 240 } },
            (decodedText) => {
              if (!didScan.current) {
                didScan.current = true;
                onScan(decodedText);
              }
            },
            undefined
          );
          
          if (isMounted) setStatus('');
        } else {
          setIsError(true);
          setStatus('No cameras found on this device.');
        }
      } catch (err) {
        if (isMounted) {
          setIsError(true);
          setStatus('Camera access denied. Please click the camera icon in your address bar to allow access, and ensure you are on a secure connection.');
        }
      }
    };

    startScanner();
    return () => {
      isMounted = false;
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch((e) => console.error("Failed to stop scanner", e));
      }
    };
  }, [onScan]);

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ position: 'relative', background: '#0f172a', borderRadius: 16, overflow: 'hidden', minHeight: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {status && (
          <div style={{ position: 'absolute', padding: '0 20px', textAlign: 'center', color: isError ? '#fca5a5' : '#94a3b8', zIndex: 10, fontSize: 13, lineHeight: 1.5 }}>
            {!isError && <div style={{ width: 24, height: 24, border: '2px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 10px' }} />}
            {status}
          </div>
        )}
        <div id="qr-reader-container" style={{ width: '100%', zIndex: 1 }} />
      </div>
      <button onClick={onClose} style={{ width: '100%', marginTop: 10, padding: '12px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 14 }}>
        <X size={16} /> Close Camera
      </button>
    </div>
  );
}

// ─────────────────────────────────────────
//  Main App
// ─────────────────────────────────────────
export default function App() {
  const [view,       setView]       = useState('scanner');
  const [isAuthed,   setIsAuthed]   = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [items,      setItems]      = useState([]);
  const [toast,      setToast]      = useState(null);

  // Scanner
  const [scanResult, setScanResult] = useState(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [manualInput,setManualInput]= useState('');
  const [history,    setHistory]    = useState([]);

  // Admin
  const [showAddForm,setShowAddForm]= useState(false);
  const [newItem,    setNewItem]    = useState({ name: '', barcode: '', qty: '', category: '', emoji: '📦' });
  const [addBusy,    setAddBusy]    = useState(false);
  const [editingId,  setEditingId]  = useState(null);
  const [editingQty, setEditingQty] = useState('');
  const [printItem,  setPrintItem]  = useState(null); // <-- Print state

  // ── Toast helper ──
  const showToast = (text, type = 'ok') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Auth lifecycle ──
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthed(!!session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setIsAuthed(!!session);
      if (!session) { setItems([]); setHistory([]); setScanResult(null); }
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Fetch + real-time subscription ──
  const fetchItems = async () => {
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .order('created_at', { ascending: true });
    if (!error && data) {
      setItems(data.map(d => ({
        ...d,
        name:  d.product_name,
        qty:   d.stock_count,
        emoji: d.emoji || '📦',
      })));
    }
  };

  useEffect(() => {
    if (!isAuthed) return;
    fetchItems();
    const channel = supabase
      .channel('inventory-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, fetchItems)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [isAuthed]);

  // ── Derived ──
  const liveItem   = scanResult?.id ? items.find(i => i.id === scanResult.id) : null;
  const totalStock = items.reduce((s, i) => s + i.qty, 0);

  // ── Handlers ──
  const handleLogout = () => supabase.auth.signOut();

  const findItem = (bc) => {
    const code = (bc || manualInput).trim();
    if (!code) return;
    const found = items.find(i => i.barcode.toLowerCase() === code.toLowerCase());
    setScanResult(found ? { id: found.id } : { notFound: code });
    setManualInput('');
    setCameraOpen(false);
  };

  const handleCheckout = async () => {
    if (!liveItem || liveItem.qty === 0) return;
    const { error } = await supabase
      .from('inventory')
      .update({ stock_count: liveItem.qty - 1 })
      .eq('id', liveItem.id);
    if (!error) {
      setHistory(p => [{ ...liveItem, at: new Date().toLocaleTimeString(), after: liveItem.qty - 1 }, ...p].slice(0, 10));
      showToast(`✓ Checked out 1× ${liveItem.name}. ${liveItem.qty - 1} remaining.`);
      setScanResult(null);
    } else {
      showToast('Checkout failed — please try again.', 'err');
    }
  };

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.barcode) { showToast('Name & barcode are required', 'err'); return; }
    setAddBusy(true);
    const { error } = await supabase.from('inventory').insert([{
      product_name: newItem.name,
      barcode:      newItem.barcode,
      stock_count:  parseInt(newItem.qty) || 0,
      category:     newItem.category,
      emoji:        newItem.emoji || '📦',
    }]);
    setAddBusy(false);
    if (!error) {
      setNewItem({ name: '', barcode: '', qty: '', category: '', emoji: '📦' });
      setShowAddForm(false);
      showToast(`✓ ${newItem.name} added to inventory!`);
    } else {
      showToast(error.message.includes('unique') ? 'That barcode is already in use.' : error.message, 'err');
    }
  };

  const handleDelete = async (id) => {
    const item = items.find(i => i.id === id);
    const { error } = await supabase.from('inventory').delete().eq('id', id);
    if (!error) {
      if (scanResult?.id === id) setScanResult(null);
      showToast(`${item.name} removed from inventory`, 'warn');
    } else {
      showToast('Failed to remove item', 'err');
    }
  };

  const adjustQty = async (id, delta) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    const next = Math.max(0, item.qty + delta);
    const { error } = await supabase.from('inventory').update({ stock_count: next }).eq('id', id);
    if (!error) showToast(`${item.name}: ${item.qty} → ${next}`, delta > 0 ? 'ok' : 'warn');
  };

  const saveEditQty = async (id) => {
    const val = Math.max(0, parseInt(editingQty) || 0);
    const { error } = await supabase.from('inventory').update({ stock_count: val }).eq('id', id);
    if (!error) { setEditingId(null); showToast('Stock count updated!'); }
  };

  // ── Style tokens ──
  const G  = '#106db9', GD = '#31ade6', S = '#0f172a';
  const G4 = '#94a3b8', G6 = '#64748b', BD = '#e2e8f0';

  const st = {
    input: { width: '100%', padding: '11px 14px', border: `1.5px solid ${BD}`, borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
    card:  { background: 'white', borderRadius: 14, padding: 16, marginBottom: 12, boxShadow: '0 1px 5px rgba(0,0,0,.07)' },
    lbl:   { fontSize: 11, fontWeight: 700, color: G6, textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 6 },
  };

  // ── Loading splash ──
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 14, background: '#f1f5f9' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <div style={{ width: 44, height: 44, border: `3px solid ${G}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
      <p style={{ color: G6, fontSize: 14 }}>Loading StockScan…</p>
    </div>
  );

  // ─────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: '#f1f5f9', minHeight: '100vh', maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', fontSize: 14 }}>
      <style>{`
        @keyframes scanLine { 0%,100%{top:8px} 50%{top:calc(100% - 10px)} }
        @keyframes fadeUp   { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        @keyframes spin     { to { transform: rotate(360deg) } }
        button:active { transform: scale(0.97); }
        
        /* 🔥 QR Code Printing Styles 🔥 */
        @media print {
          body * { visibility: hidden; }
          #qr-print-section, #qr-print-section * { visibility: visible; }
          #qr-print-section { position: absolute; left: 0; top: 0; width: 100%; display: flex; flex-direction: column; align-items: center; padding-top: 50px; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Toast */}
      {toast && (
        <div className="no-print" style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: toast.type === 'err' ? '#ef4444' : toast.type === 'warn' ? '#f59e0b' : G, color: 'white', padding: '12px 22px', borderRadius: 12, fontWeight: 600, fontSize: 13, boxShadow: '0 10px 30px rgba(0,0,0,.22)', maxWidth: 340, textAlign: 'center', animation: 'fadeUp .25s ease' }}>
          {toast.text}
        </div>
      )}

      {/* ══════════════ LOGIN / SIGN UP ══════════════ */}
      {!isAuthed && <Signup supabase={supabase} />}

      {/* ══════════════ HEADER ══════════════ */}
      {isAuthed && (
        <header className="no-print" style={{ background: S, padding: '13px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, position: 'sticky', top: 0, zIndex: 50 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 32, height: 32, background: G, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Package size={17} color="white" /></div>
            <span style={{ color: 'white', fontWeight: 800, fontSize: 17, letterSpacing: '-.3px' }}>StockScan</span>
          </div>
          <button onClick={handleLogout} style={{ background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.14)', borderRadius: 8, padding: '7px 12px', color: G4, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 500 }}>
            <LogOut size={13} />Sign Out
          </button>
        </header>
      )}

      {/* ══════════════ MAIN CONTENT ══════════════ */}
      {isAuthed && (
        <main className="no-print" style={{ flex: 1, overflowY: 'auto', paddingBottom: 80 }}>

          {/* ── SCANNER ── */}
          {view === 'scanner' && (
            <div style={{ padding: '18px 18px' }}>
              <h2 style={{ margin: '0 0 2px', fontSize: 21, fontWeight: 800, color: S, letterSpacing: '-.4px' }}>Barcode Scanner</h2>
              <p style={{ margin: '0 0 18px', color: G4, fontSize: 13 }}>Scan a QR/barcode or tap an item below</p>

              {cameraOpen ? (
                <CameraScanner onScan={findItem} onClose={() => setCameraOpen(false)} />
              ) : (
                <>
                  <div style={{ background: S, borderRadius: 18, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                    <div style={{ textAlign: 'center' }}>
                      <Camera size={44} color="#334155" />
                      <p style={{ color: '#64748b', fontSize: 12, margin: '8px 0 2px' }}>Camera is ready</p>
                      <p style={{ color: '#475569', fontSize: 11 }}>Tap the button below to open</p>
                    </div>
                  </div>
                  {/* Quick-tap item buttons */}
                  <div style={{ display: 'flex', gap: 10, marginBottom: 12, overflowX: 'auto', paddingBottom: 4 }}>
                    {items.map(it => (
                      <button key={it.id} onClick={() => findItem(it.barcode)} style={{ flexShrink: 0, minWidth: 110, padding: '12px 8px', background: 'white', border: `1.5px solid ${BD}`, borderRadius: 13, cursor: 'pointer', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
                        <div style={{ fontSize: 26, marginBottom: 4 }}>{it.emoji}</div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#334155' }}>{it.name}</div>
                        <div style={{ fontSize: 10, color: G4, fontFamily: 'monospace', marginTop: 1 }}>{it.barcode}</div>
                        <div style={{ marginTop: 6, fontSize: 13, fontWeight: 700, color: getColor(it.qty) }}>{it.qty} left</div>
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setCameraOpen(true)} style={{ width: '100%', padding: '13px 20px', background: `linear-gradient(140deg,${G},${GD})`, color: 'white', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
                    <QrCode size={17} />📷 Open Camera Scanner
                  </button>
                </>
              )}

              {/* Manual entry */}
              <div style={st.card}>
                <label style={st.lbl}>Manual Barcode Entry</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input style={{ ...st.input, flex: 1 }} value={manualInput} onChange={e => setManualInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && findItem(manualInput)} placeholder="Type or paste a barcode…" />
                  <button onClick={() => findItem(manualInput)} style={{ padding: '11px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>Find</button>
                </div>
              </div>

              {/* Scan result */}
              {scanResult && (
                <div style={{ ...st.card, border: `2px solid ${scanResult.notFound ? '#fecaca' : '#86efac'}`, marginTop: 4 }}>
                  {scanResult.notFound ? (
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ width: 46, height: 46, background: '#fee2e2', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><XCircle size={26} color="#ef4444" /></div>
                      <div>
                        <div style={{ fontWeight: 700, color: '#dc2626', fontSize: 15 }}>Item Not Found</div>
                        <div style={{ color: G4, fontSize: 13, marginTop: 2 }}>No item with barcode <code style={{ background: '#fee2e2', padding: '1px 6px', borderRadius: 4 }}>{scanResult.notFound}</code></div>
                      </div>
                    </div>
                  ) : liveItem ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 14 }}>
                        <div style={{ width: 58, height: 58, background: '#d1fae5', borderRadius: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, flexShrink: 0 }}>{liveItem.emoji}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 800, fontSize: 18, color: S, letterSpacing: '-.3px' }}>{liveItem.name}</div>
                          <div style={{ color: G4, fontSize: 12, marginTop: 2, fontFamily: 'monospace' }}>{liveItem.barcode} · {liveItem.category}</div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: 36, fontWeight: 800, color: getColor(liveItem.qty), lineHeight: 1 }}>{liveItem.qty}</div>
                          <div style={{ fontSize: 10, color: G4, fontWeight: 600 }}>in stock</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={handleCheckout} disabled={liveItem.qty === 0} style={{ flex: 1, padding: '13px', background: liveItem.qty === 0 ? '#f1f5f9' : `linear-gradient(140deg,${G},${GD})`, color: liveItem.qty === 0 ? G4 : 'white', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: liveItem.qty === 0 ? 'not-allowed' : 'pointer' }}>
                          {liveItem.qty === 0 ? '⚠️ Out of Stock' : '✓ Confirm Checkout  −1'}
                        </button>
                        <button onClick={() => setScanResult(null)} style={{ padding: '13px 13px', background: '#f1f5f9', border: 'none', borderRadius: 10, cursor: 'pointer' }}><X size={17} color={G6} /></button>
                      </div>
                    </>
                  ) : null}
                </div>
              )}

              {/* History */}
              {history.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <Clock size={13} color={G4} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: G6, textTransform: 'uppercase', letterSpacing: '.06em' }}>Recent Checkouts</span>
                  </div>
                  {history.slice(0, 4).map((h, i) => (
                    <div key={i} style={{ ...st.card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 20 }}>{h.emoji}</span>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13, color: S }}>{h.name}</div>
                          <div style={{ fontSize: 11, color: G4 }}>{h.at} · {h.after} remaining</div>
                        </div>
                      </div>
                      <span style={{ background: '#d1fae5', color: GD, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>−1 unit</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── INVENTORY ── */}
          {view === 'inventory' && (
            <div style={{ padding: '18px 18px' }}>
              <h2 style={{ margin: '0 0 2px', fontSize: 21, fontWeight: 800, color: S, letterSpacing: '-.4px' }}>Inventory</h2>
              <p style={{ margin: '0 0 18px', color: G4, fontSize: 13 }}>{items.length} products · {totalStock} total units</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
                {[
                  { label: 'Products', value: items.length, color: '#3b82f6', bg: '#eff6ff' },
                  { label: 'Total Units', value: totalStock, color: G, bg: '#d1fae5' },
                  { label: 'Alerts', value: items.filter(i => i.qty <= 5).length, color: items.some(i => i.qty === 0) ? '#ef4444' : '#f59e0b', bg: items.some(i => i.qty === 0) ? '#fee2e2' : '#fef3c7' },
                ].map(s => (
                  <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: '13px 8px', textAlign: 'center' }}>
                    <div style={{ fontSize: 27, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                    <div style={{ fontSize: 10, color: s.color, fontWeight: 700, marginTop: 4, opacity: .85 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              {items.map(it => (
                <div key={it.id} style={st.card}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                    <div style={{ width: 52, height: 52, background: getBg(it.qty), borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 27, flexShrink: 0 }}>{it.emoji}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: S }}>{it.name}</div>
                      <div style={{ color: G4, fontSize: 11, marginTop: 2, fontFamily: 'monospace' }}>#{it.barcode} · {it.category}</div>
                      <div style={{ marginTop: 8, background: '#f1f5f9', borderRadius: 4, height: 5, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(100, (it.qty / 20) * 100)}%`, height: '100%', background: `linear-gradient(90deg,${getColor(it.qty)},${getColor(it.qty)}99)`, borderRadius: 4, transition: 'width .4s ease' }} />
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 30, fontWeight: 800, color: getColor(it.qty), lineHeight: 1 }}>{it.qty}</div>
                      <div style={{ fontSize: 10, color: getColor(it.qty), fontWeight: 700, marginTop: 3 }}>{getLabel(it.qty)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── ADMIN ── */}
          {view === 'admin' && (
            <div style={{ padding: '18px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 21, fontWeight: 800, color: S, letterSpacing: '-.4px' }}>Admin Panel</h2>
                  <p style={{ margin: '2px 0 0', color: G4, fontSize: 13 }}>Manage products & stock</p>
                </div>
                <button onClick={() => setShowAddForm(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 15px', background: showAddForm ? '#f1f5f9' : `linear-gradient(140deg,${G},${GD})`, color: showAddForm ? G6 : 'white', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                  {showAddForm ? <><X size={15} />Cancel</> : <><Plus size={15} />Add Item</>}
                </button>
              </div>

              {showAddForm && (
                <div style={{ ...st.card, border: '2px solid #86efac', marginBottom: 16 }}>
                  <h3 style={{ margin: '0 0 14px', fontWeight: 700, color: S, fontSize: 15, display: 'flex', alignItems: 'center', gap: 7 }}>
                    <Plus size={16} color={G} />New Inventory Item
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[
                      { k: 'name', l: 'Product Name', ph: 'e.g. Soccer Ball', full: true },
                      { k: 'barcode', l: 'Barcode ID', ph: 'e.g. SOC-002' },
                      { k: 'qty', l: 'Initial Stock', ph: '10', type: 'number' },
                      { k: 'category', l: 'Category', ph: 'Sports Equipment' },
                      { k: 'emoji', l: 'Emoji Icon', ph: '⚽ 🏀 🎾 📦' },
                    ].map(f => (
                      <div key={f.k} style={{ gridColumn: f.full ? '1/-1' : 'auto' }}>
                        <label style={st.lbl}>{f.l}</label>
                        <input type={f.type || 'text'} value={newItem[f.k]} onChange={e => setNewItem(p => ({ ...p, [f.k]: e.target.value }))} placeholder={f.ph} style={st.input} />
                      </div>
                    ))}
                  </div>
                  <button onClick={handleAddItem} disabled={addBusy} style={{ width: '100%', marginTop: 14, padding: '13px', background: `linear-gradient(140deg,${G},${GD})`, color: 'white', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: addBusy ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: addBusy ? .7 : 1 }}>
                    {addBusy ? 'Adding…' : <><Plus size={16} />Add to Inventory</>}
                  </button>
                </div>
              )}

              {items.map(it => (
                <div key={it.id} style={st.card}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <span style={{ fontSize: 28 }}>{it.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: S }}>{it.name}</div>
                      <div style={{ fontSize: 12, color: G4, fontFamily: 'monospace' }}>#{it.barcode} · {it.category}</div>
                    </div>
                    
                    {/* 🖨️ QR Print Button */}
                    <button onClick={() => setPrintItem(it)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#eff6ff', border: 'none', borderRadius: 8, padding: '7px 10px', cursor: 'pointer', color: '#3b82f6', fontSize: 12, fontWeight: 700 }}>
                      <Printer size={13} />Print
                    </button>

                    <button onClick={() => handleDelete(it.id)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#fee2e2', border: 'none', borderRadius: 8, padding: '7px 10px', cursor: 'pointer', color: '#dc2626', fontSize: 12, fontWeight: 700 }}>
                      <Trash2 size={13} />Remove
                    </button>
                  </div>
                  <div style={{ background: '#f8fafc', borderRadius: 10, padding: '11px 13px' }}>
                    {editingId === it.id ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: G6, flexShrink: 0 }}>Set to:</span>
                        <input type="number" value={editingQty} onChange={e => setEditingQty(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveEditQty(it.id)} style={{ width: 80, padding: '8px 10px', border: `2px solid ${G}`, borderRadius: 8, fontSize: 16, fontWeight: 700, outline: 'none', textAlign: 'center' }} autoFocus />
                        <button onClick={() => saveEditQty(it.id)} style={{ padding: '8px 12px', background: G, color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center' }}><CheckCircle size={16} /></button>
                        <button onClick={() => setEditingId(null)} style={{ padding: '8px 10px', background: '#e2e8f0', border: 'none', borderRadius: 8, cursor: 'pointer' }}><X size={14} color={G6} /></button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: G6 }}>Stock:</span>
                        <span style={{ flex: 1, fontSize: 26, fontWeight: 800, color: getColor(it.qty) }}>{it.qty}</span>
                        <button onClick={() => adjustQty(it.id, -1)} disabled={it.qty === 0} style={{ width: 34, height: 34, background: '#fee2e2', border: 'none', borderRadius: 8, fontSize: 20, fontWeight: 700, color: '#dc2626', cursor: it.qty === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: it.qty === 0 ? .35 : 1 }}>−</button>
                        <button onClick={() => adjustQty(it.id, 1)} style={{ width: 34, height: 34, background: '#d1fae5', border: 'none', borderRadius: 8, fontSize: 20, fontWeight: 700, color: GD, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                        <button onClick={() => { setEditingId(it.id); setEditingQty(String(it.qty)); }} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 11px', background: '#e2e8f0', border: 'none', borderRadius: 8, color: G6, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                          <Edit2 size={12} />Set
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      )}

      {/* ══════════════ QR PRINT MODAL ══════════════ */}
      {printItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.95)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div id="qr-print-section" style={{ background: 'white', padding: '30px 20px', borderRadius: 20, textAlign: 'center', maxWidth: 320, width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
            <div style={{ fontSize: 44, marginBottom: 8 }}>{printItem.emoji}</div>
            <h3 style={{ margin: '0 0 6px', color: S, fontSize: 20, fontWeight: 800 }}>{printItem.name}</h3>
            <p style={{ margin: '0 0 24px', color: G6, fontSize: 13, fontFamily: 'monospace', letterSpacing: '1px' }}>{printItem.barcode}</p>
            
            <div style={{ background: 'white', padding: 16, display: 'inline-block', borderRadius: 12, border: `2px solid ${BD}`, marginBottom: 24 }}>
              <QRCode value={printItem.barcode} size={160} level="H" />
            </div>

            <div className="no-print" style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => window.print()} style={{ flex: 1, padding: '13px', background: G, color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 15 }}>
                Print Label
              </button>
              <button onClick={() => setPrintItem(null)} style={{ padding: '13px 20px', background: '#f1f5f9', color: G6, border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 15 }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ BOTTOM NAV ══════════════ */}
      {isAuthed && (
        <nav className="no-print" style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: 'white', borderTop: `1px solid ${BD}`, display: 'flex', zIndex: 100, paddingBottom: 6 }}>
          {[['scanner', 'Scanner', QrCode], ['inventory', 'Inventory', Package], ['admin', 'Admin', Settings]].map(([id, label, Icon]) => (
            <button key={id} onClick={() => { setView(id); setScanResult(null); }} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '9px 0 3px', background: 'none', border: 'none', cursor: 'pointer', color: view === id ? G : G4, transition: 'color .15s' }}>
              <Icon size={22} strokeWidth={view === id ? 2.5 : 1.8} />
              <span style={{ fontSize: 10, fontWeight: view === id ? 800 : 500 }}>{label}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}