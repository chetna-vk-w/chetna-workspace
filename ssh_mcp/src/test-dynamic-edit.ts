#!/usr/bin/env node

import { Storage } from './storage';
import { InteractiveSessionManager } from './interactive-session';

async function test() {
  console.log('=== Dynamic Text Replacement Test ===\n');

  const storage = new Storage('./test-dynamic.db');
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

    // Step 1: Add "ccc ccc" to the file
    console.log('1. Adding "ccc ccc" to file...');
    manager.sendInput(result.shellId, 'echo "ccc ccc" >> nano_test.txt\n');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check content
    manager.sendInput(result.shellId, 'cat nano_test.txt\n');
    await new Promise(resolve => setTimeout(resolve, 500));
    const after1 = manager.getCleanOutput(result.shellId, true);
    console.log('Content after adding "ccc ccc":');
    console.log(after1.output);

    // Step 2: Dynamically replace "ccc ccc" with "bcc bcc" using sed
    console.log('\n2. Replacing "ccc ccc" → "bcc bcc" using sed...');
    await manager.replaceInFile(result.shellId, 'nano_test.txt', 'ccc ccc', 'bcc bcc');

    // Verify
    await new Promise(resolve => setTimeout(resolve, 500));
    manager.sendInput(result.shellId, 'cat nano_test.txt\n');
    await new Promise(resolve => setTimeout(resolve, 500));
    const after2 = manager.getCleanOutput(result.shellId, true);
    console.log('\nContent after dynamic replacement:');
    console.log(after2.output);

    if (after2.output.includes('bcc bcc') && !after2.output.includes('ccc ccc')) {
      console.log('\n✓ SUCCESS: Dynamic replacement works! "ccc ccc" → "bcc bcc"\n');
    } else {
      console.log('\n✗ FAILED: Replacement did not work\n');
    }

    // Step 3: Replace "no no no no" → "yes yes yes yes"
    console.log('3. Replacing "no no no no" → "yes yes yes yes"...');
    await manager.replaceInFile(result.shellId, 'nano_test.txt', 'no no no no', 'yes yes yes yes');

    await new Promise(resolve => setTimeout(resolve, 500));
    manager.sendInput(result.shellId, 'cat nano_test.txt\n');
    await new Promise(resolve => setTimeout(resolve, 500));
    const after3 = manager.getCleanOutput(result.shellId, true);
    console.log('\nFinal content:');
    console.log(after3.output);

    if (after3.output.includes('yes yes yes yes')) {
      console.log('\n✓ SUCCESS: All dynamic edits work perfectly!\n');
    }

    manager.closeShell(result.shellId);
    console.log('✓ Test complete');

  } catch (error: any) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  } finally {
    storage.close();
    process.exit(0);
  }
}

test();
