import { Command } from 'commander';
import { initRakibox, stageFiles, pushRakibox } from './commands/rakiboxActions.js';

const program = new Command();

program
  .name('rakibox')
  .description('Custom decentralized cloud tracking file tool system')
  .version('2.0.0');

program
  .command('init')
  .description('Initialize a cloud tracked Rakibox profile architecture')
  .action(async () => await initRakibox());

program
  .command('add')
  .description('Stage internal system directories into standard tracking configurations')
  .action(() => stageFiles());

program
  .command('push')
  .description('Upload staged components cleanly across Cloudflare R2 and state file schemas inside Firestore')
  .argument('[message]', 'Commit payload reference tag summary information', 'Cloud publish checkpoint update')
  .action(async (message) => await pushRakibox(message));

program.parse(process.argv);