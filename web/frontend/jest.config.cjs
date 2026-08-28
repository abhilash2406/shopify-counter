module.exports = {
  testEnvironment: "jest-environment-jsdom",
  testMatch: ["**/__tests__/**/*.test.jsx", "**/__tests__/**/*.test.js"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.cjs"],
  clearMocks: true,
  moduleNameMapper: {
    "\\.(css|less|scss)$": "<rootDir>/__tests__/styleMock.cjs",
  },
};
