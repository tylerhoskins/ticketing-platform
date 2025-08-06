/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  },
  // Enable source maps for debugging
  productionBrowserSourceMaps: true,
  webpack: (config, { dev, isServer }) => {
    // Enable better source maps for debugging
    if (dev && !isServer) {
      config.devtool = 'source-map';
      
      // Ensure source maps are properly configured
      config.output = {
        ...config.output,
        devtoolModuleFilenameTemplate: '[absolute-resource-path]',
        devtoolFallbackModuleFilenameTemplate: '[absolute-resource-path]?[hash]'
      };
    }
    
    return config;
  },
}

module.exports = nextConfig