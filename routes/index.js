const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data'); // Ensure this is included for constructing FormData
const router = express.Router();

// Multer setup to handle multipart/form-data
const upload = multer();

// Route to handle transcription
router.post('/transcribe-audio', upload.single('file'), async (req, res) => {
    try {
        const audioBlob = req.file; // multer handles the uploaded file as req.file

        if (!audioBlob) {
            return res.status(400).json({ error: 'No file uploaded.' });
        }

        // Create FormData to send to OpenAI
        const formData = new FormData();
        formData.append('file', audioBlob.buffer, {
            filename: 'recording.mp3',
            contentType: audioBlob.mimetype,
        });
        formData.append('model', 'whisper-1');

        // Send transcription request
        const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', formData, {
            headers: {
                Authorization: `Bearer ${process.env.CHAT_COMPLETION_KEY}`,
                ...formData.getHeaders(),
            },
        });

        res.json({ transcription: response.data.text });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Transcription failed.' });
    }
});

// Route to handle chat completion remains unchanged
router.post('/interpret-text', async (req, res) => {
    try {
        const { transcription } = req.body;

        const chatPrompt = [
            {
                role: 'system',
                content: 'You are an expert in understanding pet behaviors and vocalizations.',
            },
            {
                role: 'user',
                content: `Based on this audio transcription: "${transcription}", what does the pet want?`,
            },
        ];

        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-4',
                messages: chatPrompt,
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.CHAT_COMPLETION_KEY}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Interpretation failed.' });
    }
});

module.exports = router;
