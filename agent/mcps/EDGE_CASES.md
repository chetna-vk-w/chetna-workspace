# Edge Cases Handled

This document lists all edge cases and error scenarios handled by SSH MCP Server.

## Connection Management

### ✅ Maximum Concurrent Sessions
- **Limit**: 50 concurrent SSH sessions
- **Behavior**: Returns error when limit reached
- **Error**: "Maximum concurrent sessions reached (50)"
- **Solution**: Disconnect inactive sessions first

### ✅ Connection Timeout
- **Timeout**: 15 seconds for connection establishment
- **Behavior**: Connection attempt fails gracefully
- **Error**: "Connection timeout"
- **Retry**: Automatic retry up to 3 times for transient errors

### ✅ Invalid Credentials
- **Behavior**: Authentication failure detected
- **Error**: Detailed error message from SSH server
- **No Retry**: Authentication errors are not retried

### ✅ Host Unreachable
- **Behavior**: Network error detected
- **Error**: "Connection refused" or "Network unreachable"
- **Retry**: Automatic retry for network errors

### ✅ Invalid Host/Port
- **Validation**: Host and port validated before connection
- **Host**: Must be valid hostname or IP address
- **Port**: Must be 1-65535
- **Error**: "Invalid SSH configuration"

## Authentication

### ✅ Missing Authentication
- **Validation**: At least one auth method required
- **Methods**: password, privateKey, or privateKeyPath
- **Error**: "Authentication required: provide password, privateKey, or privateKeyPath"

### ✅ Private Key File Not Found
- **Check**: File existence verified before reading
- **Error**: "Private key file not found: /path/to/key"
- **Prevention**: Path validated, helpful error message

### ✅ Private Key Permission Issues
- **Check**: File permissions checked (should be 600)
- **Warning**: Warns if world-readable (chmod 004)
- **Error**: "Permission denied reading private key"

### ✅ Invalid Private Key Format
- **Validation**: Key format verified (must contain BEGIN/PRIVATE KEY)
- **Error**: "Invalid private key format"
- **Supported**: RSA, DSA, ECDSA, Ed25519

### ✅ Wrong Passphrase
- **Behavior**: SSH2 library handles passphrase errors
- **Error**: "Cannot parse privateKey: Encrypted private OpenSSH key detected"

## Command Execution

### ✅ Command on Closed Session
- **Check**: Session existence and active status verified
- **Error**: "Session not found" or "Session is no longer active"
- **Prevention**: Automatic session cleanup removes dead sessions

### ✅ Command Rate Limiting
- **Limit**: 100 commands per session
- **Behavior**: Commands beyond limit rejected
- **Error**: "Maximum commands per session exceeded (100)"
- **Reset**: Counter reset when session disconnects

### ✅ Invalid Command Format
- **Validation**: Command must be non-empty string
- **Max Length**: 10,000 characters
- **Error**: "Command must be a non-empty string" or "Command too long"

### ✅ Dangerous Commands
- **Detection**: Warns about potentially dangerous patterns:
  - `rm -rf /`
  - Fork bombs
  - `mkfs.*`
  - `dd` to disk devices
- **Behavior**: Warns but does NOT block (user responsibility)
- **Log**: Warning logged to console

### ✅ Command Execution Timeout
- **Behavior**: Commands run in background (non-blocking)
- **Status**: Can check status with `ssh_get_command_status`
- **Logs**: Output stored even if command runs for hours

### ✅ Large Command Output
- **Behavior**: Output streamed line-by-line to database
- **Storage**: Each line stored separately
- **Filtering**: Can retrieve with head/tail/grep to limit size

## Session Management

### ✅ Inactive Session Cleanup
- **Check Interval**: Every 5 minutes
- **Inactivity Threshold**: 1 hour
- **Behavior**: Automatically closes and removes inactive sessions
- **Logging**: Cleanup actions logged

### ✅ Session Keep-Alive
- **Interval**: 10 seconds
- **Max Count**: 3 missed keep-alives before disconnect
- **Behavior**: SSH2 handles keep-alive automatically
- **Purpose**: Prevents idle connection drops

### ✅ Unexpected Disconnection
- **Detection**: `close` event handler on SSH client
- **Behavior**: Session marked as inactive, removed from map
- **Logging**: Disconnect logged
- **Cleanup**: Command counts cleared

## Storage (SQLite)

### ✅ Database Locked
- **Scenario**: Multiple processes accessing same database
- **Mitigation**: better-sqlite3 handles locking automatically
- **Behavior**: Waits for lock, doesn't fail

### ✅ Invalid UTF-8 in Logs
- **Scenario**: Binary output or invalid encoding
- **Behavior**: Stored as-is in TEXT field
- **Retrieval**: May contain replacement characters (�)

### ✅ Very Large Log Entries
- **Max Size**: No hard limit (SQLite TEXT supports ~1GB)
- **Mitigation**: Each line stored separately
- **Filtering**: Use head/tail to limit retrieval

### ✅ Concurrent Writes
- **Handling**: SQLite serializes writes automatically
- **Performance**: May be slower with high concurrency
- **Solution**: Consider connection pooling for high load

### ✅ Connection Not Found
- **Check**: Connection ID validated before operations
- **Error**: "Connection not found"
- **Prevention**: `listConnections` to see available IDs

## Configuration

### ✅ Missing Required Fields
- **Validation**: All required fields checked
- **Required**: name, host, username, (password OR key)
- **Error**: Detailed list of missing/invalid fields

### ✅ Invalid Port Number
- **Validation**: Port must be 1-65535
- **Default**: 22 if not specified
- **Error**: "Port must be a number between 1 and 65535"

### ✅ Empty/Whitespace Values
- **Validation**: Strings checked for non-empty content
- **Trimming**: Values should be trimmed by client
- **Error**: Specific field mentioned in error

## MCP Protocol

### ✅ Invalid Tool Arguments
- **Validation**: Required arguments checked by MCP SDK
- **Error**: JSON schema validation error
- **Response**: Error response with details

### ✅ Malformed JSON
- **Handling**: MCP SDK handles JSON parsing
- **Error**: Parse error returned to client
- **Recovery**: Connection remains open

### ✅ Missing Tool
- **Check**: Tool name validated against registered tools
- **Error**: "Unknown tool: <name>"
- **List**: Use `ListTools` to see available tools

## Resource Limits

### ✅ Memory Usage
- **Mitigation**:
  - Line-by-line log storage
  - Session cleanup
  - Limited concurrent sessions
- **Monitoring**: Use OS tools to monitor Node.js process

### ✅ Disk Space
- **Database**: Grows with command logs
- **Mitigation**: Consider log rotation/cleanup
- **Monitoring**: Check database size periodically

### ✅ File Descriptors
- **Usage**: Each SSH session uses file descriptors
- **Limit**: OS limits (typically 1024-4096)
- **Mitigation**: Max concurrent sessions limit
- **Check**: `ulimit -n` on Linux

## Security

### ✅ Credential Storage
- **Storage**: Passwords/keys in SQLite (plaintext)
- **Recommendation**: File permissions 600 on database
- **Warning**: Documented in security section

### ✅ Command Injection
- **Prevention**: Commands passed to SSH exec directly
- **No Shell**: SSH2 library doesn't use shell by default
- **Responsibility**: User must validate commands

### ✅ Path Traversal
- **File Paths**: Private key paths not validated for traversal
- **Mitigation**: File existence checked, errors handled
- **Responsibility**: User provides trusted paths

## Network Errors

### ✅ DNS Resolution Failure
- **Error**: "getaddrinfo ENOTFOUND <hostname>"
- **Behavior**: Connection fails with helpful error
- **Retry**: Automatic retry for DNS errors

### ✅ Connection Refused
- **Error**: "connect ECONNREFUSED <ip>:<port>"
- **Causes**: Wrong port, firewall, service not running
- **Retry**: Automatic retry

### ✅ Network Unreachable
- **Error**: "connect ENETUNREACH"
- **Causes**: No route to host, network down
- **Retry**: Automatic retry

## Process Management

### ✅ Graceful Shutdown (SIGINT/SIGTERM)
- **Handling**: Close all sessions, close database
- **Cleanup**: Socket file removed
- **Exit**: Process exits cleanly (code 0)

### ✅ Unhandled Errors
- **Handling**: Try/catch blocks around async operations
- **Logging**: Errors logged to stderr
- **Recovery**: Operation fails, but process continues

### ✅ Out of Memory
- **Behavior**: Node.js will crash
- **Mitigation**: Limited concurrent sessions, line-by-line storage
- **Monitoring**: Use process managers (PM2, systemd)

## Retry Logic

### ✅ Transient Errors Retried
- **Errors**: Network errors, DNS failures, timeouts
- **Max Retries**: 3 attempts
- **Delay**: Exponential backoff (1s, 2s, 3s)
- **No Retry**: Auth errors, invalid config

### ✅ Non-Transient Errors NOT Retried
- **Errors**:
  - Authentication failures
  - Invalid configuration
  - Missing resources (connection/session)
- **Behavior**: Fail immediately

## Edge Cases NOT Handled

### ❌ Database Encryption
- **Status**: Credentials stored in plaintext
- **Recommendation**: Encrypt database externally or use encrypted filesystem

### ❌ Log Rotation
- **Status**: Logs accumulate indefinitely
- **Recommendation**: Implement external cleanup script

### ❌ Multi-Process Coordination
- **Status**: Designed for single process
- **Issue**: Multiple processes may conflict
- **Recommendation**: Use single instance or external coordination

### ❌ SSH Agent Forwarding
- **Status**: Not implemented
- **Workaround**: Use private key authentication

### ❌ ProxyJump / Bastion Hosts
- **Status**: No built-in support for SSH proxying
- **Workaround**: Connect to bastion, then run commands to connect onward

## Testing Edge Cases

Run the test suite to verify edge case handling:

```bash
npm run build
npm test           # Full test suite
npm run verify     # Verification tests
```

### Manual Edge Case Testing

```javascript
// Test: Invalid host
ssh_test_connection({
  name: "test",
  host: "invalid..host",
  username: "user",
  password: "pass"
})
// Expected: "Invalid SSH configuration: Host must be a valid hostname or IP address"

// Test: Missing authentication
ssh_test_connection({
  name: "test",
  host: "example.com",
  username: "user"
})
// Expected: "Authentication required: provide password, privateKey, or privateKeyPath"

// Test: Invalid port
ssh_save_connection({
  name: "test",
  host: "example.com",
  port: 99999,
  username: "user",
  password: "pass"
})
// Expected: "Port must be a number between 1 and 65535"

// Test: Command too long
ssh_execute({
  sessionId: "<valid-session>",
  command: "a".repeat(10001)
})
// Expected: "Command too long (max 10000 characters)"

// Test: Session not found
ssh_execute({
  sessionId: "invalid-uuid",
  command: "ls"
})
// Expected: "Session not found: invalid-uuid"
```

## Summary

- **Connection**: Validated, rate-limited, auto-cleanup
- **Authentication**: Multiple methods, validation, helpful errors
- **Commands**: Validated, rate-limited, dangerous command warnings
- **Storage**: Concurrent-safe, handles large data
- **Resources**: Limited to prevent abuse, monitored
- **Security**: Documented concerns, recommended mitigations
- **Network**: Retry logic, helpful error messages
- **Process**: Graceful shutdown, error recovery

Most edge cases are handled automatically. User should focus on:
1. Monitoring resource usage
2. Implementing log cleanup
3. Securing database file
4. Validating commands before execution
