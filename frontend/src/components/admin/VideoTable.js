import React from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, Paper } from '@mui/material';

const VideoTable = ({ videos, onRemove, onWarn, onEdit }) => (
  <TableContainer component={Paper} sx={{ mt: 2 }}>
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>Preview</TableCell>
          <TableCell>Title</TableCell>
          <TableCell>Course</TableCell>
          <TableCell>Uploaded By</TableCell>
          <TableCell>Status</TableCell>
          <TableCell>Actions</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {videos.map(video => (
          <TableRow key={video._id}>
            <TableCell>
              <video width="120" height="70" controls src={video.videoUrl} style={{ background: '#000' }} />
            </TableCell>
            <TableCell>{video.title}</TableCell>
            <TableCell>{video.courseTitle || video.course}</TableCell>
            <TableCell>{video.teacherName || video.teacher}</TableCell>
            <TableCell>{video.warned ? 'Warned' : 'OK'}</TableCell>
            <TableCell>
              <Button size="small" color="error" onClick={() => onRemove(video._id)}>Remove</Button>
              <Button size="small" onClick={() => onWarn(video._id)} sx={{ ml: 1 }}>Warn</Button>
              <Button size="small" onClick={() => onEdit(video)} sx={{ ml: 1 }}>Edit</Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </TableContainer>
);

export default VideoTable;
