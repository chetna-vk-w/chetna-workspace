const { Client } = require('ssh2');
const crypto = require('crypto');
const stripAnsi = require('strip-ansi');
import type { SSHConnectionConfig } from './types';
import { Storage } from './storage';
import { StreamManager } from './stream-manager';

/**
 * Prompt patterns for detection
 */
const PROMPT_PATTERNS = {
  // Sudo password prompts
  SUDO_PASSWORD: /\[sudo\] password for \w+:|Password:|password:/i,

  // Su password prompts
  SU_PASSWORD: /Password:/i,

  // Yes/No prompts
  YES_NO: /\(yes\/no\)|\(y\/n\)|Are you sure|Continue\?|Proceed\?|\[Y\/n\]|\[y\/N\]/i,

  // Permission denied
  PERMISSION_DENIED: /Permission denied|Access denied|Operation not permitted/i,

  // Authentication failures
  AUTH_FAILURE: /Authentication failure|Sorry, try again|incorrect password|su: Authentication failure/i,

  // Root disabled
  ROOT_DISABLED: /root login.*disabled|PermitRootLogin.*no|not allowed.*root/i,

  // Command not found
  COMMAND_NOT_FOUND: /command not found|not found|No such file or directory/i,

  // Timeout
  TIMEOUT: /timed out|Connection timed out|timeout/i,

  // Locked account
  ACCOUNT_LOCKED: /account.*locked|too many.*attempts|Account locked/i,

  // Password expiry
  PASSWORD_EXPIRED: /password.*expired|must change password|password has expired/i,

  // Shell prompt (to detect command completion)
  SHELL_PROMPT: /[$#>]\s*$/,

  // === NEW EDGE CASES ===

  // SSH Host key verification (first time connecting)
  HOST_KEY_VERIFY: /Are you sure you want to continue connecting|fingerprint is|The authenticity of host/i,

  // SSH Host key changed (MITM warning)
  HOST_KEY_CHANGED: /REMOTE HOST IDENTIFICATION HAS CHANGED|WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED|IT IS POSSIBLE THAT SOMEONE IS DOING SOMETHING NASTY|Host key verification failed/i,

  // SSH Key passphrase
  KEY_PASSPHRASE: /Enter passphrase for key|passphrase:/i,

  // Two-factor / MFA authentication
  TWO_FACTOR: /Verification code:|Enter OTP:|Google Authenticator|Two-factor|2FA|Enter.*code:|Duo.*authentication/i,

  // Connection errors
  CONNECTION_REFUSED: /Connection refused|connect: Connection refused/i,
  CONNECTION_RESET: /Connection reset by peer|Connection closed by|Broken pipe|Connection closed unexpectedly/i,
  NETWORK_UNREACHABLE: /Network is unreachable|No route to host|Name or service not known|Could not resolve hostname/i,

  // SSH specific errors
  SSH_AUTH_FAILURE: /Permission denied \(publickey|Too many authentication failures|no more authentication methods/i,
  SSH_BANNER: /^[A-Z][A-Za-z\s]+:\s|^WARNING:|^NOTICE:|^ALERT:/im,

  // Sudo specific edge cases
  SUDO_NOT_ALLOWED: /user is not allowed|is not in the sudoers file|may not run sudo|not permitted to run/i,
  SUDO_TTY_REQUIRED: /sorry, you must have a tty|no tty present|sudo requires a tty/i,
  SUDO_TIMESTAMP_EXPIRED: /sudo: timestamp too old|sudo: a password is required/i,

  // Session/Process termination
  SESSION_TERMINATED: /killed by signal|terminated|logout|Connection to .* closed|session closed/i,
  SHELL_EXIT: /^exit$|^logout$|exit\s*\d*$/im,

  // Resource limits
  DISK_FULL: /No space left on device|Disk quota exceeded|filesystem is full/i,
  MEMORY_ERROR: /Cannot allocate memory|Out of memory|killed.*memory/i,
  TOO_MANY_SESSIONS: /too many.*sessions|session limit|max.*sessions/i,

  // Interactive prompts
  MORE_PROMPT: /--More--|Press.*continue|Press ENTER|Hit.*key/i,
  PAGER_PROMPT: /:\s*$|END|lines \d+-\d+/,

  // Background job notifications
  JOB_NOTIFICATION: /\[\d+\][+-]?\s+(Stopped|Done|Running|Terminated|Killed)/,

  // File operation prompts
  OVERWRITE_PROMPT: /overwrite.*\?|replace.*\?|File exists/i,
  DELETE_CONFIRM: /remove.*\?|delete.*\?|rm:.*\?/i,

  // Package manager prompts
  PACKAGE_CONFIRM: /Do you want to continue|Proceed with installation|Install these packages/i,

  // Git prompts
  GIT_CREDENTIAL: /Username for|Password for .* https/i,
  GIT_CONFIRM: /Merge made by|Already up to date|Your branch is/i,
};

/**
 * Detected prompt types
 */
export type PromptType =
  | 'sudo_password'
  | 'su_password'
  | 'yes_no'
  | 'permission_denied'
  | 'auth_failure'
  | 'root_disabled'
  | 'command_not_found'
  | 'timeout'
  | 'account_locked'
  | 'password_expired'
  | 'shell_ready'
  // New edge case types
  | 'host_key_verify'
  | 'host_key_changed'
  | 'key_passphrase'
  | 'two_factor'
  | 'connection_refused'
  | 'connection_reset'
  | 'network_unreachable'
  | 'ssh_auth_failure'
  | 'sudo_not_allowed'
  | 'sudo_tty_required'
  | 'disk_full'
  | 'memory_error'
  | 'session_terminated'
  | 'more_prompt'
  | 'overwrite_prompt'
  | 'delete_confirm'
  | 'package_confirm'
  | 'git_credential'
  | 'none';

/**
 * Detected shell types
 */
export type ShellType = 'bash' | 'zsh' | 'sh' | 'fish' | 'dash' | 'ksh' | 'csh' | 'tcsh' | 'unknown';

/**
 * Interactive Shell Session
 * Provides PTY-like interactive terminal with stdin/stdout
 */
export interface InteractiveSession {
  sessionId: string;
  connectionId: string;
  shellId: string;
  client: any;
  stream: any;
  buffer: string;
  screenBuffer: string; // Only last ~24 lines (current screen)
  isActive: boolean;
  createdAt: number;
  lastActivity: number;
  sudoPassword?: string; // Store password for sudo auto-response
  autoRespondSudo: boolean; // Auto-respond to sudo password prompts
  autoRespondYesNo: 'yes' | 'no' | false; // Auto-respond to yes/no prompts
  autoRespondHostKey: boolean; // Auto-accept host key verification (first connect)
  autoRespondOverwrite: 'yes' | 'no' | false; // Auto-respond to overwrite prompts
  autoRespondPackage: 'yes' | 'no' | false; // Auto-respond to package manager prompts
  autoRespondMore: boolean; // Auto-press space/enter for --More-- prompts
  lastPromptHandled: number; // Prevent duplicate responses
  lastError?: string; // Store last detected error for retrieval
  // New fields
  shellType?: ShellType; // Detected shell type
  reconnectAttempts: number; // Number of reconnect attempts
  maxReconnectAttempts: number; // Max reconnect attempts (default: 3)
  autoReconnect: boolean; // Auto-reconnect on connection drop
  commandTimeout: number; // Default command timeout in ms (0 = no timeout)
  currentWorkingDir?: string; // Tracked CWD
  lastCommandStart?: number; // Timestamp of last command start
}

/**
 * File Edit Session
 * Tracks file editing state
 */
export interface FileEditSession {
  editId: string;
  sessionId: string;
  filePath: string;
  editor: 'nano' | 'vim' | 'vi';
  status: 'editing' | 'saved' | 'cancelled' | 'error';
  startedAt: number;
  completedAt?: number;
}

/**
 * Interactive Session Manager
 * Manages interactive shell sessions with stdin support
 */
export class InteractiveSessionManager {
  private sessions: Map<string, InteractiveSession>;
  private editSessions: Map<string, FileEditSession>;
  private storage: Storage;
  private streamManager: StreamManager;

  constructor(storage: Storage, streamManager?: StreamManager) {
    this.sessions = new Map();
    this.editSessions = new Map();
    this.storage = storage;
    this.streamManager = streamManager || new StreamManager(
      parseInt(process.env.WS_PORT || '8765'),
      process.env.WS_ENABLED !== 'false'
    );
    this.streamManager.start();
    
    // Handle input from WebSocket clients
    this.streamManager.setInputCallback((shellId: string, input: string) => {
      const session = this.sessions.get(shellId);
      if (session && session.isActive) {
        session.stream.write(input);
      }
    });
  }

  getStreamUrl(): string {
    return this.streamManager.getUrl();
  }

  /**
   * Create interactive shell session
   * @param connectionIdOrConfig - Either a connectionId string or a full SSHConnectionConfig object
   */
  async createShell(connectionIdOrConfig: string | SSHConnectionConfig): Promise<{ shellId: string; sessionId: string; streamUrl?: string; error?: string }> {
    let config: SSHConnectionConfig | null;
    let connectionId: string;

    if (typeof connectionIdOrConfig === 'string') {
      connectionId = connectionIdOrConfig;
      config = this.storage.getConnection(connectionId);
      if (!config) {
        return { shellId: '', sessionId: '', error: 'Connection not found' };
      }
    } else {
      config = connectionIdOrConfig;
      connectionId = config.id || `temp-${config.host}`;
    }

    return new Promise((resolve) => {
      const client = new Client();
      const sessionId = crypto.randomUUID();
      const shellId = crypto.randomUUID();

      const timeout = setTimeout(() => {
        client.end();
        resolve({ shellId: '', sessionId: '', error: 'Connection timeout' });
      }, 15000);

      client.on('ready', () => {
        clearTimeout(timeout);

        // Request a shell (PTY)
        client.shell({ term: 'xterm-256color' }, (err: Error, stream: any) => {
          if (err) {
            client.end();
            resolve({ shellId: '', sessionId: '', error: err.message });
            return;
          }

          const session: InteractiveSession = {
            sessionId,
            connectionId,
            shellId,
            client,
            stream,
            buffer: '',
            screenBuffer: '',
            isActive: true,
            createdAt: Date.now(),
            lastActivity: Date.now(),
            sudoPassword: config.password, // Use connection password for sudo by default
            autoRespondSudo: true, // Auto-respond to sudo by default
            autoRespondYesNo: false, // Don't auto-respond to yes/no by default
            autoRespondHostKey: true, // Auto-accept host key verification by default
            autoRespondOverwrite: false, // Don't auto-respond to overwrite by default
            autoRespondPackage: false, // Don't auto-respond to package prompts by default
            autoRespondMore: true, // Auto-handle --More-- prompts by default
            lastPromptHandled: 0,
            lastError: undefined,
            // New fields
            shellType: undefined,
            reconnectAttempts: 0,
            maxReconnectAttempts: 3,
            autoReconnect: false, // Disabled by default
            commandTimeout: 0, // No timeout by default
            currentWorkingDir: undefined,
            lastCommandStart: undefined,
          };

          // Capture output and auto-handle prompts
          stream.on('data', (data: Buffer) => {
            const text = data.toString();
            session.buffer += text;
            session.lastActivity = Date.now();

            // Broadcast to WebSocket clients in real-time
            this.streamManager.broadcast(shellId, text);

            // Update screen buffer (keep last ~24 lines for terminal view)
            const lines = text.split('\n');
            let screenLines = session.screenBuffer ? session.screenBuffer.split('\n') : [];
            screenLines.push(...lines);
            // Keep only last 24 lines (typical terminal height)
            if (screenLines.length > 24) {
              screenLines = screenLines.slice(-24);
            }
            session.screenBuffer = screenLines.join('\n');

            // Auto-respond to prompts if enabled
            this.handleAutoResponse(session);
          });

          stream.on('close', () => {
            session.isActive = false;
            this.sessions.delete(shellId);
            this.streamManager.unregisterShell(shellId);
            this.streamManager.broadcastEvent(shellId, 'closed');
            console.log(`[InteractiveSession] Shell ${shellId} closed`);
          });

          this.sessions.set(shellId, session);
          this.streamManager.registerShell(shellId);

          console.log(`[InteractiveSession] Shell ${shellId} created`);
          resolve({ shellId, sessionId, streamUrl: this.streamManager.getUrl() });
        });
      });

      client.on('error', (err: Error) => {
        clearTimeout(timeout);
        console.error(`[InteractiveSession] Connection error: ${err.message}`);
        resolve({ shellId: '', sessionId: '', error: err.message });
      });

      // Connect
      try {
        const connectConfig: any = {
          host: config.host,
          port: config.port || 22,
          username: config.username,
          keepaliveInterval: 10000,
          keepaliveCountMax: 3,
          readyTimeout: 15000,
        };

        if (config.password) {
          connectConfig.password = config.password;
        } else if (config.privateKey) {
          connectConfig.privateKey = config.privateKey;
          if (config.passphrase) {
            connectConfig.passphrase = config.passphrase;
          }
        } else if (config.privateKeyPath) {
          const fs = require('fs');
          connectConfig.privateKey = fs.readFileSync(config.privateKeyPath, 'utf8');
          if (config.passphrase) {
            connectConfig.passphrase = config.passphrase;
          }
        }

        client.connect(connectConfig);
      } catch (error: any) {
        clearTimeout(timeout);
        resolve({ shellId: '', sessionId: '', error: error.message });
      }
    });
  }

  /**
   * Send input to interactive shell
   */
  sendInput(shellId: string, input: string): { success: boolean; error?: string } {
    const session = this.sessions.get(shellId);

    if (!session) {
      return { success: false, error: 'Shell session not found' };
    }

    if (!session.isActive) {
      return { success: false, error: 'Shell session is not active' };
    }

    try {
      session.stream.write(input);
      session.lastActivity = Date.now();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Filter garbage data from output
   * Removes null bytes, excessive control characters, and non-printable characters
   */
  private filterGarbageData(data: string): string {
    let filtered = '';
    const textControlChars = new Set([9, 10, 13, 27]); // tab, newline, carriage return, escape

    for (let i = 0; i < data.length; i++) {
      const charCode = data.charCodeAt(i);

      // Allow printable ASCII characters (32-126)
      if (charCode >= 32 && charCode <= 126) {
        filtered += data[i];
        continue;
      }

      // Allow common text control characters (tab, newline, CR, escape for ANSI)
      if (textControlChars.has(charCode)) {
        filtered += data[i];
        continue;
      }

      // Allow extended ASCII and Unicode (128-255+)
      // This handles UTF-8 multibyte sequences
      if (charCode >= 128) {
        filtered += data[i];
        continue;
      }

      // Skip null bytes and other control characters
      // These are likely garbage from streaming programs
    }

    return filtered;
  }

  /**
   * Get output from interactive shell
   * @param shellId - Shell ID
   * @param clear - Clear buffer after reading
   * @param filterGarbage - Filter out garbage/binary data
   * @param screenOnly - Only return last ~24 lines (current terminal screen)
   */
  getOutput(shellId: string, clear: boolean = false, filterGarbage: boolean = false, screenOnly: boolean = false): { output: string; error?: string } {
    const session = this.sessions.get(shellId);

    if (!session) {
      return { output: '', error: 'Shell session not found' };
    }

    // Use screen buffer for screen-only mode (vim/nano etc)
    let output = screenOnly ? session.screenBuffer : session.buffer;

    if (filterGarbage) {
      output = this.filterGarbageData(output);
    }

    if (clear) {
      session.buffer = '';
      session.screenBuffer = '';
    }

    return { output };
  }

  /**
   * Get output with ANSI codes stripped
   */
  getCleanOutput(shellId: string, clear: boolean = false, filterGarbage: boolean = false, screenOnly: boolean = false): { output: string; error?: string } {
    const result = this.getOutput(shellId, clear, filterGarbage, screenOnly);

    if (result.error) {
      return result;
    }

    return {
      output: stripAnsi(result.output),
    };
  }

  /**
   * Close interactive shell
   */
  closeShell(shellId: string): boolean {
    const session = this.sessions.get(shellId);

    if (!session) {
      return false;
    }

    session.stream.end();
    session.client.end();
    this.sessions.delete(shellId);

    return true;
  }

  /**
   * Edit file using nano/vim
   * High-level abstraction for file editing
   */
  async editFile(
    shellId: string,
    filePath: string,
    editor: 'nano' | 'vim' | 'vi' = 'nano'
  ): Promise<{ editId: string; error?: string }> {
    const session = this.sessions.get(shellId);

    if (!session) {
      return { editId: '', error: 'Shell session not found' };
    }

    const editId = crypto.randomUUID();

    // Clear buffer
    session.buffer = '';

    // Start editor
    const command = `${editor} "${filePath}"\n`;
    session.stream.write(command);

    // Wait for editor to start (check for editor-specific prompts)
    await new Promise(resolve => setTimeout(resolve, 500));

    const editSession: FileEditSession = {
      editId,
      sessionId: session.sessionId,
      filePath,
      editor,
      status: 'editing',
      startedAt: Date.now(),
    };

    this.editSessions.set(editId, editSession);

    return { editId };
  }

  /**
   * Send content to editor (for replacing file content)
   * NOTE: This method is deprecated - use direct shell commands instead
   */
  async sendEditorContent(editId: string, content: string): Promise<{ success: boolean; error?: string }> {
    const editSession = this.editSessions.get(editId);

    if (!editSession) {
      return { success: false, error: 'Edit session not found' };
    }

    const session = this.sessions.get(
      Array.from(this.sessions.values()).find(s => s.sessionId === editSession.sessionId)?.shellId || ''
    );

    if (!session) {
      return { success: false, error: 'Shell session not found' };
    }

    // Close editor without saving (exit nano/vim)
    if (editSession.editor === 'nano') {
      session.stream.write('\x18'); // Ctrl+X (exit)
      await new Promise(resolve => setTimeout(resolve, 100));
      session.stream.write('N\n'); // Don't save + newline
      await new Promise(resolve => setTimeout(resolve, 200));
    } else if (editSession.editor === 'vim' || editSession.editor === 'vi') {
      session.stream.write('\x1b'); // Escape
      await new Promise(resolve => setTimeout(resolve, 100));
      session.stream.write(':q!\n'); // Quit without save
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Use cat with heredoc to write multi-line content reliably
    // This preserves newlines and special characters
    const escapedContent = content.replace(/\\/g, '\\\\').replace(/'/g, "'\\''").replace(/\$/g, '\\$');
    session.stream.write(`cat > "${editSession.filePath}" << 'EOFMARKER'\n${content}\nEOFMARKER\n`);

    return { success: true };
  }

  /**
   * Save and exit editor
   * NOTE: When using sendEditorContent, the file is already saved via shell command
   */
  async saveAndExit(editId: string): Promise<{ success: boolean; error?: string }> {
    const editSession = this.editSessions.get(editId);

    if (!editSession) {
      return { success: false, error: 'Edit session not found' };
    }

    // Mark as completed (file was already saved by sendEditorContent via echo command)
    editSession.status = 'saved';
    editSession.completedAt = Date.now();

    return { success: true };
  }

  /**
   * Exit editor without saving
   */
  async exitWithoutSaving(editId: string): Promise<{ success: boolean; error?: string }> {
    const editSession = this.editSessions.get(editId);

    if (!editSession) {
      return { success: false, error: 'Edit session not found' };
    }

    const session = this.sessions.get(
      Array.from(this.sessions.values()).find(s => s.sessionId === editSession.sessionId)?.shellId || ''
    );

    if (!session) {
      return { success: false, error: 'Shell session not found' };
    }

    if (editSession.editor === 'nano') {
      // Nano: Ctrl+X, N (don't save)
      session.stream.write('\x18'); // Ctrl+X
      await new Promise(resolve => setTimeout(resolve, 200));
      session.stream.write('N'); // No, don't save

      editSession.status = 'cancelled';
      editSession.completedAt = Date.now();

      return { success: true };
    } else if (editSession.editor === 'vim' || editSession.editor === 'vi') {
      // Vim: :q! (force quit without save)
      session.stream.write('\x1b'); // Escape
      await new Promise(resolve => setTimeout(resolve, 100));
      session.stream.write(':q!\n');

      editSession.status = 'cancelled';
      editSession.completedAt = Date.now();

      return { success: true };
    }

    return { success: false, error: 'Unsupported editor' };
  }

  /**
   * List active shells
   */
  listShells(): InteractiveSession[] {
    return Array.from(this.sessions.values()).map(s => ({
      ...s,
      // Don't include sensitive data
      client: undefined as any,
      stream: undefined as any,
      buffer: undefined as any,
    }));
  }

  /**
   * Get last error for a shell session
   */
  getLastError(shellId: string): { error?: string; cleared: boolean } {
    const session = this.sessions.get(shellId);
    if (!session) {
      return { error: 'Shell session not found', cleared: false };
    }

    const error = session.lastError;
    session.lastError = undefined; // Clear after reading
    return { error, cleared: true };
  }

  /**
   * Get comprehensive shell status including errors and prompt state
   */
  getShellStatus(shellId: string): {
    isActive: boolean;
    lastError?: string;
    promptType: PromptType;
    autoRespond: {
      sudo: boolean;
      yesNo: 'yes' | 'no' | false;
      hostKey: boolean;
      overwrite: 'yes' | 'no' | false;
      packageConfirm: 'yes' | 'no' | false;
      morePrompt: boolean;
    };
    uptime: number;
    error?: string;
  } {
    const session = this.sessions.get(shellId);
    if (!session) {
      return {
        isActive: false,
        promptType: 'none',
        autoRespond: {
          sudo: false,
          yesNo: false,
          hostKey: false,
          overwrite: false,
          packageConfirm: false,
          morePrompt: false,
        },
        uptime: 0,
        error: 'Shell session not found',
      };
    }

    const prompt = this.detectPrompt(shellId);

    return {
      isActive: session.isActive,
      lastError: session.lastError,
      promptType: prompt.type,
      autoRespond: {
        sudo: session.autoRespondSudo,
        yesNo: session.autoRespondYesNo,
        hostKey: session.autoRespondHostKey,
        overwrite: session.autoRespondOverwrite,
        packageConfirm: session.autoRespondPackage,
        morePrompt: session.autoRespondMore,
      },
      uptime: Date.now() - session.createdAt,
    };
  }

  /**
   * Replace text in file using sed (dynamic editing like a human)
   */
  async replaceInFile(
    shellId: string,
    filePath: string,
    searchText: string,
    replaceText: string
  ): Promise<{ success: boolean; error?: string }> {
    const session = this.sessions.get(shellId);

    if (!session) {
      return { success: false, error: 'Shell session not found' };
    }

    // Escape special characters for sed
    const escapedSearch = searchText.replace(/[\/&]/g, '\\$&');
    const escapedReplace = replaceText.replace(/[\/&]/g, '\\$&');

    // Use sed for in-place replacement
    session.stream.write(`sed -i 's/${escapedSearch}/${escapedReplace}/g' "${filePath}"\n`);
    await new Promise(resolve => setTimeout(resolve, 300));

    return { success: true };
  }

  /**
   * Advanced line editing with sed
   * Supports: insert_after, insert_before, append_to_line, prepend_to_line
   */
  async editLine(
    shellId: string,
    filePath: string,
    operation: 'insert_after' | 'insert_before' | 'append_to_line' | 'prepend_to_line',
    pattern: string,
    text: string
  ): Promise<{ success: boolean; error?: string }> {
    const session = this.sessions.get(shellId);

    if (!session) {
      return { success: false, error: 'Shell session not found' };
    }

    // Escape special characters
    const escapedPattern = pattern.replace(/[\/&]/g, '\\$&');
    const escapedText = text.replace(/[\/&]/g, '\\$&');

    let sedCommand = '';

    switch (operation) {
      case 'insert_after':
        // Insert new line after pattern
        sedCommand = `sed -i '/${escapedPattern}/a\\${escapedText}' "${filePath}"`;
        break;

      case 'insert_before':
        // Insert new line before pattern
        sedCommand = `sed -i '/${escapedPattern}/i\\${escapedText}' "${filePath}"`;
        break;

      case 'append_to_line':
        // Add text at end of line containing pattern
        sedCommand = `sed -i 's/${escapedPattern}/${escapedPattern} ${escapedText}/' "${filePath}"`;
        break;

      case 'prepend_to_line':
        // Add text at beginning of line containing pattern
        sedCommand = `sed -i 's/${escapedPattern}/${escapedText} ${escapedPattern}/' "${filePath}"`;
        break;

      default:
        return { success: false, error: `Unknown operation: ${operation}` };
    }

    session.stream.write(`${sedCommand}\n`);
    await new Promise(resolve => setTimeout(resolve, 300));

    return { success: true };
  }

  /**
   * Get edit session status
   */
  getEditStatus(editId: string): FileEditSession | null {
    return this.editSessions.get(editId) || null;
  }

  /**
   * Close all shells
   */
  closeAll(): void {
    this.sessions.forEach((session) => {
      session.stream.end();
      session.client.end();
    });
    this.sessions.clear();
    this.editSessions.clear();
  }

  // ============================================
  // SUDO, SU & PROMPT HANDLING METHODS
  // ============================================

  /**
   * Set sudo password for a shell session
   */
  setSudoPassword(shellId: string, password: string): { success: boolean; error?: string } {
    const session = this.sessions.get(shellId);
    if (!session) {
      return { success: false, error: 'Shell session not found' };
    }
    session.sudoPassword = password;
    return { success: true };
  }

  /**
   * Configure auto-respond settings
   */
  setAutoRespond(
    shellId: string,
    options: {
      sudo?: boolean;
      yesNo?: 'yes' | 'no' | false;
      password?: string;
      hostKey?: boolean;
      overwrite?: 'yes' | 'no' | false;
      packageConfirm?: 'yes' | 'no' | false;
      morePrompt?: boolean;
    }
  ): { success: boolean; error?: string } {
    const session = this.sessions.get(shellId);
    if (!session) {
      return { success: false, error: 'Shell session not found' };
    }

    if (options.sudo !== undefined) {
      session.autoRespondSudo = options.sudo;
    }
    if (options.yesNo !== undefined) {
      session.autoRespondYesNo = options.yesNo;
    }
    if (options.password !== undefined) {
      session.sudoPassword = options.password;
    }
    if (options.hostKey !== undefined) {
      session.autoRespondHostKey = options.hostKey;
    }
    if (options.overwrite !== undefined) {
      session.autoRespondOverwrite = options.overwrite;
    }
    if (options.packageConfirm !== undefined) {
      session.autoRespondPackage = options.packageConfirm;
    }
    if (options.morePrompt !== undefined) {
      session.autoRespondMore = options.morePrompt;
    }

    return { success: true };
  }

  /**
   * Handle auto-response to prompts (called on each data event)
   */
  private handleAutoResponse(session: InteractiveSession): void {
    const now = Date.now();

    // Prevent handling same prompt multiple times (debounce 500ms)
    if (now - session.lastPromptHandled < 500) {
      return;
    }

    const output = stripAnsi(session.buffer);
    const lastLines = output.split('\n').slice(-5).join('\n');

    // === ERROR DETECTION (store for retrieval, don't auto-respond) ===
    if (PROMPT_PATTERNS.HOST_KEY_CHANGED.test(lastLines)) {
      session.lastError = 'host_key_changed';
      console.log('[AutoRespond] WARNING: Host key changed - possible MITM attack');
      return; // Don't auto-respond to security warnings
    }

    if (PROMPT_PATTERNS.SSH_AUTH_FAILURE.test(lastLines)) {
      session.lastError = 'ssh_auth_failure';
      return;
    }

    if (PROMPT_PATTERNS.CONNECTION_REFUSED.test(lastLines)) {
      session.lastError = 'connection_refused';
      return;
    }

    if (PROMPT_PATTERNS.NETWORK_UNREACHABLE.test(lastLines)) {
      session.lastError = 'network_unreachable';
      return;
    }

    if (PROMPT_PATTERNS.DISK_FULL.test(lastLines)) {
      session.lastError = 'disk_full';
      return;
    }

    if (PROMPT_PATTERNS.MEMORY_ERROR.test(lastLines)) {
      session.lastError = 'memory_error';
      return;
    }

    if (PROMPT_PATTERNS.SUDO_NOT_ALLOWED.test(lastLines)) {
      session.lastError = 'sudo_not_allowed';
      return;
    }

    if (PROMPT_PATTERNS.SUDO_TTY_REQUIRED.test(lastLines)) {
      session.lastError = 'sudo_tty_required';
      return;
    }

    // === AUTO-RESPOND SECTION ===

    // Auto-respond to sudo password prompt
    if (session.autoRespondSudo && session.sudoPassword) {
      if (PROMPT_PATTERNS.SUDO_PASSWORD.test(lastLines)) {
        // Check it's actually asking for password (not showing error)
        if (!PROMPT_PATTERNS.AUTH_FAILURE.test(lastLines)) {
          session.lastPromptHandled = now;
          session.stream.write(`${session.sudoPassword}\n`);
          console.log('[AutoRespond] Sent sudo password');
          return;
        }
      }
    }

    // Auto-respond to host key verification (first time connecting)
    if (session.autoRespondHostKey) {
      if (PROMPT_PATTERNS.HOST_KEY_VERIFY.test(lastLines)) {
        // Only if it's asking yes/no, not showing warning
        if (!PROMPT_PATTERNS.HOST_KEY_CHANGED.test(lastLines)) {
          session.lastPromptHandled = now;
          session.stream.write('yes\n');
          console.log('[AutoRespond] Accepted host key verification');
          return;
        }
      }
    }

    // Auto-respond to yes/no prompts
    if (session.autoRespondYesNo) {
      if (PROMPT_PATTERNS.YES_NO.test(lastLines)) {
        session.lastPromptHandled = now;
        session.stream.write(`${session.autoRespondYesNo}\n`);
        console.log(`[AutoRespond] Sent "${session.autoRespondYesNo}" to yes/no prompt`);
        return;
      }
    }

    // Auto-respond to overwrite prompts
    if (session.autoRespondOverwrite) {
      if (PROMPT_PATTERNS.OVERWRITE_PROMPT.test(lastLines)) {
        session.lastPromptHandled = now;
        session.stream.write(`${session.autoRespondOverwrite}\n`);
        console.log(`[AutoRespond] Sent "${session.autoRespondOverwrite}" to overwrite prompt`);
        return;
      }
    }

    // Auto-respond to package manager prompts
    if (session.autoRespondPackage) {
      if (PROMPT_PATTERNS.PACKAGE_CONFIRM.test(lastLines)) {
        session.lastPromptHandled = now;
        session.stream.write(`${session.autoRespondPackage}\n`);
        console.log(`[AutoRespond] Sent "${session.autoRespondPackage}" to package prompt`);
        return;
      }
    }

    // Auto-handle --More-- prompts (press space to continue)
    if (session.autoRespondMore) {
      if (PROMPT_PATTERNS.MORE_PROMPT.test(lastLines)) {
        session.lastPromptHandled = now;
        session.stream.write(' '); // Space to continue
        console.log('[AutoRespond] Pressed space for --More-- prompt');
        return;
      }
    }
  }

  /**
   * Detect prompt type from output buffer
   */
  detectPrompt(shellId: string): { type: PromptType; match?: string } {
    const session = this.sessions.get(shellId);
    if (!session) {
      return { type: 'none' };
    }

    const output = stripAnsi(session.buffer);
    const lastLines = output.split('\n').slice(-5).join('\n'); // Check last 5 lines

    // === CRITICAL SECURITY ISSUES (highest priority) ===
    if (PROMPT_PATTERNS.HOST_KEY_CHANGED.test(lastLines)) {
      const match = lastLines.match(PROMPT_PATTERNS.HOST_KEY_CHANGED);
      return { type: 'host_key_changed', match: match?.[0] };
    }

    // === CONNECTION ERRORS ===
    if (PROMPT_PATTERNS.CONNECTION_REFUSED.test(lastLines)) {
      const match = lastLines.match(PROMPT_PATTERNS.CONNECTION_REFUSED);
      return { type: 'connection_refused', match: match?.[0] };
    }

    if (PROMPT_PATTERNS.CONNECTION_RESET.test(lastLines)) {
      const match = lastLines.match(PROMPT_PATTERNS.CONNECTION_RESET);
      return { type: 'connection_reset', match: match?.[0] };
    }

    if (PROMPT_PATTERNS.NETWORK_UNREACHABLE.test(lastLines)) {
      const match = lastLines.match(PROMPT_PATTERNS.NETWORK_UNREACHABLE);
      return { type: 'network_unreachable', match: match?.[0] };
    }

    // === AUTHENTICATION PROMPTS ===
    if (PROMPT_PATTERNS.TWO_FACTOR.test(lastLines)) {
      const match = lastLines.match(PROMPT_PATTERNS.TWO_FACTOR);
      return { type: 'two_factor', match: match?.[0] };
    }

    if (PROMPT_PATTERNS.KEY_PASSPHRASE.test(lastLines)) {
      const match = lastLines.match(PROMPT_PATTERNS.KEY_PASSPHRASE);
      return { type: 'key_passphrase', match: match?.[0] };
    }

    if (PROMPT_PATTERNS.HOST_KEY_VERIFY.test(lastLines)) {
      const match = lastLines.match(PROMPT_PATTERNS.HOST_KEY_VERIFY);
      return { type: 'host_key_verify', match: match?.[0] };
    }

    if (PROMPT_PATTERNS.SUDO_PASSWORD.test(lastLines)) {
      const match = lastLines.match(PROMPT_PATTERNS.SUDO_PASSWORD);
      return { type: 'sudo_password', match: match?.[0] };
    }

    if (PROMPT_PATTERNS.GIT_CREDENTIAL.test(lastLines)) {
      const match = lastLines.match(PROMPT_PATTERNS.GIT_CREDENTIAL);
      return { type: 'git_credential', match: match?.[0] };
    }

    // === AUTHENTICATION FAILURES ===
    if (PROMPT_PATTERNS.SSH_AUTH_FAILURE.test(lastLines)) {
      const match = lastLines.match(PROMPT_PATTERNS.SSH_AUTH_FAILURE);
      return { type: 'ssh_auth_failure', match: match?.[0] };
    }

    if (PROMPT_PATTERNS.AUTH_FAILURE.test(lastLines)) {
      const match = lastLines.match(PROMPT_PATTERNS.AUTH_FAILURE);
      return { type: 'auth_failure', match: match?.[0] };
    }

    // === PERMISSION ERRORS ===
    if (PROMPT_PATTERNS.PERMISSION_DENIED.test(lastLines)) {
      const match = lastLines.match(PROMPT_PATTERNS.PERMISSION_DENIED);
      return { type: 'permission_denied', match: match?.[0] };
    }

    if (PROMPT_PATTERNS.SUDO_NOT_ALLOWED.test(lastLines)) {
      const match = lastLines.match(PROMPT_PATTERNS.SUDO_NOT_ALLOWED);
      return { type: 'sudo_not_allowed', match: match?.[0] };
    }

    if (PROMPT_PATTERNS.SUDO_TTY_REQUIRED.test(lastLines)) {
      const match = lastLines.match(PROMPT_PATTERNS.SUDO_TTY_REQUIRED);
      return { type: 'sudo_tty_required', match: match?.[0] };
    }

    if (PROMPT_PATTERNS.ROOT_DISABLED.test(lastLines)) {
      const match = lastLines.match(PROMPT_PATTERNS.ROOT_DISABLED);
      return { type: 'root_disabled', match: match?.[0] };
    }

    // === ACCOUNT STATUS ===
    if (PROMPT_PATTERNS.ACCOUNT_LOCKED.test(lastLines)) {
      const match = lastLines.match(PROMPT_PATTERNS.ACCOUNT_LOCKED);
      return { type: 'account_locked', match: match?.[0] };
    }

    if (PROMPT_PATTERNS.PASSWORD_EXPIRED.test(lastLines)) {
      const match = lastLines.match(PROMPT_PATTERNS.PASSWORD_EXPIRED);
      return { type: 'password_expired', match: match?.[0] };
    }

    // === RESOURCE ERRORS ===
    if (PROMPT_PATTERNS.DISK_FULL.test(lastLines)) {
      const match = lastLines.match(PROMPT_PATTERNS.DISK_FULL);
      return { type: 'disk_full', match: match?.[0] };
    }

    if (PROMPT_PATTERNS.MEMORY_ERROR.test(lastLines)) {
      const match = lastLines.match(PROMPT_PATTERNS.MEMORY_ERROR);
      return { type: 'memory_error', match: match?.[0] };
    }

    // === SESSION STATUS ===
    if (PROMPT_PATTERNS.SESSION_TERMINATED.test(lastLines)) {
      const match = lastLines.match(PROMPT_PATTERNS.SESSION_TERMINATED);
      return { type: 'session_terminated', match: match?.[0] };
    }

    // === INTERACTIVE PROMPTS ===
    if (PROMPT_PATTERNS.YES_NO.test(lastLines)) {
      const match = lastLines.match(PROMPT_PATTERNS.YES_NO);
      return { type: 'yes_no', match: match?.[0] };
    }

    if (PROMPT_PATTERNS.OVERWRITE_PROMPT.test(lastLines)) {
      const match = lastLines.match(PROMPT_PATTERNS.OVERWRITE_PROMPT);
      return { type: 'overwrite_prompt', match: match?.[0] };
    }

    if (PROMPT_PATTERNS.DELETE_CONFIRM.test(lastLines)) {
      const match = lastLines.match(PROMPT_PATTERNS.DELETE_CONFIRM);
      return { type: 'delete_confirm', match: match?.[0] };
    }

    if (PROMPT_PATTERNS.PACKAGE_CONFIRM.test(lastLines)) {
      const match = lastLines.match(PROMPT_PATTERNS.PACKAGE_CONFIRM);
      return { type: 'package_confirm', match: match?.[0] };
    }

    if (PROMPT_PATTERNS.MORE_PROMPT.test(lastLines)) {
      const match = lastLines.match(PROMPT_PATTERNS.MORE_PROMPT);
      return { type: 'more_prompt', match: match?.[0] };
    }

    // === GENERAL ERRORS ===
    if (PROMPT_PATTERNS.COMMAND_NOT_FOUND.test(lastLines)) {
      const match = lastLines.match(PROMPT_PATTERNS.COMMAND_NOT_FOUND);
      return { type: 'command_not_found', match: match?.[0] };
    }

    if (PROMPT_PATTERNS.TIMEOUT.test(lastLines)) {
      const match = lastLines.match(PROMPT_PATTERNS.TIMEOUT);
      return { type: 'timeout', match: match?.[0] };
    }

    // === READY STATE ===
    if (PROMPT_PATTERNS.SHELL_PROMPT.test(lastLines)) {
      return { type: 'shell_ready' };
    }

    return { type: 'none' };
  }

  /**
   * Execute command with sudo
   * Automatically handles password prompt
   */
  async executeSudo(
    shellId: string,
    command: string,
    password?: string
  ): Promise<{ success: boolean; output: string; error?: string }> {
    const session = this.sessions.get(shellId);
    if (!session) {
      return { success: false, output: '', error: 'Shell session not found' };
    }

    const sudoPassword = password || session.sudoPassword;
    if (!sudoPassword) {
      return { success: false, output: '', error: 'No sudo password provided' };
    }

    // Clear buffer
    session.buffer = '';

    // Send sudo command
    session.stream.write(`sudo ${command}\n`);

    // Wait for password prompt or result
    let attempts = 0;
    const maxAttempts = 20; // 10 seconds max wait

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const prompt = this.detectPrompt(shellId);

      if (prompt.type === 'sudo_password') {
        // Send password
        session.stream.write(`${sudoPassword}\n`);
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Check for auth failure
        const afterPassword = this.detectPrompt(shellId);
        if (afterPassword.type === 'auth_failure') {
          return {
            success: false,
            output: stripAnsi(session.buffer),
            error: 'Sudo authentication failed - incorrect password',
          };
        }

        // Wait for command completion
        await new Promise(resolve => setTimeout(resolve, 500));
        break;
      }

      if (prompt.type === 'shell_ready') {
        // Command completed (might have NOPASSWD)
        break;
      }

      if (prompt.type === 'permission_denied') {
        return {
          success: false,
          output: stripAnsi(session.buffer),
          error: 'Permission denied',
        };
      }

      if (prompt.type === 'auth_failure') {
        return {
          success: false,
          output: stripAnsi(session.buffer),
          error: 'Authentication failed',
        };
      }

      attempts++;
    }

    if (attempts >= maxAttempts) {
      return {
        success: false,
        output: stripAnsi(session.buffer),
        error: 'Timeout waiting for sudo command',
      };
    }

    return {
      success: true,
      output: stripAnsi(session.buffer),
    };
  }

  /**
   * Switch user using su
   * Handles password prompt
   */
  async switchUser(
    shellId: string,
    username: string,
    password: string
  ): Promise<{ success: boolean; output: string; error?: string }> {
    const session = this.sessions.get(shellId);
    if (!session) {
      return { success: false, output: '', error: 'Shell session not found' };
    }

    // Clear buffer
    session.buffer = '';

    // Send su command
    if (username === 'root') {
      session.stream.write('su -\n');
    } else {
      session.stream.write(`su - ${username}\n`);
    }

    // Wait for password prompt
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const prompt = this.detectPrompt(shellId);

      if (prompt.type === 'sudo_password' || prompt.type === 'su_password') {
        // Send password
        session.stream.write(`${password}\n`);
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Check result
        const afterPassword = this.detectPrompt(shellId);
        if (afterPassword.type === 'auth_failure') {
          return {
            success: false,
            output: stripAnsi(session.buffer),
            error: `su: Authentication failure for user ${username}`,
          };
        }

        if (afterPassword.type === 'root_disabled') {
          return {
            success: false,
            output: stripAnsi(session.buffer),
            error: 'Root login is disabled on this system',
          };
        }

        // Success - check if we got new prompt
        await new Promise(resolve => setTimeout(resolve, 500));
        return {
          success: true,
          output: stripAnsi(session.buffer),
        };
      }

      if (prompt.type === 'auth_failure') {
        return {
          success: false,
          output: stripAnsi(session.buffer),
          error: `Authentication failed for user ${username}`,
        };
      }

      if (prompt.type === 'root_disabled') {
        return {
          success: false,
          output: stripAnsi(session.buffer),
          error: 'Root login is disabled',
        };
      }

      attempts++;
    }

    return {
      success: false,
      output: stripAnsi(session.buffer),
      error: 'Timeout waiting for su command',
    };
  }

  /**
   * Execute sudo su to become root
   * Uses sudo to switch to root (works when su root is disabled but sudo is allowed)
   */
  async sudoSu(
    shellId: string,
    password?: string
  ): Promise<{ success: boolean; output: string; error?: string }> {
    const session = this.sessions.get(shellId);
    if (!session) {
      return { success: false, output: '', error: 'Shell session not found' };
    }

    const sudoPassword = password || session.sudoPassword;
    if (!sudoPassword) {
      return { success: false, output: '', error: 'No password provided' };
    }

    // Clear buffer
    session.buffer = '';

    // Send sudo su command
    session.stream.write('sudo su -\n');

    // Wait and handle prompts
    let attempts = 0;
    const maxAttempts = 15;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const prompt = this.detectPrompt(shellId);

      if (prompt.type === 'sudo_password') {
        session.stream.write(`${sudoPassword}\n`);
        await new Promise(resolve => setTimeout(resolve, 1000));

        const afterPassword = this.detectPrompt(shellId);
        if (afterPassword.type === 'auth_failure') {
          return {
            success: false,
            output: stripAnsi(session.buffer),
            error: 'Sudo authentication failed',
          };
        }

        // Wait for shell
        await new Promise(resolve => setTimeout(resolve, 500));
        return {
          success: true,
          output: stripAnsi(session.buffer),
        };
      }

      if (prompt.type === 'shell_ready') {
        // NOPASSWD configured
        return {
          success: true,
          output: stripAnsi(session.buffer),
        };
      }

      if (prompt.type === 'permission_denied' || prompt.type === 'auth_failure') {
        return {
          success: false,
          output: stripAnsi(session.buffer),
          error: 'Permission denied or authentication failed',
        };
      }

      attempts++;
    }

    return {
      success: false,
      output: stripAnsi(session.buffer),
      error: 'Timeout',
    };
  }

  /**
   * Respond to yes/no prompt
   */
  async respondToPrompt(
    shellId: string,
    response: 'yes' | 'no' | 'y' | 'n' | string
  ): Promise<{ success: boolean; error?: string }> {
    const session = this.sessions.get(shellId);
    if (!session) {
      return { success: false, error: 'Shell session not found' };
    }

    session.stream.write(`${response}\n`);
    await new Promise(resolve => setTimeout(resolve, 300));

    return { success: true };
  }

  /**
   * Send Ctrl+C to interrupt current command
   */
  interrupt(shellId: string): { success: boolean; error?: string } {
    const session = this.sessions.get(shellId);
    if (!session) {
      return { success: false, error: 'Shell session not found' };
    }

    session.stream.write('\x03'); // Ctrl+C
    return { success: true };
  }

  /**
   * Send Ctrl+D (EOF)
   */
  sendEOF(shellId: string): { success: boolean; error?: string } {
    const session = this.sessions.get(shellId);
    if (!session) {
      return { success: false, error: 'Shell session not found' };
    }

    session.stream.write('\x04'); // Ctrl+D
    return { success: true };
  }

  /**
   * Send Ctrl+Z (suspend)
   */
  suspend(shellId: string): { success: boolean; error?: string } {
    const session = this.sessions.get(shellId);
    if (!session) {
      return { success: false, error: 'Shell session not found' };
    }

    session.stream.write('\x1a'); // Ctrl+Z
    return { success: true };
  }

  /**
   * Wait for shell to be ready (detect shell prompt)
   */
  async waitForPrompt(
    shellId: string,
    timeoutMs: number = 10000
  ): Promise<{ ready: boolean; promptType: PromptType; output: string }> {
    const session = this.sessions.get(shellId);
    if (!session) {
      return { ready: false, promptType: 'none', output: '' };
    }

    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      await new Promise(resolve => setTimeout(resolve, 200));
      const prompt = this.detectPrompt(shellId);

      if (prompt.type === 'shell_ready') {
        return {
          ready: true,
          promptType: 'shell_ready',
          output: stripAnsi(session.buffer),
        };
      }

      // Check for error conditions
      if (['auth_failure', 'permission_denied', 'account_locked', 'root_disabled'].includes(prompt.type)) {
        return {
          ready: false,
          promptType: prompt.type,
          output: stripAnsi(session.buffer),
        };
      }

      // Check for prompts that need response
      if (['sudo_password', 'yes_no'].includes(prompt.type)) {
        return {
          ready: false,
          promptType: prompt.type,
          output: stripAnsi(session.buffer),
        };
      }
    }

    return {
      ready: false,
      promptType: 'timeout',
      output: stripAnsi(session.buffer),
    };
  }

  /**
   * Execute privileged command (tries sudo first, then checks result)
   */
  async executePrivileged(
    shellId: string,
    command: string,
    password?: string
  ): Promise<{
    success: boolean;
    output: string;
    usedSudo: boolean;
    error?: string;
  }> {
    const session = this.sessions.get(shellId);
    if (!session) {
      return { success: false, output: '', usedSudo: false, error: 'Shell session not found' };
    }

    // First try without sudo
    session.buffer = '';
    session.stream.write(`${command}\n`);
    await new Promise(resolve => setTimeout(resolve, 1000));

    let prompt = this.detectPrompt(shellId);

    // If permission denied, try with sudo
    if (prompt.type === 'permission_denied') {
      const sudoResult = await this.executeSudo(shellId, command, password);
      return {
        success: sudoResult.success,
        output: sudoResult.output,
        usedSudo: true,
        error: sudoResult.error,
      };
    }

    return {
      success: prompt.type !== 'command_not_found',
      output: stripAnsi(session.buffer),
      usedSudo: false,
    };
  }

  /**
   * Check if current user has sudo access
   */
  async checkSudoAccess(shellId: string, password?: string): Promise<{
    hasSudo: boolean;
    requiresPassword: boolean;
    error?: string;
  }> {
    const session = this.sessions.get(shellId);
    if (!session) {
      return { hasSudo: false, requiresPassword: false, error: 'Shell session not found' };
    }

    // Clear buffer
    session.buffer = '';

    // Try sudo -n (non-interactive) first
    session.stream.write('sudo -n true 2>&1\n');
    await new Promise(resolve => setTimeout(resolve, 1000));

    let output = stripAnsi(session.buffer);

    if (output.includes('sudo: a password is required')) {
      // Sudo available but needs password
      if (password) {
        // Try with password
        const result = await this.executeSudo(shellId, 'true', password);
        return {
          hasSudo: result.success,
          requiresPassword: true,
          error: result.error,
        };
      }
      return { hasSudo: true, requiresPassword: true };
    }

    if (output.includes('not in the sudoers file') || output.includes('not allowed to run sudo')) {
      return { hasSudo: false, requiresPassword: false, error: 'User not in sudoers' };
    }

    // NOPASSWD configured
    return { hasSudo: true, requiresPassword: false };
  }

  /**
   * Get current username
   */
  async getCurrentUser(shellId: string): Promise<{ username: string; error?: string }> {
    const session = this.sessions.get(shellId);
    if (!session) {
      return { username: '', error: 'Shell session not found' };
    }

    session.buffer = '';
    session.stream.write('whoami\n');
    await new Promise(resolve => setTimeout(resolve, 500));

    const output = stripAnsi(session.buffer);
    const lines = output.split('\n').filter((l: string) => l.trim() && !l.includes('whoami'));

    if (lines.length > 0) {
      return { username: lines[0].trim() };
    }

    return { username: '', error: 'Could not determine username' };
  }

  /**
   * Check if running as root
   */
  async isRoot(shellId: string): Promise<boolean> {
    const result = await this.getCurrentUser(shellId);
    return result.username === 'root';
  }

  // ============================================
  // SPECIAL KEY SEQUENCES
  // ============================================

  /**
   * Special key escape sequences
   */
  private static readonly SPECIAL_KEYS: Record<string, string> = {
    // Arrow keys
    up: '\x1b[A',
    down: '\x1b[B',
    right: '\x1b[C',
    left: '\x1b[D',

    // Navigation
    home: '\x1b[H',
    end: '\x1b[F',
    page_up: '\x1b[5~',
    page_down: '\x1b[6~',
    insert: '\x1b[2~',
    delete: '\x1b[3~',

    // Function keys
    f1: '\x1bOP',
    f2: '\x1bOQ',
    f3: '\x1bOR',
    f4: '\x1bOS',
    f5: '\x1b[15~',
    f6: '\x1b[17~',
    f7: '\x1b[18~',
    f8: '\x1b[19~',
    f9: '\x1b[20~',
    f10: '\x1b[21~',
    f11: '\x1b[23~',
    f12: '\x1b[24~',

    // Control keys
    tab: '\t',
    enter: '\n',
    escape: '\x1b',
    backspace: '\x7f',

    // Ctrl combinations
    ctrl_a: '\x01',
    ctrl_b: '\x02',
    ctrl_c: '\x03',
    ctrl_d: '\x04',
    ctrl_e: '\x05',
    ctrl_f: '\x06',
    ctrl_g: '\x07',
    ctrl_h: '\x08',
    ctrl_i: '\x09',
    ctrl_j: '\x0a',
    ctrl_k: '\x0b',
    ctrl_l: '\x0c',
    ctrl_m: '\x0d',
    ctrl_n: '\x0e',
    ctrl_o: '\x0f',
    ctrl_p: '\x10',
    ctrl_q: '\x11',
    ctrl_r: '\x12',
    ctrl_s: '\x13',
    ctrl_t: '\x14',
    ctrl_u: '\x15',
    ctrl_v: '\x16',
    ctrl_w: '\x17',
    ctrl_x: '\x18',
    ctrl_y: '\x19',
    ctrl_z: '\x1a',
  };

  /**
   * Send special key to shell
   */
  sendSpecialKey(shellId: string, key: string): { success: boolean; error?: string } {
    const session = this.sessions.get(shellId);
    if (!session) {
      return { success: false, error: 'Shell session not found' };
    }

    const sequence = InteractiveSessionManager.SPECIAL_KEYS[key.toLowerCase()];
    if (!sequence) {
      return { success: false, error: `Unknown key: ${key}. Available: ${Object.keys(InteractiveSessionManager.SPECIAL_KEYS).join(', ')}` };
    }

    session.stream.write(sequence);
    session.lastActivity = Date.now();
    return { success: true };
  }

  /**
   * List available special keys
   */
  listSpecialKeys(): string[] {
    return Object.keys(InteractiveSessionManager.SPECIAL_KEYS);
  }

  // ============================================
  // SHELL TYPE DETECTION
  // ============================================

  /**
   * Detect shell type
   */
  async detectShellType(shellId: string): Promise<{ shellType: ShellType; error?: string }> {
    const session = this.sessions.get(shellId);
    if (!session) {
      return { shellType: 'unknown', error: 'Shell session not found' };
    }

    session.buffer = '';
    session.stream.write('echo $SHELL\n');
    await new Promise(resolve => setTimeout(resolve, 500));

    const output = stripAnsi(session.buffer).toLowerCase();

    let shellType: ShellType = 'unknown';

    if (output.includes('/bash')) {
      shellType = 'bash';
    } else if (output.includes('/zsh')) {
      shellType = 'zsh';
    } else if (output.includes('/fish')) {
      shellType = 'fish';
    } else if (output.includes('/dash')) {
      shellType = 'dash';
    } else if (output.includes('/ksh')) {
      shellType = 'ksh';
    } else if (output.includes('/csh')) {
      shellType = 'csh';
    } else if (output.includes('/tcsh')) {
      shellType = 'tcsh';
    } else if (output.includes('/sh')) {
      shellType = 'sh';
    }

    session.shellType = shellType;
    return { shellType };
  }

  /**
   * Get detected shell type
   */
  getShellType(shellId: string): ShellType {
    const session = this.sessions.get(shellId);
    return session?.shellType || 'unknown';
  }

  // ============================================
  // COMMAND TIMEOUT
  // ============================================

  /**
   * Set command timeout for shell
   */
  setCommandTimeout(shellId: string, timeoutMs: number): { success: boolean; error?: string } {
    const session = this.sessions.get(shellId);
    if (!session) {
      return { success: false, error: 'Shell session not found' };
    }

    session.commandTimeout = timeoutMs;
    return { success: true };
  }

  /**
   * Execute command with timeout
   * Sends Ctrl+C if command doesn't complete within timeout
   */
  async executeWithTimeout(
    shellId: string,
    command: string,
    timeoutMs?: number
  ): Promise<{ success: boolean; output: string; timedOut: boolean; error?: string }> {
    const session = this.sessions.get(shellId);
    if (!session) {
      return { success: false, output: '', timedOut: false, error: 'Shell session not found' };
    }

    const timeout = timeoutMs || session.commandTimeout;
    if (!timeout) {
      return { success: false, output: '', timedOut: false, error: 'No timeout specified' };
    }

    session.buffer = '';
    session.lastCommandStart = Date.now();
    session.stream.write(`${command}\n`);

    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      await new Promise(resolve => setTimeout(resolve, 200));

      const prompt = this.detectPrompt(shellId);
      if (prompt.type === 'shell_ready') {
        return {
          success: true,
          output: stripAnsi(session.buffer),
          timedOut: false,
        };
      }

      // Check for error conditions
      if (['permission_denied', 'command_not_found', 'auth_failure'].includes(prompt.type)) {
        return {
          success: false,
          output: stripAnsi(session.buffer),
          timedOut: false,
          error: prompt.type,
        };
      }
    }

    // Timeout - send Ctrl+C
    session.stream.write('\x03');
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      success: false,
      output: stripAnsi(session.buffer),
      timedOut: true,
      error: `Command timed out after ${timeout}ms`,
    };
  }

  // ============================================
  // WORKING DIRECTORY TRACKING
  // ============================================

  /**
   * Get current working directory
   */
  async getCwd(shellId: string): Promise<{ cwd: string; error?: string }> {
    const session = this.sessions.get(shellId);
    if (!session) {
      return { cwd: '', error: 'Shell session not found' };
    }

    session.buffer = '';
    session.stream.write('pwd\n');
    await new Promise(resolve => setTimeout(resolve, 500));

    const output = stripAnsi(session.buffer);
    const lines = output.split('\n').filter((l: string) => l.trim() && !l.includes('pwd') && l.startsWith('/'));

    if (lines.length > 0) {
      const cwd = lines[0].trim();
      session.currentWorkingDir = cwd;
      return { cwd };
    }

    return { cwd: '', error: 'Could not determine working directory' };
  }

  /**
   * Change working directory
   */
  async setCwd(shellId: string, path: string): Promise<{ success: boolean; cwd: string; error?: string }> {
    const session = this.sessions.get(shellId);
    if (!session) {
      return { success: false, cwd: '', error: 'Shell session not found' };
    }

    session.buffer = '';
    session.stream.write(`cd "${path}" && pwd\n`);
    await new Promise(resolve => setTimeout(resolve, 500));

    const output = stripAnsi(session.buffer);

    // Check for errors
    if (output.includes('No such file or directory') || output.includes('Not a directory')) {
      return { success: false, cwd: session.currentWorkingDir || '', error: 'Directory not found' };
    }

    if (output.includes('Permission denied')) {
      return { success: false, cwd: session.currentWorkingDir || '', error: 'Permission denied' };
    }

    // Extract new cwd
    const lines = output.split('\n').filter((l: string) => l.trim() && l.startsWith('/'));
    if (lines.length > 0) {
      const newCwd = lines[lines.length - 1].trim();
      session.currentWorkingDir = newCwd;
      return { success: true, cwd: newCwd };
    }

    return { success: false, cwd: '', error: 'Could not change directory' };
  }

  // ============================================
  // RECONNECT HANDLING
  // ============================================

  /**
   * Configure auto-reconnect settings
   */
  setAutoReconnect(
    shellId: string,
    options: { enabled?: boolean; maxAttempts?: number }
  ): { success: boolean; error?: string } {
    const session = this.sessions.get(shellId);
    if (!session) {
      return { success: false, error: 'Shell session not found' };
    }

    if (options.enabled !== undefined) {
      session.autoReconnect = options.enabled;
    }
    if (options.maxAttempts !== undefined) {
      session.maxReconnectAttempts = options.maxAttempts;
    }

    return { success: true };
  }

  /**
   * Attempt to reconnect a dropped session
   */
  async reconnect(shellId: string): Promise<{ success: boolean; newShellId?: string; error?: string }> {
    const session = this.sessions.get(shellId);
    if (!session) {
      return { success: false, error: 'Shell session not found' };
    }

    if (session.isActive) {
      return { success: false, error: 'Session is still active' };
    }

    if (session.reconnectAttempts >= session.maxReconnectAttempts) {
      return { success: false, error: `Max reconnect attempts (${session.maxReconnectAttempts}) reached` };
    }

    session.reconnectAttempts++;
    console.log(`[Reconnect] Attempt ${session.reconnectAttempts}/${session.maxReconnectAttempts} for shell ${shellId}`);

    // Try to create a new shell with same connection
    const result = await this.createShell(session.connectionId);

    if (result.error) {
      return { success: false, error: `Reconnect failed: ${result.error}` };
    }

    // Copy settings to new session
    const newSession = this.sessions.get(result.shellId);
    if (newSession) {
      newSession.sudoPassword = session.sudoPassword;
      newSession.autoRespondSudo = session.autoRespondSudo;
      newSession.autoRespondYesNo = session.autoRespondYesNo;
      newSession.autoRespondHostKey = session.autoRespondHostKey;
      newSession.autoRespondOverwrite = session.autoRespondOverwrite;
      newSession.autoRespondPackage = session.autoRespondPackage;
      newSession.autoRespondMore = session.autoRespondMore;
      newSession.autoReconnect = session.autoReconnect;
      newSession.maxReconnectAttempts = session.maxReconnectAttempts;
      newSession.commandTimeout = session.commandTimeout;

      // Try to restore CWD
      if (session.currentWorkingDir) {
        await this.setCwd(result.shellId, session.currentWorkingDir);
      }
    }

    // Remove old session
    this.sessions.delete(shellId);

    return { success: true, newShellId: result.shellId };
  }

  /**
   * Check if session is still connected
   */
  isConnected(shellId: string): boolean {
    const session = this.sessions.get(shellId);
    return session?.isActive ?? false;
  }

  // ============================================
  // ENVIRONMENT VARIABLES
  // ============================================

  /**
   * Get environment variable
   */
  async getEnv(shellId: string, varName: string): Promise<{ value: string; error?: string }> {
    const session = this.sessions.get(shellId);
    if (!session) {
      return { value: '', error: 'Shell session not found' };
    }

    session.buffer = '';
    session.stream.write(`echo $${varName}\n`);
    await new Promise(resolve => setTimeout(resolve, 500));

    const output = stripAnsi(session.buffer);
    const lines = output.split('\n').filter((l: string) => l.trim() && !l.includes(`echo $${varName}`));

    if (lines.length > 0) {
      return { value: lines[0].trim() };
    }

    return { value: '' };
  }

  /**
   * Set environment variable
   */
  async setEnv(shellId: string, varName: string, value: string): Promise<{ success: boolean; error?: string }> {
    const session = this.sessions.get(shellId);
    if (!session) {
      return { success: false, error: 'Shell session not found' };
    }

    // Escape value for shell
    const escapedValue = value.replace(/'/g, "'\\''");
    session.stream.write(`export ${varName}='${escapedValue}'\n`);
    await new Promise(resolve => setTimeout(resolve, 300));

    return { success: true };
  }

  /**
   * Get all environment variables
   */
  async getAllEnv(shellId: string): Promise<{ env: Record<string, string>; error?: string }> {
    const session = this.sessions.get(shellId);
    if (!session) {
      return { env: {}, error: 'Shell session not found' };
    }

    session.buffer = '';
    session.stream.write('env\n');
    await new Promise(resolve => setTimeout(resolve, 1000));

    const output = stripAnsi(session.buffer);
    const env: Record<string, string> = {};

    const lines = output.split('\n');
    for (const line of lines) {
      const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (match) {
        env[match[1]] = match[2];
      }
    }

    return { env };
  }

  // ============================================
  // EXIT CODE & COMMAND EXECUTION
  // ============================================

  /**
   * Get exit code of last command
   */
  async getLastExitCode(shellId: string): Promise<{ exitCode: number; error?: string }> {
    const session = this.sessions.get(shellId);
    if (!session) {
      return { exitCode: -1, error: 'Shell session not found' };
    }

    session.buffer = '';
    session.stream.write('echo $?\n');
    await new Promise(resolve => setTimeout(resolve, 500));

    const output = stripAnsi(session.buffer);
    const lines = output.split('\n').filter((l: string) => /^\d+$/.test(l.trim()));

    if (lines.length > 0) {
      return { exitCode: parseInt(lines[0].trim(), 10) };
    }

    return { exitCode: -1, error: 'Could not get exit code' };
  }

  /**
   * Execute command and return exit code
   */
  async executeAndGetExitCode(
    shellId: string,
    command: string
  ): Promise<{ exitCode: number; output: string; error?: string }> {
    const session = this.sessions.get(shellId);
    if (!session) {
      return { exitCode: -1, output: '', error: 'Shell session not found' };
    }

    session.buffer = '';
    // Run command with exit code marker
    session.stream.write(`${command}; echo "___EXIT_CODE_$?___"\n`);

    // Wait for completion
    let attempts = 0;
    const maxAttempts = 60; // 30 seconds max

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 500));

      const output = stripAnsi(session.buffer);
      const exitCodeMatch = output.match(/___EXIT_CODE_(\d+)___/);

      if (exitCodeMatch) {
        const exitCode = parseInt(exitCodeMatch[1], 10);
        const cleanOutput = output.replace(/___EXIT_CODE_\d+___/, '').trim();
        return { exitCode, output: cleanOutput };
      }

      attempts++;
    }

    return { exitCode: -1, output: stripAnsi(session.buffer), error: 'Timeout waiting for command' };
  }

  // ============================================
  // TERMINAL RESIZE
  // ============================================

  /**
   * Resize PTY terminal
   */
  resizeTerminal(
    shellId: string,
    cols: number,
    rows: number
  ): { success: boolean; error?: string } {
    const session = this.sessions.get(shellId);
    if (!session) {
      return { success: false, error: 'Shell session not found' };
    }

    try {
      session.stream.setWindow(rows, cols, 0, 0);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // ============================================
  // COMMAND HISTORY
  // ============================================

  /**
   * Get command history
   */
  async getHistory(shellId: string, count: number = 50): Promise<{ history: string[]; error?: string }> {
    const session = this.sessions.get(shellId);
    if (!session) {
      return { history: [], error: 'Shell session not found' };
    }

    session.buffer = '';
    session.stream.write(`history ${count} 2>/dev/null || fc -l -${count} 2>/dev/null\n`);
    await new Promise(resolve => setTimeout(resolve, 1000));

    const output = stripAnsi(session.buffer);
    const lines = output.split('\n')
      .filter((l: string) => l.trim() && !l.includes('history') && !l.includes('fc -l'))
      .map((l: string) => l.replace(/^\s*\d+\s+/, '').trim())
      .filter((l: string) => l.length > 0);

    return { history: lines };
  }

  /**
   * Search command history
   */
  async searchHistory(shellId: string, pattern: string): Promise<{ matches: string[]; error?: string }> {
    const session = this.sessions.get(shellId);
    if (!session) {
      return { matches: [], error: 'Shell session not found' };
    }

    session.buffer = '';
    session.stream.write(`history | grep "${pattern}" 2>/dev/null\n`);
    await new Promise(resolve => setTimeout(resolve, 1000));

    const output = stripAnsi(session.buffer);
    const lines = output.split('\n')
      .filter((l: string) => l.trim() && !l.includes('history | grep'))
      .map((l: string) => l.replace(/^\s*\d+\s+/, '').trim())
      .filter((l: string) => l.length > 0);

    return { matches: lines };
  }

  // ============================================
  // PROCESS MANAGEMENT
  // ============================================

  /**
   * List running processes
   */
  async listProcesses(
    shellId: string,
    options?: { user?: string; all?: boolean }
  ): Promise<{ processes: Array<{ pid: number; user: string; cpu: string; mem: string; command: string }>; error?: string }> {
    const session = this.sessions.get(shellId);
    if (!session) {
      return { processes: [], error: 'Shell session not found' };
    }

    session.buffer = '';

    let psCommand = 'ps aux';
    if (options?.user) {
      psCommand = `ps -u ${options.user} -o pid,user,%cpu,%mem,command`;
    } else if (!options?.all) {
      psCommand = 'ps -u $USER -o pid,user,%cpu,%mem,command';
    }

    session.stream.write(`${psCommand}\n`);
    await new Promise(resolve => setTimeout(resolve, 1000));

    const output = stripAnsi(session.buffer);
    const lines = output.split('\n').filter((l: string) => l.trim() && !l.startsWith('USER') && !l.startsWith('PID'));

    const processes = lines
      .map((line: string) => {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 5) {
          // ps aux format: USER PID %CPU %MEM VSZ RSS TTY STAT START TIME COMMAND
          // ps -o format: PID USER %CPU %MEM COMMAND
          if (options?.user || !options?.all) {
            return {
              pid: parseInt(parts[0], 10),
              user: parts[1],
              cpu: parts[2],
              mem: parts[3],
              command: parts.slice(4).join(' '),
            };
          } else {
            return {
              pid: parseInt(parts[1], 10),
              user: parts[0],
              cpu: parts[2],
              mem: parts[3],
              command: parts.slice(10).join(' '),
            };
          }
        }
        return null;
      })
      .filter((p: { pid: number; user: string; cpu: string; mem: string; command: string } | null): p is { pid: number; user: string; cpu: string; mem: string; command: string } => p !== null && !isNaN(p.pid));

    return { processes };
  }

  /**
   * Kill process by PID
   */
  async killProcess(
    shellId: string,
    pid: number,
    signal: number = 15
  ): Promise<{ success: boolean; error?: string }> {
    const session = this.sessions.get(shellId);
    if (!session) {
      return { success: false, error: 'Shell session not found' };
    }

    session.buffer = '';
    session.stream.write(`kill -${signal} ${pid} 2>&1\n`);
    await new Promise(resolve => setTimeout(resolve, 500));

    const output = stripAnsi(session.buffer);

    if (output.includes('No such process')) {
      return { success: false, error: 'Process not found' };
    }
    if (output.includes('Operation not permitted') || output.includes('Permission denied')) {
      return { success: false, error: 'Permission denied' };
    }

    return { success: true };
  }

  // ============================================
  // FILE OPERATIONS (via shell)
  // ============================================

  /**
   * Check if file/directory exists
   */
  async fileExists(shellId: string, path: string): Promise<{ exists: boolean; isDir: boolean; error?: string }> {
    const session = this.sessions.get(shellId);
    if (!session) {
      return { exists: false, isDir: false, error: 'Shell session not found' };
    }

    session.buffer = '';
    session.stream.write(`test -e "${path}" && echo "EXISTS" && test -d "${path}" && echo "ISDIR"\n`);
    await new Promise(resolve => setTimeout(resolve, 500));

    const output = stripAnsi(session.buffer);

    return {
      exists: output.includes('EXISTS'),
      isDir: output.includes('ISDIR'),
    };
  }

  /**
   * Read file content
   */
  async readFile(shellId: string, path: string, maxLines?: number): Promise<{ content: string; error?: string }> {
    const session = this.sessions.get(shellId);
    if (!session) {
      return { content: '', error: 'Shell session not found' };
    }

    session.buffer = '';

    const catCommand = maxLines ? `head -n ${maxLines} "${path}"` : `cat "${path}"`;
    session.stream.write(`${catCommand} 2>&1\n`);
    await new Promise(resolve => setTimeout(resolve, 1000));

    const output = stripAnsi(session.buffer);

    if (output.includes('No such file or directory')) {
      return { content: '', error: 'File not found' };
    }
    if (output.includes('Permission denied')) {
      return { content: '', error: 'Permission denied' };
    }
    if (output.includes('Is a directory')) {
      return { content: '', error: 'Path is a directory' };
    }

    // Remove the command echo from output
    const lines = output.split('\n');
    const contentLines = lines.filter((l: string) => !l.includes(catCommand.substring(0, 20)));

    return { content: contentLines.join('\n').trim() };
  }

  /**
   * List directory contents
   */
  async listDir(
    shellId: string,
    path: string = '.',
    options?: { all?: boolean; long?: boolean }
  ): Promise<{ entries: string[]; error?: string }> {
    const session = this.sessions.get(shellId);
    if (!session) {
      return { entries: [], error: 'Shell session not found' };
    }

    session.buffer = '';

    let lsCommand = 'ls';
    if (options?.all) lsCommand += ' -a';
    if (options?.long) lsCommand += ' -l';
    lsCommand += ` "${path}" 2>&1`;

    session.stream.write(`${lsCommand}\n`);
    await new Promise(resolve => setTimeout(resolve, 1000));

    const output = stripAnsi(session.buffer);

    if (output.includes('No such file or directory')) {
      return { entries: [], error: 'Directory not found' };
    }
    if (output.includes('Permission denied')) {
      return { entries: [], error: 'Permission denied' };
    }

    const lines = output.split('\n')
      .filter((l: string) => l.trim() && !l.includes(lsCommand.substring(0, 10)) && !l.startsWith('total'));

    return { entries: lines };
  }
}
