import { mergeConfig, type UserConfig } from "vite";

export default (config: UserConfig) => {
  // Important: always return the modified config
  return mergeConfig(config, {
    resolve: {
      alias: {
        "@": "/src",
      },
    },
    server: {
      allowedHosts: [
        "localhost",
        "127.0.0.1",
        ".ngrok-free.app",
      ],
    },
  });
};
