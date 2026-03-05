<div align="center">

</div>

# Veo 3 Video Generation Lab

Advanced AI-powered video generation platform using Google's Gemini API and Veo-3 model. Generate cinematic videos from text prompts, images, or scene descriptions with precise control over resolution, duration, and animation dynamics.

View your app in AI 

---

## 🎯 Features

- **Text-to-Video**: Generate videos from creative prompts
- **Image Animation**: Animate static images with cinematic motion
- **Customizable Output**: Control resolution (720p-4320p), aspect ratio (16:9 / 9:16), duration, and FPS
- **Motion Control**: Apply specific camera movements (pan, zoom, tracking, etc.)
- **Real-time Polling**: Monitor generation progress with live status updates
- **REST API**: Full backend API for programmatic access

---

## 🏗️ Architecture & Workflow Design

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    USER BROWSER                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         React Frontend (Vite Dev Server)            │   │
│  │  Port 3000                                          │   │
│  │  - Video Generation UI                              │   │
│  │  - Image Upload & Preview                           │   │
│  │  - Progress Monitoring                              │   │
│  │  - Video Player & Download                          │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────┬────────────────────────────────────────────┘
                 │ HTTP/REST
                 ▼
┌─────────────────────────────────────────────────────────────┐
│              EXPRESS BACKEND API                            │
│  Port 5000                                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  POST /api/generate-video                           │   │
│  │  - Receive video config + base64 images             │   │
│  │  - Call Gemini API (Video Generation)               │   │
│  │  - Return operation ID for polling                  │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  POST /api/get-operation                            │   │
│  │  - Poll Gemini for generation status                │   │
│  │  - Return completed video URI when done             │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  GET /api/download-video                            │   │
│  │  - Proxy download to avoid CORS issues              │   │
│  │  - Stream video blob to frontend                    │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────┬────────────────────────────────────────────┘
                 │ HTTPS/REST
                 ▼
┌─────────────────────────────────────────────────────────────┐
│              GOOGLE GEMINI API                              │
│  - models.generateVideos()                                 │
│  - operations.getVideosOperation()                         │
│  - Video storage & download URLs                           │
└─────────────────────────────────────────────────────────────┘
```

### Workflow Algorithm

#### **Phase 1: Input Configuration**
1. User uploads image (optional) or enters scene description
2. Frontend builds `videoConfig` object:
   ```json
   {
     "model": "veo-3.1-fast-generate-preview",
     "prompt": "Combined text prompt with motion descriptors",
     "config": {
       "numberOfVideos": 1,
       "resolution": "720p|1080p|1440p|2160p|4320p",
       "aspectRatio": "16:9|9:16",
       "durationSeconds": 5,
       "fps": 24
     },
     "image": {
       "imageBytes": "<base64_data>",
       "mimeType": "image/png|image/jpeg"
     }
   }
   ```

#### **Phase 2: Request Generation**
1. Frontend POST to `/api/generate-video`
2. Backend receives config, validates request
3. Backend calls `@google/genai` SDK:
   ```typescript
   const operation = await ai.models.generateVideos(videoConfig);
   ```
4. Gemini returns **operation object** with:
   - `operation.name`: Unique operation ID
   - `operation.done`: Boolean (false initially)
   - Request timestamp

#### **Phase 3: Long-Poll Monitoring**
1. Frontend polls `/api/get-operation` every 5 seconds
2. Backend calls:
   ```typescript
   const result = await ai.operations.getVideosOperation({ operation });
   ```
3. Gemini processes video asynchronously (1-3 minutes typical)
4. Continue until `operation.done === true`

#### **Phase 4: Result Retrieval**
1. When complete, operation contains:
   ```json
   {
     "response": {
       "generatedVideos": [
         {
           "video": {
             "uri": "https://storage.googleapis.com/..."
           }
         }
       ]
     }
   }
   ```
2. Extract video URI from response

#### **Phase 5: Download & Display**
1. Frontend requests `/api/download-video?url=<encoded_uri>`
2. Backend proxies download (avoids CORS issues, hides API key)
3. Convert streamed blob to Object URL
4. Display in HTML5 video player

---

## 🔄 Error Handling & Recovery

### Error Scenarios

| Scenario | Handling |
|----------|----------|
| Missing API Key | Show warning banner with key selector |
| Invalid Config | Return 400 with error message |
| Network Timeout | Retry polling with backoff |
| Generation Failure | Return operation error via polling |
| Download Error | Proxy fallback with detailed error |
| JSON Parse Error | Fall back to .text() response |

### Robustness Features

- ✅ Response body read validation (prevents double-reading)
- ✅ Graceful error messages with actionable feedback
- ✅ Server-side proxy for CORS and security
- ✅ Configurable polling interval & retry logic
- ✅ Environment variable validation on startup

---

## 🚀 Run Locally

**Prerequisites:** 
- Node.js v18+
- Valid Gemini API Key

### Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   Create `.env` file:
   ```env
   PORT=5000
   GEMINI_API_KEY=your_gemini_api_key_here
   NODE_ENV=development
   ```

3. **Start both servers:**
   ```bash
   # Terminal 1 - Backend (port 5000)
   node "./node_modules/tsx/dist/cli.mjs" watch server.ts

   # Terminal 2 - Frontend (port 3000)
   node "./node_modules/vite/bin/vite.js" --port 3000 --host 0.0.0.0
   ```

4. **Access the app:**
   - Open http://localhost:3000/

### NPM Scripts

- `npm run dev` - Start Vite dev server (port 3000)
- `npm run server` - Start Express server with watch mode
- `npm run dev:all` - Run both servers concurrently (requires `concurrently` compatibility)
- `npm run build` - Build production bundle
- `npm run lint` - Run TypeScript type checking

---

## 📁 Project Structure

```
├── server.ts              # Express backend with Gemini API integration
├── src/
│   ├── App.tsx           # Main React component with video generation UI
│   ├── main.tsx          # React entry point
│   └── index.css         # Tailwind CSS styling
├── vite.config.ts        # Vite configuration with React plugin
├── tsconfig.json         # TypeScript configuration
├── package.json          # Dependencies & scripts
├── .env                  # Environment variables (not committed)
├── index.html            # HTML template
├── Dockerfile            # Docker configuration
└── ts-base/              # TypeScript utility base project
```

---

## 🔐 Security Considerations

- **API Key Protection**: Never commit `.env` file
- **CORS Handling**: Backend proxy prevents exposing API key to frontend
- **Input Validation**: Server validates all request parameters
- **Error Messages**: Avoid revealing sensitive information in errors
- **Rate Limiting**: Monitor Gemini API quota usage

---

## 📊 Performance & Optimization

| Aspect | Details |
|--------|---------|
| **Frontend Build** | Vite for instant builds & HMR |
| **Backend Framework** | Express.js lightweight & fast |
| **API Polling** | 5-second intervals, configurable |
| **Video Size** | Depends on resolution (720p: ~10-50MB) |
| **Max Upload** | 50MB limit for images |
| **Generation Time** | 1-3 minutes avg (Gemini processing) |

---

## 🔗 Dependencies

### Frontend
- React 19
- Vite 6
- Tailwind CSS 4
- Lucide React (icons)
- Motion (animations)
- Google Gemini SDK

### Backend
- Express 4
- TypeScript 5
- tsx (TypeScript executor)
- dotenv (environment config)
- Google Gemini SDK

---

## 📝 License

MIT License - Feel free to use and modify

---

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📞 Support

- **Issues**: GitHub Issues tracker
- **Docs**: Google Gemini API documentation
- **Veo Model**: https://deepmind.google/technologies/veo/
