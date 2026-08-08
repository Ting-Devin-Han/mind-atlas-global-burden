# Individual mental-health and socioeconomic survey data dictionary

## Study design / 研究设计

- Population / 研究对象: adults aged 18 years or older / 18岁及以上成年人
- Design / 设计: anonymous cross-sectional online survey / 匿名横断面在线问卷
- Primary outcomes / 主要结局: GAD-7 anxiety symptom score and WHO-5 mental wellbeing score
- Direct identifiers / 直接身份标识: not collected / 不收集
- Default self-harm item / 默认自伤题目: none / 无

## Record and consent variables / 记录与同意变量

| Variable | Type | Coding / definition |
|---|---:|---|
| `participant_uuid` | UUID | Random browser-generated identifier; unique |
| `survey_version` | text | `individual-ses-v1.0` |
| `consent_version` | text | `electronic-consent-v1.0` |
| `consented_at` | timestamp | Electronic consent time |
| `submitted_at` | timestamp | Database submission time |
| `language` | category | `zh`, `en` |
| `recruitment_source` | text, nullable | Optional URL recruitment source tag |
| `completion_seconds` | integer | Time from consent to submission |

## Socioeconomic and contextual variables / 社会经济与情境变量

| Variable | Coding / definition |
|---|---|
| `age_group` | `18-24`, `25-34`, `35-44`, `45-54`, `55-64`, `65+` |
| `gender` | woman, man, non-binary, other/self-described, prefer not |
| `country_code` | ISO 3166-1 alpha-3 residence code |
| `residence_type` | urban centre, suburban/town, rural |
| `education` | lower secondary or below, upper secondary/vocational, bachelor, postgraduate |
| `employment` | full-time, part-time, self-employed, student, unemployed, unpaid care, retired, other |
| `household_size` | 1–20 usual residents |
| `income_ladder` | Subjective household position from 1 (lowest) to 10 (highest) within country |
| `financial_strain` | 1 (none) to 5 (extreme) |
| `housing_status` | owner, rent, family/no rent, temporary/unstable, other |
| `housing_insecurity` | 1 (none) to 5 (extreme/frequent) |
| `job_insecurity` | 1–5; nullable when not applicable |
| `healthcare_barrier` | 1 (none) to 5 (extreme) |
| `chronic_condition` | yes, no, prefer not |
| `disability` | yes, no, prefer not |
| `caregiving_hours` | 0, 1–9, 10–19, 20+ hours/week |
| `social_support` | 1 (none) to 5 (very strong) |
| `loneliness` | 1 (none) to 5 (very frequent) |
| `discrimination` | 1 (none) to 5 (very frequent) |
| `major_life_events` | 0, 1, 2, 3+ events in past 12 months |
| `sleep_hours` | Usual nightly hours, 0–16; optional |

## Mental-health outcomes / 心理健康结局

| Variable | Coding / definition |
|---|---|
| `gad7_answers` | Seven item responses, each 0–3 |
| `gad7_score` | Sum of seven items, 0–21; higher indicates more anxiety symptoms |
| `functional_difficulty` | 0–3 self-reported functional difficulty |
| `who5_answers` | Five item responses, each 0–5 |
| `who5_score` | Raw sum multiplied by 4, 0–100; higher indicates better wellbeing |

Scores are screening and research measures, not clinical diagnoses. Missingness, skip logic, sampling strategy, recruitment channels, translation validation and the statistical analysis plan should be finalised before formal data collection.

量表得分仅用于筛查和研究，不属于临床诊断。正式收集前应确定缺失值规则、跳题逻辑、抽样方案、招募渠道、翻译验证和统计分析计划。
