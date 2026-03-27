#!/usr/bin/env node

const { spawn } = require('child_process');

const MCP_SERVER = 'node';
const SERVER_PATH = './dist/mcp-server.js';

let idCounter = 1;
let requestId = 1;
let initialized = false;
let responseHandler = null;
let messageBuffer = '';

const server = spawn(MCP_SERVER, [SERVER_PATH], {
  stdio: ['pipe', 'pipe', 'pipe']
});

server.stderr.on('data', (data) => {
  console.error('[Server]:', data.toString().trim());
});

server.stdout.on('data', (data) => {
  messageBuffer += data.toString();
  
  const lines = messageBuffer.split('\n');
  messageBuffer = lines.pop() || '';
  
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const msg = JSON.parse(line);
      handleMessage(msg);
    } catch (e) {
      // Not JSON, might be log
    }
  }
});

function handleMessage(msg) {
  if (msg.id && responseHandler) {
    responseHandler(msg);
    responseHandler = null;
  }
}

function sendRequest(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = idCounter++;
    const request = { jsonrpc: '2.0', id, method, params };
    
    responseHandler = (msg) => {
      if (msg.error) {
        reject(new Error(msg.error.message || JSON.stringify(msg.error)));
      } else {
        resolve(msg.result);
      }
    };
    
    server.stdin.write(JSON.stringify(request) + '\n');
    
    // Timeout after 30 seconds
    setTimeout(() => {
      if (responseHandler) {
        reject(new Error('Request timeout'));
        responseHandler = null;
      }
    }, 30000);
  });
}

async function initialize() {
  console.log('\n=== Initializing MCP Server ===');
  
  const result = await sendRequest('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'test-client', version: '1.0.0' }
  });
  
  console.log('Server:', result.serverInfo);
  initialized = true;
  
  // Send initialized notification
  server.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'initialized' }) + '\n');
  console.log('Initialized!\n');
}

async function listTools() {
  console.log('=== Available Tools ===');
  const result = await sendRequest('tools/list');
  console.log(result.tools.map(t => t.name).join('\n'));
  console.log();
}

async function callTool(name, args = {}) {
  console.log(`\n=== Calling ${name} ===`);
  console.log('Args:', JSON.stringify(args, null, 2));
  
  const result = await sendRequest('tools/call', { name, arguments: args });
  
  if (result.content && result.content[0]) {
    console.log('Result:', result.content[0].text);
  }
  
  return result;
}

async function main() {
  try {
    // Initialize
    await initialize();
    
    // List available tools
    await listTools();
    
    // SSH Connection details - use provided key
    const host = '5.189.151.56';
    const username = 'agent-test';
    const privateKey = `-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACBj2N9tLTFzJj+yawsY38HsnVm4oFIiZNi+MdyOzbXJRQAAAJjTSB3X00gd
1wAAAAtzc2gtZWQyNTUxOQAAACBj2N9tLTFzJj+yawsY38HsnVm4oFIiZNi+MdyOzbXJRQ
AAAECdvDm6180q/8cdGHmiXJ8Cckcn6zZLIpYE/3/tvqnsiWPY320tMXMmP7JrCxjfweyd
WbigUiJk2L4x3I7NtclFAAAAFWFnZW50LXRlc3RAdm1pMjU0NzMxNQ==
-----END OPENSSH PRIVATE KEY-----`;
    
    console.log('Using provided private key');
    
    // Save SSH connection using consolidated ssh_conn tool
    console.log('\n=== Saving SSH Connection ===');
    await callTool('ssh_conn', {
      op: 'save',
      name: 'agent-test',
      host: host,
      port: 22,
      username: username,
      privateKey: privateKey
    });
    
    // List connections to verify using consolidated ssh_conn tool
    console.log('\n=== Saved Connections ===');
    await callTool('ssh_conn', { op: 'list' });
    
    // Open interactive shell using consolidated ssh_shell tool
    console.log('\n=== Opening Interactive Shell ===');
    const shellResult = await callTool('ssh_shell', {
      op: 'open',
      name: 'agent-test'
    });
    
    console.log('\n=== SUCCESS ===');
    console.log('Shell ID extracted from above response.');
    console.log('Use Shell ID in terminal.html to connect!');
    console.log('Keeping shell alive for 10 minutes...');
    
    // Keep alive for 10 minutes - shell will close after this
    await new Promise(r => setTimeout(r, 600000));
    
    console.log('Time up, closing...');
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    server.kill();
    process.exit(0);
  }
}

main();
