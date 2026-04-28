module.exports = {
  apps: [
    {
      name: "wildwalk-ai",
      script: "src/server/index.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "300M",
      env: {
        NODE_ENV: "production",
        PORT: 3000
      }
    }
  ]
};
