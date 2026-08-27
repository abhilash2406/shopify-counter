module.exports = {
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.js"],
  setupFiles: ["<rootDir>/jest.setup.cjs"],
  clearMocks: true,
  // config/shopify.js opens a MongoDBSessionStorage connection at import
  // time that's meant to live for the whole app process, not to be closed
  // per test file — harmless here, but Jest otherwise warns/hangs waiting
  // for it.
  forceExit: true,
  // A couple of sanitize-html's transitive deps (htmlparser2, entities) ship
  // ESM-only. Node's native require(esm) interop loads them fine at runtime,
  // but Jest's own module loader doesn't, so let babel-jest transform
  // node_modules too instead of chasing each offending package by name.
  transformIgnorePatterns: [],
};
