import React, { useState, useEffect } from 'react';
import { supabase } from './utils/supabaseClient';

const MedicationTracker = ({ session, onBack }) => {
  const [meds, setMeds] = useState([]);
  const [newMed, setNewMed] = useState({ name: '', stock: '', daily: 1 });

  useEffect(() => { 
    fetchMeds(); 
  }, [session.user.id]);

  const fetchMeds = async () => {
    const { data } = await supabase.from('medications').select('*').eq('user_id', session.user.id);
    if (data) setMeds(data);
  };

  const addMed = async (e) => {
    e.preventDefault();
    await supabase.from('medications').insert([{
      user_id: session.user.id,
      med_name: newMed.name,
      pills_remaining: parseInt(newMed.stock),
      pills_per_day: parseInt(newMed.daily)
    }]);
    setNewMed({ name: '', stock: '', daily: 1 });
    fetchMeds();
  };

  return (
    <div style={{ padding: '20px', textAlign: 'center', backgroundColor: '#f4f7f6', minHeight: '100vh' }}>
      <button onClick={onBack} style={{ float: 'left', padding: '10px' }}>← Back</button>
      <h2 style={{ color: '#1a535c' }}>💊 Medicine Stock Tracker</h2>
      
      <form onSubmit={addMed} style={{ padding: '20px', backgroundColor: '#fff', borderRadius: '15px', marginBottom: '20px' }}>
        <input placeholder="Medicine Name" value={newMed.name} onChange={e => setNewMed({...newMed, name: e.target.value})} required style={inputS} />
        <input type="number" placeholder="Pills Left in Box" value={newMed.stock} onChange={e => setNewMed({...newMed, stock: e.target.value})} required style={inputS} />
        <button type="submit" style={{ padding: '10px', backgroundColor: '#1a535c', color: 'white', borderRadius: '5px' }}>Add Medicine</button>
      </form>

      <div>
        {meds.map(m => {
          const daysLeft = Math.floor(m.pills_remaining / m.pills_per_day);
          return (
            <div key={m.id} style={{ padding: '15px', borderRadius: '10px', backgroundColor: 'white', marginBottom: '10px', borderLeft: `10px solid ${daysLeft < 3 ? 'red' : 'green'}`, textAlign: 'left' }}>
              <h3>{m.med_name}</h3>
              <p>Stock: {m.pills_remaining} pills</p>
              <p style={{ fontWeight: 'bold' }}>Finish in: {daysLeft} days</p>
              {daysLeft < 3 && <p style={{ color: 'red', fontWeight: 'bold' }}>⚠️ Order Soon!</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const inputS = { padding: '10px', margin: '5px', borderRadius: '5px', border: '1px solid #ddd' };
export default MedicationTracker;