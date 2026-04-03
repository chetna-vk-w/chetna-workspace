#!/usr/bin/env node

(async function checkFile() {
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const path = require('path');
  const client = new Client({ name: 'check', version: '1.0.0' }, { capabilities: {} });
  const transport = new StdioClientTransport({
    command: 'node',
    args: [path.join(__dirname, 'mcp-server.js')],
  });

  await client.connect(transport);

  // Save connection
  const saveResult = await client.callTool('ssh_save_connection', {
    name: 'test',
    host: '68.183.80.188',
    port: 22,
    username: 'ssh-test',
    password: '1234567890',
  });

  const connectionId = saveResult.content[0].text.match(/ID: ([a-f0-9-]+)/)?.[1];

  // Connect
  const connectResult = await client.callTool('ssh_connect', { connectionId });
  const sessionId = connectResult.content[0].text.match(/Session ID: ([a-f0-9-]+)/)?.[1];

  // Execute cat command
  const execResult = await client.callTool('ssh_execute', {
    sessionId,
    command: 'cat nano_test.txt',
  });

  const commandId = execResult.content[0].text.match(/Command ID: ([a-f0-9-]+)/)?.[1];

  // Wait and get logs
  await new Promise(resolve => setTimeout(resolve, 1000));
  const logsResult = await client.callTool('ssh_get_logs', { commandId });

  console.log('\n===== nano_test.txt content =====');
  console.log(logsResult.content[0].text);
  console.log('===================================\n');

  await client.callTool('ssh_disconnect', { sessionId });
  await client.close();
  process.exit(0);
})();
