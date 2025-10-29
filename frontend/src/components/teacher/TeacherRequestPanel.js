import React, { useState, useEffect } from 'react';
import { createTeacherRequest, getTeacherRequests } from '../../api/teacherRequestApi';
import { Button, TextField, Typography, Box, Paper, List, ListItem, ListItemText, Divider } from '@mui/material';

const TeacherRequestPanel = ({ token }) => {
  const [message, setMessage] = useState('');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchRequests = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getTeacherRequests(token);
      setRequests(data);
    } catch (err) {
      setError('Failed to load requests');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!message.trim()) {
      setError('Message cannot be empty');
      return;
    }
    setLoading(true);
    try {
      await createTeacherRequest(message, token);
      setSuccess('Request submitted successfully');
      setMessage('');
      fetchRequests();
    } catch (err) {
      setError('Failed to submit request');
    }
    setLoading(false);
  };

  return (
    <Box sx={{ maxWidth: 600, margin: '0 auto', mt: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>Request Super Admin</Typography>
        <form onSubmit={handleSubmit}>
          <TextField
            label="Your Request"
            value={message}
            onChange={e => setMessage(e.target.value)}
            fullWidth
            multiline
            minRows={2}
            maxRows={6}
            margin="normal"
            disabled={loading}
          />
          <Button type="submit" variant="contained" color="primary" disabled={loading}>
            Submit Request
          </Button>
        </form>
        {error && <Typography color="error" sx={{ mt: 2 }}>{error}</Typography>}
        {success && <Typography color="primary" sx={{ mt: 2 }}>{success}</Typography>}
      </Paper>
      <Paper sx={{ p: 3, mt: 4 }}>
        <Typography variant="h6" gutterBottom>Your Requests</Typography>
        {loading ? (
          <Typography>Loading...</Typography>
        ) : (
          <List>
            {requests.length === 0 && <Typography>No requests found.</Typography>}
            {requests.map(req => (
              <React.Fragment key={req._id}>
                <ListItem alignItems="flex-start">
                  <ListItemText
                    primary={req.message}
                    secondary={
                      <>
                        <Typography component="span" variant="body2" color="text.secondary">
                          Status: {req.status || 'pending'}
                        </Typography>
                        {req.response && (
                          <><br /><b>Admin Response:</b> {req.response}</>
                        )}
                      </>
                    }
                  />
                </ListItem>
                <Divider component="li" />
              </React.Fragment>
            ))}
          </List>
        )}
      </Paper>
    </Box>
  );
};

export default TeacherRequestPanel;
