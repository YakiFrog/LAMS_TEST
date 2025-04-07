import { ChakraProvider } from '@chakra-ui/react'
import { useState, useEffect, createContext } from 'react'
import theme from '../lib/theme'
import { AppProps } from 'next/app'
import { setupDefaultSettings } from '../utils/setupDefaults'

// クライアント状態を共有するためのコンテキスト作成
export const ClientContext = createContext(false);

function MyApp({ Component, pageProps }: AppProps) {
  // クライアントサイドでのみレンダリングを行うための状態
  const [isClient, setIsClient] = useState(false)

  // コンポーネントがマウントされた後にクライアントサイドであることを示す
  useEffect(() => {
    // デフォルト設定の初期化
    setupDefaultSettings();

    setIsClient(true)
  }, [])

  // SSRとCSRの不一致を避けるための条件付きレンダリング
  if (!isClient) {
    // サーバーサイドまたは初期レンダリング時は最小限のコンテンツのみを表示
    return (
      <ChakraProvider theme={theme}>
        <div style={{ visibility: 'hidden' }}>
          <Component {...pageProps} />
        </div>
      </ChakraProvider>
    )
  }

  // クライアントサイドでの完全なレンダリング
  return (
    <ChakraProvider theme={theme}>
      <ClientContext.Provider value={isClient}>
        <Component {...pageProps} />
      </ClientContext.Provider>
    </ChakraProvider>
  )
}

export default MyApp
