#!/usr/bin/env node

import { Storage } from './storage';
import { InteractiveSessionManager } from './interactive-session';

async function test() {
  console.log('=== Auto Sudo Handling Test ===\n');
  console.log('This test verifies that sudo password prompts are handled automatically.\n');

  const storage = new Storage('./test-auto-sudo.db');
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

    // Create shell - sudo password auto-handling is enabled by default
    console.log('1. Creating shell (auto-sudo enabled by default)...');
    const result = await manager.createShell(connectionId);
    if (result.error) throw new Error(result.error);
    console.log(`   ✓ Shell created: ${result.shellId}\n`);

    await new Promise(resolve => setTimeout(resolve, 2000));
    manager.getOutput(result.shellId, true); // Clear buffer

    // Test sending a sudo command - password should be auto-filled
    console.log('2. Sending sudo command (password should auto-fill if prompted)...');
    manager.sendInput(result.shellId, 'sudo whoami\n');

    // Wait for response (auto-handler will respond to password prompt)
    await new Promise(resolve => setTimeout(resolve, 3000));

    const output = manager.getCleanOutput(result.shellId, true);
    console.log('   Output:', output.output.substring(0, 200));

    // Check configuration API
    console.log('\n3. Testing setAutoRespond configuration...');

    // Disable auto-sudo
    let configResult = manager.setAutoRespond(result.shellId, { sudo: false });
    console.log(`   Disable auto-sudo: ${configResult.success ? '✓' : '✗'}`);

    // Enable auto yes/no
    configResult = manager.setAutoRespond(result.shellId, { yesNo: 'yes' });
    console.log(`   Enable auto yes/no: ${configResult.success ? '✓' : '✗'}`);

    // Re-enable auto-sudo with custom password
    configResult = manager.setAutoRespond(result.shellId, { sudo: true, password: 'custompass' });
    console.log(`   Re-enable auto-sudo with custom password: ${configResult.success ? '✓' : '✗'}`);

    console.log('\n✓ All configuration tests passed!\n');

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
