# SYSU3DAILAB // MIND ATLAS — Global Mental Burden Observatory

An interactive, browser-only dashboard for comparing anxiety-disorder prevalence and suicide mortality across countries and years. Upload a country–year CSV panel to recalculate outcome-specific rankings, a composite RankScore, annual trajectories, outcome divergence and global map views in real time.

一个完全在浏览器本地运行的全球心理健康负担交互式观测台。上传国家—年份 CSV 面板后，可实时重算焦虑症患病率排名、自杀死亡率排名、综合 RankScore、年度变化轨迹、结局分化和全球地图。

## Data format / 数据格式

Required columns / 必需字段:

- `country_code`
- `country_name`
- `year`
- `suicide_rate`
- `anxiety_disorder_prevalence`

Optional / 可选字段: `continent`. Existing aliases such as `Code`, `NAME`, `Sui_R` and `axi` are accepted.

## Privacy / 隐私

Uploaded files are processed locally in the visitor's browser and are not sent to a server.

上传文件仅在访问者的浏览器中处理，不会发送到服务器。

## Development / 本地开发

```bash
pnpm install
pnpm run dev:static
```

Production build / 生产构建:

```bash
pnpm run build:static
```
