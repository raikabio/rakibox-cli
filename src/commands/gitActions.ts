import { execSync } from 'child_process';
import pc from 'picocolors';

// Helper to run shell commands cleanly
function runGitCommand(command: string, successMessage: string) {
  try {
    execSync(command, { stdio: 'ignore' });
    console.log(pc.green('✔ ') + pc.white(successMessage));
  } catch (error) {
    console.error(pc.red(`✖ Error executing: "${command}"`));
    process.exit(1);
  }
}

export function initRepo() {
  console.log(pc.gray('\nInitializing repository...'));
  runGitCommand('git init', 'Initialized empty Git repository.');
}

export function addFiles(path: string = '.') {
  console.log(pc.gray(`\nStaging files from: ${path}`));
  runGitCommand(`git add ${path}`, `Staged files successfully.`);
}

export function commitRepo(message: string) {
  console.log(pc.gray('\nCreating initial commit...'));
  runGitCommand(`git commit -m "${message}"`, `Committed with message: "${message}"`);
}

export function setupRemote(url: string) {
  console.log(pc.gray('\nSetting up remote repository and main branch...'));
  runGitCommand('git branch -M main', 'Set default branch to "main".');
  
  try {
    // If a remote already exists, remove it first to avoid conflicts
    try { execSync('git remote remove origin', { stdio: 'ignore' }); } catch {}
    
    execSync(`git remote add origin ${url}`, { stdio: 'ignore' });
    console.log(pc.green('✔ ') + pc.white(`Remote origin set to: ${url}`));
  } catch (error) {
    console.error(pc.red('✖ Error setting remote URL.'));
    process.exit(1);
  }
}

export function pushRepo() {
  console.log(pc.gray('\nPushing to GitHub (this might take a second)...'));
  // Let this inherit stdio so the user can see GitHub's actual progress/login prompts
  try {
    execSync('git push -u origin main', { stdio: 'inherit' });
    console.log(pc.green('\n✔ Success:') + pc.white(' Code successfully pushed to GitHub!\n'));
  } catch (error) {
    console.error(pc.red('\n✖ Error pushing to remote repository.'));
    process.exit(1);
  }
}