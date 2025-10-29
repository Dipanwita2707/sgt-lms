import React, { useState } from 'react';
import { Container, Box, Typography, TextField, Button, Alert, Link, Paper } from '@mui/material';
import axios from 'axios';

const ForgotPasswordPage = () => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [suggestedEmail, setSuggestedEmail] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setSuggestedEmail('');

        const trimmedEmail = email.trim();
        if (!trimmedEmail) {
            setError('Please enter your email address');
            return;
        }

        try {
            await axios.post('/api/auth/request-password-reset', { email: trimmedEmail });
            setMessage('Password reset link sent to your email.');
        } catch (err) {
            const suggested = err.response?.data?.suggestedEmail;
            if (suggested) {
                setSuggestedEmail(suggested);
            }
            setError(err.response?.data?.message || 'Failed to send reset link');
        }
    };

    const useSuggestedEmail = () => {
        setEmail(suggestedEmail);
        setSuggestedEmail('');
    };

    return (
        <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minHeight: '100vh',
            bgcolor: 'grey.100', // Subtle background for the page
        }}>

            {/* University Management System Title - Independent of the stripe */}
            <Typography
                variant="h4"
                sx={{
                    fontWeight: 800,
                    color: '#1a237e',
                    letterSpacing: 0.5,
                    textAlign: 'center',
                    lineHeight: 1.2,
                    fontFamily: 'Montserrat',
                    fontSize: '2rem',
                    my: 4,
                }}
            >
                University Management System
            </Typography>

            {/* Container for the stripe and the form card */}
            <Box
                sx={{
                    position: 'relative',
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    // The height of this container determines the vertical position of the stripe
                    // relative to the form card
                    height: '400px', 
                    // To show the stripe's full width, we need to handle overflow on the body or a parent element
                    overflowX: 'hidden',
                }}
            >
                {/* The blue stripe is an absolutely positioned element */}
                

                {/* The form card is a separate element with a higher z-index */}
                <Container
                    maxWidth="xs"
                    sx={{
                        position: 'relative',
                        zIndex: 1, // On top of the stripe
                    }}
                >
                    <Paper
                        elevation={8}
                        sx={{
                            p: 4,
                            bgcolor: '#e4eeffff',
                            borderRadius: 2,
                            boxShadow: 4,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                        }}
                    >
                        <Typography
                            variant="h5"
                            mb={2}
                            align="center"
                            gutterBottom
                            sx={{ fontWeight: 'bold', mb: 2 }}
                        >
                            Forgot Password
                        </Typography>
                        {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
                        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                        {suggestedEmail && (
                            <Alert severity="info" sx={{ mb: 2 }}>
                                Did you mean <Link component="button" onClick={useSuggestedEmail} underline="hover">{suggestedEmail}</Link>?
                            </Alert>
                        )}
                        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                            <TextField
                                label="Enter you registered mail              "
                                type="email"
                                fullWidth
                                margin="normal"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                error={!!error && !suggestedEmail}
                            />
                            <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 2 }}>
                                Send Reset Link
                            </Button>
                        </form>
                    </Paper>
                </Container>
            </Box>
        </Box>
    );
};

export default ForgotPasswordPage;