/** @type {import('jest').Config} */
const config = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  roots: ["<rootDir>/src"],
  testMatch: ["**/?(*.)+(spec|test).ts"],
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.json",
        useESM: true,
      },
    ],
  },
  moduleNameMapper: {
    "^obsidian$": "<rootDir>/__mocks__/obsidian.ts",
    "^franc-min$": "<rootDir>/__mocks__/franc-min.ts",
  },
  // Transform ESM modules in node_modules
  transformIgnorePatterns: [
    "node_modules/(?!(franc-min|trigram-utils|n-gram|collapse-white-space)/)",
  ],
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.test.ts"],
  coverageDirectory: "coverage",
};

module.exports = config;
