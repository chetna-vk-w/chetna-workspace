# SSH MCP Server

MCP (Model Context Protocol) server for managing SSH connections, sessions, and executing commands with persistent connections.

## Features

- **Test & Save Connections**: Test SSH connections before saving them
- **Persistent Sessions**: Keep SSH connections alive with configurable keep-alive
- **Non-blocking Command Execution**: Execute commands asynchronously with background logging
- **Advanced Log Filtering**: Filter logs with grep, head, tail, and line ranges
- **Multiple Sessions**: Manage multiple simultaneous SSH sessions
- **Auto-shutdown**: Optional auto-shutdown after inactivity period

## Installation

```bash
npm install
npm run build
```

## Configuration

Create a `.env` file (see `.env.example`):

```bash
# Keep-alive timeout in milliseconds (default: 24 hours)
KEEP_ALIVE_TIMEOUT=86400000

# Auto-shutdown after inactivity (in milliseconds, 0 = disabled)
AUTO_SHUTDOWN_TIMEOUT=0

# Database path
DB_PATH=./ssh_connections.db
```

## Authentication

SSH MCP Server supports multiple authentication methods:

### 1. Password Authentication

```json
{
  "name": "my-server",
  "host": "example.com",
  "port": 22,
  "username": "user",
  "password": "your-password"
}
```

### 2. Private Key Authentication (Inline)

Pass the private key content directly:

```json
{
  "name": "my-server",
  "host": "example.com",
  "port": 22,
  "username": "user",
  "privateKey": "-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIB..."
}
```

### 3. Private Key Authentication (File Path)

Reference a private key file path (recommended):

```json
{
  "name": "my-server",
  "host": "example.com",
  "port": 22,
  "username": "user",
  "privateKeyPath": "/home/user/.ssh/id_rsa"
}
```

### 4. Encrypted Private Key

For encrypted keys, provide the passphrase:

```json
{
  "name": "my-server",
  "host": "example.com",
  "port": 22,
  "username": "user",
  "privateKeyPath": "/home/user/.ssh/id_rsa",
  "passphrase": "your-passphrase"
}
```

### Security Notes

⚠️ **Important Security Considerations:**

- Credentials (passwords, private keys, passphrases) are stored in SQLite database
- Database file permissions should be restricted (chmod 600)
- Consider using private key files with `privateKeyPath` instead of inline keys
- For production use, consider encrypting the database
- Never commit the database file to version control
- Use strong passphrases for encrypted private keys
- Consider using SSH agent forwarding for sensitive environments

## Usage

### Running the Server

```bash
npm start
```

Or for development:

```bash
npm run dev
```

### MCP Tools

The server exposes the following MCP tools:

#### 1. `ssh_test_connection`
Test SSH connection without saving it. Supports password or private key authentication.

**Example with password:**
```json
{
  "name": "my-server",
  "host": "example.com",
  "port": 22,
  "username": "user",
  "password": "your-password"
}
```

**Example with private key file:**
```json
{
  "name": "my-server",
  "host": "example.com",
  "port": 22,
  "username": "user",
  "privateKeyPath": "/home/user/.ssh/id_rsa"
}
```

#### 2. `ssh_save_connection`
Save SSH connection after successful test. Automatically tests connection before saving.

**Example:**
```json
{
  "name": "production-server",
  "host": "prod.example.com",
  "port": 22,
  "username": "deploy",
  "privateKeyPath": "/home/user/.ssh/prod_key",
  "passphrase": "key-passphrase"
}
```

#### 3. `ssh_list_connections`
List all saved SSH connections.

#### 4. `ssh_connect`
Connect to a saved SSH connection and create a session.

```json
{
  "connectionId": "uuid-here"
}
```

#### 5. `ssh_disconnect`
Disconnect an SSH session.

```json
{
  "sessionId": "uuid-here"
}
```

#### 6. `ssh_list_sessions`
List all active SSH sessions.

#### 7. `ssh_execute`
Execute command on SSH session (non-blocking).

```json
{
  "sessionId": "uuid-here",
  "command": "ls -la"
}
```

Returns immediately with a command ID. Use `ssh_get_logs` to see output.

#### 8. `ssh_get_command_status`
Get status of a command execution.

```json
{
  "commandId": "uuid-here"
}
```

#### 9. `ssh_get_logs`
Get command logs with advanced filtering.

```json
{
  "commandId": "uuid-here",
  "grep": "error",      // optional: filter by pattern
  "head": 10,           // optional: first 10 lines
  "tail": 20,           // optional: last 20 lines
  "fromLine": 5,        // optional: from line 5
  "toLine": 30,         // optional: to line 30
  "stream": "stdout"    // optional: stdout, stderr, or both
}
```

## How It Works

### Single-Process Architecture

```
Claude (MCP Client)
    ↓ stdio
MCP Server (exposes tools)
    ↓ direct function calls
SSH Manager (manages connections)
    ↓ ssh2 library
Remote SSH Servers
```

- Everything runs in a single Node.js process
- MCP server communicates with Claude via stdio
- SSH manager maintains persistent connections with keep-alive
- Commands execute non-blocking with output stored in SQLite
- Process stays alive via configurable `setInterval`

### Non-Blocking Command Execution

1. Submit command via `ssh_execute` → returns immediately with command ID
2. Command runs in background, output streamed to SQLite
3. Check status with `ssh_get_command_status`
4. Retrieve logs with `ssh_get_logs` (supports filtering)

### Log Filtering Examples

Get first 10 lines:
```json
{ "commandId": "abc", "head": 10 }
```

Get last 20 lines:
```json
{ "commandId": "abc", "tail": 20 }
```

Get lines 5-30:
```json
{ "commandId": "abc", "fromLine": 5, "toLine": 30 }
```

Grep for "error":
```json
{ "commandId": "abc", "grep": "error" }
```

Combine filters (grep + tail):
```json
{ "commandId": "abc", "grep": "error", "tail": 10 }
```

## MCP Configuration

Add to your MCP settings (e.g., Claude Desktop config):

```json
{
  "mcpServers": {
    "ssh": {
      "command": "node",
      "args": ["/path/to/ssh_mcp/dist/mcp-server.js"],
      "env": {
        "KEEP_ALIVE_TIMEOUT": "86400000",
        "AUTO_SHUTDOWN_TIMEOUT": "0",
        "DB_PATH": "/path/to/ssh_connections.db"
      }
    }
  }
}
```

## Database Schema

### connections
- `id`: Connection UUID
- `name`: Connection name
- `host`, `port`, `username`: SSH credentials
- `password`, `privateKey`, `passphrase`: Authentication

### commands
- `commandId`: Command UUID
- `sessionId`: Session UUID
- `command`: Command text
- `status`: running, completed, failed
- `exitCode`: Exit code when completed

### logs
- `commandId`: Command UUID
- `sessionId`: Session UUID
- `lineNumber`: Line number
- `content`: Log line content
- `stream`: stdout or stderr
- `timestamp`: Timestamp

## License

MIT
