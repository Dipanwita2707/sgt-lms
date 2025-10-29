import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Alert } from '@mui/material';

const ResetPasswordDialog = ({ open, onClose, onSubmit }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!password) return setError('Password required');
    setError('');
    onSubmit(password);
    setPassword('');
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Reset Teacher Password</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField label="New Password" type="password" fullWidth margin="normal" value={password} onChange={e => setPassword(e.target.value)} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">Reset</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ResetPasswordDialog;
