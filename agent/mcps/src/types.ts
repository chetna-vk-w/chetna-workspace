/**
 * SSH Connection Configuration
 */
export interface SSHConnectionConfig {
  id?: string;
  name: string;
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  privateKeyPath?: string;  // Path to private key file
  passphrase?: string;
}

/**
 * SSH Session Information
 */
export interface SSHSession {
  sessionId: string;
  connectionId: string;
  connectedAt: number;
  lastActivity: number;
  isActive: boolean;
}

/**
 * Command Execution Request
 */
export interface CommandRequest {
  sessionId: string;
  command: string;
}

/**
 * Command Execution Result
 */
export interface CommandResult {
  commandId: string;
  sessionId: string;
  command: string;
  status: 'running' | 'completed' | 'failed';
  exitCode?: number;
  startedAt: number;
  completedAt?: number;
}

/**
 * Log Entry
 */
export interface LogEntry {
  id: number;
  commandId: string;
  sessionId: string;
  lineNumber: number;
  content: string;
  stream: 'stdout' | 'stderr';
  timestamp: number;
}

/**
 * Log Filter Options
 */
export interface LogFilter {
  commandId?: string;
  sessionId?: string;
  grep?: string;
  head?: number;
  tail?: number;
  fromLine?: number;
  toLine?: number;
  stream?: 'stdout' | 'stderr' | 'both';
}

/**
 * IPC Message Types
 */
export type IPCMessageType =
  | 'connect'
  | 'disconnect'
  | 'execute'
  | 'get_logs'
  | 'list_sessions'
  | 'list_connections'
  | 'test_connection'
  | 'save_connection'
  | 'get_command_status';

/**
 * IPC Request
 */
export interface IPCRequest {
  id: string;
  type: IPCMessageType;
  data: any;
}

/**
 * IPC Response
 */
export interface IPCResponse {
  id: string;
  success: boolean;
  data?: any;
  error?: string;
}
