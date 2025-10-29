import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, TextField, Button, Table, TableHead, TableRow, TableCell, TableBody, Chip, Alert } from '@mui/material';
import axios from 'axios';

const UnitQuizLocks = () => {
  const [courseId, setCourseId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const token = localStorage.getItem('token');

  const fetchLocks = async () => {
    try {
      setLoading(true);
      setError('');
      setInfo('');
      if (!courseId || !unitId) {
        setError('Enter both Course ID and Unit ID');
        setLoading(false);
        return;
      }
      const res = await axios.get(`/api/admin/course/${courseId}/unit/${unitId}/locks`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRows(res.data || []);
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  const unlockStudent = async (studentId) => {
    try {
      setError('');
      setInfo('');
      await axios.post(`/api/admin/course/${courseId}/unit/${unitId}/unlock`, { studentId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInfo('Student unlocked successfully');
      await fetchLocks();
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    }
  };

  return (
    <Box p={2}>
      <Typography variant="h5" gutterBottom>Unit Quiz Locks</Typography>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box display="flex" gap={2}>
          <TextField label="Course ID" size="small" value={courseId} onChange={(e) => setCourseId(e.target.value)} />
          <TextField label="Unit ID" size="small" value={unitId} onChange={(e) => setUnitId(e.target.value)} />
          <Button variant="contained" onClick={fetchLocks} disabled={loading}>Load</Button>
        </Box>
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        {info && <Alert severity="success" sx={{ mt: 2 }}>{info}</Alert>}
      </Paper>
      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Student</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Locked</TableCell>
              <TableCell>Reason</TableCell>
              <TableCell>Locked At</TableCell>
              <TableCell>Violations</TableCell>
              <TableCell>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.student?._id}>
                <TableCell>{r.student?.name || r.student?._id}</TableCell>
                <TableCell>{r.student?.email}</TableCell>
                <TableCell>
                  {r.locked ? <Chip label="Locked" color="warning" size="small"/> : <Chip label="Unlocked" color="success" size="small"/>}
                </TableCell>
                <TableCell>{r.reason || '-'}</TableCell>
                <TableCell>{r.lockedAt ? new Date(r.lockedAt).toLocaleString() : '-'}</TableCell>
                <TableCell>{r.violationCount || 0}</TableCell>
                <TableCell>
                  <Button variant="outlined" size="small" onClick={() => unlockStudent(r.student?._id)} disabled={!r.locked || loading}>Unlock</Button>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7}>
                  <Typography variant="body2" align="center" sx={{ p: 2 }}>
                    {loading ? 'Loading…' : 'No data'}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
};

export default UnitQuizLocks;
