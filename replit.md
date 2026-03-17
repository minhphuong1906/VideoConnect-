# ConnectNow - Video Chat App

## Overview
A real-time video chat web application that connects strangers via WebRTC peer-to-peer video calls. Features include user authentication, live online counter, random matchmaking, and full video/audio controls.

## Architecture

### Stack
- **Frontend**: React + TypeScript + TailwindCSS + shadcn/ui + Wouter (routing)
- **Backend**: Express.js + WebSocket (ws) for signaling
- **Video**: WebRTC peer-to-peer (STUN servers from Google)
- **Auth**: Session-based with express-session + memorystore
- **State**: TanStack Query + Context API

### Key Files
- `server/routes.ts` - HTTP auth routes + WebSocket signaling server
- `server/storage.ts` - In-memory user storage
- `shared/schema.ts` - Drizzle schema + Zod types
- `client/src/App.tsx` - Root with providers (Auth, Theme, WebSocket, Query)
- `client/src/hooks/use-auth.tsx` - Auth context (login/register/logout)
- `client/src/hooks/use-theme.tsx` - Dark/light theme toggle
- `client/src/contexts/websocket-context.tsx` - WebSocket connection + event bus
- `client/src/pages/auth.tsx` - Login & register page
- `client/src/pages/home.tsx` - Dashboard with online count
- `client/src/pages/video-call.tsx` - WebRTC video call UI

### WebSocket Protocol
Client → Server:
- `authenticate` { userId } - Associate WS with user
- `find-match` - Add to matchmaking queue
- `cancel-match` - Remove from queue
- `offer` { offer, roomId } - WebRTC offer (initiator → receiver via server)
- `answer` { answer, roomId } - WebRTC answer
- `ice-candidate` { candidate, roomId } - ICE candidate relay
- `end-call` { roomId } - Notify partner call ended

Server → Client:
- `online-count` { count } - Broadcast to all
- `matched` { roomId, role } - Role is "initiator" or "receiver"
- `offer`, `answer`, `ice-candidate` - Relayed signals
- `peer-disconnected` - Partner left

## Running
- `npm run dev` - Starts Express + Vite dev server on port 5000

## Features
- User registration and login (username + hashed password)
- Real-time online user counter
- Random video chat matchmaking
- WebRTC peer-to-peer video + audio
- Mic and camera toggle controls
- Skip to next person
- Dark/light mode toggle
- Fully responsive (mobile + desktop)
- Reconnection on WebSocket drop
