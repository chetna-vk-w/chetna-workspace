/**
 * SFTP Test Script
 * Tests upload and download functionality
 */

import { Storage } from './storage';
import { SFTPManager } from './sftp-manager';
import * as fs from 'fs';
import * as path from 'path';

async function testSFTP() {
  console.log('=== SFTP Test ===\n');

  const storage = new Storage();
  const sftpManager = new SFTPManager(storage);

  console.log(`SFTP Base Path: ${sftpManager.getBasePath()}\n`);

  // List saved connections
  const connections = storage.listConnections();
  console.log('Available connections:');
  if (connections.length === 0) {
    console.log('  No saved connections found.');
    console.log('  Please save a connection first using the MCP server.');
    return;
  }

  connections.forEach((conn) => {
    console.log(`  - ${conn.id}: ${conn.username}@${conn.host}:${conn.port}`);
  });

  // Use first connection for testing
  const testConnection = connections[0];
  const connectionId: string = testConnection.id!;
  console.log(`\nUsing connection: ${connectionId}\n`);

  // Create test file for upload (use absolute paths)
  const basePath = path.resolve(sftpManager.getBasePath());
  const testDir = path.join(basePath, 'test');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  const testContent = `Test file created at ${new Date().toISOString()}\nThis is a test for SFTP upload/download.`;
  const localTestFile = path.join(testDir, 'test-upload.txt');
  fs.writeFileSync(localTestFile, testContent);
  console.log(`Created test file: ${localTestFile}`);

  // Test 1: List remote home directory
  console.log('\n--- Test 1: List remote ~ ---');
  const listResult = await sftpManager.list(connectionId, '.');
  if (listResult.error) {
    console.log(`  Error: ${listResult.error}`);
  } else {
    console.log(`  Found ${listResult.entries.length} entries:`);
    listResult.entries.slice(0, 5).forEach((entry) => {
      console.log(`    ${entry.type === 'directory' ? 'd' : '-'}${entry.permissions} ${entry.size.toString().padStart(10)} ${entry.name}`);
    });
    if (listResult.entries.length > 5) {
      console.log(`    ... and ${listResult.entries.length - 5} more`);
    }
  }

  // Test 2: Upload file
  console.log('\n--- Test 2: Upload file ---');
  const remotePath = '/tmp/ssh-mcp-test-upload.txt';
  const uploadResult = await sftpManager.upload(connectionId, localTestFile, remotePath);
  if (uploadResult.success) {
    console.log(`  Uploaded: ${uploadResult.localPath} -> ${remotePath}`);
    console.log(`  Bytes transferred: ${uploadResult.bytesTransferred}`);
  } else {
    console.log(`  Error: ${uploadResult.error}`);
    return;
  }

  // Test 3: Stat remote file
  console.log('\n--- Test 3: Stat remote file ---');
  const statResult = await sftpManager.stat(connectionId, remotePath);
  if (statResult.exists) {
    console.log(`  File exists: ${statResult.type}`);
    console.log(`  Size: ${statResult.size} bytes`);
    console.log(`  Permissions: ${statResult.permissions}`);
    console.log(`  Modified: ${statResult.modifyTime}`);
  } else {
    console.log(`  Error: ${statResult.error || 'File not found'}`);
  }

  // Test 4: Download file
  console.log('\n--- Test 4: Download file ---');
  const downloadLocalPath = path.join(testDir, 'test-download.txt'); // Already absolute via testDir
  const downloadResult = await sftpManager.download(connectionId, remotePath, downloadLocalPath);
  if (downloadResult.success) {
    console.log(`  Downloaded: ${remotePath} -> ${downloadResult.localPath}`);
    console.log(`  Bytes transferred: ${downloadResult.bytesTransferred}`);

    // Verify content
    const downloadedContent = fs.readFileSync(downloadLocalPath, 'utf8');
    if (downloadedContent === testContent) {
      console.log(`  Content verification: PASSED`);
    } else {
      console.log(`  Content verification: FAILED`);
      console.log(`  Expected: ${testContent}`);
      console.log(`  Got: ${downloadedContent}`);
    }
  } else {
    console.log(`  Error: ${downloadResult.error}`);
  }

  // Test 5: Create remote directory
  console.log('\n--- Test 5: Create remote directory ---');
  const remoteDirPath = '/tmp/ssh-mcp-test-dir';
  const mkdirResult = await sftpManager.mkdir(connectionId, remoteDirPath);
  if (mkdirResult.success) {
    console.log(`  Created directory: ${remoteDirPath}`);
  } else {
    console.log(`  Error (may already exist): ${mkdirResult.error}`);
  }

  // Test 6: Delete remote file
  console.log('\n--- Test 6: Delete remote file ---');
  const deleteResult = await sftpManager.deleteFile(connectionId, remotePath);
  if (deleteResult.success) {
    console.log(`  Deleted: ${remotePath}`);
  } else {
    console.log(`  Error: ${deleteResult.error}`);
  }

  // Test 7: Delete remote directory
  console.log('\n--- Test 7: Delete remote directory ---');
  const deleteDirResult = await sftpManager.deleteDir(connectionId, remoteDirPath);
  if (deleteDirResult.success) {
    console.log(`  Deleted directory: ${remoteDirPath}`);
  } else {
    console.log(`  Error: ${deleteDirResult.error}`);
  }

  // Cleanup local test files
  console.log('\n--- Cleanup ---');
  fs.unlinkSync(localTestFile);
  fs.unlinkSync(downloadLocalPath);
  fs.rmdirSync(testDir);
  console.log('  Removed local test files');

  console.log('\n=== SFTP Test Complete ===');
}

testSFTP().catch(console.error);
