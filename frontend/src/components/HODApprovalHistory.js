import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  TextField,
  MenuItem,
  Button,
  Card,
  CardContent,
  Divider,
  Alert
} from '@mui/material';
import {
  History as HistoryIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Person as PersonIcon,
  Class as ClassIcon,
  Schedule as ScheduleIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

const RelativeTime = ({ date }) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.floor((now - new Date(date).getTime()) / 1000);
  const abs = Math.abs(diff);
  const suffix = diff >= 0 ? 'ago' : 'from now';
  const units = [
    ['year', 365*24*3600],
    ['month', 30*24*3600],
    ['day', 24*3600],
    ['hour', 3600],
    ['minute', 60]
  ];
  for (const [name, sec] of units) {
    if (abs >= sec) {
      const val = Math.floor(abs / sec);
      return <>{val} {name}{val>1?'s':''} {suffix}</>;
    }
  }
  return <>just now</>;
};

const HODApprovalHistory = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (status !== 'all') params.set('status', status);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/hod/announcements/history?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load history');
      const data = await res.json();
      setItems(data.announcements || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHistory(); }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h4">
          <HistoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} /> Approval History
        </Typography>
        <Button startIcon={<RefreshIcon />} onClick={fetchHistory} disabled={loading}>Refresh</Button>
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <TextField
              select
              label="Status"
              fullWidth
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="approved">Approved</MenuItem>
              <MenuItem value="rejected">Rejected</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              type="date"
              label="From"
              InputLabelProps={{ shrink: true }}
              fullWidth
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              type="date"
              label="To"
              InputLabelProps={{ shrink: true }}
              fullWidth
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={3} sx={{ display: 'flex', alignItems: 'center' }}>
            <Button variant="contained" onClick={fetchHistory} sx={{ mr: 1 }}>Apply</Button>
            <Button onClick={() => { setStatus('all'); setFrom(''); setTo(''); fetchHistory(); }}>Reset</Button>
          </Grid>
        </Grid>
      </Paper>

      {loading ? (
        <Typography>Loading...</Typography>
      ) : items.length === 0 ? (
        <Alert severity="info">No reviewed announcements found.</Alert>
      ) : (
        <Grid container spacing={2}>
          {items.map(item => (
            <Grid item xs={12} key={item.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="h6">{item.title}</Typography>
                    <Chip
                      label={item.status.toUpperCase()}
                      color={item.status === 'approved' ? 'success' : 'error'}
                      icon={item.status === 'approved' ? <ApproveIcon /> : <RejectIcon />}
                      size="small"
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Reviewed <RelativeTime date={item.reviewedAt} />
                  </Typography>
                  <Divider sx={{ my: 1.5 }} />
                  <Typography variant="body1" paragraph>{item.message}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <PersonIcon fontSize="small" color="action" />
                    <Typography variant="body2">Teacher: {item.teacher?.name}</Typography>
                    <ClassIcon fontSize="small" color="action" sx={{ ml: 2 }} />
                    <Typography variant="body2">Sections: {item.sections?.map(s => s.name).join(', ') || '—'}</Typography>
                    {item.approvalNote && (
                      <>
                        <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
                        <Typography variant="body2">Note: {item.approvalNote}</Typography>
                      </>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default HODApprovalHistory;
