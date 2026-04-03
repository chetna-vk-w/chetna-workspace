import WebSocket, { WebSocketServer } from 'ws';

interface StreamClient {
  ws: WebSocket;
  shellIds: Set<string>;
}

export class StreamManager {
  private wss: WebSocketServer | null = null;
  private clients: Map<number, StreamClient> = new Map();
  private port: number;
  private enabled: boolean;
  private clientIdCounter = 0;
  private inputCallback: ((shellId: string, input: string) => void) | null = null;
  private activeShells: Set<string> = new Set();

  constructor(port: number = 8765, enabled: boolean = true) {
    this.port = port;
    this.enabled = enabled;
  }

  registerShell(shellId: string): void {
    console.error('[StreamManager] Registering shell:', shellId);
    this.activeShells.add(shellId);
    this.broadcastShellList();
  }

  unregisterShell(shellId: string): void {
    console.error('[StreamManager] Unregistering shell:', shellId);
    this.activeShells.delete(shellId);
    this.broadcastShellList();
  }

  private broadcastShellList(): void {
    console.error('[StreamManager] Broadcasting shell list:', Array.from(this.activeShells));
    if (!this.wss) {
      console.error('[StreamManager] No WebSocket server running!');
      return;
    }
    const shellIds = Array.from(this.activeShells);
    const msg = JSON.stringify({ type: 'shell_list', shells: shellIds });
    this.clients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(msg);
      }
    });
  }

  start(): void {
    if (!this.enabled) {
      console.error('[StreamManager] Disabled');
      return;
    }

    try {
      this.wss = new WebSocketServer({ port: this.port });

      this.wss.on('listening', () => {
        console.error(`[StreamManager] WebSocket server started on ws://localhost:${this.port}`);
      });

      this.wss.on('connection', (ws: WebSocket) => {
        const clientId = ++this.clientIdCounter;
        this.clients.set(clientId, { ws, shellIds: new Set() });

        console.error(`[StreamManager] Client ${clientId} connected`);

        ws.on('message', (data: Buffer) => {
          try {
            const message = JSON.parse(data.toString());
            console.error('[StreamManager] Received:', message);

            if (message.list_shells) {
              console.error('[StreamManager] list_shells request, active shells:', Array.from(this.activeShells));
              const shellIds = Array.from(this.activeShells);
              ws.send(JSON.stringify({ type: 'shell_list', shells: shellIds }));
            }

            if (message.subscribe) {
              const client = this.clients.get(clientId);
              if (client) {
                client.shellIds.add(message.subscribe);
                ws.send(JSON.stringify({ type: 'subscribed', shellId: message.subscribe }));
              }
            }

            if (message.unsubscribe) {
              const client = this.clients.get(clientId);
              if (client) {
                client.shellIds.delete(message.unsubscribe);
                ws.send(JSON.stringify({ type: 'unsubscribed', shellId: message.unsubscribe }));
              }
            }

            // Handle list shells request
            if (message.list_shells) {
              const shellIds = Array.from(this.activeShells);
              ws.send(JSON.stringify({ type: 'shell_list', shells: shellIds }));
            }

            // Handle input sending
            if (message.send && message.input !== undefined) {
              if (this.inputCallback) {
                this.inputCallback(message.send, message.input);
                ws.send(JSON.stringify({ type: 'sent', shellId: message.send }));
              }
            }

            if (message.ping) {
              ws.send(JSON.stringify({ type: 'pong' }));
            }
          } catch (e) {
            console.error('[StreamManager] Invalid message:', data.toString());
          }
        });

        ws.on('close', () => {
          this.clients.delete(clientId);
          console.error(`[StreamManager] Client ${clientId} disconnected`);
        });

        ws.on('error', (err) => {
          console.error(`[StreamManager] Client ${clientId} error:`, err.message);
          this.clients.delete(clientId);
        });
      });

      this.wss.on('error', (err) => {
        console.error('[StreamManager] Server error:', err.message);
      });
    } catch (err: any) {
      console.error('[StreamManager] Failed to start:', err.message);
    }
  }

  setInputCallback(callback: (shellId: string, input: string) => void): void {
    this.inputCallback = callback;
  }

  stop(): void {
    if (this.wss) {
      this.clients.forEach((client) => {
        client.ws.close();
      });
      this.clients.clear();
      this.wss.close();
      this.wss = null;
      console.error('[StreamManager] Server stopped');
    }
  }

  broadcast(shellId: string, data: string): void {
    if (!this.enabled || !this.wss) return;

    const message = JSON.stringify({
      type: 'output',
      shellId,
      data,
      timestamp: Date.now(),
    });

    this.clients.forEach((client) => {
      if (client.shellIds.has(shellId) && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    });
  }

  broadcastEvent(shellId: string, event: string, data?: any): void {
    if (!this.enabled || !this.wss) return;

    const message = JSON.stringify({
      type: 'event',
      shellId,
      event,
      data,
      timestamp: Date.now(),
    });

    this.clients.forEach((client) => {
      if (client.shellIds.has(shellId) && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    });
  }

  getUrl(): string {
    return `ws://localhost:${this.port}`;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getPort(): number {
    return this.port;
  }
}

// Simple event emitter for shell events
class EventEmitter {}
