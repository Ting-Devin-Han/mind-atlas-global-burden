# SYSU3DAILAB // MIND ATLAS — Global Mental Burden Observatory

An interactive, browser-only dashboard for comparing anxiety-disorder prevalence and suicide mortality across countries and years. Upload a country–year CSV panel to recalculate outcome-specific rankings, a composite RankScore, annual trajectories, outcome divergence and global map views in real time.

一个完全在浏览器本地运行的全球心理健康负担交互式观测台。上传国家—年份 CSV 面板后，可实时重算焦虑症患病率排名、自杀死亡率排名、综合 RankScore、年度变化轨迹、结局分化和全球地图。

## Interactive pages / 交互页面

- `#/` — Global atlas with maps, trajectories and rankings / 全球地图、年度轨迹与综合排名
- `#/scenario` — Ranking scenario lab with adjustable outcome and temporal weights / 可调整结局与时间权重的排名情景实验室
- `#/survey` — Individual mental-health and socioeconomic research survey for adults aged 18+ / 面向18岁及以上成年人的个体心理健康与社会经济研究问卷
- `#/admin` — Authorised research data dashboard / 仅授权管理员访问的研究数据后台

## Data format / 数据格式

Required columns / 必需字段:

- `country_code`
- `country_name`
- `year`
- `suicide_rate`
- `anxiety_disorder_prevalence`

Optional / 可选字段: `continent`. Existing aliases such as `Code`, `NAME`, `Sui_R` and `axi` are accepted.

## Privacy / 隐私

Uploaded country panels are processed locally. Research survey responses are submitted only after electronic consent and only when an approved study database is configured.

上传的国家面板仅在浏览器本地处理。个体研究问卷仅在参与者完成电子知情同意、且经批准的研究数据库完成配置后才会提交。

## Research database / 研究数据库

The survey uses a Supabase PostgreSQL database with row-level security. Anonymous visitors can insert one response but cannot read any record. Only users listed in `research_admins` can access the dashboard and export data.

问卷使用启用行级安全策略的 Supabase PostgreSQL 数据库。匿名访问者只能提交一条记录，不能读取任何记录；只有加入 `research_admins` 的用户才能进入后台并导出数据。

1. Create a Supabase project and run [`supabase/schema.sql`](supabase/schema.sql) in its SQL editor.
2. Create the administrator in Supabase Authentication, then add that user UUID to `research_admins`.
3. Add `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_STUDY_CONTACT` and `VITE_ETHICS_ID` as GitHub Actions repository secrets.
4. Complete and obtain ethics approval for [`docs/participant-information-consent-template.md`](docs/participant-information-consent-template.md) before formal recruitment.

The questionnaire variable definitions are documented in [`docs/individual-survey-data-dictionary.md`](docs/individual-survey-data-dictionary.md).

## Development / 本地开发

```bash
pnpm install
pnpm run dev:static
```

Production build / 生产构建:

```bash
pnpm run build:static
```
