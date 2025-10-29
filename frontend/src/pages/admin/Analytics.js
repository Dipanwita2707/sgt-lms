
import React, { useState } from 'react';
import { Typography, Paper, TextField, Button, CircularProgress, Alert } from '@mui/material';
import VideoAnalyticsTable from '../../components/admin/VideoAnalyticsTable';
import axios from 'axios';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const Analytics = () => {
  const [videoId, setVideoId] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const token = localStorage.getItem('token');

  const handleFetch = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`/api/admin/analytics/video/${videoId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(res.data);
    } catch (err) {
      setError('Failed to fetch analytics');
    }
    setLoading(false);
  };

  const handleExportPDF = () => {
    if (!data) return;
    const doc = new jsPDF();
    doc.text(`Video Analytics: ${data.video.title}`, 10, 10);
    doc.autoTable({
      head: [['Video', 'Student', 'Watchtime (s)', 'Completion %']],
      body: data.records.map(r => [data.video.title, r.student?.name || r.student?._id, r.watchtime, r.completion])
    });
    doc.save('video-analytics.pdf');
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" mb={2}>Video Analytics</Typography>
      <TextField label="Video ID" value={videoId} onChange={e => setVideoId(e.target.value)} sx={{ mr: 2 }} />
      <Button variant="contained" onClick={handleFetch}>Fetch Analytics</Button>
      {loading && <CircularProgress sx={{ ml: 2 }} />}
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      {data && <VideoAnalyticsTable data={data} onExportPDF={handleExportPDF} />}
      {/* Improvement: Heatmap placeholder */}
      {data && <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Heatmap: (future feature)</Typography>}
    </Paper>
  );
};

export default Analytics;
