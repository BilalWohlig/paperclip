// Set NODE_ENV before any test module is loaded so that
// src/index.ts does not attempt to call app.listen() during tests.
process.env.NODE_ENV = 'test';
