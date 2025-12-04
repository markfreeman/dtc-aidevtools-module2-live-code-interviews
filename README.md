# Live Coding Interview Platform

A real-time collaborative coding platform designed for technical interviews. Interviewers can create sessions and share links with candidates, allowing both parties to edit code simultaneously with instant synchronization.

## Features

- **Real-time Collaboration**: Code changes sync instantly across all connected users via WebSockets
- **Shareable Sessions**: Create a session and share the link with candidates
- **Monaco Editor**: Full-featured code editor (the same editor that powers VS Code) with syntax highlighting
- **In-Browser Code Execution**: Run Python and JavaScript code safely using WebAssembly
- **User Presence**: See who's connected to the session
- **Language Support**: Switch between JavaScript and Python with proper syntax highlighting

## Tech Stack

### Backend
| Library | Purpose |
|---------|---------|
| [Express](https://expressjs.com/) | HTTP server framework |
| [Socket.IO](https://socket.io/) | Real-time bidirectional WebSocket communication |
| [nanoid](https://github.com/ai/nanoid) | Unique session ID generation |
| [TypeScript](https://www.typescriptlang.org/) | Type-safe JavaScript |
| [tsx](https://github.com/privatenumber/tsx) | TypeScript execution for development |

### Frontend
| Library | Purpose |
|---------|---------|
| [React](https://react.dev/) | UI framework |
| [Vite](https://vitejs.dev/) | Build tool and dev server |
| [Monaco Editor](https://microsoft.github.io/monaco-editor/) | Code editor component (via @monaco-editor/react) |
| [Socket.IO Client](https://socket.io/docs/v4/client-api/) | WebSocket client for real-time sync |
| [React Router](https://reactrouter.com/) | Client-side routing |
| [Pyodide](https://pyodide.org/) | Python runtime compiled to WebAssembly |
| [QuickJS](https://github.com/aspect-build/aspect-build-plugins) | JavaScript runtime in WebAssembly (via quickjs-emscripten) |

## Project Structure

```
├── backend/
│   ├── src/
│   │   ├── index.ts              # Express + Socket.IO server entry
│   │   ├── sessions/
│   │   │   ├── sessionStore.ts   # In-memory session management
│   │   │   └── sessionHandlers.ts # Socket event handlers
│   │   └── types/
│   │       └── index.ts          # Shared TypeScript types
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx               # Main app with routing
│   │   ├── components/
│   │   │   ├── Editor/           # Monaco editor wrapper
│   │   │   ├── Session/          # Create/Join session forms
│   │   │   └── Output/           # Code execution output panel
│   │   ├── hooks/
│   │   │   ├── useSocket.ts      # Socket.IO React hook
│   │   │   └── useCodeExecution.ts # WASM execution hook
│   │   ├── services/
│   │   │   ├── socket.ts         # Socket.IO client setup
│   │   │   └── wasmExecutor.ts   # Pyodide/QuickJS execution
│   │   └── types/
│   │       └── index.ts
│   ├── package.json
│   └── vite.config.ts
│
└── package.json                  # Monorepo root with npm workspaces
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
# Install all dependencies (backend + frontend)
npm install
```

### Running the Application

**Start both servers (recommended):**
```bash
npm run dev
```

**Or start individually:**
```bash
# Backend only (runs on http://localhost:3001)
npm run dev:backend

# Frontend only (runs on http://localhost:5173)
npm run dev -w frontend
```

### Usage

1. Open http://localhost:5173 in your browser
2. Enter your name and click **"Create Session"**
3. Click **"Copy Link"** to copy the session URL
4. Share the link with your interview candidate
5. Both users can now edit code in real-time
6. Select a language (JavaScript or Python) from the dropdown
7. Click **"Run"** to execute the code in the browser

## Architecture

```
┌─────────────────┐     WebSocket      ┌─────────────────┐
│   React App     │◄──────────────────►│   Node.js       │
│                 │                    │   + Socket.IO   │
│  Monaco Editor  │                    │                 │
│  WASM Runtime   │                    │  Session Store  │
│  (Pyodide/QJS)  │                    │  (in-memory)    │
└─────────────────┘                    └─────────────────┘
```

- **Session Creation**: Interviewer creates a session, gets a unique ID
- **Session Joining**: Candidate joins via shared link
- **Code Sync**: All code changes broadcast to session participants via Socket.IO rooms
- **Code Execution**: Runs entirely in the browser using WebAssembly (no server execution)

## Socket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `session:create` | Client → Server | Create a new session |
| `session:join` | Client → Server | Join an existing session |
| `session:joined` | Server → Client | Session state after joining |
| `code:change` | Bidirectional | Sync code changes |
| `language:change` | Bidirectional | Sync language selection |
| `user:joined` | Server → Clients | New participant notification |
| `user:left` | Server → Clients | Participant left notification |

## Notes

- Sessions are stored in-memory and will be lost on server restart
- Code execution happens entirely in the browser via WebAssembly
- Python runtime (Pyodide) takes a few seconds to load initially
- JavaScript runtime (QuickJS) loads almost instantly
