module.exports = {
  timeout: '60000',
  files: ['__tests__/*.ava.ts', 'examples/*.ava.ts'],
  extensions: [
    'ts',
  ],
  require: [
    'ts-node/register',
  ],
};
