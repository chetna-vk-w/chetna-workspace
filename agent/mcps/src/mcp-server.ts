#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');

import { Storage } from './storage';
import { SSHManager } from './ssh-manager';
import { InteractiveSessionManager } from './interactive-session';
import { SFTPManager } from './sftp-manager';
import { StreamManager } from './stream-manager';
import { ALL_TOOLS } from './tools';
import type { SSHConnectionConfig, CommandRequest, LogFilter } from './types';

// Dynamically inject search tool (must NOT be deferred)
ALL_TOOLS.unshift({
  name: 'ssh_tool_search',
  description: '[meta] Search for SSH tools by keyword with fuzzy matching. Returns schemas for matching tools.\nWeighted: exact name 100%, prefix 90%, partial 80%, description match 30-40%.',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Keyword to search for in tool names and descriptions' },
    },
    required: ['query'],
  },
});

function success(message: string) {
  const timestamp = new Date().toISOString();
  return { content: [{ type: 'text', text: `✓ [success] [${timestamp}]: ${message}` }] };
}

function error(message: string) {
  const timestamp = new Date().toISOString();
  return { content: [{ type: 'text', text: `✗ [failed] [${timestamp}]: ${message}` }], isError: true };
}

function validationError(message: string) {
  return error(message);
}

function notFoundError(resource: string, identifier: string) {
  return error(`${resource} not found: "${identifier}". Use ssh_conn_list or ssh_background_exec_list to find valid IDs.`);
}

/**
 * MCP Server with integrated SSH Persistence
 * 
 * Environment Variables:
 * - KEEP_ALIVE_TIMEOUT: Keep process alive interval (default: 24h)
 * - AUTO_SHUTDOWN_TIMEOUT: Auto-shutdown after inactivity (default: disabled)
 * - DB_PATH: Path to SQLite database (default: ./ssh_connections.db)
 * - MAX_CONCURRENT_SESSIONS: Max concurrent SSH sessions (default: 10)
 * - ENABLE_DEFER_LOADING: Show only ssh_tool_search (default: false)
 * - SESSION_TIMEOUT: Session inactivity timeout in ms (default: 2h)
 * - COMMAND_TIMEOUT: Default command timeout in ms (default: 5min)
 * - MAX_OUTPUT_SIZE: Max output bytes per command (default: 1MB)
 */
class SSHMCPServer {
  private server: any;
  private storage: Storage;
  private sshManager: SSHManager;
  private interactiveManager: InteractiveSessionManager;
  private sftpManager: SFTPManager;
  private lastActivity: number;
  private keepAliveInterval: any;
  private autoShutdownInterval: any;
  private keepAliveTimeout: number;
  private autoShutdownTimeout: number;
  private sessionTimeout: number;
  private commandTimeout: number;
  private maxOutputSize: number;

  constructor() {
    // Configuration from environment variables
    this.keepAliveTimeout = parseInt(process.env.KEEP_ALIVE_TIMEOUT || '86400000'); // 24 hours default
    this.autoShutdownTimeout = parseInt(process.env.AUTO_SHUTDOWN_TIMEOUT || '0'); // Disabled by default
    this.sessionTimeout = parseInt(process.env.SESSION_TIMEOUT || '7200000'); // 2 hours default
    this.commandTimeout = parseInt(process.env.COMMAND_TIMEOUT || '300000'); // 5 min default
    this.maxOutputSize = parseInt(process.env.MAX_OUTPUT_SIZE || '1048576'); // 1MB default
    const dbPath = process.env.DB_PATH || './ssh_connections.db';

    // Initialize storage and managers
    const wsPort = parseInt(process.env.WS_PORT || '8765');
    const wsEnabled = process.env.WS_ENABLED !== 'false';
    const streamManager = new StreamManager(wsPort, wsEnabled);

    this.storage = new Storage(dbPath);
    this.sshManager = new SSHManager(this.storage);
    this.interactiveManager = new InteractiveSessionManager(this.storage, streamManager);
    this.sftpManager = new SFTPManager(this.storage);
    this.lastActivity = Date.now();

    // Initialize MCP server
    this.server = new Server(
      {
        name: 'ssh-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          prompts: {},
        },
      }
    );

    this.setupHandlers();
    this.setupKeepAlive();
    this.setupAutoShutdown();
  }

  /**
   * Update last activity timestamp
   */
  private updateActivity(): void {
    this.lastActivity = Date.now();
  }

  /**
   * Setup keep-alive interval
   */
  private setupKeepAlive(): void {
    // Keep process alive
    this.keepAliveInterval = setInterval(() => {
      const uptime = Date.now() - this.lastActivity;
      console.error(`[KeepAlive] Process alive. Last activity: ${Math.floor(uptime / 1000)}s ago`);
    }, this.keepAliveTimeout);

    console.error(`[KeepAlive] Configured with ${this.keepAliveTimeout}ms interval`);
  }

  /**
   * Setup auto-shutdown based on inactivity
   */
  private setupAutoShutdown(): void {
    if (this.autoShutdownTimeout > 0) {
      this.autoShutdownInterval = setInterval(() => {
        const inactiveTime = Date.now() - this.lastActivity;
        if (inactiveTime > this.autoShutdownTimeout) {
          console.error(`[AutoShutdown] Inactive for ${Math.floor(inactiveTime / 1000)}s. Shutting down...`);
          this.shutdown();
        }
      }, 60000); // Check every minute

      console.error(`[AutoShutdown] Configured with ${this.autoShutdownTimeout}ms timeout`);
    } else {
      console.error('[AutoShutdown] Disabled');
    }
  }

  /**
   * Resolve connection from args (connectionId, or host+username)
   */
  private resolveConnection(args: any): SSHConnectionConfig | null {
    if (!args) return null;
    
    if (args.connectionId) {
      return this.storage.getConnection(args.connectionId);
    }
    
    if (args.host && args.username) {
      const connections = this.storage.listConnections();
      return connections.find((c: any) => 
        c.host.toLowerCase() === args.host.toLowerCase() || 
        c.host.toLowerCase().includes(args.host.toLowerCase())
      ) || null;
    }

    if (args.name) {
      const connections = this.storage.listConnections();
      return connections.find((c: any) => 
        c.name.toLowerCase().includes(args.name.toLowerCase())
      ) || null;
    }
    
    return null;
  }

  /**
   * Validate required fields
   */
  private validateRequired(args: any, fields: string[]): string | null {
    for (const field of fields) {
      if (!args[field] || (typeof args[field] === 'string' && !args[field].trim())) {
        return `Missing required field: ${field}`;
      }
    }
    return null;
  }

  /**
   * Setup MCP request handlers
   */
  private setupHandlers(): void {
    // ============================================
    // PROMPTS (Reusable Workflows)
    // ============================================
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      return {
        prompts: [
          {
            name: "ssh_troubleshoot_connection",
            description: "Guides the user through troubleshooting an SSH connection using the SSH MCP tools.",
            arguments: [
              {
                name: "hostname",
                description: "The hostname or IP address failing to connect",
                required: true
              }
            ]
          },
          {
            name: "ssh_log_analysis",
            description: "A prompt to help analyze server logs via SSH using tools.",
            arguments: [
              {
                name: "service",
                description: "The service to analyze (e.g., nginx, syslog)",
                required: true
              }
            ]
          },
          {
            name: "ssh_deploy_app",
            description: "A prompt demonstrating how to deploy an app using the preferred persistent non-interactive exec tools.",
            arguments: [
              {
                name: "repo_url",
                description: "The Git repository URL to deploy",
                required: true
              }
            ]
          },
          {
            name: "ssh_system_update",
            description: "A prompt for running a system update using persistent non-interactive exec tools.",
            arguments: []
          }
        ]
      };
    });

    this.server.setRequestHandler(GetPromptRequestSchema, async (request: any) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'ssh_tool_search': {
          const query = String(args.query || '').toLowerCase();

          const results = ALL_TOOLS.filter((t: any) =>
            t.name.toLowerCase().includes(query) ||
            (t.description && t.description.toLowerCase().includes(query))
          );

          if (results.length === 0) {
            return {
              content: [{ type: 'text', text: `No tools found matching '${query}'. Try a broader keyword.` }]
            };
          }

          const formatted = results.map((t: any) =>
            `--- Tool: ${t.name} ---\nDescription: ${t.description}\nSchema: ${JSON.stringify(t.inputSchema, null, 2)}`
          ).join('\n\n');

          return {
            content: [{ type: 'text', text: `Found ${results.length} matching tools:\n\n${formatted}` }]
          };
        }

        case "ssh_troubleshoot_connection":
          return {
            description: "Troubleshoot SSH connection issues",
            messages: [
              {
                role: "user",
                content: {
                  type: "text",
                  text: `I'm having trouble connecting to ${args?.hostname}. Please use the ssh_conn_test tool to verify connectivity. If it fails, explain the potential causes and how to fix them.`
                }
              }
            ]
          };
        case "ssh_log_analysis":
          return {
            description: `Analyze logs for ${args?.service}`,
            messages: [
              {
                role: "user",
                content: {
                  type: "text",
                  text: `Please analyze the logs for ${args?.service}. First context: use ssh_conn_list to find an active connection or ask me to provide one. Then use ssh_background_exec_open and ssh_background_exec_run to fetch the logs using 'journalctl -u ${args?.service} -n 50' or checking '/var/log/${args?.service}/error.log'. Analyze any errors found.`
                }
              }
            ]
          };
        case "ssh_deploy_app":
          return {
            description: "Deploy an application non-interactively",
            messages: [
              {
                role: "user",
                content: {
                  type: "text",
                  text: `Please deploy the app from ${args?.repo_url}. First use ssh_conn_save, then use ssh_background_exec_open (preferred for non-interactive persistence), and run commands like 'git clone' and 'npm install' using ssh_background_exec_run, tracking them via ssh_background_exec_status/logs. Use non-interactive exec tools heavily, avoiding ssh_interactive_shell_open unless strict UI keys are needed.`
                }
              }
            ]
          };
        case "ssh_system_update":
          return {
            description: "Run a non-interactive system update",
            messages: [
              {
                role: "user",
                content: {
                  type: "text",
                  text: `Please run a system update (e.g., 'apt-get update && apt-get upgrade -y'). Use the preferred non-interactive tools: ssh_background_exec_open and ssh_background_exec_run. Wait for completion via ssh_background_exec_status and check the ssh_background_exec_logs. Do not use the interactive shell.`
                }
              }
            ]
          };
        default:
          throw new Error(`Unknown prompt: ${name}`);
      }
    });

    // List available tools - organized hierarchically
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      // When ENABLE_DEFER_LOADING is set to true, only expose ssh_tool_search.
      // The LLM must use ssh_tool_search to discover and call other tools.
      // Set ENABLE_DEFER_LOADING=true to enable deferred loading (lower token usage).
      const enableDeferLoading = process.env.ENABLE_DEFER_LOADING === 'true';

      const tools = enableDeferLoading
        ? ALL_TOOLS.filter(t => t.name === 'ssh_tool_search')
        : ALL_TOOLS;

      return { tools };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
      this.updateActivity();

      try {
        const { name, arguments: args } = request.params;

        switch (name) {
          case 'ssh_server_status': {
            const uptime = Date.now() - this.lastActivity;
            const execSessions = this.sshManager.listSessions();
            const shellSessions = this.interactiveManager.listShells();
            const savedConnections = this.storage.listConnections();

            const status = {
              uptime_ms: uptime,
              uptime_hours: (uptime / 3600000).toFixed(2),
              config: {
                keepAliveTimeout: this.keepAliveTimeout,
                autoShutdownTimeout: this.autoShutdownTimeout,
                sessionTimeout: this.sessionTimeout,
                commandTimeout: this.commandTimeout,
                maxOutputSize: this.maxOutputSize,
              },
              resources: {
                saved_connections: savedConnections.length,
                active_exec_sessions: execSessions.length,
                active_shells: shellSessions.length,
                total_active_sessions: execSessions.length + shellSessions.length,
              },
            };

            return success(`Server status:\n${JSON.stringify(status, null, 2)}`);
          }

          case 'ssh_stream_info': {
            const streamUrl = this.interactiveManager.getStreamUrl();
            return success(`WebSocket streaming server:\nURL: ${streamUrl}\n\nTo receive live shell output:\n1. Connect to WebSocket\n2. Send: {"subscribe": "shell-id"}\n3. Receive real-time output!\n\nExample:\nconst ws = new WebSocket('${streamUrl}');\nws.on('message', (data) => console.log(data.toString()));\nws.send(JSON.stringify({ subscribe: 'your-shell-id' }));`);
          }

          // ============================================
          // CONSOLIDATED TOOL HANDLERS
          // ============================================
          
          case 'ssh_conn': {
            const op = args.op;
            switch (op) {
              case 'test': {
                const config: SSHConnectionConfig = {
                  name: args.name || 'test',
                  host: args.host,
                  port: args.port || 22,
                  username: args.username,
                  password: args.password,
                  privateKey: args.privateKey,
                  privateKeyPath: args.privateKeyPath,
                  passphrase: args.passphrase,
                };
                const result = await this.sshManager.testConnection(config);
                return result.success
                  ? success(`Connection test successful for ${config.host}`)
                  : error(`Connection test failed: ${result.error}`);
              }
              case 'save': {
                const validationErrorMsg = this.validateRequired(args, ['name', 'host', 'username']);
                if (validationErrorMsg) return validationError(validationErrorMsg);
                
                const config: SSHConnectionConfig = {
                  name: args.name,
                  host: args.host,
                  port: args.port || 22,
                  username: args.username,
                  password: args.password,
                  privateKey: args.privateKey,
                  privateKeyPath: args.privateKeyPath,
                  passphrase: args.passphrase,
                };
                const testResult = await this.sshManager.testConnection(config);
                if (!testResult.success) {
                  return error(`Cannot save connection - test failed: ${testResult.error}`);
                }
                const connectionId = this.storage.saveConnection(config);
                return success(`Connection saved successfully. ID: ${connectionId}`);
              }
              case 'list': {
                const connections = this.storage.listConnections();
                const safeConnections = connections.map((c: any) => ({
                  id: c.id, name: c.name, host: c.host, port: c.port,
                  username: c.username, authType: c.privateKey ? 'key' : c.password ? 'password' : 'none',
                }));
                return { content: [{ type: 'text', text: JSON.stringify(safeConnections, null, 2) }] };
              }
              default:
                return error(`Unknown ssh_conn operation: ${op}. Use: test, save, list`);
            }
          }

          case 'ssh_exec': {
            const op = args.op;
            switch (op) {
              case 'open': {
                const config = this.resolveConnection(args);
                if (!config) return notFoundError('Connection', args.connectionId || args.host || args.name);
                const sessionResult = await this.sshManager.connect(config);
                if (sessionResult.error) return error(`Connection failed: ${sessionResult.error}`);
                return success(`Connected successfully. Session ID: ${sessionResult.sessionId}`);
              }
              case 'close': {
                const disconnected = this.sshManager.disconnect(args.sessionId);
                return disconnected ? success('Session disconnected successfully') : error('Session not found');
              }
              case 'list': {
                const sessions = this.sshManager.listSessions();
                return success(`Active sessions:\n${JSON.stringify(sessions, null, 2)}`);
              }
              case 'run': {
                const commandRequest: CommandRequest = { sessionId: args.sessionId, command: args.command };
                const result = await this.sshManager.executeCommand(commandRequest);
                return success(`Command submitted (non-blocking). Command ID: ${result.commandId}\nStatus: ${result.status}\nUse ssh_exec status/logs to check progress.`);
              }
              case 'status': {
                const status = this.storage.getCommandStatus(args.commandId);
                if (!status) return error('Command not found');
                return success(`Command status:\n${JSON.stringify(status, null, 2)}`);
              }
              case 'logs': {
                const filter: LogFilter = {
                  commandId: args.commandId, sessionId: args.sessionId,
                  grep: args.grep, head: args.head, tail: args.tail || (args.head ? undefined : 200),
                  stream: args.stream || 'both',
                };
                const logs = this.storage.getLogs(filter);
                let formattedLogs = logs.map(log => `[${log.stream}] Line ${log.lineNumber}: ${log.content}`).join('\n');
                if (formattedLogs.length > this.maxOutputSize) {
                  formattedLogs = formattedLogs.slice(0, this.maxOutputSize) + '\n\n[WARNING: Output truncated]';
                }
                return success(formattedLogs || 'No logs found');
              }
              default:
                return error(`Unknown ssh_exec operation: ${op}. Use: open, close, list, run, status, logs`);
            }
          }

          case 'ssh_shell': {
            const op = args.op;
            switch (op) {
              case 'open': {
                const config = this.resolveConnection(args);
                if (!config) return notFoundError('Connection', args.connectionId || args.host || args.name);
                const result = await this.interactiveManager.createShell(config);
                if (result.error) return error(`Failed to create shell: ${result.error}`);
                return success(`Shell created. ID: ${result.shellId}\nSession ID: ${result.sessionId}\nWebSocket: ${result.streamUrl}`);
              }
              case 'close': {
                const closed = this.interactiveManager.closeShell(args.shellId);
                return closed ? success('Shell closed') : error('Shell not found');
              }
              case 'list': {
                const shells = this.interactiveManager.listShells();
                return success(`Active shells:\n${JSON.stringify(shells, null, 2)}`);
              }
              case 'send': {
                this.interactiveManager.sendInput(args.shellId, args.input);
                return success('Input sent');
              }
              case 'read': {
                const result = this.interactiveManager.getCleanOutput(args.shellId, args.clear || false, true, args.screenOnly !== false);
                return success(result.output);
              }
              case 'status': {
                const status = this.interactiveManager.getShellStatus(args.shellId);
                return success(`Shell status:\n${JSON.stringify(status, null, 2)}`);
              }
              case 'exec': {
                const result = await this.interactiveManager.executeAndGetExitCode(args.shellId, args.command);
                if (result.error) return error(result.error);
                return success(`Exit code: ${result.exitCode}\nOutput:\n${result.output}`);
              }
              case 'timeout': {
                const result = await this.interactiveManager.executeWithTimeout(args.shellId, args.command, args.timeout);
                return success(`Success: ${result.success}\nTimed out: ${result.timedOut}\nOutput:\n${result.output}`);
              }
              case 'signal': {
                if (args.signal === 'ctrl_c') this.interactiveManager.interrupt(args.shellId);
                else if (args.signal === 'ctrl_d') this.interactiveManager.sendEOF(args.shellId);
                else if (args.signal === 'ctrl_z') this.interactiveManager.suspend(args.shellId);
                return success('Signal sent');
              }
              case 'key': {
                const result = this.interactiveManager.sendSpecialKey(args.shellId, args.key);
                return result ? success('Key sent') : error('Failed to send key');
              }
              case 'cwd': {
                if (args.path) {
                  const result = await this.interactiveManager.setCwd(args.shellId, args.path);
                  return success(`Working directory set to: ${result}`);
                }
                const cwd = await this.interactiveManager.getCwd(args.shellId);
                return success(`Working directory: ${cwd}`);
              }
              case 'env': {
                if (args.action === 'get') {
                  const value = await this.interactiveManager.getEnv(args.shellId, args.envName);
                  return success(`${args.envName}=${value}`);
                } else if (args.action === 'set') {
                  await this.interactiveManager.setEnv(args.shellId, args.envName, args.envValue);
                  return success('Environment variable set');
                } else {
                  const all = await this.interactiveManager.getAllEnv(args.shellId);
                  return success(`Environment:\n${all}`);
                }
              }
              case 'config': {
                const options: any = {};
                if (args.autoSudo !== undefined) options.autoSudo = args.autoSudo;
                if (args.autoYesNo !== undefined) options.autoYesNo = args.autoYesNo;
                if (args.sudoPassword !== undefined) options.sudoPassword = args.sudoPassword;
                if (args.autoHostKey !== undefined) options.autoHostKey = args.autoHostKey;
                if (args.autoOverwrite !== undefined) options.autoOverwrite = args.autoOverwrite;
                if (args.autoPackage !== undefined) options.autoPackage = args.autoPackage;
                if (args.autoMore !== undefined) options.autoMore = args.autoMore;
                this.interactiveManager.setAutoRespond(args.shellId, options);
                return success('Shell configured');
              }
              case 'reconnect': {
                const result = await this.interactiveManager.reconnect(args.shellId);
                return result ? success('Shell reconnected') : error('Failed to reconnect');
              }
              default:
                return error(`Unknown ssh_shell operation: ${op}`);
            }
          }

          case 'ssh_sftp': {
            const op = args.op;
            const connectionId = args.connectionId;
            if (!connectionId && op !== 'list') return notFoundError('Connection', connectionId || '');
            
            switch (op) {
              case 'list': {
                if (connectionId) {
                  const result = await this.sftpManager.list(connectionId, args.remotePath || '.');
                  if (result.error) return error(result.error);
                  return success(result.entries.map(e => `${e.type} ${e.size} ${e.name}`).join('\n'));
                }
                return error('Connection ID required');
              }
              case 'stat': {
                const result = await this.sftpManager.stat(connectionId!, args.remotePath);
                if (result.error) return error(result.error);
                return success(JSON.stringify(result, null, 2));
              }
              case 'mkdir': {
                const result = await this.sftpManager.mkdir(connectionId!, args.remotePath);
                if (result.error) return error(result.error);
                return success('Directory created');
              }
              case 'delete': {
                const result = await this.sftpManager.deleteFile(connectionId!, args.remotePath);
                if (result.error) return error(result.error);
                return success('Deleted');
              }
              case 'upload': {
                const result = await this.sftpManager.upload(connectionId!, args.localPath, args.remotePath);
                if (result.error) return error(result.error);
                return success(`File uploaded (${result.bytesTransferred} bytes)`);
              }
              case 'download': {
                const result = await this.sftpManager.download(connectionId!, args.remotePath, args.localPath);
                if (result.error) return error(result.error);
                return success('File downloaded');
              }
              default:
                return error(`Unknown ssh_sftp operation: ${op}`);
            }
          }

          case 'ssh_file': {
            const op = args.op;
            if (!args.shellId) return error('Shell ID required for file operations');
            
            switch (op) {
              case 'write': {
                // Use shell to write file via echo/cat
                const content = args.content.replace(/'/g, "'\"'\"'");
                this.interactiveManager.sendInput(args.shellId, `cat > '${args.filePath}' << 'EOF'\n${args.content}\nEOF\n`);
                await new Promise(r => setTimeout(r, 500));
                const output = this.interactiveManager.getCleanOutput(args.shellId, false, true, true);
                return success('File written');
              }
              case 'replace': {
                await this.interactiveManager.replaceInFile(args.shellId, args.filePath, args.search, args.replace);
                return success('Text replaced');
              }
              case 'edit_line': {
                const result = await this.interactiveManager.editFile(args.shellId, args.filePath);
                if (result.error) return error(result.error);
                return success(`File edit session started. Edit ID: ${result.editId}`);
              }
              default:
                return error(`Unknown ssh_file operation: ${op}`);
            }
          }

          default:
            return {
              content: [{ type: 'text', text: `Unknown tool: ${name}. Use ssh_tool_search to find available tools.` }],
              isError: true,
            };
        }
      } catch (error: any) {
        console.error(`[SSHMCPServer] Tool error:`, error.message);
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message || 'An unexpected error occurred'}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    console.error('[SSHMCPServer] Server started');
    console.error(`[SSHMCPServer] Keep-alive timeout: ${this.keepAliveTimeout}ms`);
    console.error(`[SSHMCPServer] Auto-shutdown timeout: ${this.autoShutdownTimeout}ms`);
  }

  /**
   * Shutdown server gracefully
   */
  private shutdown(): void {
    console.error('[SSHMCPServer] Shutting down...');

    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
    }

    if (this.autoShutdownInterval) {
      clearInterval(this.autoShutdownInterval);
    }

    this.sshManager.closeAll();
    this.interactiveManager.closeAll();
    this.storage.close();

    process.exit(0);
  }
}

// Start the server
const server = new SSHMCPServer();
server.start().catch((error) => {
  console.error('[SSHMCPServer] Fatal error:', error);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.error('\n[SSHMCPServer] Received SIGINT, shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('\n[SSHMCPServer] Received SIGTERM, shutting down...');
  process.exit(0);
});
