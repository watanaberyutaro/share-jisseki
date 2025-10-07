# イベント実績分析ツール

携帯ショップ外販イベントの実績を管理・分析するためのWebアプリケーション

## 機能

- **実績入力**: シンプルで使いやすい入力フォーム
- **データ分析**: 月別トレンド、商品構成比、催事場別・チーム別実績の可視化
- **レスポンシブデザイン**: PC・スマートフォン両対応
- **リアルタイム集計**: 入力データの即時反映

## 実績項目

### 新規ID系
- au MNP (SP1, SP2, SIM単)
- UQ MNP (SP1, SP2, SIM単)
- au HS (SP1, SP2, SIM単)
- UQ HS (SP1, SP2, SIM単)
- セルアップ (SP1, SP2, SIM単)

### LTV系
- クレカ、ゴールド、じ銀、保証、OTT、でんき、ガス

### その他
- NW件数

## セットアップ

1. 依存関係のインストール
```bash
npm install
```

2. データベースの初期化
```bash
npm run prisma:generate
npm run prisma:migrate
```

3. 開発サーバーの起動
```bash
npm run dev
```

4. ブラウザで http://localhost:3000 にアクセス

## 技術スタック

- Next.js 14
- React 18
- TypeScript
- Prisma (SQLite)
- Tailwind CSS
- Recharts (グラフ表示)
- React Hook Form (フォーム管理)