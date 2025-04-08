# MacからWindowsバイナリをビルドする方法

## 基本セットアップ

MacでWindowsアプリケーションをビルドするには、Wine（Windowsエミュレーター）とその他の依存関係が必要です。

### 事前準備（Intel Mac）

1. Homebrewをインストール（まだの場合）:
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

2. Wineと依存関係をインストール:
   ```bash
   brew install wine
   brew install mono
   ```

### 事前準備（Apple Silicon Mac - M1/M2/M3/M4）

Apple SiliconチップのMacでは、以下の手順が必要です：

1. Homebrewをインストール（まだの場合）:
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

2. Rosettaをインストール（まだの場合）:
   ```bash
   softwareupdate --install-rosetta
   ```

3. Wineをインストール:

   WineはApple Siliconで直接実行できません。Crossoverまたは特殊なセットアップが必要です。
   推奨方法は以下のいずれかです：

   #### 方法1: Docker Desktop + Windows Containerを使用

   1. [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop/)をインストール
   2. Windows Containerを有効化
   3. 以下のDockerfileを作成:

   ```dockerfile
   FROM electronuserland/builder:wine
   
   WORKDIR /app
   COPY . .
   RUN npm install
   CMD npm run build:win32
   ```

   4. ビルドコマンドを実行:
   ```bash
   docker build -t lams-win-builder .
   docker run --rm -v ${PWD}:/app lams-win-builder
   ```

   #### 方法2: GitHub Actionsを使用

   1. リポジトリに以下の`.github/workflows/build.yml`ファイルを追加:

   ```yaml
   name: Build Windows App
   
   on:
     workflow_dispatch:
   
   jobs:
     build:
       runs-on: windows-latest
       steps:
         - uses: actions/checkout@v3
         - uses: actions/setup-node@v3
           with:
             node-version: 16
         - run: npm ci
         - run: npm run build:win32
         - uses: actions/upload-artifact@v3
           with:
             name: windows-build
             path: dist/*.exe
   ```

   2. GitHubリポジトリでWorkflow Dispatchをトリガー

## ビルド方法

package.jsonに以下のスクリプトを追加しました：

```json
"scripts": {
  "build:win64:mac": "electron-builder --win --x64",
  "build:win32:mac": "electron-builder --win --ia32",
  "build:win:mac:both": "electron-builder --win --x64 --ia32"
}
```

以下のコマンドでWindowsアプリをビルドできます：

```bash
# 64-bit Windowsアプリをビルド
npm run build:win32:mac

# 32-bit Windowsアプリをビルド
npm run build:win32:mac:32

# 両方のアーキテクチャをビルド
npm run build:win32:mac:both
```

## トラブルシューティング

1. **Wineのエラー**: `wine: command not found`などのエラーが表示される場合：
   - `brew info wine`で正しくインストールされているか確認
   - パスが通っているか確認：`echo $PATH`

2. **ビルドエラー**: electron-builderがエラーを起こす場合：
   - electron-builderを更新：`npm install electron-builder@latest --save-dev`
   - Wineのバージョンを確認：`wine --version`（最新版を推奨）

3. **Apple Silicon特有の問題**:
   - Docker方式またはGitHub Actions方式の使用を検討
   - UTMなどでWindows VMを利用するのも選択肢

4. **署名の問題**:
   - 開発目的の場合は`--win.sign=false`オプションの追加を検討

## 参考リンク

- [electron-builder公式ドキュメント](https://www.electron.build/)
- [Wine公式サイト](https://www.winehq.org/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
