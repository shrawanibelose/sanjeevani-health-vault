import React, { useEffect, useState } from 'react';
import { supabase } from './utils/supabaseClient';

const ReportList = ({ session, onBack }) => {
  const [reports, setReports] = useState([]);

  useEffect(() => {
    const fetchReports = async () => {
      const { data, error } = await supabase
        .from('medical_records')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (!error) setReports(data);
    };

    fetchReports();
  }, [session.user.id]); // Adding this dependency makes the warning go away

  const fetchReports = async () => {
    const { data, error } = await supabase
      .from('medical_records')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (!error) setReports(data);
  };

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <button onClick={onBack} style={backBtnStyle}>← Go Back</button>
      <h2 style={{ fontSize: '30px', color: '#1a535c' }}>My Health Records</h2>
      
      {reports.length === 0 ? <p>No reports found yet.</p> : (
        <div style={{ display: 'grid', gap: '15px', marginTop: '20px' }}>
          {reports.map((report) => (
            <div key={report.id} style={cardStyle}>
              <p style={{ fontSize: '18px', color: '#888' }}>
                {new Date(report.created_at).toLocaleDateString()}
              </p>
              <h3 style={{ fontSize: '24px', margin: '10px 0' }}>
                {report.extracted_data?.metric || "Report"}: {report.extracted_data?.value || "N/A"}
              </h3>
              <span style={statusStyle(report.extracted_data?.value)}>
                {report.extracted_data?.value ? "Analyzed" : "Processing..."}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Senior-friendly styles
const backBtnStyle = { padding: '10px 20px', fontSize: '18px', borderRadius: '8px', cursor: 'pointer', marginBottom: '20px' };
const cardStyle = { padding: '20px', borderRadius: '15px', backgroundColor: 'white', boxShadow: '0 4px 8px rgba(0,0,0,0.1)', textAlign: 'left', borderLeft: '8px solid #4ecdc4' };
const statusStyle = (val) => ({ color: val ? 'green' : 'orange', fontWeight: 'bold' });

export default ReportList;