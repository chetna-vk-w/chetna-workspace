#!/usr/bin/env node

import { Storage } from './storage';
import { InteractiveSessionManager } from './interactive-session';

async function test() {
  console.log('=== Advanced Line Editing Test ===\n');

  const storage = new Storage('./test-line-edit.db');
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

    // Step 1: Create initial file with basic content
    console.log('1. Creating initial file...');
    manager.sendInput(result.shellId, 'cat > line_test.txt << \'EOF\'\nfirst line\nsecond line\nthird line\nEOF\n');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check initial content
    manager.sendInput(result.shellId, 'cat line_test.txt\n');
    await new Promise(resolve => setTimeout(resolve, 500));
    const initial = manager.getCleanOutput(result.shellId, true);
    console.log('Initial content:');
    console.log(initial.output);

    // Step 2: Test insert_after - insert new line after "second line"
    console.log('\n2. Testing insert_after - adding "INSERTED AFTER" after "second line"...');
    await manager.editLine(result.shellId, 'line_test.txt', 'insert_after', 'second line', 'INSERTED AFTER');

    await new Promise(resolve => setTimeout(resolve, 500));
    manager.sendInput(result.shellId, 'cat line_test.txt\n');
    await new Promise(resolve => setTimeout(resolve, 500));
    const afterInsertAfter = manager.getCleanOutput(result.shellId, true);
    console.log('After insert_after:');
    console.log(afterInsertAfter.output);

    if (afterInsertAfter.output.includes('INSERTED AFTER') && afterInsertAfter.output.includes('second line')) {
      console.log('✓ insert_after works!\n');
    } else {
      console.log('✗ insert_after failed\n');
    }

    // Step 3: Test insert_before - insert new line before "third line"
    console.log('3. Testing insert_before - adding "INSERTED BEFORE" before "third line"...');
    await manager.editLine(result.shellId, 'line_test.txt', 'insert_before', 'third line', 'INSERTED BEFORE');

    await new Promise(resolve => setTimeout(resolve, 500));
    manager.sendInput(result.shellId, 'cat line_test.txt\n');
    await new Promise(resolve => setTimeout(resolve, 500));
    const afterInsertBefore = manager.getCleanOutput(result.shellId, true);
    console.log('After insert_before:');
    console.log(afterInsertBefore.output);

    if (afterInsertBefore.output.includes('INSERTED BEFORE') && afterInsertBefore.output.includes('third line')) {
      console.log('✓ insert_before works!\n');
    } else {
      console.log('✗ insert_before failed\n');
    }

    // Step 4: Test append_to_line - append text to end of "first line"
    console.log('4. Testing append_to_line - adding " APPENDED" to end of "first line"...');
    await manager.editLine(result.shellId, 'line_test.txt', 'append_to_line', 'first line', 'APPENDED');

    await new Promise(resolve => setTimeout(resolve, 500));
    manager.sendInput(result.shellId, 'cat line_test.txt\n');
    await new Promise(resolve => setTimeout(resolve, 500));
    const afterAppend = manager.getCleanOutput(result.shellId, true);
    console.log('After append_to_line:');
    console.log(afterAppend.output);

    if (afterAppend.output.includes('first line APPENDED')) {
      console.log('✓ append_to_line works!\n');
    } else {
      console.log('✗ append_to_line failed\n');
    }

    // Step 5: Test prepend_to_line - prepend text to beginning of "third line"
    console.log('5. Testing prepend_to_line - adding "PREPENDED " to beginning of "third line"...');
    await manager.editLine(result.shellId, 'line_test.txt', 'prepend_to_line', 'third line', 'PREPENDED');

    await new Promise(resolve => setTimeout(resolve, 500));
    manager.sendInput(result.shellId, 'cat line_test.txt\n');
    await new Promise(resolve => setTimeout(resolve, 500));
    const afterPrepend = manager.getCleanOutput(result.shellId, true);
    console.log('After prepend_to_line:');
    console.log(afterPrepend.output);

    if (afterPrepend.output.includes('PREPENDED third line')) {
      console.log('✓ prepend_to_line works!\n');
    } else {
      console.log('✗ prepend_to_line failed\n');
    }

    // Final content
    console.log('6. Final file content:');
    manager.sendInput(result.shellId, 'cat line_test.txt\n');
    await new Promise(resolve => setTimeout(resolve, 500));
    const final = manager.getCleanOutput(result.shellId, true);
    console.log(final.output);

    // Expected final content:
    // first line APPENDED
    // second line
    // INSERTED AFTER
    // INSERTED BEFORE
    // PREPENDED third line

    if (
      final.output.includes('first line APPENDED') &&
      final.output.includes('INSERTED AFTER') &&
      final.output.includes('INSERTED BEFORE') &&
      final.output.includes('PREPENDED third line')
    ) {
      console.log('\n✓ SUCCESS: All line editing operations work perfectly!\n');
    } else {
      console.log('\n✗ FAILED: Some operations did not work as expected\n');
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
