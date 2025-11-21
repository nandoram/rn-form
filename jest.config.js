module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  transformIgnorePatterns: [
    "node_modules/(?!(react-native|@react-native|expo(nent)?|expo-modules-core|@expo|@unimodules|unimodules|sentry-expo|native-base|react-clone-referenced-element|react-native-svg)/)",
  ],
  testPathIgnorePatterns: ["/node_modules/", "/dist/", "/build/"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
};
