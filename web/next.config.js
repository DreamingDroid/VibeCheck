const fs = require('fs');
const path = require('path');

// Dynamically load environment variables from the correct .env.<env> file
const rawEnv = (process.env.APP_ENV || 'local').toLowerCase().trim();
const envMap = {
  dev: 'development',
  development: 'development',
  uat: 'uat',
  staging: 'uat',
  prd: 'production',
  prod: 'production',
  production: 'production',
  local: 'local'
};
const appEnv = envMap[rawEnv] || rawEnv;
let envPath = path.resolve(process.cwd(), `.env.${appEnv}`);
if (!fs.existsSync(envPath) && fs.existsSync(path.resolve(process.cwd(), '.env.local'))) {
  envPath = path.resolve(process.cwd(), '.env.local');
}

if (fs.existsSync(envPath)) {
  console.log(`[NextConfig] Loading environment variables from: ${envPath}`);
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let val = match[2].trim();
      // Strip surrounding quotes
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.substring(1, val.length - 1);
      }
      process.env[key] = val;
    }
  });
} else {
  console.log(`[NextConfig] Environment file not found: ${envPath}`);
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimizes the build output for Docker/self-hosted deployments.
  // Produces a minimal, self-contained server in .next/standalone
  output: 'standalone',
};

module.exports = nextConfig;
