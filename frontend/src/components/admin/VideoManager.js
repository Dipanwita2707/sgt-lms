import React, { useState } from 'react';
import { Box, Button, TextField, Alert, Paper } from '@mui/material';

const VideoManager = ({ onUpload, onRemove, onWarn, videos }) => {
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', courseId: '', teacherId: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });
  const handleFileChange = e => setFile(e.target.files[0]);

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!file || !form.title || !form.courseId || !form.teacherId) return setError('All fields required');
    try {
      await onUpload({ ...form, file });
      setSuccess('Video uploaded');
      setFile(null);
      setForm({ title: '', description: '', courseId: '', teacherId: '' });
    } catch (err) {
      setError(err.message || 'Upload failed');
    }
  };

  return (
    <Paper sx={{ p: 2, mt: 2 }}>
      <Box component="form" onSubmit={handleSubmit}>
        {error && <Alert severity="error">{error}</Alert>}
        {success && <Alert severity="success">{success}</Alert>}
        <TextField label="Title" name="title" value={form.title} onChange={handleChange} fullWidth margin="normal" required />
        <TextField label="Description" name="description" value={form.description} onChange={handleChange} fullWidth margin="normal" />
        <TextField label="Course ID" name="courseId" value={form.courseId} onChange={handleChange} fullWidth margin="normal" required />
        <TextField label="Teacher ID" name="teacherId" value={form.teacherId} onChange={handleChange} fullWidth margin="normal" required />
        <input type="file" accept="video/*" onChange={handleFileChange} />
        <Button type="submit" variant="contained" color="primary" sx={{ ml: 2 }}>Upload Video</Button>
      </Box>
      <Box mt={2}>
        {videos.map(video => (
          <Paper key={video._id} sx={{ p: 2, mb: 1 }}>
            <b>{video.title}</b> ({video.courseId})
            <Button size="small" color="error" onClick={() => onRemove(video._id)} sx={{ ml: 2 }}>Remove</Button>
            <Button size="small" onClick={() => onWarn(video._id)} sx={{ ml: 1 }}>Warn</Button>
          </Paper>
        ))}
      </Box>
    </Paper>
  );
};

export default VideoManager;
