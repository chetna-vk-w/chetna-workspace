#!/usr/bin/env node

/**
 * Simple Interactive Shell Test
 */
(async function simpleInteractiveTest() {
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const path = require('path');

console.log('[Test] Starting simple interactive test...\n');

// Create client
const client = new Client(
  { name: 'simple-test', version: '1.0.0' },
  { capabilities: {} }
);

// Create transport
const serverPath = path.join(__dirname, 'mcp-server.js');
const transport = new StdioClientTransport({
  command: 'node',
  args: [serverPath],
});

// Connect
await client.connect(transport);
console.log('[Test] Connected to MCP server\n');

try {
  // Save connection
  console.log('[Test] Saving connection...');
  const saveResult = await client.callTool('ssh_save_connection', {
    name: 'test',
    host: '68.183.80.188',
    port: 22,
    username: 'ssh-test',
    password: '1234567890',
  });
  console.log(saveResult.content[0].text);

  const connectionId = saveResult.content[0].text.match(/ID: ([a-f0-9-]+)/)?.[1];
  console.log(`Connection ID: ${connectionId}\n`);

  // Create interactive shell
  console.log('[Test] Creating interactive shell...');
  const shellResult = await client.callTool('ssh_create_interactive_shell', {
    connectionId,
  });
  console.log(shellResult.content[0].text);

  const shellId = shellResult.content[0].text.match(/Shell ID: ([a-f0-9-]+)/)?.[1];
  console.log(`Shell ID: ${shellId}\n`);

  // Wait for shell to be ready
  console.log('[Test] Waiting for shell...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Get output
  const output1 = await client.callTool('ssh_shell_get_output', {
    shellId,
    clear: true,
  });
  console.log('[Test] Initial output received\n');

  // Edit file
  console.log('[Test] Editing nano_test.txt...');
  const editResult = await client.callTool('ssh_edit_file', {
    shellId,
    filePath: 'nano_test.txt',
    content: 'hacker_failed',
    editor: 'nano',
    save: true,
  });
  console.log(editResult.content[0].text);

  // Verify
  await new Promise(resolve => setTimeout(resolve, 1000));
  await client.callTool('ssh_shell_send_input', {
    shellId,
    input: 'cat nano_test.txt\n',
  });
  await new Promise(resolve => setTimeout(resolve, 500));

  const verifyOutput = await client.callTool('ssh_shell_get_output', {
    shellId,
    clear: true,
    stripAnsi: true,
  });
  console.log('\n[Test] File content:');
  console.log(verifyOutput.content[0].text);

  if (verifyOutput.content[0].text.includes('hacker_failed')) {
    console.log('\n✓ SUCCESS: File edited successfully!\n');
  } else {
    console.log('\n✗ FAILED: Content does not match\n');
  }

  // Close shell
  await client.callTool('ssh_close_interactive_shell', { shellId });
  console.log('[Test] Shell closed\n');

} catch (error: any) {
  console.error('[Test] Error:', error.message);
  process.exit(1);
} finally {
  await client.close();
  console.log('[Test] Done');
  process.exit(0);
}
})();
