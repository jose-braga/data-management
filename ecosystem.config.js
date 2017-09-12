module.exports = {
  /**
   * Application configuration section
   * http://pm2.keymetrics.io/docs/usage/application-declaration/
   */
  apps : [

    // First application...
    {
      name      : "app",
      script    : "./bin/www",
      instances : 1,
      exec_mode : "cluster",
      env: {
        NODE_ENV: "development"
      },
      env_production : {
        NODE_ENV: "production"
      }
    },
  ],
}
