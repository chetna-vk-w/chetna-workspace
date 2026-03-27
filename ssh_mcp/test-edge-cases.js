#!/usr/bin/env node

const { spawn } = require('child_process');

const MCP_SERVER = 'node';
const SERVER_PATH = './dist/mcp-server.js';

let idCounter = 1;
let responseHandler = null;
let messageBuffer = '';

const server = spawn(MCP_SERVER, [SERVER_PATH], {
  stdio: ['pipe', 'pipe', 'pipe']
});

server.stderr.on('data', (data) => {
  // Silent
});

server.stdout.on('data', (data) => {
  messageBuffer += data.toString();
  const lines = messageBuffer.split('\n');
  messageBuffer = lines.pop() || '';
  
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const msg = JSON.parse(line);
      if (msg.id && responseHandler) {
        responseHandler(msg);
        responseHandler = null;
      }
    } catch (e) {}
  }
});

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
    
    setTimeout(() => {
      if (responseHandler) {
        reject(new Error('Request timeout'));
        responseHandler = null;
      }
    }, 20000);
  });
}

async function initialize() {
  await sendRequest('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'test-client', version: '1.0.0' }
  });
  server.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'initialized' }) + '\n');
}

async function testConnection(args, expectedType) {
  console.log(`\n=== Test: ${args.name || 'unnamed'} ===`);
  console.log('Host:', args.host);
  
  const result = await sendRequest('tools/call', { 
    name: 'ssh_conn_test', 
    arguments: args 
  });
  
  const text = result.content?.[0]?.text || '';
  console.log('Result:', text.substring(0, 150));
  
  // Check if error message is helpful
  if (expectedType === 'error') {
    if (text.includes('[failed]') && text.length > 50) {
      console.log('✓ Good error message');
    } else {
      console.log('✗ Poor error message');
    }
  }
  
  return text;
}

async function main() {
  try {
    await initialize();
    console.log('Server initialized');
    
    // Test cases
    const validKey = `-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACBj2N9tLTFzJj+yawsY38HsnVm4oFIiZNi+MdyOzbXJRQAAAJjTSB3X00gd
1wAAAAtzc2gtZWQyNTUxOQAAACBj2N9tLTFzJj+yawsY38HsnVm4oFIiZNi+MdyOzbXJRQ
AAAECdvDm6180q/8cdGHmiXJ8Cckcn6zZLIpYE/3/tvqnsiWPY320tMXMmP7JrCxjfweyd
WbigUiJk2L4x3I7NtclFAAAAFWFnZW50LXRlc3RAdm1pMjU0NzMxNQ==
-----END OPENSSH PRIVATE KEY-----`;
    
    const tests = [
      // Edge cases
      { name: 'empty', host: '', username: '', password: '', expected: 'error' },
      { name: 'no auth', host: '5.189.151.56', username: 'agent-test', expected: 'error' },
      { name: 'invalid host', host: 'invalid.host.that.does.not.exist', username: 'test', password: 'test', expected: 'error' },
      { name: 'wrong port', host: '5.189.151.56', username: 'agent-test', port: 2222, privateKey: 'fake', expected: 'error' },
      { name: 'wrong password', host: '5.189.151.56', username: 'agent-test', password: 'wrongpassword123', expected: 'error' },
      { name: 'fake key format', host: '5.189.151.56', username: 'agent-test', privateKey: 'fakekey', expected: 'error' },
      { name: 'valid key', host: '5.189.151.56', username: 'agent-test', privateKey: validKey, expected: 'success' },
    ];
    
    for (const test of tests) {
      await testConnection(test, test.expected);
    }
    
    console.log('\n=== All tests done ===');
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    server.kill();
    process.exit(0);
  }
}

main();
