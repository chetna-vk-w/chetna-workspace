#!/usr/bin/env node

/**
 * Direct interactive shell test (no MCP)
 * Tests the InteractiveSessionManager directly
 */

import { Storage } from './storage';
import { InteractiveSessionManager } from './interactive-session';

async function test() {
  console.log('=== Direct Interactive Shell Test ===\n');

  const storage = new Storage('./test-interactive.db');
  const manager = new InteractiveSessionManager(storage);

  try {
    // Save connection
    console.log('1. Saving connection...');
    const connectionId = storage.saveConnection({
      name: 'test',
      host: '68.183.80.188',
      port: 22,
      username: 'ssh-test',
      password: '1234567890',
    });
    console.log(`✓ Connection saved: ${connectionId}\n`);

    // Create shell
    console.log('2. Creating interactive shell...');
    const result = await manager.createShell(connectionId);

    if (result.error) {
      console.error(`✗ Error: ${result.error}`);
      process.exit(1);
    }

    console.log(`✓ Shell created successfully`);
    console.log(`  Shell ID: ${result.shellId}`);
    console.log(`  Session ID: ${result.sessionId}\n`);

    // Wait for shell to be ready
    console.log('3. Waiting for shell prompt...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get initial output
    const initial = manager.getOutput(result.shellId, true);
    console.log(`✓ Shell ready\n`);

    // Send command to check current file content
    console.log('4. Checking current file content...');
    manager.sendInput(result.shellId, 'cat nano_test.txt\n');
    await new Promise(resolve => setTimeout(resolve, 500));

    const before = manager.getCleanOutput(result.shellId, true);
    console.log(`Current content:\n${before.output}\n`);

    // Edit the file
    console.log('5. Editing file with nano...');
    const editResult = await manager.editFile(result.shellId, 'nano_test.txt', 'nano');

    if (editResult.error) {
      console.error(`✗ Edit error: ${editResult.error}`);
    } else {
      console.log(`✓ Edit session started: ${editResult.editId}`);

      // Send new content with all three lines - changing hacker_failed to "no no no no"
      const newContent = 'test\nno no no no\nok';
      await manager.sendEditorContent(editResult.editId, newContent);
      console.log('✓ Content updated');

      // Save and exit
      await manager.saveAndExit(editResult.editId);
      console.log('✓ File saved\n');
    }

    // Verify the change
    console.log('6. Verifying file content...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    manager.sendInput(result.shellId, 'cat nano_test.txt\n');
    await new Promise(resolve => setTimeout(resolve, 500));

    const after = manager.getCleanOutput(result.shellId, true);
    console.log(`New content:\n${after.output}\n`);

    if (after.output.includes('no no no no') && after.output.includes('test') && after.output.includes('ok')) {
      console.log('✓ SUCCESS: File edited correctly - all three lines present with hacker_failed→"no no no no"\n');
    } else {
      console.log('✗ FAILED: Content does not match expected\n');
      console.log('Expected: test\\nno no no no\\nok');
      console.log('Got:', after.output);
    }

    // Test garbage filtering
    console.log('7. Testing garbage filtering...');
    manager.sendInput(result.shellId, 'cat nano_test.txt\n');
    await new Promise(resolve => setTimeout(resolve, 500));

    const raw = manager.getOutput(result.shellId, false, false);
    const filtered = manager.getOutput(result.shellId, true, true);

    console.log(`Raw output length: ${raw.output.length} chars`);
    console.log(`Filtered output length: ${filtered.output.length} chars`);
    console.log('✓ Garbage filtering feature available\n');

    // Close shell
    console.log('8. Closing shell...');
    manager.closeShell(result.shellId);
    console.log('✓ Shell closed\n');

    console.log('=== All Tests Passed ===');

  } catch (error: any) {
    console.error('✗ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    storage.close();
    process.exit(0);
  }
}

test();
