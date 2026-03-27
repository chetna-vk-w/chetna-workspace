export const ALL_TOOLS: any[] = [
  // ============================================
  // META - Server info
  // ============================================
  {
    name: 'ssh_server_status',
    description: '[meta] Get server status: uptime, active sessions, connections, config.\nUse to check server health and resource usage.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'ssh_stream_info',
    description: '[meta] Get WebSocket URL for real-time shell streaming.\nConnect to ws://localhost:8765 and send: {"subscribe": "shell-id"} to receive live output.',
    inputSchema: { type: 'object', properties: {} },
  },

  // ============================================
  // CONNECTION - ssh_conn
  // ============================================
  {
    name: 'ssh_conn',
    description: '[conn] Connection management operations.\nOperations:\n- test: Verify SSH connection before saving\n- save: Save connection for reuse (returns connectionId)\n- list: List saved connections (id, name, host, username)\n\nExamples:\n`{"op": "test", "name": "prod", "host": "10.0.0.1", "username": "admin"}`\n`{"op": "list"}`',
    inputSchema: {
      type: 'object',
      properties: {
        op: { type: 'string', enum: ['test', 'save', 'list'], description: 'Operation' },
        name: { type: 'string', description: 'Connection name' },
        host: { type: 'string', description: 'SSH host or IP' },
        port: { type: 'number', description: 'SSH port (default: 22)' },
        username: { type: 'string', description: 'SSH username' },
        password: { type: 'string', description: 'Password' },
        privateKey: { type: 'string', description: 'Private key content' },
        privateKeyPath: { type: 'string', description: 'Path to private key file' },
        passphrase: { type: 'string', description: 'Key passphrase' },
      },
      required: ['op'],
    },
  },

  // ============================================
  // EXEC - Background commands (PREFERRED)
  // ============================================
  {
    name: 'ssh_exec',
    description: '[exec] Background command execution (non-blocking, preferred for most tasks).\nOperations:\n- open: Create persistent exec session (returns sessionId)\n- run: Execute command (returns commandId)\n- status: Check command status (running/completed/exit code)\n- logs: Get output with filters (grep, head, tail)\n- list: List active sessions\n- close: Close session\n\nFlow: ssh_exec open → ssh_exec run → ssh_exec status/logs → ssh_exec close\n\nExamples:\n`{"op": "run", "sessionId": "sess-123", "command": "apt-get update"}`\n`{"op": "logs", "commandId": "cmd-123", "tail": 50}`',
    inputSchema: {
      type: 'object',
      properties: {
        op: { type: 'string', enum: ['open', 'run', 'status', 'logs', 'list', 'close'], description: 'Operation' },
        connectionId: { type: 'string', description: 'Connection ID from ssh_conn save' },
        host: { type: 'string', description: 'SSH host (use with username)' },
        username: { type: 'string', description: 'SSH username' },
        name: { type: 'string', description: 'Connection name to search' },
        sessionId: { type: 'string', description: 'Session ID from ssh_exec open' },
        commandId: { type: 'string', description: 'Command ID from ssh_exec run' },
        command: { type: 'string', description: 'Command to execute' },
        grep: { type: 'string', description: 'Filter logs by pattern' },
        head: { type: 'number', description: 'First N lines' },
        tail: { type: 'number', description: 'Last N lines (default: 200)' },
        stream: { type: 'string', enum: ['stdout', 'stderr', 'both'], description: 'Stream type' },
      },
      required: ['op'],
    },
  },

  // ============================================
  // SHELL - Interactive PTY (use when needed)
  // ============================================
  {
    name: 'ssh_shell',
    description: '[shell] Interactive PTY shell operations (blocking, use when needed).\nUse for: vim/nano, sudo prompts, interactive CLI.\nPREFER ssh_exec for most tasks!\n\nOperations:\n- open: Create shell (returns shellId)\n- send: Send input (use \\n for Enter)\n- read: Get output buffer\n- status: Check shell status\n- close: Close shell\n- list: List active shells\n- exec: Run command and get exit code\n- signal: Send ctrl_c/ctrl_d/ctrl_z\n- key: Send special keys (up/down/tab/F1-F12)\n- cwd: Get/set working directory\n- env: Get/set environment variables\n- config: Configure auto-response (autoSudo, autoYesNo)\n- reconnect: Reconnect dropped session\n- timeout: Execute with timeout\n\nExamples:\n`{"op": "send", "shellId": "sh-123", "input": "ls -la\\n"}`\n`{"op": "read", "shellId": "sh-123", "screenOnly": true}`',
    inputSchema: {
      type: 'object',
      properties: {
        op: { type: 'string', enum: ['open', 'send', 'read', 'status', 'close', 'list', 'exec', 'signal', 'key', 'cwd', 'env', 'config', 'reconnect', 'timeout'], description: 'Operation' },
        connectionId: { type: 'string', description: 'Connection ID' },
        host: { type: 'string', description: 'SSH host' },
        username: { type: 'string', description: 'SSH username' },
        name: { type: 'string', description: 'Connection name to search' },
        shellId: { type: 'string', description: 'Shell ID' },
        input: { type: 'string', description: 'Input text (use \\n for Enter)' },
        clear: { type: 'boolean', description: 'Clear buffer after read' },
        stripAnsi: { type: 'boolean', description: 'Remove ANSI codes (default: true)' },
        filterGarbage: { type: 'boolean', description: 'Filter binary/garbage (default: true)' },
        screenOnly: { type: 'boolean', description: 'Show only current screen ~24 lines (default: true)' },
        command: { type: 'string', description: 'Command for exec/timeout operations' },
        timeout: { type: 'number', description: 'Timeout in ms for timeout operation' },
        signal: { type: 'string', enum: ['ctrl_c', 'ctrl_d', 'ctrl_z'], description: 'Signal type' },
        key: { type: 'string', description: 'Key: up, down, left, right, tab, enter, f1-f12' },
        path: { type: 'string', description: 'Path for cwd operation' },
        action: { type: 'string', enum: ['get', 'set', 'list'], description: 'Action for env operation' },
        envName: { type: 'string', description: 'Environment variable name' },
        envValue: { type: 'string', description: 'Environment variable value' },
        autoSudo: { type: 'boolean', description: 'Auto-respond sudo (default: true)' },
        autoYesNo: { type: 'string', enum: ['yes', 'no', 'disabled'], description: 'Auto-respond yes/no' },
        sudoPassword: { type: 'string', description: 'Custom sudo password' },
        autoHostKey: { type: 'boolean', description: 'Auto-accept host key (default: true)' },
        autoOverwrite: { type: 'string', enum: ['yes', 'no', 'disabled'], description: 'Auto-overwrite files' },
        autoPackage: { type: 'string', enum: ['yes', 'no', 'disabled'], description: 'Auto-package confirm' },
        autoMore: { type: 'boolean', description: 'Auto-handle --More-- (default: true)' },
      },
      required: ['op'],
    },
  },

  // ============================================
  // SFTP - File transfer
  // ============================================
  {
    name: 'ssh_sftp',
    description: '[sftp] SFTP file operations.\nOperations:\n- upload: Upload local file to remote\n- download: Download remote file to local\n- list: List directory contents\n- stat: Get file info (size, permissions, dates)\n- mkdir: Create directory\n- delete: Delete file/directory\n\nExamples:\n`{"op": "list", "connectionId": "conn-123", "remotePath": "/home/user"}`\n`{"op": "upload", "connectionId": "conn-123", "localPath": "./file.txt", "remotePath": "/tmp/file.txt"}`',
    inputSchema: {
      type: 'object',
      properties: {
        op: { type: 'string', enum: ['upload', 'download', 'list', 'stat', 'mkdir', 'delete'], description: 'Operation' },
        connectionId: { type: 'string', description: 'Connection ID from ssh_conn' },
        localPath: { type: 'string', description: 'Local file path (for upload/download)' },
        remotePath: { type: 'string', description: 'Remote file path' },
        recursive: { type: 'boolean', description: 'Delete directory recursively' },
      },
      required: ['op'],
    },
  },

  // ============================================
  // FILE - File editing (requires shell)
  // ============================================
  {
    name: 'ssh_file',
    description: '[file] File editing operations (requires shell).\n⚠️ Use ssh_sftp for large files!\n\nOperations:\n- write: Overwrite file with content\n- replace: Find and replace text\n- edit_line: Insert/append relative to pattern\n\nExamples:\n`{"op": "write", "shellId": "sh-123", "filePath": "/tmp/test.txt", "content": "hello world"}`\n`{"op": "replace", "shellId": "sh-123", "filePath": "/tmp/test.txt", "search": "old", "replace": "new"}`',
    inputSchema: {
      type: 'object',
      properties: {
        op: { type: 'string', enum: ['write', 'replace', 'edit_line'], description: 'Operation' },
        shellId: { type: 'string', description: 'Shell ID from ssh_shell open' },
        filePath: { type: 'string', description: 'File path' },
        content: { type: 'string', description: 'File content for write operation' },
        search: { type: 'string', description: 'Text to find for replace' },
        replace: { type: 'string', description: 'Replacement text' },
        operation: { type: 'string', enum: ['insert_after', 'insert_before', 'append_to_line', 'prepend_to_line'], description: 'Line operation' },
        pattern: { type: 'string', description: 'Pattern to find for edit_line' },
        text: { type: 'string', description: 'Text to add' },
      },
      required: ['op'],
    },
  },
];
