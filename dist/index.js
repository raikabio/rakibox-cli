import { Command } from 'commander';
import { initRakibox, addFiles, commit, setBranch, addRemote, pushRakibox } from './commands/rakiboxActions.js';
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
    .argument('[paths]', 'Files or directories to stage', '.')
    .action((paths) => addFiles(paths));
program
    .command('commit')
    .description('Commit staged changes')
    .requiredOption('-m, --message <message>', 'Commit message')
    .action((options) => commit(options.message));
program
    .command('branch')
    .description('Set branch name')
    .argument('<name>', 'Branch name')
    .action((name) => setBranch(name));
program
    .command('remote')
    .description('Add remote URL')
    .argument('url', 'Remote repository URL')
    .action((url) => addRemote(url));
program
    .command('push')
    .description('Push changes to Rakibox Cloud')
    .argument('[message]', 'Commit message', 'Cloud publish checkpoint update')
    .action(async (message) => await pushRakibox(message));
program.parse(process.argv);
