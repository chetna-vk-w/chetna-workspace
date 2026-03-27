#!/usr/bin/env node

import { Storage } from './storage';
import { InteractiveSessionManager } from './interactive-session';

async function test() {
  console.log('=== Sudo & Privileged Operations Test ===\n');

  const storage = new Storage('./test-sudo.db');
  const manager = new InteractiveSessionManager(storage);

  try {
    // Save connection
    const connectionId = storage.saveConnection({
      name: 'test',
      host: '68.183.80.188',
      port: 22,
      username: 'ssh-test',
      password: '1234567890',
    });

    // Create shell
    const result = await manager.createShell(connectionId);
    if (result.error) throw new Error(result.error);

    console.log(`✓ Shell created: ${result.shellId}\n`);
    await new Promise(resolve => setTimeout(resolve, 2000));
    manager.getOutput(result.shellId, true); // Clear buffer

    // Test 1: Check current user
    console.log('1. Checking current user...');
    const whoami = await manager.getCurrentUser(result.shellId);
    console.log(`   Current user: ${whoami.username}`);
    console.log(`   Is root: ${await manager.isRoot(result.shellId)}\n`);

    // Test 2: Check sudo access
    console.log('2. Checking sudo access...');
    const sudoCheck = await manager.checkSudoAccess(result.shellId, '1234567890');
    console.log(`   Has sudo: ${sudoCheck.hasSudo}`);
    console.log(`   Requires password: ${sudoCheck.requiresPassword}`);
    if (sudoCheck.error) console.log(`   Error: ${sudoCheck.error}`);
    console.log('');

    // Test 3: Detect prompt
    console.log('3. Detecting current prompt...');
    const prompt = manager.detectPrompt(result.shellId);
    console.log(`   Prompt type: ${prompt.type}`);
    if (prompt.match) console.log(`   Match: "${prompt.match}"`);
    console.log('');

    // Test 4: Execute sudo command (if available)
    if (sudoCheck.hasSudo) {
      console.log('4. Testing sudo command...');
      const sudoResult = await manager.executeSudo(result.shellId, 'whoami', '1234567890');
      console.log(`   Success: ${sudoResult.success}`);
      if (sudoResult.error) {
        console.log(`   Error: ${sudoResult.error}`);
      } else {
        console.log(`   Output includes 'root': ${sudoResult.output.includes('root')}`);
      }
      console.log('');
    } else {
      console.log('4. Skipping sudo test (no sudo access)\n');
    }

    // Test 5: Test prompt detection with simulated scenarios
    console.log('5. Testing prompt detection patterns...');

    // Simulate permission denied
    manager.sendInput(result.shellId, 'cat /etc/shadow 2>&1\n');
    await new Promise(resolve => setTimeout(resolve, 500));
    const permPrompt = manager.detectPrompt(result.shellId);
    console.log(`   After "cat /etc/shadow": ${permPrompt.type}`);
    manager.getOutput(result.shellId, true); // Clear

    // Simulate command not found
    manager.sendInput(result.shellId, 'nonexistentcommand123 2>&1\n');
    await new Promise(resolve => setTimeout(resolve, 500));
    const notFoundPrompt = manager.detectPrompt(result.shellId);
    console.log(`   After "nonexistentcommand123": ${notFoundPrompt.type}`);
    manager.getOutput(result.shellId, true); // Clear
    console.log('');

    // Test 6: Test control characters
    console.log('6. Testing control characters...');

    // Start a long-running command
    manager.sendInput(result.shellId, 'sleep 10\n');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Interrupt it
    const interruptResult = manager.interrupt(result.shellId);
    console.log(`   Interrupt (Ctrl+C): ${interruptResult.success ? 'sent' : interruptResult.error}`);
    await new Promise(resolve => setTimeout(resolve, 500));
    manager.getOutput(result.shellId, true); // Clear
    console.log('');

    // Test 7: Test execute privileged
    console.log('7. Testing executePrivileged...');
    const privResult = await manager.executePrivileged(result.shellId, 'ls /root', '1234567890');
    console.log(`   Success: ${privResult.success}`);
    console.log(`   Used sudo: ${privResult.usedSudo}`);
    if (privResult.error) console.log(`   Error: ${privResult.error}`);
    console.log('');

    // Test 8: Wait for prompt
    console.log('8. Testing waitForPrompt...');
    const waitResult = await manager.waitForPrompt(result.shellId, 5000);
    console.log(`   Ready: ${waitResult.ready}`);
    console.log(`   Prompt type: ${waitResult.promptType}`);
    console.log('');

    console.log('✓ All tests completed!\n');

    manager.closeShell(result.shellId);
    console.log('✓ Shell closed');

  } catch (error: any) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  } finally {
    storage.close();
    process.exit(0);
  }
}

test();
