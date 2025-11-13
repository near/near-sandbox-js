module.exports = {
  timeout: '60000',
  files: ['__tests__/*.ava.ts', 'examples/*.ava.ts'],
  extensions: {
    ts: 'commonjs',
  },
  require: [
    'ts-node/register',
  ],
};
