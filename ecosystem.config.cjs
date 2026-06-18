module.exports = {
  apps: [
    {
      name: "face-attendance-backend",
      cwd: "./backend",
      script: "server.js",
      interpreter: "node",
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "face-attendance-face-service",
      cwd: "./face_recognition",
      script: "app.py",
      interpreter: "python",
      env: {
        FACE_DEBUG: "false",
        FACE_HOST: "127.0.0.1",
        FACE_PORT: "8000"
      }
    }
  ]
};
