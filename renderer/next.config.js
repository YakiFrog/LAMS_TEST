/** @type {import('next').NextConfig} */
const webpack = require('webpack');

module.exports = {
  output: process.env.NODE_ENV === 'production' ? 'export' : undefined,
  distDir: process.env.NODE_ENV === 'production' ? '../app' : '.next',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer, dev }) => {
    if (!isServer) {
      config.target = 'electron-renderer';
      
      // Node.js モジュールのポリフィル
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        crypto: false,
      };
      
      // Node.js グローバル変数のポリフィル提供
      config.plugins.push(
        new webpack.DefinePlugin({
          '__dirname': JSON.stringify('/'),
          '__filename': JSON.stringify('/index.html'),
        })
      );
    }
    
    // 開発モードでのデバッグの有効化
    if (dev && !isServer) {
      config.devtool = 'inline-source-map';
    }
    
    return config;
  },
  
  // 開発モードでのパフォーマンス調整
  reactStrictMode: false,
  
  // 開発モードでのReactエラーを抑制
  onDemandEntries: {
    // period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },
}
