import Document, { Html, Head, Main, NextScript, DocumentContext } from 'next/document';
import { ColorModeScript } from '@chakra-ui/react';

class MyDocument extends Document {
  static async getInitialProps(ctx: DocumentContext) {
    const initialProps = await Document.getInitialProps(ctx);
    return { ...initialProps };
  }

  render() {
    return (
      <Html>
        <Head>
          <meta httpEquiv="Content-Security-Policy" content="script-src 'self' 'unsafe-inline' 'unsafe-eval'; object-src 'self'" />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link href="https://fonts.googleapis.com/css2?family=Yusei+Magic&display=swap" rel="stylesheet" />
          
          {/* グローバルオブジェクトの初期化を行うスクリプト - エラーハンドリング付き */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function() {
                  try {
                    console.log('Environment setup script starting...');
                    
                    // __dirname と __filename のポリフィル
                    if (typeof window !== 'undefined') {
                      window.__dirname = '/';
                      window.__filename = '/index.html';
                      window.process = window.process || {};
                      window.process.cwd = function() { return '/' };
                      window.process.env = window.process.env || {};
                    }
                    
                    // グローバルオブジェクトの設定
                    if (typeof window.global === 'undefined') {
                      window.global = window;
                    }
                    
                    // プロセスオブジェクトの設定
                    if (typeof window.process === 'undefined') {
                      window.process = { 
                        env: { 
                          NODE_ENV: '${process.env.NODE_ENV || 'production'}',
                          NEXT_PUBLIC_APP_ENV: '${process.env.NEXT_PUBLIC_APP_ENV || 'browser'}'
                        },
                        browser: true,
                        cwd: function() { return '/' }
                      };
                    }
                    
                    // Next.js開発モードでの特別な処理
                    const isDev = process.env.NODE_ENV === 'development';
                    if (isDev) {
                      console.log('Running in development mode');
                    }
                    
                    // モック用のElectron APIを提供（開発モードで使用）
                    if (typeof window.electron === 'undefined') {
                      console.log('Electron API not detected, providing mock implementation');
                      window.electron = {
                        isElectron: false,
                        selectDirectory: async function() {
                          console.log('Mock selectDirectory called');
                          return { canceled: false, filePaths: ['/mock/path'] };
                        },
                        saveFile: async function(options) {
                          console.log('Mock saveFile called with:', options);
                          return { success: true, filePath: options.filePath };
                        },
                        fileExists: async function(filePath) {
                          console.log('Mock fileExists called with:', filePath);
                          return { exists: false };
                        },
                        readFile: async function(filePath) {
                          console.log('Mock readFile called with:', filePath);
                          return '';
                        }
                      };
                    } else {
                      console.log('Electron API detected');
                    }
                    
                    // エラーログ用関数
                    window.logInitError = function(error) {
                      console.error('Initialization error:', error);
                      // エラー画面を表示するための要素を作成
                      if (document.body) {
                        var errorDiv = document.createElement('div');
                        errorDiv.style.padding = '20px';
                        errorDiv.style.color = 'red';
                        errorDiv.style.backgroundColor = '#fff';
                        errorDiv.style.position = 'fixed';
                        errorDiv.style.top = '0';
                        errorDiv.style.left = '0';
                        errorDiv.style.right = '0';
                        errorDiv.style.zIndex = '9999';
                        errorDiv.textContent = 'アプリケーション初期化エラー: ' + error.message;
                        document.body.appendChild(errorDiv);
                      }
                    };
                    
                    // グローバルエラーハンドリング
                    window.addEventListener('error', function(event) {
                      console.error('Global error:', event.error);
                    });
                    
                    // 未処理のPromiseエラーをキャッチ
                    window.addEventListener('unhandledrejection', function(event) {
                      console.error('Unhandled Promise rejection:', event.reason);
                    });
                    
                    console.log('Global initialization completed successfully');
                  } catch (error) {
                    console.error('Failed to initialize globals:', error);
                    if (typeof window !== 'undefined') {
                      if (window.logInitError) {
                        window.logInitError(error);
                      } else {
                        console.error('logInitError function not available:', error);
                        // 最低限のエラー表示
                        setTimeout(function() {
                          if (document.body) {
                            var errorDiv = document.createElement('div');
                            errorDiv.style.padding = '20px';
                            errorDiv.style.color = 'red';
                            errorDiv.style.position = 'fixed';
                            errorDiv.style.top = '0';
                            errorDiv.style.left = '0';
                            errorDiv.style.zIndex = '9999';
                            errorDiv.textContent = '初期化エラー: ' + error.message;
                            document.body.appendChild(errorDiv);
                          }
                        }, 1000);
                      }
                    }
                  }
                })();
              `,
            }}
          />
        </Head>
        <body>
          {/* ColorModeを維持するためのスクリプト */}
          <ColorModeScript />
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
