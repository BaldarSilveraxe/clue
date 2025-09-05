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

```mermaid
sequenceDiagram
  participant User
  participant Frontend as Frontend (Vite app)
  participant Yjs as Yjs/HocuspocusProvider
  participant WS as Hocuspocus WS Server

  User->>Frontend: Load app from Vercel (static)
  Frontend->>Yjs: init Provider (uses VITE_WS_URL)
  Yjs->>WS: WebSocket connect (optional token/origin checks)
  WS-->>Yjs: ack + sync awareness
  Yjs-->>Frontend: shared doc updates (Y.Doc)
  loop Editing/Interaction
    Frontend->>Yjs: local changes (CRDT ops)
    Yjs->>WS: broadcast ops
    WS-->>Yjs: remote ops from others
    Yjs-->>Frontend: apply updates to UI state
  end
