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
                try {
                  if (typeof global === 'undefined') {
                    window.global = window;
                  }
                  
                  if (typeof process === 'undefined') {
                    window.process = { env: { NODE_ENV: '${process.env.NODE_ENV || 'production'}' } };
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
                  
                  // エラーハンドリングの設定
                  window.addEventListener('error', function(event) {
                    console.error('Global error:', event.error);
                  });
                  
                  console.log('Global initialization completed');
                } catch (error) {
                  console.error('Failed to initialize globals:', error);
                  if (typeof window !== 'undefined' && window.logInitError) {
                    window.logInitError(error);
                  }
                }
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
