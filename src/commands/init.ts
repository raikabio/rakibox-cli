import { execSync } from 'child_process';
import pc from 'picocolors';

export function initCommand() {
  console.log(pc.gray('\nInitializing repository via rakibox...'));

  try {
    // Run the actual git init command under the hood
    execSync('git init', { stdio: 'inherit' });
    
    console.log(pc.green('✔ Success:') + pc.white(' Rakibox workspace initialized successfully.\n'));
  } catch (error) {
    console.error(pc.red('✖ Error:') + ' Could not initialize git repository.');
    process.exit(1);
  }
}