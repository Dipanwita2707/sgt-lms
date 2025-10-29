import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, CircularProgress, Button, Table, TableBody, TableCell, TableHead, TableRow, Dialog, DialogTitle, DialogContent } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';

export function StudentAnalytics({ studentId }) {
  const [heatmap, setHeatmap] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('token');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await axios.get(`/api/admin/analytics/student/${studentId}/heatmap`, { headers: { Authorization: `Bearer ${token}` } });
      setHeatmap(res.data);
      setLoading(false);
    })();
  }, [studentId, token]);

  if (loading) return <CircularProgress />;

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6">Student Activity Heatmap (hour x day)</Typography>
      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Day</TableCell>
              <TableCell>Hour</TableCell>
              <TableCell>Activity Count</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {heatmap.map((row, idx) => (
              <TableRow key={idx}>
                <TableCell>{row._id.day}</TableCell>
                <TableCell>{row._id.hour}</TableCell>
                <TableCell>{row.count}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Paper>
  );
}

export function TeacherPerformance({ teacherId }) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('token');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await axios.get(`/api/admin/analytics/teacher/${teacherId}/performance`, { headers: { Authorization: `Bearer ${token}` } });
      setMetrics(res.data);
      setLoading(false);
    })();
  }, [teacherId, token]);

  if (loading) return <CircularProgress />;

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6">Teacher Performance</Typography>
      <Typography>Videos Uploaded: <b>{metrics.videoCount}</b></Typography>
      <Typography>Students Completed: <b>{metrics.studentsCompleted}</b></Typography>
      <Typography>Average Feedback Rating: <b>{metrics.avgRating || '-'}</b></Typography>
    </Paper>
  );
}

export function ExportAnalyticsButtons() {
  const token = localStorage.getItem('token');
  const handleExport = (type) => {
    window.open(`/api/admin/analytics/export?type=${type}&token=${token}`);
  };
  return (
    <Box sx={{ mb: 2 }}>
      <Button variant="outlined" onClick={() => handleExport('students')} sx={{ mr: 2 }}>Export Student Analytics (CSV)</Button>
      <Button variant="outlined" onClick={() => handleExport('teachers')}>Export Teacher Analytics (CSV)</Button>
    </Box>
  );
}
