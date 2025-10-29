import React from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, Tooltip } from '@mui/material';
import { CSVLink } from 'react-csv';
// For PDF export, you can use jsPDF or similar

const VideoAnalyticsTable = ({ data, onExportPDF }) => {
  // Format watch time for display
  const formatWatchTime = (seconds) => {
    if (!seconds) return '0s';
    
    // Handle very small values (less than 1 second)
    if (seconds < 1) {
      return `${seconds.toFixed(1)}s`;
    }
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${remainingSeconds}s`;
    }
  };

  const csvData = data.records.map(r => ({
    Video: data.video.title,
    Student: r.student?.name || r.student?._id,
    Watchtime: r.watchtime,
    'Watchtime (formatted)': formatWatchTime(r.watchtime),
    'Completion %': r.completion
  }));

  return (
    <TableContainer component={Paper} sx={{ mt: 2 }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Video</TableCell>
            <TableCell>Student</TableCell>
            <TableCell>Watchtime</TableCell>
            <TableCell>Completion %</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.records.map((r, i) => (
            <TableRow key={i}>
              <TableCell>{data.video.title}</TableCell>
              <TableCell>{r.student?.name || r.student?._id}</TableCell>
              <TableCell>
                <Tooltip title={`${r.watchtime} seconds`}>
                  <span>{formatWatchTime(r.watchtime)}</span>
                </Tooltip>
              </TableCell>
              <TableCell>{r.completion}%</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: 16 }}>
        <CSVLink data={csvData} filename="video-analytics.csv">
          <Button variant="outlined" sx={{ mr: 2 }}>Export CSV</Button>
        </CSVLink>
        <Button variant="outlined" onClick={onExportPDF}>Export PDF</Button>
      </div>
    </TableContainer>
  );
};

export default VideoAnalyticsTable;
