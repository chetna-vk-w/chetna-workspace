const { Client } = require('ssh2');
const crypto = require('crypto');
const { EventEmitter } = require('events');
const fs = require('fs');
import type { SSHConnectionConfig, SSHSession, CommandRequest, CommandResult } from './types';
import { Storage } from './storage';
import {
  SSHConnectionError,
  SSHAuthenticationError,
  SessionNotFoundError,
  validateSSHConfig,
  validateCommand,
  retryOperation,
} from './error-handler';

/**
 * SSH Manager for handling connections and command execution
 */
export class SSHManager extends EventEmitter {
  private sessions: Map<string, any>;
  private storage: Storage;
  private maxConcurrentSessions: number = 50;
  private maxCommandsPerSession: number = 100;
  private commandCounts: Map<string, number> = new Map();

  constructor(storage: Storage) {
    super();
    this.sessions = new Map();
    this.storage = storage;

    // Cleanup inactive sessions periodically
    setInterval(() => this.cleanupInactiveSessions(), 300000); // Every 5 minutes
  }

  /**
   * Cleanup inactive sessions
   */
  private cleanupInactiveSessions(): void {
    const now = Date.now();
    const inactivityThreshold = 3600000; // 1 hour

    this.sessions.forEach((sessionData, sessionId) => {
      const inactiveTime = now - sessionData.session.lastActivity;
      if (inactiveTime > inactivityThreshold) {
        console.log(`[SSHManager] Cleaning up inactive session: ${sessionId}`);
        sessionData.client.end();
        this.sessions.delete(sessionId);
        this.commandCounts.delete(sessionId);
      }
    });
  }

  /**
   * Prepare SSH connection config with authentication
   */
  private prepareConnectConfig(config: SSHConnectionConfig): any {
    // Validate configuration
    const validation = validateSSHConfig(config);
    if (!validation.valid) {
      throw new Error(`Invalid SSH configuration: ${validation.errors.join(', ')}`);
    }

    const connectConfig: any = {
      host: config.host,
      port: config.port || 22,
      username: config.username,
      keepaliveInterval: 10000,
      keepaliveCountMax: 3,
      readyTimeout: 15000, // 15 seconds
    };

    // Password authentication
    if (config.password) {
      connectConfig.password = config.password;
    }

    // Private key authentication (inline key)
    if (config.privateKey) {
      connectConfig.privateKey = config.privateKey;
      if (config.passphrase) {
        connectConfig.passphrase = config.passphrase;
      }
    }
    // Private key authentication (from file)
    else if (config.privateKeyPath) {
      try {
        // Check if file exists
        if (!fs.existsSync(config.privateKeyPath)) {
          throw new Error(`Private key file not found: ${config.privateKeyPath}`);
        }

        // Check file permissions (should not be world-readable)
        const stats = fs.statSync(config.privateKeyPath);
        const mode = stats.mode & parseInt('777', 8);
        if (mode & parseInt('004', 8)) {
          console.warn(`[SSHManager] Warning: Private key file is world-readable: ${config.privateKeyPath}`);
        }

        const keyContent = fs.readFileSync(config.privateKeyPath, 'utf8');

        // Validate key format
        if (!keyContent.includes('BEGIN') || !keyContent.includes('PRIVATE KEY')) {
          throw new Error('Invalid private key format');
        }

        connectConfig.privateKey = keyContent;
        if (config.passphrase) {
          connectConfig.passphrase = config.passphrase;
        }
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          throw new Error(`Private key file not found: ${config.privateKeyPath}`);
        } else if (error.code === 'EACCES') {
          throw new Error(`Permission denied reading private key: ${config.privateKeyPath}`);
        } else {
          throw new Error(`Failed to read private key: ${error.message}`);
        }
      }
    }

    return connectConfig;
  }

  /**
   * Test SSH connection without saving
   */
  async testConnection(config: SSHConnectionConfig): Promise<{ success: boolean; error?: string }> {
    // Validate config first
    if (!config.host || !config.host.trim()) {
      return { success: false, error: 'Host is required' };
    }
    if (!config.username || !config.username.trim()) {
      return { success: false, error: 'Username is required' };
    }
    if (!config.password && !config.privateKey && !config.privateKeyPath) {
      return { success: false, error: 'Authentication required - provide password, privateKey, or privateKeyPath' };
    }

    return new Promise((resolve) => {
      const client = new Client();

      const timeout = setTimeout(() => {
        client.end();
        resolve({ success: false, error: 'Connection timeout (15s) - host may be unreachable, firewall blocking, or server not responding' });
      }, 15000);

      client.on('ready', () => {
        clearTimeout(timeout);
        client.end();
        resolve({ success: true });
      });

      client.on('error', (err: Error) => {
        clearTimeout(timeout);
        
        let errorMessage = err.message;
        
        // Connection errors
        if (errorMessage.includes('ECONNREFUSED')) {
          errorMessage = `Connection refused on port ${config.port || 22} - is SSH running? Check firewall or try different port.`;
        } else if (errorMessage.includes('ETIMEDOUT') || errorMessage.includes('Timed out')) {
          errorMessage = 'Connection timed out - host unreachable, firewall blocking, or network issue';
        } else if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('getaddrinfo') || errorMessage.includes('DNS')) {
          errorMessage = `DNS error - host "${config.host}" not found. Check hostname/IP.`;
        } else if (errorMessage.includes('EHOSTUNREACH') || errorMessage.includes('No route')) {
          errorMessage = `No route to host "${config.host}" - network/firewall issue`;
        } else if (errorMessage.includes('ECONNRESET')) {
          errorMessage = 'Connection reset by peer - server may be down or rejecting connections';
        
        // Authentication errors
        } else if (errorMessage.includes('Permission denied') || errorMessage.includes('denied')) {
          if (config.privateKey || config.privateKeyPath) {
            errorMessage = 'Permission denied (publickey) - key invalid, wrong, or not authorized. Add key to server\'s authorized_keys.';
          } else if (config.password) {
            errorMessage = 'Permission denied (password) - wrong password or server only accepts key auth';
          } else {
            errorMessage = 'Permission denied - provide password or privateKey/privateKeyPath';
          }
        } else if (errorMessage.includes('Authentications that can continue') || errorMessage.includes('authentication methods failed')) {
          errorMessage = 'All auth methods failed. Server likely requires key auth - use privateKey or privateKeyPath.';
        } else if (errorMessage.includes('private key')) {
          errorMessage = `Private key error: ${err.message}. Check key format (OpenSSH) and passphrase if encrypted.`;
        } else if (errorMessage.includes('Passphrase') || errorMessage.includes('passphrase')) {
          errorMessage = 'Key is encrypted - provide passphrase or use unencrypted key';
        } else if (errorMessage.includes('key_load_public') || errorMessage.includes('no such identity')) {
          errorMessage = `Key file not found or not accessible: ${config.privateKeyPath}`;
        } else if (errorMessage.includes('SELinux') || errorMessage.includes('security policy')) {
          errorMessage = 'SELinux blocked connection - check security policies';
        } else if (errorMessage.includes('MAX_STARTUPS') || errorMessage.includes('too many')) {
          errorMessage = 'Server has too many connections - wait and retry';
        } else if (errorMessage.includes('Host key verification') || errorMessage.includes('HostKey')) {
          errorMessage = 'Host key changed - possible security issue or server reinstalled';
        }
        
        resolve({ success: false, error: errorMessage });
      });

      try {
        const connectConfig = this.prepareConnectConfig(config);
        client.connect(connectConfig);
      } catch (error: any) {
        clearTimeout(timeout);
        
        let errorMessage = error.message;
        
        // Validation errors from prepareConnectConfig
        if (errorMessage.includes('Invalid SSH configuration')) {
          resolve({ success: false, error: errorMessage });
          return;
        }
        if (errorMessage.includes('Private key file not found')) {
          errorMessage = `Key file not found: ${config.privateKeyPath}. Check path is correct.`;
        } else if (errorMessage.includes('world-readable')) {
          errorMessage = `Key file has bad permissions (${config.privateKeyPath}). Run: chmod 600 ${config.privateKeyPath}`;
        }
        
        resolve({ success: false, error: errorMessage });
      }
    });
  }

  /**
   * Connect to SSH server and create session
   * @param connectionIdOrConfig - Either a connectionId string or a full SSHConnectionConfig object
   */
  async connect(connectionIdOrConfig: string | SSHConnectionConfig): Promise<{ sessionId: string; error?: string }> {
    // Check max concurrent sessions
    if (this.sessions.size >= this.maxConcurrentSessions) {
      return {
        sessionId: '',
        error: `Maximum concurrent sessions reached (${this.maxConcurrentSessions}). Please disconnect some sessions first.`,
      };
    }

    let config: SSHConnectionConfig | null;
    let connectionId: string;

    if (typeof connectionIdOrConfig === 'string') {
      connectionId = connectionIdOrConfig;
      config = this.storage.getConnection(connectionId);
      if (!config) {
        return { sessionId: '', error: 'Connection not found' };
      }
    } else {
      config = connectionIdOrConfig;
      connectionId = config.id || `temp-${config.host}`;
    }

    return new Promise((resolve) => {
      const client = new Client();
      const sessionId = crypto.randomUUID();

      const timeout = setTimeout(() => {
        client.end();
        resolve({ sessionId: '', error: 'Connection timeout' });
      }, 10000);

      client.on('ready', () => {
        clearTimeout(timeout);

        const session: SSHSession = {
          sessionId,
          connectionId,
          connectedAt: Date.now(),
          lastActivity: Date.now(),
          isActive: true,
        };

        this.sessions.set(sessionId, {
          client,
          session,
          config,
        });

        console.log(`[SSHManager] Session ${sessionId} connected to ${config.host}`);
        resolve({ sessionId });
      });

      client.on('error', (err: Error) => {
        clearTimeout(timeout);
        console.error(`[SSHManager] Connection error: ${err.message}`);
        resolve({ sessionId: '', error: err.message });
      });

      client.on('close', () => {
        console.log(`[SSHManager] Session ${sessionId} closed`);
        const sessionData = this.sessions.get(sessionId);
        if (sessionData) {
          sessionData.session.isActive = false;
          this.sessions.delete(sessionId);
        }
      });

      try {
        const connectConfig = this.prepareConnectConfig(config);
        connectConfig.readyTimeout = 10000;
        client.connect(connectConfig);
      } catch (error: any) {
        clearTimeout(timeout);
        resolve({ sessionId: '', error: error.message });
      }
    });
  }

  /**
   * Execute command on SSH session (non-blocking)
   */
  async executeCommand(request: CommandRequest): Promise<CommandResult> {
    // Validate command
    const commandValidation = validateCommand(request.command);
    if (!commandValidation.safe) {
      throw new Error(commandValidation.reason || 'Invalid command');
    }

    const sessionData = this.sessions.get(request.sessionId);

    if (!sessionData) {
      throw new SessionNotFoundError(request.sessionId);
    }

    // Check if session is still active
    if (!sessionData.session.isActive) {
      throw new Error('Session is no longer active');
    }

    // Rate limit commands per session
    const commandCount = this.commandCounts.get(request.sessionId) || 0;
    if (commandCount >= this.maxCommandsPerSession) {
      throw new Error(`Maximum commands per session exceeded (${this.maxCommandsPerSession})`);
    }
    this.commandCounts.set(request.sessionId, commandCount + 1);

    const commandId = crypto.randomUUID();
    const client = sessionData.client;

    // Save command to database
    this.storage.saveCommand(commandId, request.sessionId, request.command);

    const result: CommandResult = {
      commandId,
      sessionId: request.sessionId,
      command: request.command,
      status: 'running',
      startedAt: Date.now(),
    };

    // Execute command asynchronously
    client.exec(request.command, (err: Error, stream: any) => {
      if (err) {
        console.error(`[SSHManager] Command execution error: ${err.message}`);
        this.storage.updateCommandStatus(commandId, 'failed', -1);
        this.storage.saveLog(commandId, request.sessionId, 1, err.message, 'stderr');
        return;
      }

      let stdoutLineNumber = 0;
      let stderrLineNumber = 0;
      let stdoutBuffer = '';
      let stderrBuffer = '';

      stream.on('data', (data: Buffer) => {
        stdoutBuffer += data.toString();
        const lines = stdoutBuffer.split('\n');
        stdoutBuffer = lines.pop() || '';

        lines.forEach((line: string) => {
          stdoutLineNumber++;
          this.storage.saveLog(commandId, request.sessionId, stdoutLineNumber, line, 'stdout');
        });
      });

      stream.stderr.on('data', (data: Buffer) => {
        stderrBuffer += data.toString();
        const lines = stderrBuffer.split('\n');
        stderrBuffer = lines.pop() || '';

        lines.forEach((line: string) => {
          stderrLineNumber++;
          this.storage.saveLog(commandId, request.sessionId, stderrLineNumber, line, 'stderr');
        });
      });

      stream.on('close', (code: number, signal: string) => {
        // Save remaining buffer content
        if (stdoutBuffer) {
          stdoutLineNumber++;
          this.storage.saveLog(commandId, request.sessionId, stdoutLineNumber, stdoutBuffer, 'stdout');
        }
        if (stderrBuffer) {
          stderrLineNumber++;
          this.storage.saveLog(commandId, request.sessionId, stderrLineNumber, stderrBuffer, 'stderr');
        }

        const status = code === 0 ? 'completed' : 'failed';
        this.storage.updateCommandStatus(commandId, status, code);
        console.log(`[SSHManager] Command ${commandId} finished with code ${code}`);
      });
    });

    sessionData.session.lastActivity = Date.now();

    return result;
  }

  /**
   * Disconnect session
   */
  disconnect(sessionId: string): boolean {
    const sessionData = this.sessions.get(sessionId);

    if (!sessionData) {
      return false;
    }

    sessionData.client.end();
    this.sessions.delete(sessionId);
    return true;
  }

  /**
   * List active sessions
   */
  listSessions(): SSHSession[] {
    const sessions: SSHSession[] = [];

    this.sessions.forEach((sessionData) => {
      sessions.push({
        ...sessionData.session,
        lastActivity: sessionData.session.lastActivity,
      });
    });

    return sessions;
  }

  /**
   * Get session info
   */
  getSession(sessionId: string): SSHSession | null {
    const sessionData = this.sessions.get(sessionId);
    return sessionData ? sessionData.session : null;
  }

  /**
   * Close all sessions
   */
  closeAll(): void {
    this.sessions.forEach((sessionData) => {
      sessionData.client.end();
    });
    this.sessions.clear();
  }
}
