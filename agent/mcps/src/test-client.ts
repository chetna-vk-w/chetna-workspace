#!/usr/bin/env node

const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const { spawn } = require('child_process');
const path = require('path');

/**
 * MCP Client Test
 * Tests SSH connection using MCP server
 */
class MCPTestClient {
  private client: any;
  private transport: any;
  private serverProcess: any;

  constructor() {
    this.client = null;
    this.transport = null;
    this.serverProcess = null;
  }

  /**
   * Start MCP server and connect client
   */
  async connect(): Promise<void> {
    console.log('[Test] Starting MCP server...');

    // Create client
    this.client = new Client(
      {
        name: 'test-client',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );

    // Create transport - it will spawn the server process
    const serverPath = path.join(__dirname, 'mcp-server.js');
    this.transport = new StdioClientTransport({
      command: 'node',
      args: [serverPath],
    });

    // Connect
    await this.client.connect(this.transport);
    console.log('[Test] Connected to MCP server\n');
  }

  /**
   * List available tools
   */
  async listTools(): Promise<void> {
    console.log('[Test] Listing available tools...');
    const response = await this.client.listTools();

    console.log(`\nAvailable tools (${response.tools.length}):`);
    response.tools.forEach((tool: any, index: number) => {
      console.log(`  ${index + 1}. ${tool.name} - ${tool.description}`);
    });
    console.log('');
  }

  /**
   * Test SSH connection
   */
  async testConnection(config: any): Promise<void> {
    console.log('[Test] Testing SSH connection...');
    console.log(`  Host: ${config.host}`);
    console.log(`  Username: ${config.username}`);
    console.log(`  Auth: ${config.password ? 'Password' : config.privateKeyPath ? 'Private Key (file)' : config.privateKey ? 'Private Key (inline)' : 'Unknown'}\n`);

    try {
      const response = await this.client.callTool({
        name: 'ssh_test_connection',
        arguments: config,
      });

      console.log('[Test] Result:');
      response.content.forEach((content: any) => {
        console.log(`  ${content.text}`);
      });
      console.log('');

      return response;
    } catch (error: any) {
      console.error('[Test] Error:', error.message);
      throw error;
    }
  }

  /**
   * Save SSH connection
   */
  async saveConnection(config: any): Promise<any> {
    console.log('[Test] Saving SSH connection...');

    try {
      const response = await this.client.callTool({
        name: 'ssh_save_connection',
        arguments: config,
      });

      console.log('[Test] Result:');
      response.content.forEach((content: any) => {
        console.log(`  ${content.text}`);
      });
      console.log('');

      return response;
    } catch (error: any) {
      console.error('[Test] Error:', error.message);
      throw error;
    }
  }

  /**
   * Connect to saved connection and create session
   */
  async connectSession(connectionId: string): Promise<any> {
    console.log('[Test] Connecting to saved connection...');
    console.log(`  Connection ID: ${connectionId}\n`);

    try {
      const response = await this.client.callTool({
        name: 'ssh_connect',
        arguments: { connectionId },
      });

      console.log('[Test] Result:');
      response.content.forEach((content: any) => {
        console.log(`  ${content.text}`);
      });
      console.log('');

      // Extract session ID from response
      const text = response.content[0]?.text || '';
      const match = text.match(/Session ID: ([a-f0-9-]+)/);
      return match ? match[1] : null;
    } catch (error: any) {
      console.error('[Test] Error:', error.message);
      throw error;
    }
  }

  /**
   * Execute command on session
   */
  async executeCommand(sessionId: string, command: string): Promise<any> {
    console.log('[Test] Executing command...');
    console.log(`  Session ID: ${sessionId}`);
    console.log(`  Command: ${command}\n`);

    try {
      const response = await this.client.callTool({
        name: 'ssh_execute',
        arguments: { sessionId, command },
      });

      console.log('[Test] Result:');
      response.content.forEach((content: any) => {
        console.log(`  ${content.text}`);
      });
      console.log('');

      // Extract command ID
      const text = response.content[0]?.text || '';
      const match = text.match(/Command ID: ([a-f0-9-]+)/);
      return match ? match[1] : null;
    } catch (error: any) {
      console.error('[Test] Error:', error.message);
      throw error;
    }
  }

  /**
   * Get command logs
   */
  async getLogs(commandId: string, filter: any = {}): Promise<void> {
    console.log('[Test] Getting command logs...');
    console.log(`  Command ID: ${commandId}`);
    if (filter.tail) console.log(`  Filter: tail ${filter.tail}`);
    console.log('');

    try {
      const response = await this.client.callTool({
        name: 'ssh_get_logs',
        arguments: { commandId, ...filter },
      });

      console.log('[Test] Output:');
      response.content.forEach((content: any) => {
        console.log(content.text);
      });
      console.log('');
    } catch (error: any) {
      console.error('[Test] Error:', error.message);
      throw error;
    }
  }

  /**
   * List active sessions
   */
  async listSessions(): Promise<void> {
    console.log('[Test] Listing active sessions...');

    try {
      const response = await this.client.callTool({
        name: 'ssh_list_sessions',
        arguments: {},
      });

      console.log('[Test] Active sessions:');
      response.content.forEach((content: any) => {
        console.log(content.text);
      });
      console.log('');
    } catch (error: any) {
      console.error('[Test] Error:', error.message);
      throw error;
    }
  }

  /**
   * Disconnect session
   */
  async disconnect(sessionId: string): Promise<void> {
    console.log('[Test] Disconnecting session...');
    console.log(`  Session ID: ${sessionId}\n`);

    try {
      const response = await this.client.callTool({
        name: 'ssh_disconnect',
        arguments: { sessionId },
      });

      console.log('[Test] Result:');
      response.content.forEach((content: any) => {
        console.log(`  ${content.text}`);
      });
      console.log('');
    } catch (error: any) {
      console.error('[Test] Error:', error.message);
      throw error;
    }
  }

  /**
   * Close client and server
   */
  async close(): Promise<void> {
    console.log('[Test] Closing connection...');

    if (this.client) {
      await this.client.close();
    }

    if (this.transport) {
      await this.transport.close();
    }

    console.log('[Test] Closed\n');
  }
}

/**
 * Main test function
 */
async function main() {
  const testClient = new MCPTestClient();

  try {
    // Connect to MCP server
    await testClient.connect();

    // List available tools
    await testClient.listTools();

    // Test SSH connection with provided credentials
    console.log('='.repeat(60));
    console.log('TEST 1: Test SSH Connection');
    console.log('='.repeat(60) + '\n');

    const config = {
      name: 'test-server',
      host: '68.183.80.188',
      port: 22,
      username: 'ssh-test',
      password: '1234567890',
    };

    await testClient.testConnection(config);

    // Save the connection
    console.log('='.repeat(60));
    console.log('TEST 2: Save Connection');
    console.log('='.repeat(60) + '\n');

    const saveResponse = await testClient.saveConnection(config);
    const connectionIdMatch = saveResponse.content[0]?.text.match(/ID: ([a-f0-9-]+)/);
    const connectionId = connectionIdMatch ? connectionIdMatch[1] : null;

    if (!connectionId) {
      throw new Error('Failed to get connection ID');
    }

    // Connect and create session
    console.log('='.repeat(60));
    console.log('TEST 3: Create SSH Session');
    console.log('='.repeat(60) + '\n');

    const sessionId = await testClient.connectSession(connectionId);

    if (!sessionId) {
      throw new Error('Failed to get session ID');
    }

    // Wait a moment for session to stabilize
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Execute command
    console.log('='.repeat(60));
    console.log('TEST 4: Execute Command');
    console.log('='.repeat(60) + '\n');

    const commandId = await testClient.executeCommand(sessionId, 'whoami && pwd && ls -la');

    if (!commandId) {
      throw new Error('Failed to get command ID');
    }

    // Wait for command to complete
    console.log('[Test] Waiting for command to complete...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Get logs
    console.log('='.repeat(60));
    console.log('TEST 5: Get Command Logs');
    console.log('='.repeat(60) + '\n');

    await testClient.getLogs(commandId);

    // List sessions
    console.log('='.repeat(60));
    console.log('TEST 6: List Active Sessions');
    console.log('='.repeat(60) + '\n');

    await testClient.listSessions();

    // Disconnect
    console.log('='.repeat(60));
    console.log('TEST 7: Disconnect Session');
    console.log('='.repeat(60) + '\n');

    await testClient.disconnect(sessionId);

    // Final message
    console.log('='.repeat(60));
    console.log('ALL TESTS COMPLETED SUCCESSFULLY ✓');
    console.log('='.repeat(60) + '\n');

  } catch (error: any) {
    console.error('\n[Test] Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await testClient.close();
    process.exit(0);
  }
}

// Run tests
main();
