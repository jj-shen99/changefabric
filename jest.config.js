/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          jsx: "react-jsx",
          esModuleInterop: true,
          module: "commonjs",
          moduleResolution: "node",
          target: "ES2020",
          strict: true,
          skipLibCheck: true,
          paths: {
            "@/*": ["./src/*"],
          },
          baseUrl: ".",
        },
      },
    ],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testPathIgnorePatterns: ["<rootDir>/.next/", "<rootDir>/node_modules/"],
  transformIgnorePatterns: [
    "/node_modules/(?!(jose|openid-client|next-auth)/)",
  ],
  collectCoverageFrom: [
    "src/lib/**/*.{ts,tsx}",
    "src/components/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
  ],
};
