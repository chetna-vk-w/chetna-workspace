# Stream Handling Documentation

This document explains how SSH MCP Server handles different input/output streams.

## Overview

SSH MCP Server deals with multiple stream types:
1. **MCP Protocol Streams** - Communication with Claude
2. **SSH Command Streams** - Output from remote commands
3. **Server Diagnostic Streams** - Internal logging

## Stream Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        MCP Client (Claude)                       │
└──────────────────┬──────────────────────┬───────────────────────┘
                   │                      │
                stdin (requests)      stdout (responses)
                   │                      │
┌──────────────────▼──────────────────────▼───────────────────────┐
│                      MCP Server (Node.js)                        │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  StdioServerTransport                                     │  │
│  │    - Receives: MCP tool calls via stdin                   │  │
│  │    - Sends: MCP responses via stdout                      │  │
│  └───────────────────────────────────────────────────────────┘  │
│                           │                                      │
│                           ▼                                      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  SSH Manager                                              │  │
│  │    - Executes commands on remote SSH servers              │  │
│  │    - Captures stdout & stderr separately                  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                           │                                      │
│                           ▼                                      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Storage (SQLite)                                         │  │
│  │    - Stores stdout lines with stream='stdout'             │  │
│  │    - Stores stderr lines with stream='stderr'             │  │
│  │    - Line-by-line with timestamps                         │  │
│  └───────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                           │
                           ▼
                    stderr (diagnostics)
                           │
                     Console Output
```

## Stream Types

### 1. MCP Communication Streams

**Purpose**: Protocol communication between Claude and the MCP server

| Stream | Direction | Content | Format |
|--------|-----------|---------|--------|
| **stdin** | Claude → Server | MCP requests (tool calls) | JSON-RPC |
| **stdout** | Server → Claude | MCP responses | JSON-RPC |

**Implementation**:
```typescript
// src/mcp-server.ts
const transport = new StdioServerTransport();
await this.server.connect(transport);

// stdin: Reads MCP requests
// stdout: Writes MCP responses
```

**Characteristics**:
- Binary-safe JSON-RPC protocol
- Newline-delimited messages
- Bidirectional but separate streams
- stderr NOT used for protocol (only diagnostics)

### 2. SSH Command Streams

**Purpose**: Capture output from SSH commands executed on remote servers

| Stream | Source | Storage | Characteristics |
|--------|--------|---------|----------------|
| **stdout** | Remote command normal output | SQLite `logs` table | Text, line-buffered |
| **stderr** | Remote command error output | SQLite `logs` table | Text, line-buffered |

**Implementation**:
```typescript
// src/ssh-manager.ts (line 287-307)

// Capture stdout
stream.on('data', (data: Buffer) => {
  stdoutBuffer += data.toString();
  const lines = stdoutBuffer.split('\n');
  stdoutBuffer = lines.pop() || '';

  lines.forEach((line: string) => {
    stdoutLineNumber++;
    this.storage.saveLog(commandId, sessionId, stdoutLineNumber, line, 'stdout');
  });
});

// Capture stderr
stream.stderr.on('data', (data: Buffer) => {
  stderrBuffer += data.toString();
  const lines = stderrBuffer.split('\n');
  stderrBuffer = lines.pop() || '';

  lines.forEach((line: string) => {
    stderrLineNumber++;
    this.storage.saveLog(commandId, sessionId, stderrLineNumber, line, 'stderr');
  });
});
```

**Characteristics**:
- **Line-buffered**: Lines split on `\n`, buffered until complete
- **Separate line numbering**: stdout and stderr numbered independently
- **Non-blocking**: Streams processed asynchronously
- **Complete capture**: Remaining buffer saved on stream close

### 3. Server Diagnostic Streams

**Purpose**: Internal logging and diagnostics

| Stream | Usage | Examples |
|--------|-------|----------|
| **stderr** | Server logs, errors, warnings | `console.log()`, `console.error()` |

**Implementation**:
```typescript
console.log('[SSHManager] Session created');
console.error('[SSHManager] Connection error:', err.message);
```

**Characteristics**:
- Not captured in database
- Visible in server console/logs
- Used for debugging and monitoring

## Database Storage Schema

### Log Entry Structure

```sql
CREATE TABLE logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  commandId TEXT NOT NULL,
  sessionId TEXT NOT NULL,
  lineNumber INTEGER NOT NULL,
  content TEXT NOT NULL,
  stream TEXT NOT NULL,        -- 'stdout' or 'stderr'
  timestamp INTEGER NOT NULL,
  FOREIGN KEY (commandId) REFERENCES commands(commandId)
);
```

### Example Data

| id | commandId | sessionId | lineNumber | content | stream | timestamp |
|----|-----------|-----------|------------|---------|--------|-----------|
| 1 | abc-123 | xyz-789 | 1 | `ssh-test` | stdout | 1700000000 |
| 2 | abc-123 | xyz-789 | 2 | `/home/ssh-test` | stdout | 1700000001 |
| 3 | abc-123 | xyz-789 | 1 | `Warning: ...` | stderr | 1700000002 |

## Stream Filtering

### Filter by Stream Type

```javascript
// Get only stdout
ssh_get_logs({
  commandId: "abc-123",
  stream: "stdout"
})

// Get only stderr
ssh_get_logs({
  commandId: "abc-123",
  stream: "stderr"
})

// Get both (default)
ssh_get_logs({
  commandId: "abc-123",
  stream: "both"
})
```

### Combined Filtering

```javascript
// stderr + grep + tail
ssh_get_logs({
  commandId: "abc-123",
  stream: "stderr",
  grep: "error",
  tail: 10
})

// stdout + line range
ssh_get_logs({
  commandId: "abc-123",
  stream: "stdout",
  fromLine: 5,
  toLine: 30
})
```

## Stream Processing Details

### Line Buffering Algorithm

```typescript
// Problem: Data arrives in chunks, not lines
// Solution: Buffer partial lines until \n received

let buffer = '';

stream.on('data', (chunk: Buffer) => {
  buffer += chunk.toString();       // Add chunk to buffer
  const lines = buffer.split('\n'); // Split on newlines
  buffer = lines.pop() || '';       // Keep last partial line

  lines.forEach(line => {           // Process complete lines
    saveLog(line);
  });
});

stream.on('close', () => {
  if (buffer) {                     // Save remaining buffer
    saveLog(buffer);
  }
});
```

**Why line buffering?**
- SSH data arrives in arbitrary-sized chunks
- Lines may be split across multiple chunks
- Need to reconstruct complete lines for storage
- Last line may not end with `\n`

### Character Encoding

**Current**: UTF-8 assumed
```typescript
data.toString() // Defaults to UTF-8
```

**Limitations**:
- Binary data will show as garbled text
- Non-UTF-8 encodings may show replacement characters (�)
- No encoding detection/conversion

## Stream Timing

### Command Execution Timeline

```
Time    Event                    Stream Activity
────────────────────────────────────────────────────────
0ms     ssh_execute called       Command saved to DB (status='running')
5ms     SSH exec started         -
10ms    First stdout chunk       Lines 1-5 saved to DB (stream='stdout')
15ms    stderr chunk             Lines 1-2 saved to DB (stream='stderr')
20ms    More stdout              Lines 6-10 saved to DB (stream='stdout')
25ms    Command completes        Remaining buffers saved
26ms    Stream closed            Status updated (status='completed', exitCode=0)
```

### Non-blocking Behavior

```javascript
// Client submits command
const result = await ssh_execute({
  sessionId: "xyz-789",
  command: "long-running-command"
});

// Returns immediately with commandId
// result: {
//   commandId: "abc-123",
//   status: "running"
// }

// Output captured in background
// Check status later:
await ssh_get_command_status({ commandId: "abc-123" });
// Returns: { status: "running" | "completed" | "failed" }

// Get logs as they arrive:
await ssh_get_logs({ commandId: "abc-123" });
```

## Current Limitations

### 1. No stdin Support

**Issue**: Cannot send input to running commands

```javascript
// ❌ NOT SUPPORTED
ssh_execute({
  sessionId: "xyz",
  command: "read -p 'Enter name: ' name"
})
// Command will hang waiting for input that never comes
```

**Workaround**: Use non-interactive commands only
```javascript
// ✅ WORKS
ssh_execute({
  sessionId: "xyz",
  command: "cat file.txt"  // No user input needed
})
```

### 2. No Stream Merging

**Issue**: stdout and stderr shown separately

```javascript
// Actual command output timeline:
// 10ms: stdout: "Starting process..."
// 15ms: stderr: "Warning: deprecated"
// 20ms: stdout: "Process complete"

// Retrieved separately:
get_logs({ stream: "stdout" })
// Line 1: "Starting process..."
// Line 2: "Process complete"

get_logs({ stream: "stderr" })
// Line 1: "Warning: deprecated"
```

**Workaround**: Redirect stderr to stdout in command
```javascript
ssh_execute({
  sessionId: "xyz",
  command: "my-command 2>&1"  // Merge stderr to stdout
})
```

### 3. Binary Data Not Handled

**Issue**: Binary output shows as garbled text

```javascript
ssh_execute({
  sessionId: "xyz",
  command: "cat image.png"
})
// Logs will contain: "�PNG\r\n\x1a\n..."
```

**Workaround**: Base64 encode binary data
```javascript
ssh_execute({
  sessionId: "xyz",
  command: "cat image.png | base64"
})
```

### 4. No Exit Signal Capture

**Issue**: Only exit code stored, not signal (SIGTERM, SIGKILL, etc.)

```typescript
// stream.on('close', (code: number, signal: string) => {
//   // signal available but not stored
// })
```

**Current**: Only `exitCode` stored in database

### 5. No Real-time Streaming

**Issue**: Logs retrieved by polling, not pushed

```javascript
// Must poll for updates
setInterval(async () => {
  const logs = await ssh_get_logs({ commandId: "abc-123" });
  console.log(logs);
}, 1000);
```

**Alternative**: Could add WebSocket/SSE for real-time updates (not implemented)

## Best Practices

### 1. Handle Both Streams

```javascript
// Good: Check both stdout and stderr
const stdout = await ssh_get_logs({ commandId: id, stream: "stdout" });
const stderr = await ssh_get_logs({ commandId: id, stream: "stderr" });

if (stderr.length > 0) {
  console.warn("Command had errors:", stderr);
}
```

### 2. Use Filters for Large Output

```javascript
// Good: Use tail for recent output
const recent = await ssh_get_logs({
  commandId: id,
  tail: 100  // Last 100 lines only
});

// Bad: Retrieve everything (may be huge)
const all = await ssh_get_logs({ commandId: id });
```

### 3. Check Command Status First

```javascript
// Good: Check if command completed
const status = await ssh_get_command_status({ commandId: id });

if (status.status === 'completed') {
  const logs = await ssh_get_logs({ commandId: id });
}

// Bad: Retrieve logs immediately (may be incomplete)
const logs = await ssh_get_logs({ commandId: id });
```

### 4. Merge Streams in Commands

```javascript
// If you need chronological order:
ssh_execute({
  sessionId: id,
  command: "my-script.sh 2>&1"  // Merge stderr to stdout
})
```

## Performance Considerations

### Memory Usage

**Line buffering**: Minimal memory usage
- Each stream buffer: ~1KB typical
- Released after each newline
- Max buffer size: One line (unbounded but typically <10KB)

**Database writes**: One INSERT per line
- Frequent small writes (line-by-line)
- SQLite handles efficiently
- Consider batch writes for high-volume output

### Database Size

**Growth rate**: Depends on command output volume
- Average line: ~100 bytes
- 1000 lines = ~100KB
- 1M lines = ~100MB

**Recommendation**: Implement log cleanup/rotation

### Retrieval Speed

**Filtering**: Uses SQL indexes
```sql
CREATE INDEX idx_logs_commandId ON logs(commandId);
CREATE INDEX idx_logs_sessionId ON logs(sessionId);
```

**Performance**:
- 1000 lines: <10ms
- 10,000 lines: <100ms
- 100,000 lines: <1s

## Debugging Stream Issues

### Enable Verbose Logging

```bash
# Run server with debug output
DEBUG=* npm start
```

### Check Stream Capture

```javascript
// Verify data is being captured
const status = await ssh_get_command_status({ commandId: id });
console.log(status);  // Check status and exitCode

const logs = await ssh_get_logs({ commandId: id, stream: "both" });
console.log(`Captured ${logs.length} lines`);
```

### Common Issues

**No output captured**:
- Command may not produce output
- Check stderr: `stream: "stderr"`
- Command may be interactive (waiting for input)

**Garbled output**:
- Binary data in output
- Use base64: `command | base64`

**Incomplete output**:
- Command still running
- Check status first: `ssh_get_command_status`

**Out of order**:
- stdout/stderr separate line numbers
- Use `command 2>&1` to merge

## Future Enhancements

### Potential Improvements

1. **Interactive stdin support**
   ```javascript
   ssh_execute_interactive({
     sessionId: id,
     command: "python",
     stdin: "print('hello')\nexit()\n"
   })
   ```

2. **Real-time streaming**
   ```javascript
   ssh_execute_stream({
     sessionId: id,
     command: "tail -f /var/log/app.log",
     onData: (line, stream) => console.log(line)
   })
   ```

3. **Binary data handling**
   ```javascript
   ssh_execute({
     sessionId: id,
     command: "cat image.png",
     binary: true  // Return base64
   })
   ```

4. **Stream merging with timestamps**
   ```javascript
   ssh_get_logs({
     commandId: id,
     merged: true,  // Chronological order
     timestamps: true
   })
   ```

5. **Exit signal capture**
   ```javascript
   // Store signal alongside exitCode
   {
     exitCode: null,
     signal: "SIGTERM"
   }
   ```

## Related Documentation

- [README.md](README.md) - Main documentation
- [AUTHENTICATION.md](AUTHENTICATION.md) - Authentication methods
- [EDGE_CASES.md](EDGE_CASES.md) - Error handling
- [MCP Protocol Specification](https://modelcontextprotocol.io/specification)
