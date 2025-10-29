import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Button, MenuItem, Select, FormControl, InputLabel, OutlinedInput, Checkbox, ListItemText, CircularProgress, Snackbar, Alert, Table, TableBody, TableCell, TableHead, TableRow, Dialog, DialogTitle, DialogContent } from '@mui/material';
import axios from 'axios';

export default function CourseAssignment() {
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [condition, setCondition] = useState('');
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState('');
  const [historyDialog, setHistoryDialog] = useState({ open: false, student: null, history: [] });
  const token = localStorage.getItem('token');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [stu, cou] = await Promise.all([
        axios.get('/api/admin/students', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/admin/courses', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setStudents(stu.data);
      setCourses(cou.data);
      setLoading(false);
    })();
  }, [token]);

  const handleAssign = async () => {
    await axios.post('/api/admin/student/assign-courses', {
      studentIds: selectedStudents,
      courseIds: selectedCourses,
      condition: condition || undefined,
    }, { headers: { Authorization: `Bearer ${token}` } });
    setSnackbar('Courses assigned');
  };

  const openHistory = async (student) => {
    const res = await axios.get(`/api/admin/student/${student._id}/assignment-history`, { headers: { Authorization: `Bearer ${token}` } });
    setHistoryDialog({ open: true, student, history: res.data });
  };

  if (loading) return <CircularProgress />;

  return (
    <Box>
      <Typography variant="h4" mb={2}>Course Assignment</Typography>
      <Paper sx={{ p: 2, mb: 3 }}>
        <FormControl sx={{ minWidth: 220, mr: 2 }}>
          <InputLabel>Students</InputLabel>
          <Select
            multiple
            value={selectedStudents}
            onChange={e => setSelectedStudents(e.target.value)}
            input={<OutlinedInput label="Students" />}
            renderValue={selected => selected.map(id => students.find(s => s._id === id)?.name).join(', ')}
          >
            {students.map(s => (
              <MenuItem key={s._id} value={s._id}>
                <Checkbox checked={selectedStudents.indexOf(s._id) > -1} />
                <ListItemText primary={s.name + (s.grade ? ` (Grade: ${s.grade})` : '')} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 220, mr: 2 }}>
          <InputLabel>Courses</InputLabel>
          <Select
            multiple
            value={selectedCourses}
            onChange={e => setSelectedCourses(e.target.value)}
            input={<OutlinedInput label="Courses" />}
            renderValue={selected => selected.map(id => courses.find(c => c._id === id)?.title).join(', ')}
          >
            {courses.map(c => (
              <MenuItem key={c._id} value={c._id}>
                <Checkbox checked={selectedCourses.indexOf(c._id) > -1} />
                <ListItemText primary={c.title} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 180, mr: 2 }}>
          <InputLabel>Condition (e.g., grade:10)</InputLabel>
          <OutlinedInput value={condition} onChange={e => setCondition(e.target.value)} label="Condition (e.g., grade:10)" />
        </FormControl>
        <Button variant="contained" onClick={handleAssign} disabled={!selectedStudents.length || !selectedCourses.length}>Assign</Button>
      </Paper>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6">Students</Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Grade</TableCell>
              <TableCell>Assigned Courses</TableCell>
              <TableCell>History</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {students.map(s => (
              <TableRow key={s._id}>
                <TableCell>{s.name}</TableCell>
                <TableCell>{s.email}</TableCell>
                <TableCell>{s.grade || '-'}</TableCell>
                <TableCell>{(s.coursesAssigned || []).map(cid => courses.find(c => c._id === cid)?.title).join(', ')}</TableCell>
                <TableCell><Button size="small" onClick={() => openHistory(s)}>View</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
      <Dialog open={historyDialog.open} onClose={() => setHistoryDialog({ open: false, student: null, history: [] })} maxWidth="md" fullWidth>
        <DialogTitle>Assignment History for {historyDialog.student?.name}</DialogTitle>
        <DialogContent>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Courses</TableCell>
                <TableCell>Assigned By</TableCell>
                <TableCell>Condition</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {historyDialog.history.map((h, i) => (
                <TableRow key={i}>
                  <TableCell>{new Date(h.createdAt).toLocaleString()}</TableCell>
                  <TableCell>{h.courses.map(c => c.title).join(', ')}</TableCell>
                  <TableCell>{h.assignedBy?.email}</TableCell>
                  <TableCell>{h.condition || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
      <Snackbar open={!!snackbar} autoHideDuration={3000} onClose={() => setSnackbar('')}>
        <Alert severity="success">{snackbar}</Alert>
      </Snackbar>
    </Box>
  );
}
