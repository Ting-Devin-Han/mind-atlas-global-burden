# SYSU3DAILAB // MIND ATLAS — Global Mental Burden Observatory

An interactive, browser-only dashboard for comparing suicide mortality with anxiety- and depressive-disorder prevalence across 200 countries and territories. Upload a country-year CSV panel to recalculate outcome-specific rankings, a composite burden score, annual trajectories, fatal/non-fatal divergence and global map views in real time.

一个完全在浏览器本地运行的全球心理健康负担交互式观测台，比较200个国家和地区的自杀死亡率、焦虑障碍患病率与抑郁障碍患病率。上传国家-年份 CSV 面板后，可实时重算三项结局排名、综合负担得分、年度变化轨迹、致死/非致死分化和全球地图。

## Interactive pages / 交互页面

- `#/` — Global atlas with maps, trajectories and rankings / 全球地图、年度轨迹与综合排名
- `#/scenario` — Conditional 2030 results under trend continuation, attenuated divergence and accelerated divergence / 趋势延续、负担分化减弱和负担分化加速三种2030条件性情景
- `#/survey` — Individual mental-health and socioeconomic research survey for adults aged 18+ / 面向18岁及以上成年人的个体心理健康与社会经济研究问卷
- `#/contact` — Research contact, privacy information and a country-level visitor map / 研究联系、隐私说明与国家级访客地图
- `#/admin` — Authorised research data dashboard / 仅授权管理员访问的研究数据后台

English is the default interface language on every page. The language control switches the current page to Chinese.

所有页面默认显示英文，可使用页面右上角的语言按钮切换为中文。

## Data format / 数据格式

Required columns / 必需字段:

- `country_code`
- `country_name`
- `year`
- `suicide_rate`
- `anxiety_disorder_prevalence`
- `depressive_disorder_prevalence`

Optional / 可选字段: `continent`. Existing aliases such as `Code`, `NAME`, `Sui_R` and `axi` are accepted.

## Privacy / 隐私

Uploaded country panels are processed locally. Research survey responses are submitted only after electronic consent and only when an approved study database is configured. When the research backend is connected, the site also records one visit per browser session to assess global reach. GeoJS uses the visitor's public IP to identify the country; the database stores only the country code and name and does not store the raw IP address, region, city, GPS data or precise coordinates.

上传的国家面板仅在浏览器本地处理。个体研究问卷仅在参与者完成电子知情同意、且经批准的研究数据库完成配置后才会提交。研究后台接通后，网站还会为每个浏览器会话记录一次访问，以评估全球覆盖范围。GeoJS 仅根据访客公共 IP 判断国家；数据库只保存国家代码和名称，不保存原始 IP、地区、城市、GPS 数据或精确坐标。

## Research database / 研究数据库

The survey and privacy-limited visitor analytics use a Supabase PostgreSQL database with row-level security. Anonymous visitors can insert survey or session records but cannot read row-level data. The public visitor map receives country-level aggregate counts through a restricted database function. Only users listed in `research_admins` can access the dashboard and export survey data.

问卷和隐私受限的访客统计使用启用行级安全策略的 Supabase PostgreSQL 数据库。匿名访问者可以写入问卷或会话记录，但不能读取行级数据；公开访客地图仅通过受限数据库函数获得国家级汇总数量。只有加入 `research_admins` 的用户才能进入后台并导出问卷数据。

1. Create a Supabase project and run [`supabase/schema.sql`](supabase/schema.sql) in its SQL editor.
2. Create the administrator in Supabase Authentication, then add that user UUID to `research_admins`.
3. Add `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_STUDY_CONTACT` and `VITE_ETHICS_ID` as GitHub Actions repository secrets. Visitor analytics are enabled by default when Supabase is configured; set `VITE_VISITOR_ANALYTICS_ENABLED=false` to disable them or override `VITE_VISITOR_GEO_ENDPOINT` to use another approved geolocation endpoint.
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
