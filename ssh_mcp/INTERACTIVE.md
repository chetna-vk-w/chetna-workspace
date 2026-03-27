# Interactive Features Documentation

This document explains SSH MCP Server's interactive capabilities, including interactive shells, file editing, and binary handling.

## Overview

SSH MCP Server now supports:
- **Interactive Shells**: PTY-like sessions with stdin/stdout
- **File Editing**: Use nano/vim to edit files remotely
- **Binary Handling**: Automatic detection and Base64 encoding

## Interactive Shell Sessions

### Architecture

```
┌─────────────────────────────────────────────────────┐
│  MCP Client (Claude)                                │
│                                                     │
│  "Edit /etc/hosts file"                            │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│  MCP Server                                         │
│                                                     │
│  1. ssh_create_interactive_shell(connectionId)     │
│  2. ssh_edit_file(shellId, path, content)          │
│  3. ssh_close_interactive_shell(shellId)           │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│  Interactive Session Manager                        │
│                                                     │
│  - Creates PTY session (xterm-256color)            │
│  - Buffers stdout/stderr                           │
│  - Sends stdin commands                            │
│  - Strips ANSI codes                               │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│  SSH2 Shell (PTY)                                   │
│                                                     │
│  - Remote interactive shell (/bin/bash)            │
│  - Editors: nano, vim, vi                          │
│  - Interactive programs: top, htop, etc.           │
└─────────────────────────────────────────────────────┘
```

## New MCP Tools

### 1. ssh_create_interactive_shell

**Purpose**: Create an interactive shell session with stdin support

```javascript
{
  "connectionId": "uuid-of-saved-connection"
}
```

**Returns**:
```javascript
{
  "shellId": "uuid-for-this-shell",
  "sessionId": "uuid-for-session"
}
```

**Use Case**: Start before running interactive commands or editing files

---

### 2. ssh_shell_send_input

**Purpose**: Send input to interactive shell

```javascript
{
  "shellId": "shell-uuid",
  "input": "ls -la\n"  // \n = Enter key
}
```

**Special Characters**:
- `\n` - Enter/Return
- `\x03` - Ctrl+C (interrupt)
- `\x04` - Ctrl+D (EOF)
- `\x1b` - Escape
- `\t` - Tab

**Returns**: Success confirmation

---

### 3. ssh_shell_get_output

**Purpose**: Read output from interactive shell

```javascript
{
  "shellId": "shell-uuid",
  "clear": false,       // Clear buffer after reading (default: false)
  "stripAnsi": true     // Remove ANSI color codes (default: true)
}
```

**Returns**: Shell output as text

**Buffer Behavior**:
- Output accumulates in buffer
- `clear: false` - Read but keep in buffer
- `clear: true` - Read and clear buffer

---

### 4. ssh_close_interactive_shell

**Purpose**: Close interactive shell session

```javascript
{
  "shellId": "shell-uuid"
}
```

**Important**: Always close shells when done to free resources

---

### 5. ssh_edit_file ⭐ **Recommended**

**Purpose**: Edit file using nano/vim with automatic workflow

```javascript
{
  "shellId": "shell-uuid",
  "filePath": "/etc/hosts",
  "content": "127.0.0.1 localhost\n::1 localhost\n",
  "editor": "nano"  // Options: nano, vim, vi
}
```

**What it does**:
1. Opens editor with file
2. Replaces content
3. Saves automatically
4. Exits editor
5. Returns success confirmation

**Agent-Friendly**: Claude doesn't need to know editor commands!

---

### 6. ssh_list_interactive_shells

**Purpose**: List all active interactive shell sessions

```javascript
{}  // No arguments
```

**Returns**: Array of active shells with metadata

## File Editing Workflow

### High-Level (Recommended) ✅

Use `ssh_edit_file` for one-step editing:

```javascript
// 1. Create interactive shell
const shell = await ssh_create_interactive_shell({ connectionId });

// 2. Edit file (all-in-one)
await ssh_edit_file({
  shellId: shell.shellId,
  filePath: "/home/user/config.txt",
  content: "new content here",
  editor: "nano"
});

// 3. Close shell
await ssh_close_interactive_shell({ shellId: shell.shellId });
```

**Benefits**:
- Simple 3-step process
- Automatic editor workflow
- No need to know editor commands
- Error handling included

### Low-Level (Manual Control)

For advanced use cases:

```javascript
// 1. Create shell
const shell = await ssh_create_interactive_shell({ connectionId });

// 2. Start editor
await ssh_shell_send_input({
  shellId: shell.shellId,
  input: "nano /home/user/file.txt\n"
});

// 3. Wait for editor to load
await sleep(500);

// 4. Send content
await ssh_shell_send_input({
  shellId: shell.shellId,
  input: "Hello World"
});

// 5. Save and exit (nano)
await ssh_shell_send_input({
  shellId: shell.shellId,
  input: "\x18"  // Ctrl+X
});
await sleep(200);
await ssh_shell_send_input({
  shellId: shell.shellId,
  input: "Y"  // Yes to save
});
await sleep(200);
await ssh_shell_send_input({
  shellId: shell.shellId,
  input: "\n"  // Confirm filename
});

// 6. Close shell
await ssh_close_interactive_shell({ shellId: shell.shellId });
```

## Editor Support

### Nano

**High-Level**: Fully supported via `ssh_edit_file`

**Manual Commands**:
- `\x18` (Ctrl+X) - Exit
- `Y` - Save changes
- `N` - Don't save
- `\n` - Confirm filename

**Workflow**:
1. `nano filename`
2. Type content
3. Ctrl+X → Y → Enter

---

### Vim/Vi

**High-Level**: Fully supported via `ssh_edit_file`

**Manual Commands**:
- `i` - Insert mode
- `\x1b` (Escape) - Command mode
- `:wq\n` - Save and quit
- `:q!\n` - Quit without saving
- `ggdG` - Delete all content

**Workflow**:
1. `vim filename`
2. `ggdG` - Delete existing content
3. `i` - Insert mode
4. Type content
5. Escape → `:wq` → Enter

## Interactive Commands Examples

### Example 1: Simple Command

```javascript
// Create shell
const shell = await ssh_create_interactive_shell({ connectionId });

// Run command
await ssh_shell_send_input({
  shellId: shell.shellId,
  input: "whoami\n"
});

// Wait for output
await sleep(500);

// Read result
const output = await ssh_shell_get_output({
  shellId: shell.shellId,
  clear: true,
  stripAnsi: true
});

console.log(output);  // "username"

// Close
await ssh_close_interactive_shell({ shellId: shell.shellId });
```

### Example 2: Edit File with Nano

```javascript
// Using high-level API (recommended)
const shell = await ssh_create_interactive_shell({ connectionId });

await ssh_edit_file({
  shellId: shell.shellId,
  filePath: "/home/user/.bashrc",
  content: "export PATH=$PATH:/usr/local/bin\n",
  editor: "nano"
});

await ssh_close_interactive_shell({ shellId: shell.shellId });
```

### Example 3: Interactive Prompt

```javascript
const shell = await ssh_create_interactive_shell({ connectionId });

// Start interactive Python
await ssh_shell_send_input({
  shellId: shell.shellId,
  input: "python3\n"
});

await sleep(500);

// Send Python commands
await ssh_shell_send_input({
  shellId: shell.shellId,
  input: "print('Hello from Python')\n"
});

await sleep(300);

// Get output
const output = await ssh_shell_get_output({
  shellId: shell.shellId,
  clear: true
});

console.log(output);  // "Hello from Python"

// Exit Python
await ssh_shell_send_input({
  shellId: shell.shellId,
  input: "exit()\n"
});

await ssh_close_interactive_shell({ shellId: shell.shellId });
```

### Example 4: Menu Navigation

```javascript
const shell = await ssh_create_interactive_shell({ connectionId });

// Start a menu-driven program
await ssh_shell_send_input({
  shellId: shell.shellId,
  input: "./menu.sh\n"
});

await sleep(500);

// Select menu option 1
await ssh_shell_send_input({
  shellId: shell.shellId,
  input: "1\n"
});

await sleep(300);

// Get result
const output = await ssh_shell_get_output({
  shellId: shell.shellId
});

await ssh_close_interactive_shell({ shellId: shell.shellId });
```

## Binary Data Handling

### Automatic Detection

Binary files are automatically detected and handled:

```javascript
// Reading a binary file
const result = await ssh_execute({
  sessionId: sessionId,
  command: "cat /path/to/image.png | base64"
});

// Binary data returned as base64
```

### Manual Binary Handling

Use utility functions:

```typescript
import {  isBinary, encodeBase64, detectFileType } from './binary-utils';

// Detect if binary
const buffer = Buffer.from(...);
if (isBinary(buffer)) {
  const base64 = encodeBase64(buffer);
  // Handle binary data
}

// Detect file type
const type = detectFileType("image.png");  // 'binary'
const type2 = detectFileType("script.sh");  // 'text'
```

### Supported Binary Formats

**Images**: jpg, png, gif, bmp, ico, svg
**Documents**: pdf, doc, docx, xls, xlsx, ppt, pptx
**Archives**: zip, tar, gz, bz2, 7z, rar
**Media**: mp3, mp4, avi, mkv, mov
**Executables**: exe, dll, so, dylib
**Databases**: bin, dat, db, sqlite

### MIME Type Detection

```typescript
import { guessMimeType } from './binary-utils';

guessMimeType("document.pdf");   // "application/pdf"
guessMimeType("photo.jpg");      // "image/jpeg"
guessMimeType("script.js");      // "application/javascript"
```

## ANSI Code Stripping

Interactive shells often include ANSI color/formatting codes. These are automatically stripped by default.

### With ANSI Stripping (Default)

```javascript
const output = await ssh_shell_get_output({
  shellId: shell.shellId,
  stripAnsi: true  // Default
});

// Output: "Hello World"
// (clean text, no color codes)
```

### Without ANSI Stripping

```javascript
const output = await ssh_shell_get_output({
  shellId: shell.shellId,
  stripAnsi: false
});

// Output: "\x1b[32mHello\x1b[0m \x1b[1mWorld\x1b[0m"
// (includes ANSI codes for green and bold)
```

**When to disable**:
- Debugging terminal issues
- Preserving exact terminal output
- Color-aware display systems

## Buffer Management

### Buffer Behavior

Output accumulates in a buffer until read:

```javascript
// Command produces output
await ssh_shell_send_input({ shellId, input: "echo 'Line 1'\n" });
await sleep(100);
await ssh_shell_send_input({ shellId, input: "echo 'Line 2'\n" });
await sleep(100);

// Read without clearing
const output1 = await ssh_shell_get_output({ shellId, clear: false });
// "Line 1\nLine 2\n"

// Read again (still there)
const output2 = await ssh_shell_get_output({ shellId, clear: false });
// "Line 1\nLine 2\n"  (same content)

// Read and clear
const output3 = await ssh_shell_get_output({ shellId, clear: true });
// "Line 1\nLine 2\n"

// Read again (buffer now empty)
const output4 = await ssh_shell_get_output({ shellId, clear: false });
// ""
```

### Best Practices

1. **Clear after reading** when you're done with output:
   ```javascript
   const output = await ssh_shell_get_output({ shellId, clear: true });
   ```

2. **Don't clear** if you might need to read again:
   ```javascript
   const peek = await ssh_shell_get_output({ shellId, clear: false });
   ```

3. **Clear before new command** to separate outputs:
   ```javascript
   await ssh_shell_get_output({ shellId, clear: true });  // Clear old output
   await ssh_shell_send_input({ shellId, input: "new command\n" });
   ```

## Resource Management

### Maximum Shells

- Default limit: 50 concurrent interactive shells
- Exceeding limit returns error
- Close unused shells to free resources

### Automatic Cleanup

Interactive shells are NOT automatically cleaned up. You must close them explicitly:

```javascript
// ✅ Good
const shell = await ssh_create_interactive_shell({ connectionId });
try {
  // ... use shell ...
} finally {
  await ssh_close_interactive_shell({ shellId: shell.shellId });
}

// ❌ Bad (resource leak)
const shell = await ssh_create_interactive_shell({ connectionId });
// ... use shell ...
// (forgot to close)
```

### Memory Usage

Each shell maintains:
- Output buffer (grows until read)
- SSH connection
- PTY session

**Clear buffers** regularly to prevent memory growth:
```javascript
await ssh_shell_get_output({ shellId, clear: true });
```

## Error Handling

### Common Errors

**Shell not found**:
```javascript
{
  error: "Shell session not found"
}
```
**Solution**: Check shellId, shell may have been closed

**Shell not active**:
```javascript
{
  error: "Shell session is not active"
}
```
**Solution**: SSH connection lost, create new shell

**Editor failed**:
```javascript
{
  error: "Failed to save file: permission denied"
}
```
**Solution**: Check file permissions, user privileges

### Error Recovery

```javascript
try {
  await ssh_edit_file({ shellId, filePath, content });
} catch (error) {
  console.error("Edit failed:", error.message);

  // Verify shell still active
  const shells = await ssh_list_interactive_shells();
  const exists = shells.find(s => s.shellId === shellId);

  if (!exists) {
    // Recreate shell
    const newShell = await ssh_create_interactive_shell({ connectionId });
    // Retry with new shell
  }
}
```

## Performance Considerations

### Shell Creation

- **Time**: 1-3 seconds
- **Reuse shells** for multiple operations:
  ```javascript
  const shell = await ssh_create_interactive_shell({ connectionId });

  // Multiple operations
  await ssh_edit_file({ shellId: shell.shellId, filePath: "file1.txt", content: "..." });
  await ssh_edit_file({ shellId: shell.shellId, filePath: "file2.txt", content: "..." });

  await ssh_close_interactive_shell({ shellId: shell.shellId });
  ```

### Output Polling

- **Wait time** after sending input: 300-500ms typical
- **Adjust** based on command:
  - Fast commands: 100ms
  - Slow commands: 1000ms+
  - Editors: 500ms

### Buffer Size

- No hard limit on buffer size
- Large outputs (>1MB) may impact performance
- **Clear buffers** regularly:
  ```javascript
  await ssh_shell_get_output({ shellId, clear: true });
  ```

## Security Considerations

### Input Sanitization

User input is sent directly to shell. **Sanitize carefully**:

```javascript
// ❌ Dangerous
const userInput = req.body.command;  // Could be: "rm -rf /"
await ssh_shell_send_input({ shellId, input: userInput + "\n" });

// ✅ Better
const allowedCommands = ["ls", "pwd", "whoami"];
if (allowedCommands.includes(userInput)) {
  await ssh_shell_send_input({ shellId, input: userInput + "\n" });
}
```

### File Editing

File editing bypasses normal file permission checks:

```javascript
// User could edit any file the SSH user has access to
await ssh_edit_file({
  shellId,
  filePath: "/etc/passwd",  // Dangerous!
  content: "..."
});
```

**Recommendation**: Validate `filePath` against allowed paths

### Shell Access

Interactive shells have full shell access:

```javascript
// User could run anything
await ssh_shell_send_input({ shellId, input: "sudo rm -rf /\n" });
```

**Mitigation**:
- Use dedicated SSH user with limited permissions
- Implement command filtering
- Monitor commands in logs
- Use sudoers restrictions

## Debugging

### Enable Verbose Output

```javascript
// Don't strip ANSI codes
const output = await ssh_shell_get_output({
  shellId,
  stripAnsi: false
});

console.log("Raw output:", output);
```

### Check Shell Status

```javascript
const shells = await ssh_list_interactive_shells();
console.log("Active shells:", shells);

shells.forEach(shell => {
  console.log(`Shell ${shell.shellId}:`);
  console.log(`  Active: ${shell.isActive}`);
  console.log(`  Created: ${new Date(shell.createdAt)}`);
  console.log(`  Last Activity: ${new Date(shell.lastActivity)}`);
});
```

### Monitor Buffer

```javascript
// Peek at buffer without clearing
const peek = await ssh_shell_get_output({
  shellId,
  clear: false,
  stripAnsi: true
});

console.log("Current buffer:", peek);
console.log("Buffer size:", peek.length);
```

## Limitations

### Current Limitations

1. **No real-time streaming** - Must poll for output
2. **No terminal resize** - Fixed terminal size (xterm-256color)
3. **No file upload/download** - Use base64 encoding workaround
4. **No tab completion** - Can't intercept tab key
5. **No cursor position** - Can't get cursor location
6. **Single buffer** - stdout/stderr merged in PTY

### Workarounds

**File upload**:
```javascript
// Upload via base64
const content = fs.readFileSync("local-file.txt", "base64");
await ssh_shell_send_input({
  shellId,
  input: `echo "${content}" | base64 -d > remote-file.txt\n`
});
```

**File download**:
```javascript
await ssh_shell_send_input({
  shellId,
  input: "cat file.txt | base64\n"
});
await sleep(500);
const output = await ssh_shell_get_output({ shellId, clear: true });
const content = Buffer.from(output, "base64");
```

## Best Practices Summary

1. ✅ **Use `ssh_edit_file`** for file editing (high-level API)
2. ✅ **Always close shells** when done
3. ✅ **Clear buffers** after reading to free memory
4. ✅ **Reuse shells** for multiple operations
5. ✅ **Wait appropriately** after sending input (300-500ms)
6. ✅ **Strip ANSI** by default for clean output
7. ✅ **Validate user input** before sending to shell
8. ✅ **Handle errors** gracefully
9. ✅ **Monitor shell limits** (max 50 concurrent)
10. ✅ **Use try/finally** to ensure cleanup

## Related Documentation

- [README.md](README.md) - Main documentation
- [STREAMS.md](STREAMS.md) - Stream handling details
- [AUTHENTICATION.md](AUTHENTICATION.md) - Authentication methods
- [EDGE_CASES.md](EDGE_CASES.md) - Error handling
