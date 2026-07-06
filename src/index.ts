import { Command } from 'commander';
import { initRakibox, addFiles, commit, setBranch, addRemote, pushRakibox } from './commands/rakiboxActions';

const program = new Command();

program
  .name('rakibox')
  .description('Rakibox - Custom version control system using Firestore and R2')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize Rakibox workspace')
  .action(async () => await initRakibox());

program
  .command('add')
  .description('Stage files')
  .argument('[paths...]', 'Files or directories to stage', ['.'])
  .action((paths) => addFiles(paths.join(' ')));

program
  .command('commit')
  .description('Commit staged changes')
  .requiredOption('-m, --message <message>', 'Commit message')
  .action((options) => commit(options.message));

program
  .command('branch')
  .description('Set branch name')
  .allowUnknownOption()
  .argument('[args...]', 'Branch arguments (name or -M name)')
  .action((args, options) => {
    const allArgs = process.argv.slice(process.argv.indexOf('branch') + 1);
    setBranch(...allArgs);
  });

program
  .command('remote')
  .description('Add remote URL')
  .argument('[args...]', 'Remote arguments (add origin <url> or just <url>)')
  .action((args) => addRemote(...args));

program
  .command('push')
  .description('Push changes to Rakibox Cloud')
  .allowUnknownOption()
  .argument('[args...]', 'Push arguments (message, -u origin main, etc.)')
  .action(async (args) => {
    const allArgs = process.argv.slice(process.argv.indexOf('push') + 1);
    // Find the message (any argument not starting with -)
    const message = allArgs.find(a => !a.startsWith('-')) || 'Cloud publish checkpoint update';
    await pushRakibox(message);
  });

program.parse(process.argv);