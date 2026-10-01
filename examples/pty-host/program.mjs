import process from 'node:process';

// Fixed public sample program. It never invokes a shell or evaluates input.
process.stdout.write(
  `Demo PTY | stdinTTY=${!!process.stdin.isTTY} stdoutTTY=${!!process.stdout.isTTY}\r\nCommands: help, colors, size, exit\r\n> `,
);
if (process.stdin.isTTY) process.stdin.setRawMode(true);
process.stdin.resume();
let line = '',
  ignoreLF = false;
function run(command) {
  switch (command.trim()) {
    case 'help':
      process.stdout.write('Only help, colors, size and exit are available.\r\n');
      break;
    case 'colors':
      process.stdout.write('\x1b[32mGreen sample\x1b[0m | \x1b[34mBlue sample\x1b[0m\r\n');
      break;
    case 'size':
      process.stdout.write(
        `Size ${process.stdout.columns ?? 'unknown'}x${process.stdout.rows ?? 'unknown'}\r\n`,
      );
      break;
    case 'exit':
      process.stdout.write('Demo complete.\r\n');
      process.exit(0);
      break;
    default:
      process.stdout.write(command ? 'Unknown demo command.\r\n' : '\r\n');
  }
  process.stdout.write('> ');
}
process.stdin.on('data', (chunk) => {
  for (const character of chunk.toString('utf8')) {
    if (character === '\u0003') {
      process.stdout.write('Cancelled.\r\n');
      process.exit(130);
    }
    if (character === '\n' && ignoreLF) {
      ignoreLF = false;
      continue;
    }
    ignoreLF = false;
    if (character === '\r' || character === '\n') {
      process.stdout.write('\r\n');
      run(line);
      line = '';
      ignoreLF = character === '\r';
    } else if (character === '\u007f' || character === '\b') {
      if (line) {
        line = line.slice(0, -1);
        process.stdout.write('\b \b');
      }
    } else if (/^[\x20-\x7e]$/.test(character) && line.length < 160) {
      line += character;
      process.stdout.write(character);
    }
  }
});
