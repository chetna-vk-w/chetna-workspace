#!/usr/bin/env node

/**
 * Interactive Shell Test
 * Tests creating shell, editing files with nano
 */
(async function testInteractiveMain() {
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const path = require('path');

class InteractiveTest {
  private client: any;
  private transport: any;

  constructor() {
    this.client = null;
    this.transport = null;
  }

  async connect() {
    console.log('[Test] Starting MCP server...');

    this.client = new Client(
      {
        name: 'interactive-test-client',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );

    const serverPath = path.join(__dirname, 'mcp-server.js');
    this.transport = new StdioClientTransport({
      command: 'node',
      args: [serverPath],
    });

    await this.client.connect(this.transport);
    console.log('[Test] Connected to MCP server\n');
  }

  async testInteractiveEdit() {
    try {
      console.log('=== Interactive Shell Test ===\n');

      // Step 1: Save connection
      console.log('1. Saving SSH connection...');
      const saveResult = await this.client.callTool('ssh_save_connection', {
        name: 'test-server',
        host: '68.183.80.188',
        port: 22,
        username: 'ssh-test',
        password: '1234567890',
      });
      console.log(saveResult.content[0].text);

      const connectionId = saveResult.content[0].text.match(/Connection ID: ([a-f0-9-]+)/)?.[1];
      if (!connectionId) {
        throw new Error('Failed to get connection ID');
      }
      console.log(`Connection ID: ${connectionId}\n`);

      // Step 2: Create interactive shell
      console.log('2. Creating interactive shell...');
      const shellResult = await this.client.callTool('ssh_create_interactive_shell', {
        connectionId,
      });
      console.log(shellResult.content[0].text);

      const shellId = shellResult.content[0].text.match(/Shell ID: ([a-f0-9-]+)/)?.[1];
      if (!shellId) {
        throw new Error('Failed to get shell ID');
      }
      console.log(`Shell ID: ${shellId}\n`);

      // Step 3: Wait for shell to be ready
      console.log('3. Waiting for shell to be ready...');
      await this.sleep(2000);

      // Get initial output
      const initialOutput = await this.client.callTool('ssh_shell_get_output', {
        shellId,
        clear: true,
        stripAnsi: true,
      });
      console.log('Initial output:', initialOutput.content[0].text.substring(0, 100) + '...\n');

      // Step 4: Check if file exists, if not create it with "hacker"
      console.log('4. Creating/checking nano_test.txt...');
      await this.client.callTool('ssh_shell_send_input', {
        shellId,
        input: 'echo "hacker" > nano_test.txt\n',
      });
      await this.sleep(500);

      // Clear output
      await this.client.callTool('ssh_shell_get_output', {
        shellId,
        clear: true,
      });

      // Verify file creation
      await this.client.callTool('ssh_shell_send_input', {
        shellId,
        input: 'cat nano_test.txt\n',
      });
      await this.sleep(500);

      const catOutput = await this.client.callTool('ssh_shell_get_output', {
        shellId,
        clear: true,
        stripAnsi: true,
      });
      console.log('Current content:', catOutput.content[0].text);

      // Step 5: Edit file using nano
      console.log('\n5. Editing file with nano...');
      const editResult = await this.client.callTool('ssh_edit_file', {
        shellId,
        filePath: 'nano_test.txt',
        content: 'hacker_failed',
        editor: 'nano',
        save: true,
      });
      console.log(editResult.content[0].text);

      // Step 6: Verify the change
      console.log('\n6. Verifying the change...');
      await this.sleep(1000);

      await this.client.callTool('ssh_shell_send_input', {
        shellId,
        input: 'cat nano_test.txt\n',
      });
      await this.sleep(500);

      const verifyOutput = await this.client.callTool('ssh_shell_get_output', {
        shellId,
        clear: true,
        stripAnsi: true,
      });
      console.log('New content:', verifyOutput.content[0].text);

      if (verifyOutput.content[0].text.includes('hacker_failed')) {
        console.log('\n✓ SUCCESS: File edited successfully from "hacker" to "hacker_failed"');
      } else {
        console.log('\n✗ FAILED: File content does not match expected');
      }

      // Step 7: Close shell
      console.log('\n7. Closing interactive shell...');
      const closeResult = await this.client.callTool('ssh_close_interactive_shell', {
        shellId,
      });
      console.log(closeResult.content[0].text);

      console.log('\n=== Test Complete ===');

    } catch (error: any) {
      console.error('✗ Test failed:', error.message);
      throw error;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async disconnect() {
    await this.client.close();
    console.log('\n[Test] Disconnected from MCP server');
  }
}

// Run test
const test = new InteractiveTest();
try {
  await test.connect();
  await test.testInteractiveEdit();
} catch (error) {
  console.error('[Test] Error:', error);
  process.exit(1);
} finally {
  await test.disconnect();
  process.exit(0);
}
})();
