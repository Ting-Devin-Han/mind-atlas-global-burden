"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as echarts from "echarts";
import Papa from "papaparse";
import countries from "i18n-iso-countries";
import enCountries from "i18n-iso-countries/langs/en.json";
import zhCountries from "i18n-iso-countries/langs/zh.json";
import worldAtlas from "world-atlas/countries-110m.json";
import { Activity, Globe2, Search, Sparkles } from "lucide-react";
import AtlasNav, { type AtlasLanguage } from "./atlas-nav";

countries.registerLocale(enCountries);
countries.registerLocale(zhCountries);

type Scenario = "Trend continuation" | "Attenuated burden divergence" | "Accelerated burden divergence";
type Outcome = "Divergence" | "Suicide" | "Anxiety" | "Depression";

type ProjectionRow = {
  code: string;
  name: string;
  continent: string;
  year: number;
  scenario: Scenario;
  outcome: Exclude<Outcome, "Divergence">;
  prediction: number;
  baseline: number;
};

type TrajectoryRow = {
  scenario: Scenario;
  outcome: Exclude<Outcome, "Divergence">;
  year: number;
  p25: number;
  median: number;
  mean: number;
  p75: number;
};

type SummaryRow = {
  scenario: Scenario;
  outcome: Exclude<Outcome, "Divergence">;
  medianChange: number;
  meanChange: number;
  increases: number;
  declines: number;
};

type CountryScenario = {
  code: string;
  name: string;
  continent: string;
  suicide: number;
  anxiety: number;
  depression: number;
  nonFatal: number;
  divergence: number;
};

type AtlasGeometry = { id?: string | number; properties?: { name?: string } };

const atlasGeographies = (worldAtlas as unknown as {
  objects: { countries: { geometries: AtlasGeometry[] } };
}).objects.countries.geometries;

const atlasNameByNumericCode = new Map(
  atlasGeographies
    .filter((geo) => geo.id !== undefined && geo.id !== null && geo.properties?.name)
    .map((geo) => [String(geo.id).padStart(3, "0"), geo.properties?.name as string]),
);

const scenarioOrder: Scenario[] = [
  "Trend continuation",
  "Attenuated burden divergence",
  "Accelerated burden divergence",
];

const outcomeOrder: Outcome[] = ["Divergence", "Suicide", "Anxiety", "Depression"];

const colors = {
  Suicide: "#3e63af",
  Anxiety: "#d97cb3",
  Depression: "#7f3292",
};

const copy = {
  zh: {
    documentTitle: "2030条件性情景 — SYSU3DAILAB MIND ATLAS",
    kicker: "2030条件性预测",
    titleA: "三种情景下，",
    titleB: "全球负担分化将如何演变？",
    intro: "比较趋势延续、负担分化减弱和负担分化加速三种透明压力测试。所有数值均以2019年为基线，是条件性估计而非政策承诺或无条件预测。",
    TrendContinuation: "趋势延续",
    AttenuatedBurdenDivergence: "负担分化减弱",
    AcceleratedBurdenDivergence: "负担分化加速",
    scenarioHint: "选择情景",
    outcomeHint: "地图指标",
    Divergence: "致死/非致死分化",
    Suicide: "自杀死亡率",
    Anxiety: "焦虑患病率",
    Depression: "抑郁患病率",
    medianChange: "2030中位变化",
    countriesUp: "上升国家",
    countriesDown: "下降国家",
    areas: "200个国家和地区",
    trajectoryTitle: "全球中位预测轨迹",
    trajectorySub: "相对2019年的跨国中位变化（%）",
    mapTitle: "2030年国家分布",
    mapSub: "点击国家可联动下方表格",
    high: "较高",
    low: "较低",
    noData: "暂无数据",
    rankingTitle: "国家情景结果",
    rankingSub: "按当前地图指标排序；所有变化均相对2019年",
    search: "搜索国家或代码",
    country: "国家或地区",
    divergence: "分化",
    nonFatal: "非致死均值",
    note: "情景结果用于检验观察到的分化在不同强度下是否持续，不用于宣称确定的未来。",
    selected: "聚焦国家",
  },
  en: {
    documentTitle: "Conditional scenarios to 2030 — SYSU3DAILAB MIND ATLAS",
    kicker: "CONDITIONAL ESTIMATES TO 2030",
    titleA: "How will the global burden gap evolve",
    titleB: "under three transparent scenarios?",
    intro: "Compare trend continuation with attenuated and accelerated burden divergence. All values are conditional estimates relative to 2019, not policy commitments or unconditional forecasts.",
    TrendContinuation: "Trend continuation",
    AttenuatedBurdenDivergence: "Attenuated divergence",
    AcceleratedBurdenDivergence: "Accelerated divergence",
    scenarioHint: "Select scenario",
    outcomeHint: "Map outcome",
    Divergence: "Fatal/non-fatal divergence",
    Suicide: "Suicide mortality",
    Anxiety: "Anxiety prevalence",
    Depression: "Depressive prevalence",
    medianChange: "Median change in 2030",
    countriesUp: "Countries increasing",
    countriesDown: "Countries declining",
    areas: "200 countries and territories",
    trajectoryTitle: "Global median trajectories",
    trajectorySub: "Cross-country median change relative to 2019 (%)",
    mapTitle: "National distribution in 2030",
    mapSub: "Select a country to connect the map and table",
    high: "HIGHER",
    low: "LOWER",
    noData: "No data",
    rankingTitle: "Country scenario results",
    rankingSub: "Sorted by the active map measure; all changes are relative to 2019",
    search: "Search country or code",
    country: "Country or area",
    divergence: "Divergence",
    nonFatal: "Non-fatal mean",
    note: "Scenarios test whether the observed divergence persists at different intensities; they do not claim a certain future.",
    selected: "Focus country",
  },
};

const scenarioCopyKey: Record<
  Scenario,
  "TrendContinuation" | "AttenuatedBurdenDivergence" | "AcceleratedBurdenDivergence"
> = {
  "Trend continuation": "TrendContinuation",
  "Attenuated burden divergence": "AttenuatedBurdenDivergence",
  "Accelerated burden divergence": "AcceleratedBurdenDivergence",
};

function percentChange(prediction: number, baseline: number) {
  return baseline > 0 ? ((prediction / baseline) - 1) * 100 : 0;
}

function fmt(value: number, digits = 1) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

function mapCountryName(code: string, fallback: string) {
  const numericCode = countries.alpha3ToNumeric(code);
  return (numericCode && atlasNameByNumericCode.get(numericCode)) || fallback;
}

function displayName(code: string, fallback: string, lang: AtlasLanguage) {
  return countries.getName(code, lang, { select: "official" }) || fallback;
}

function parseProjections(rows: Record<string, unknown>[]) {
  return rows.flatMap((row): ProjectionRow[] => {
    const code = String(row.country_code ?? "").trim().toUpperCase();
    const name = String(row.country_name ?? code).trim();
    const continent = String(row.continent ?? "").trim();
    const year = Number(row.year);
    const scenario = String(row.scenario) as Scenario;
    const outcome = String(row.outcome) as Exclude<Outcome, "Divergence">;
    const prediction = Number(row.prediction);
    const baseline = Number(row.baseline_2019);
    if (!code || !scenarioOrder.includes(scenario) || !["Suicide", "Anxiety", "Depression"].includes(outcome) || !Number.isFinite(year) || !Number.isFinite(prediction) || !Number.isFinite(baseline)) return [];
    return [{ code, name, continent, year, scenario, outcome, prediction, baseline }];
  });
}

function parseTrajectories(rows: Record<string, unknown>[]) {
  return rows.flatMap((row): TrajectoryRow[] => {
    const scenario = String(row.scenario) as Scenario;
    const outcome = String(row.outcome) as Exclude<Outcome, "Divergence">;
    const year = Number(row.year);
    const p25 = Number(row.p25);
    const median = Number(row.median);
    const mean = Number(row.mean);
    const p75 = Number(row.p75);
    if (!scenarioOrder.includes(scenario) || !["Suicide", "Anxiety", "Depression"].includes(outcome) || ![year, p25, median, mean, p75].every(Number.isFinite)) return [];
    return [{ scenario, outcome, year, p25, median, mean, p75 }];
  });
}

function parseSummaries(rows: Record<string, unknown>[]) {
  return rows.flatMap((row): SummaryRow[] => {
    const scenario = String(row.scenario) as Scenario;
    const outcome = String(row.outcome) as Exclude<Outcome, "Divergence">;
    const medianChange = Number(row.median_change);
    const meanChange = Number(row.mean_change);
    const increases = Number(row.countries_increase);
    const declines = Number(row.countries_decline);
    if (!scenarioOrder.includes(scenario) || !["Suicide", "Anxiety", "Depression"].includes(outcome) || ![medianChange, meanChange, increases, declines].every(Number.isFinite)) return [];
    return [{ scenario, outcome, medianChange, meanChange, increases, declines }];
  });
}

function ScenarioChart({ option, className, onClick }: { option: echarts.EChartsOption; className: string; onClick?: (params: unknown) => void }) {
  const node = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!node.current) return;
    const chart = echarts.getInstanceByDom(node.current) || echarts.init(node.current, undefined, { renderer: "canvas" });
    chart.setOption(option, { notMerge: true, lazyUpdate: true });
    chart.off("click");
    if (onClick) chart.on("click", onClick);
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(node.current);
    return () => {
      observer.disconnect();
      chart.off("click");
    };
  }, [onClick, option]);
  return <div ref={node} className={className} />;
}

export default function ScenarioPage() {
  const [lang, setLang] = useState<AtlasLanguage>("en");
  const [scenario, setScenario] = useState<Scenario>("Trend continuation");
  const [outcome, setOutcome] = useState<Outcome>("Divergence");
  const [projections, setProjections] = useState<ProjectionRow[]>([]);
  const [trajectories, setTrajectories] = useState<TrajectoryRow[]>([]);
  const [summaries, setSummaries] = useState<SummaryRow[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("CHN");
  const t = copy[lang];

  useEffect(() => {
    document.title = t.documentTitle;
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  }, [lang, t.documentTitle]);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("./data/figure4_new_3_country_projections.csv").then((response) => response.text()),
      fetch("./data/figure4_new_3_global_trajectories.csv").then((response) => response.text()),
      fetch("./data/figure4_new_3_2030_summary.csv").then((response) => response.text()),
    ]).then(([projectionText, trajectoryText, summaryText]) => {
      if (!active) return;
      setProjections(parseProjections(Papa.parse<Record<string, unknown>>(projectionText, { header: true, skipEmptyLines: true }).data));
      setTrajectories(parseTrajectories(Papa.parse<Record<string, unknown>>(trajectoryText, { header: true, skipEmptyLines: true }).data));
      setSummaries(parseSummaries(Papa.parse<Record<string, unknown>>(summaryText, { header: true, skipEmptyLines: true }).data));
    });
    return () => { active = false; };
  }, []);

  const countryResults = useMemo<CountryScenario[]>(() => {
    const grouped = new Map<string, ProjectionRow[]>();
    projections.filter((row) => row.scenario === scenario && row.year === 2030).forEach((row) => grouped.set(row.code, [...(grouped.get(row.code) || []), row]));
    return [...grouped.entries()].flatMap(([code, rows]) => {
      const byOutcome = new Map(rows.map((row) => [row.outcome, row]));
      const suicideRow = byOutcome.get("Suicide");
      const anxietyRow = byOutcome.get("Anxiety");
      const depressionRow = byOutcome.get("Depression");
      if (!suicideRow || !anxietyRow || !depressionRow) return [];
      const suicide = percentChange(suicideRow.prediction, suicideRow.baseline);
      const anxiety = percentChange(anxietyRow.prediction, anxietyRow.baseline);
      const depression = percentChange(depressionRow.prediction, depressionRow.baseline);
      const nonFatal = (anxiety + depression) / 2;
      return [{ code, name: suicideRow.name, continent: suicideRow.continent, suicide, anxiety, depression, nonFatal, divergence: nonFatal - suicide }];
    });
  }, [projections, scenario]);

  const metricValue = useCallback((row: CountryScenario) => outcome === "Divergence" ? row.divergence : row[outcome.toLowerCase() as "suicide" | "anxiety" | "depression"], [outcome]);
  const sortedCountries = useMemo(() => [...countryResults].sort((a, b) => metricValue(b) - metricValue(a)), [countryResults, metricValue]);
  const filteredCountries = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? sortedCountries.filter((row) => `${row.code} ${row.name} ${displayName(row.code, row.name, lang)}`.toLowerCase().includes(needle)) : sortedCountries;
  }, [lang, query, sortedCountries]);
  const selectedCountry = countryResults.find((row) => row.code === selected) || sortedCountries[0];

  const summaryByOutcome = useMemo(() => new Map(
    summaries.filter((row) => row.scenario === scenario).map((row) => [row.outcome, row]),
  ), [scenario, summaries]);

  const trajectoryOption = useMemo<echarts.EChartsOption>(() => {
    const active = trajectories.filter((row) => row.scenario === scenario);
    const years = [...new Set(active.map((row) => row.year))].sort((a, b) => a - b);
    return {
      animationDuration: 550,
      grid: { left: 56, right: 26, top: 48, bottom: 42 },
      legend: { top: 6, left: 10, textStyle: { color: "#8296a1", fontSize: 9 }, itemWidth: 13, data: [t.Suicide, t.Anxiety, t.Depression] },
      tooltip: { trigger: "axis", backgroundColor: "#08141b", borderColor: "#334a58", textStyle: { color: "#ecf7fb", fontSize: 10 } },
      xAxis: { type: "category", data: years, boundaryGap: false, axisLabel: { color: "#607683", fontSize: 8 }, axisLine: { lineStyle: { color: "#2a3c47" } }, axisTick: { show: false } },
      yAxis: { type: "value", name: "%", nameTextStyle: { color: "#607683", fontSize: 8 }, axisLabel: { color: "#607683", fontSize: 8, formatter: "{value}%" }, splitLine: { lineStyle: { color: "rgba(136,174,194,.09)" } } },
      series: (["Suicide", "Anxiety", "Depression"] as const).map((item) => ({
        name: t[item],
        type: "line",
        showSymbol: false,
        smooth: 0.28,
        data: years.map((year) => active.find((row) => row.outcome === item && row.year === year)?.median ?? null),
        lineStyle: { color: colors[item], width: 2.6 },
        itemStyle: { color: colors[item] },
        markLine: item === "Suicide" ? { silent: true, symbol: "none", lineStyle: { color: "rgba(210,225,232,.24)", width: 1 }, data: [{ yAxis: 0 }] } : undefined,
      })),
    };
  }, [scenario, t, trajectories]);

  const mapOption = useMemo<echarts.EChartsOption>(() => {
    const values = countryResults.map(metricValue);
    const min = Math.min(...values, 0);
    const max = Math.max(...values, 0);
    const span = Math.max(Math.abs(min), Math.abs(max), 1);
    const palette = outcome === "Suicide"
      ? ["#173b7a", "#4f78c8", "#e9eef5", "#c9d5e6"]
      : outcome === "Anxiety"
        ? ["#f4ebf1", "#d97cb3", "#7f3292", "#3c145f"]
        : outcome === "Depression"
          ? ["#f0eef7", "#a8aad5", "#7661aa", "#4c2b82"]
          : ["#173b7a", "#6f92c8", "#f4f2f5", "#ba79b2", "#5a176e"];
    return {
      animationDurationUpdate: 600,
      tooltip: {
        trigger: "item",
        backgroundColor: "rgba(7,12,18,.96)",
        borderColor: "#3b4e59",
        textStyle: { color: "#eef9ff", fontSize: 10 },
        formatter: (params: unknown) => {
          const row = (params as { data?: CountryScenario }).data;
          if (!row) return t.noData;
          return `<b>${displayName(row.code, row.name, lang)}</b> · ${row.code}<br/>${t.Suicide}: ${fmt(row.suicide)}<br/>${t.Anxiety}: ${fmt(row.anxiety)}<br/>${t.Depression}: ${fmt(row.depression)}<br/>${t.divergence}: ${fmt(row.divergence)}`;
        },
      },
      visualMap: {
        type: "continuous",
        min: outcome === "Divergence" ? -span : min,
        max: outcome === "Divergence" ? span : max,
        left: "center",
        bottom: 7,
        orient: "horizontal",
        itemWidth: 8,
        itemHeight: 190,
        text: [t.high, t.low],
        textStyle: { color: "#7d929e", fontSize: 8 },
        inRange: { color: palette },
        calculable: false,
        borderColor: "transparent",
      },
      series: [{
        type: "map",
        map: "mind-world",
        roam: true,
        zoom: 1.06,
        top: 0,
        bottom: 35,
        data: countryResults.map((row) => ({ ...row, name: mapCountryName(row.code, row.name), value: metricValue(row) })),
        itemStyle: { areaColor: "#111d26", borderColor: "#2b3c47", borderWidth: 0.55 },
        emphasis: { label: { show: false }, itemStyle: { areaColor: "#f3cb70", borderColor: "#fff2be", borderWidth: 1.1 } },
        select: { label: { show: false }, itemStyle: { areaColor: "#f3cb70", borderColor: "#ffffff" } },
      }],
    };
  }, [countryResults, lang, metricValue, outcome, t.Anxiety, t.Depression, t.Suicide, t.divergence, t.high, t.low, t.noData]);

  const handleMapClick = useCallback((params: unknown) => {
    const code = (params as { data?: { code?: string } }).data?.code;
    if (code) setSelected(code);
  }, []);

  if (!countryResults.length) return <main className="app-shell feature-page scenario-page"><AtlasNav lang={lang} active="scenario" onLanguage={() => setLang(lang === "zh" ? "en" : "zh")} /><div className="feature-loading">Loading…</div></main>;

  return (
    <main className="app-shell feature-page scenario-page">
      <div className="ambient ambient-one" /><div className="ambient ambient-two" />
      <AtlasNav lang={lang} active="scenario" onLanguage={() => setLang(lang === "zh" ? "en" : "zh")} />

      <section className="feature-hero scenario-forecast-hero">
        <span className="feature-kicker"><Sparkles size={15} />{t.kicker}</span>
        <h1><span>{t.titleA}</span><span>{t.titleB}</span></h1>
        <p>{t.intro}</p>
      </section>

      <section className="forecast-controls feature-width">
        <div><span>{t.scenarioHint}</span><div className="forecast-segments">{scenarioOrder.map((item) => <button key={item} className={scenario === item ? "active" : ""} onClick={() => setScenario(item)}>{t[scenarioCopyKey[item]]}</button>)}</div></div>
        <div><span>{t.outcomeHint}</span><div className="forecast-segments outcome-segments">{outcomeOrder.map((item) => <button key={item} className={outcome === item ? "active" : ""} onClick={() => setOutcome(item)}>{t[item]}</button>)}</div></div>
      </section>

      <section className="forecast-kpis feature-width">
        {(["Suicide", "Anxiety", "Depression"] as const).map((item) => {
          const summary = summaryByOutcome.get(item);
          return <article key={item} style={{ "--outcome-color": colors[item] } as React.CSSProperties}>
            <Activity size={17} /><span>{t[item]}</span><strong>{fmt(summary?.medianChange || 0)}</strong><small>{t.medianChange} · {summary?.increases || 0} {t.countriesUp.toLowerCase()}</small>
          </article>;
        })}
        <article className="forecast-focus"><Globe2 size={17} /><span>{t.selected}</span><strong>{displayName(selectedCountry.code, selectedCountry.name, lang)}</strong><small>{selectedCountry.code} · {t.areas}</small></article>
      </section>

      <section className="forecast-grid feature-width">
        <article className="panel forecast-trajectory-panel">
          <div className="feature-panel-head"><div><span>01</span><h2>{t.trajectoryTitle}</h2><p>{t.trajectorySub}</p></div><i>{t[scenarioCopyKey[scenario]]}</i></div>
          <ScenarioChart option={trajectoryOption} className="forecast-trajectory" />
        </article>
        <article className="panel forecast-map-panel">
          <div className="feature-panel-head"><div><span>02</span><h2>{t.mapTitle}</h2><p>{t.mapSub}</p></div><i>{t[outcome]}</i></div>
          <ScenarioChart option={mapOption} className="forecast-map" onClick={handleMapClick} />
        </article>
      </section>

      <section className="panel forecast-table-panel feature-width">
        <div className="feature-panel-head"><div><span>03</span><h2>{t.rankingTitle}</h2><p>{t.rankingSub}</p></div><label className="scenario-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} /></label></div>
        <div className="forecast-table-head"><span>#</span><span>{t.country}</span><span>{t.Suicide}</span><span>{t.Anxiety}</span><span>{t.Depression}</span><span>{t.nonFatal}</span><span>{t.divergence}</span></div>
        <div className="forecast-table-body">{filteredCountries.map((row, index) => <button key={row.code} className={selected === row.code ? "selected" : ""} onClick={() => setSelected(row.code)}>
          <span>{String(index + 1).padStart(2, "0")}</span><span><i>{row.code}</i><strong>{displayName(row.code, row.name, lang)}</strong></span><em className={row.suicide >= 0 ? "rise" : "fall"}>{fmt(row.suicide)}</em><em className={row.anxiety >= 0 ? "rise" : "fall"}>{fmt(row.anxiety)}</em><em className={row.depression >= 0 ? "rise" : "fall"}>{fmt(row.depression)}</em><span>{fmt(row.nonFatal)}</span><b>{fmt(row.divergence)}</b>
        </button>)}</div>
      </section>

      <footer className="feature-footer"><span>SYSU3DAILAB // MIND ATLAS</span><p>{t.note}</p><span>2030 SCENARIOS / v0.3</span></footer>
    </main>
  );
}
