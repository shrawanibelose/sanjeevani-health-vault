import React, { useState } from 'react';
import { supabase } from './utils/supabaseClient';
import { Camera, CameraResultType } from '@capacitor/camera';

const ReportUpload = ({ session, onUploadSuccess }) => {
  const [uploading, setUploading] = useState(false);

  const takePhoto = async () => {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64
      });

      setUploading(true);
      const fileName = `${session.user.id}/${Date.now()}.jpg`;

      // 1. Send to AI (Flask Backend) FIRST
      const formData = new FormData();
      const response = await fetch(`data:image/jpeg;base64,${image.base64String}`);
      const blob = await response.blob();
      formData.append('file', blob, 'report.jpg');

      const aiResponse = await fetch('http://127.0.0.1:5000/process-report', {
        method: 'POST',
        body: formData,
      });
      const aiData = await aiResponse.json();

      // 2. Upload to Supabase Storage
      await supabase.storage.from('reports').upload(fileName, blob);

      // 3. Save to Database with AI results
      await supabase.from('medical_records').insert([{ 
        user_id: session.user.id, 
        file_url: fileName,
        extracted_data: aiData 
      }]);

      alert(`AI Analysis: ${aiData.metric || "Found"} - ${aiData.value || "Data extracted"}`);
      onUploadSuccess();
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <button onClick={takePhoto} disabled={uploading} style={btnStyle}>
      {uploading ? "Analyzing..." : "📸 Take Photo of Report"}
    </button>
  );
};

const btnStyle = { padding: '30px', fontSize: '28px', backgroundColor: '#ff6b6b', color: 'white', borderRadius: '15px', border: 'none', fontWeight: 'bold', width: '100%', cursor: 'pointer' };

export default ReportUpload;