import express from 'express';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));

// Initialize Gemini
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error('❌ GEMINI_API_KEY is not set in environment variables');
}
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// API Endpoint for Video Generation
app.post('/api/generate-video', async (req, res) => {
    if (!ai) {
        return res.status(500).json({ error: 'Gemini API not configured on server' });
    }

    try {
        const { videoConfig } = req.body;
        console.log('🎬 Starting video generation for prompt:', videoConfig.prompt);

        // Call the Gemini API
        const operation = await ai.models.generateVideos(videoConfig);
        res.json({ operation });
    } catch (error: any) {
        console.error('❌ Generation error:', error);
        res.status(500).json({ error: error.message || 'Failed to start video generation' });
    }
});

// Endpoint to check operation status
app.post('/api/get-operation', async (req, res) => {
    if (!ai) return res.status(500).json({ error: 'AI not configured' });

    try {
        const { operation } = req.body;
        // @ts-ignore
        const result = await ai.operations.getVideosOperation({ operation });
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Proxy for video download (to avoid CORS and expose key)
app.get('/api/download-video', async (req, res) => {
    const { url } = req.query;
    if (!url || typeof url !== 'string') return res.status(400).send('URL required');

    try {
        const response = await fetch(url, {
            headers: {
                'x-goog-api-key': apiKey || '',
            }
        });

        if (!response.ok) throw new Error(`Failed to fetch video: ${response.statusText}`);

        const contentType = response.headers.get('content-type');
        if (contentType) res.setHeader('Content-Type', contentType);

        response.body.pipe(res);
    } catch (error: any) {
        res.status(500).send(error.message);
    }
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
}

app.listen(port, () => {
    console.log(`🚀 God Mode API running at http://localhost:${port}`);
});
