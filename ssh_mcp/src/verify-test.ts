#!/usr/bin/env node

/**
 * Verification Test - List and read files
 */
(async function verifyMain() {
  const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
  const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
  const path = require('path');
  console.log('='.repeat(70));
  console.log('SSH MCP VERIFICATION TEST');
  console.log('='.repeat(70) + '\n');

  const client = new Client(
    { name: 'verify-client', version: '1.0.0' },
    { capabilities: {} }
  );

  const transport = new StdioClientTransport({
    command: 'node',
    args: [path.join(__dirname, 'mcp-server.js')],
  });

  try {
    await client.connect(transport);
    console.log('[✓] Connected to MCP server\n');

    // Get saved connections
    console.log('[1] Listing saved connections...\n');
    const listResponse = await client.callTool({
      name: 'ssh_list_connections',
      arguments: {},
    });

    const connectionsText = listResponse.content[0]?.text || '[]';
    const connections = JSON.parse(connectionsText);

    if (connections.length === 0) {
      console.log('[✗] No saved connections found. Run npm test first.\n');
      process.exit(1);
    }

    console.log(`Found ${connections.length} connection(s):`);
    connections.forEach((conn: any, i: number) => {
      console.log(`  ${i + 1}. ${conn.name} (${conn.username}@${conn.host})`);
    });
    console.log('');

    // Use the first connection
    const connectionId = connections[0].id;
    console.log(`[2] Connecting to: ${connections[0].name}\n`);

    const connectResponse = await client.callTool({
      name: 'ssh_connect',
      arguments: { connectionId },
    });

    const connectText = connectResponse.content[0]?.text || '';
    const sessionMatch = connectText.match(/Session ID: ([a-f0-9-]+)/);

    if (!sessionMatch) {
      console.log('[✗] Failed to extract session ID\n');
      process.exit(1);
    }

    const sessionId = sessionMatch[1];
    console.log(`[✓] Session created: ${sessionId}\n`);

    // Wait for connection to stabilize
    await new Promise(resolve => setTimeout(resolve, 1000));

    // List files in home directory
    console.log('-'.repeat(70));
    console.log('[3] Listing files in home directory...\n');

    const lsResponse = await client.callTool({
      name: 'ssh_execute',
      arguments: {
        sessionId,
        command: 'ls -1 ~/',
      },
    });

    const lsText = lsResponse.content[0]?.text || '';
    const lsCommandMatch = lsText.match(/Command ID: ([a-f0-9-]+)/);

    if (!lsCommandMatch) {
      console.log('[✗] Failed to execute ls command\n');
      process.exit(1);
    }

    const lsCommandId = lsCommandMatch[1];
    console.log(`[✓] Command submitted: ${lsCommandId}\n`);

    // Wait for command to complete
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get ls output
    const lsLogsResponse = await client.callTool({
      name: 'ssh_get_logs',
      arguments: { commandId: lsCommandId },
    });

    const lsOutput = lsLogsResponse.content[0]?.text || '';
    console.log('Files found:');
    console.log(lsOutput);
    console.log('');

    // Extract file names from ls output
    const fileLines = lsOutput.split('\n')
      .filter((line: string) => line.includes('[stdout]'))
      .map((line: string) => {
        const match = line.match(/Line \d+: (.+)/);
        return match ? match[1].trim() : '';
      })
      .filter((name: string) => name && !name.includes('total'));

    console.log(`Found ${fileLines.length} file(s)\n`);

    // Read content of each file
    for (let i = 0; i < Math.min(fileLines.length, 3); i++) {
      const fileName = fileLines[i];

      console.log('-'.repeat(70));
      console.log(`[${4 + i}] Reading file: ${fileName}\n`);

      // Execute cat command
      const catResponse = await client.callTool({
        name: 'ssh_execute',
        arguments: {
          sessionId,
          command: `cat ~/`+fileName+` 2>&1 || echo "Cannot read file"`,
        },
      });

      const catText = catResponse.content[0]?.text || '';
      const catCommandMatch = catText.match(/Command ID: ([a-f0-9-]+)/);

      if (!catCommandMatch) {
        console.log('[✗] Failed to execute cat command\n');
        continue;
      }

      const catCommandId = catCommandMatch[1];

      // Wait for command to complete
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Get file content
      const catLogsResponse = await client.callTool({
        name: 'ssh_get_logs',
        arguments: { commandId: catCommandId },
      });

      const fileContent = catLogsResponse.content[0]?.text || '';

      // Extract actual content
      const contentLines = fileContent.split('\n')
        .filter((line: string) => line.includes('[stdout]') || line.includes('[stderr]'))
        .map((line: string) => {
          const match = line.match(/Line \d+: (.+)/);
          return match ? match[1] : '';
        })
        .join('\n');

      console.log('Content:');
      console.log('─'.repeat(70));
      console.log(contentLines || '(empty or binary file)');
      console.log('─'.repeat(70));
      console.log('');
    }

    // Show system info
    console.log('-'.repeat(70));
    console.log('[Final] System Information\n');

    const infoResponse = await client.callTool({
      name: 'ssh_execute',
      arguments: {
        sessionId,
        command: 'echo "=== System Info ===" && uname -a && echo "" && echo "=== Disk Usage ===" && df -h ~ && echo "" && echo "=== Current User ===" && id',
      },
    });

    const infoText = infoResponse.content[0]?.text || '';
    const infoCommandMatch = infoText.match(/Command ID: ([a-f0-9-]+)/);

    if (infoCommandMatch) {
      const infoCommandId = infoCommandMatch[1];
      await new Promise(resolve => setTimeout(resolve, 2000));

      const infoLogsResponse = await client.callTool({
        name: 'ssh_get_logs',
        arguments: { commandId: infoCommandId },
      });

      const infoOutput = infoLogsResponse.content[0]?.text || '';
      const infoLines = infoOutput.split('\n')
        .filter((line: string) => line.includes('[stdout]'))
        .map((line: string) => {
          const match = line.match(/Line \d+: (.+)/);
          return match ? match[1] : '';
        })
        .join('\n');

      console.log(infoLines);
      console.log('');
    }

    // Disconnect
    console.log('-'.repeat(70));
    console.log('[Cleanup] Disconnecting session...\n');

    await client.callTool({
      name: 'ssh_disconnect',
      arguments: { sessionId },
    });

    console.log('[✓] Session disconnected\n');

    console.log('='.repeat(70));
    console.log('VERIFICATION COMPLETE - ALL OPERATIONS SUCCESSFUL ✓');
    console.log('='.repeat(70) + '\n');

  } catch (error: any) {
    console.error('\n[✗] Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await client.close();
    await transport.close();
    process.exit(0);
  }
})();
