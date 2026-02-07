module.exports = {
  apps: [{
    name: "cordverse",
    script: "./backend/src/index.js",
    env: {
      NODE_ENV: "production",
      PORT: 80
    }
  }]
}
