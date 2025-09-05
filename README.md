```mermaid
flowchart TD
  subgraph Client["Frontend (Vite)"]
    A[index.html]
    B[src/]
    A --> B
    B --> C[realtime.js Yjs/HocuspocusProvider]
  end

  subgraph Host1["Vercel (static hosting)"]
    Client
    V[vercel.json redirects/rewrites]
  end

  subgraph Server["WebSocket Sync Server (Node)"]
    S[server/ - Hocuspocus]
    E[.env / .env.production]
    S <-- reads --> E
  end

  U[User Browser] -->|HTTP| Host1
  Client -->|WS: VITE_WS_URL| Server
