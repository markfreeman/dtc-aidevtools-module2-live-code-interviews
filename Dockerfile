# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN npm install

# Copy source code
COPY backend ./backend
COPY frontend ./frontend

# Build frontend
RUN npm run build -w frontend

# Build backend
RUN npm run build -w backend

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files for production install
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install production dependencies only and set module type
RUN npm install -w backend --omit=dev && \
    npm pkg set type=module

# Copy built backend
COPY --from=builder /app/backend/dist ./backend/dist

# Copy built frontend (static files)
COPY --from=builder /app/frontend/dist ./frontend/dist

# Copy a simple server script to serve both
COPY <<EOF ./server.js
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const httpServer = createServer(app);

// Serve static frontend files
app.use(express.static(join(__dirname, 'frontend/dist')));

// Import and setup backend
const { setupSessionHandlers } = await import('./backend/dist/sessions/sessionHandlers.js');

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(\`Client connected: \${socket.id}\`);
  setupSessionHandlers(io, socket);
});

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'frontend/dist/index.html'));
});

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(\`Server running on http://0.0.0.0:\${PORT}\`);
});
EOF

EXPOSE 3000

CMD ["node", "server.js"]
