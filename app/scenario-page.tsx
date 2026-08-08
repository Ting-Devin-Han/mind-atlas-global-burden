"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as echarts from "echarts";
import Papa from "papaparse";
import countries from "i18n-iso-countries";
import enCountries from "i18n-iso-countries/langs/en.json";
import zhCountries from "i18n-iso-countries/langs/zh.json";
import { Activity, ArrowDownRight, ArrowUpRight, FlaskConical, RotateCcw, Search, SlidersHorizontal, Sparkles, Target } from "lucide-react";
import AtlasNav, { type AtlasLanguage } from "./atlas-nav";

countries.registerLocale(enCountries);
countries.registerLocale(zhCountries);

type PanelRow = {
  code: string;
  name: string;
  year: number;
  suicide: number;
  anxiety: number;
};

type ScenarioCountry = {
  code: string;
  name: string;
  structural: number;
  momentum: number;
  score: number;
  rank: number;
  baselineRank: number;
  movement: number;
  meanSuicide: number;
  meanAnxiety: number;
};

type ScenarioPreset = "balanced" | "anxiety" | "suicide" | "emerging";

const scenarioCopy = {
  zh: {
    documentTitle: "排名情景实验室 — SYSU3DAILAB MIND ATLAS",
    kicker: "实验性权重重算",
    titleA: "如果我们改变观察重点，",
    titleB: "全球负担排名会怎样变化？",
    intro: "调整结局权重与时间权重，使用最终231国面板即时重算综合负担排名。所有结果均为探索性情景，不替代论文主分析。",
    outcomeWeight: "结局权重",
    anxietyWeight: "焦虑患病率",
    suicideWeight: "自杀死亡率",
    timeWeight: "时间维度权重",
    structuralWeight: "长期平均负担",
    momentumWeight: "变化趋势",
    presets: "快速情景",
    balanced: "均衡视角",
    anxiety: "焦虑优先",
    suicide: "自杀预防优先",
    emerging: "新兴风险",
    reset: "恢复论文基准",
    scenarioLeader: "当前情景首位",
    largestRise: "排名上升最多",
    largestFall: "排名下降最多",
    countries: "参与排名",
    pressureMap: "结构负担 × 变化趋势",
    pressureSub: "右上象限表示长期负担与上升趋势同时较高",
    topRanking: "情景排名前20名",
    topSub: "条形长度表示当前情景标准化得分",
    fullRanking: "全部国家和地区",
    search: "搜索国家或代码",
    rank: "情景排名",
    country: "国家或地区",
    score: "情景得分",
    movement: "较论文基准",
    structure: "长期负担",
    trend: "变化趋势",
    loading: "正在载入最终研究数据…",
    note: "论文基准为长期联合负担60%、联合增长40%，两类结局各占50%。本页仅用于敏感性探索。",
    up: "上升",
    down: "下降",
    unchanged: "不变",
    areas: "个国家和地区",
    axisStructure: "长期标准化负担",
    axisMomentum: "标准化变化趋势",
  },
  en: {
    documentTitle: "Ranking scenario lab — SYSU3DAILAB MIND ATLAS",
    kicker: "EXPERIMENTAL WEIGHTING",
    titleA: "What happens to global rankings",
    titleB: "when the analytical lens changes?",
    intro: "Adjust outcome and temporal weights to recalculate composite burden rankings across the final 231-country panel. Results are exploratory scenarios, not replacements for the main analysis.",
    outcomeWeight: "Outcome weighting",
    anxietyWeight: "Anxiety prevalence",
    suicideWeight: "Suicide mortality",
    timeWeight: "Temporal weighting",
    structuralWeight: "Long-term mean burden",
    momentumWeight: "Change momentum",
    presets: "Quick scenarios",
    balanced: "Balanced lens",
    anxiety: "Anxiety priority",
    suicide: "Suicide prevention",
    emerging: "Emerging risk",
    reset: "Restore paper baseline",
    scenarioLeader: "Scenario leader",
    largestRise: "Largest upward move",
    largestFall: "Largest downward move",
    countries: "Ranked areas",
    pressureMap: "Structural burden × change momentum",
    pressureSub: "The upper-right quadrant combines high long-term burden with an increasing trend",
    topRanking: "Top 20 scenario ranks",
    topSub: "Bar length represents the standardized scenario score",
    fullRanking: "All countries and territories",
    search: "Search country or code",
    rank: "Scenario rank",
    country: "Country or area",
    score: "Scenario score",
    movement: "Vs paper baseline",
    structure: "Long-term burden",
    trend: "Change momentum",
    loading: "Loading final research data…",
    note: "The paper baseline assigns 60% to long-term joint burden, 40% to joint increase, and equal weight to both outcomes. This page is for sensitivity exploration only.",
    up: "up",
    down: "down",
    unchanged: "unchanged",
    areas: "countries and territories",
    axisStructure: "Standardized long-term burden",
    axisMomentum: "Standardized change momentum",
  },
};

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
}

function standardize(values: number[]) {
  const mean = average(values);
  const variance = average(values.map((value) => (value - mean) ** 2));
  const sd = Math.sqrt(variance) || 1;
  return values.map((value) => (value - mean) / sd);
}

function logSlope(rows: PanelRow[], accessor: (row: PanelRow) => number) {
  if (rows.length < 2) return 0;
  const xs = rows.map((row) => row.year - rows[0].year);
  const ys = rows.map((row) => Math.log(Math.max(accessor(row), 0.000001)));
  const meanX = average(xs);
  const meanY = average(ys);
  const denominator = xs.reduce((sum, x) => sum + (x - meanX) ** 2, 0);
  if (!denominator) return 0;
  return xs.reduce((sum, x, index) => sum + (x - meanX) * (ys[index] - meanY), 0) / denominator;
}

function normalizePanel(data: Record<string, unknown>[]) {
  return data.flatMap((row) => {
    const code = String(row.country_code ?? row.Code ?? row.code ?? "").trim().toUpperCase();
    const name = String(row.country_name ?? row.NAME ?? row.name ?? code).trim();
    const year = Number(row.year ?? row.Year);
    const suicide = Number(row.suicide_rate ?? row.Sui_R ?? row.suicide);
    const anxiety = Number(row.anxiety_disorder_prevalence ?? row.axi ?? row.anxiety);
    if (!code || !name || !Number.isFinite(year) || !Number.isFinite(suicide) || !Number.isFinite(anxiety)) return [];
    return [{ code, name, year, suicide, anxiety }];
  });
}

function displayName(country: Pick<ScenarioCountry, "code" | "name">, lang: AtlasLanguage) {
  return countries.getName(country.code, lang, { select: "official" }) || country.name;
}

function ScenarioChart({ option, className, onClick }: { option: echarts.EChartsOption; className: string; onClick?: (params: unknown) => void }) {
  const node = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!node.current) return;
    const chart = echarts.getInstanceByDom(node.current) || echarts.init(node.current, undefined, { renderer: "canvas" });
    chart.setOption(option, { notMerge: true });
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
  const [lang, setLang] = useState<AtlasLanguage>("zh");
  const [rows, setRows] = useState<PanelRow[]>([]);
  const [anxietyWeight, setAnxietyWeight] = useState(50);
  const [structuralWeight, setStructuralWeight] = useState(60);
  const [preset, setPreset] = useState<ScenarioPreset>("balanced");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("CHN");
  const t = scenarioCopy[lang];

  useEffect(() => {
    document.title = t.documentTitle;
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  }, [lang, t.documentTitle]);

  useEffect(() => {
    let active = true;
    fetch("./data/main_country_year_panel_231_2000_2019_FINAL.csv")
      .then((response) => response.text())
      .then((text) => {
        if (!active) return;
        const parsed = Papa.parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: true });
        setRows(normalizePanel(parsed.data));
      });
    return () => { active = false; };
  }, []);

  const ranking = useMemo<ScenarioCountry[]>(() => {
    const grouped = new Map<string, PanelRow[]>();
    rows.forEach((row) => grouped.set(row.code, [...(grouped.get(row.code) || []), row]));
    const raw = [...grouped.entries()].map(([code, series]) => {
      const ordered = [...series].sort((a, b) => a.year - b.year);
      return {
        code,
        name: ordered[0].name,
        meanSuicide: average(ordered.map((row) => row.suicide)),
        meanAnxiety: average(ordered.map((row) => row.anxiety)),
        suicideSlope: logSlope(ordered, (row) => row.suicide),
        anxietySlope: logSlope(ordered, (row) => row.anxiety),
      };
    });
    const suicideMeanZ = standardize(raw.map((item) => item.meanSuicide));
    const anxietyMeanZ = standardize(raw.map((item) => item.meanAnxiety));
    const suicideSlopeZ = standardize(raw.map((item) => item.suicideSlope));
    const anxietySlopeZ = standardize(raw.map((item) => item.anxietySlope));
    const a = anxietyWeight / 100;
    const s = structuralWeight / 100;
    const computed = raw.map((item, index) => {
      const structural = a * anxietyMeanZ[index] + (1 - a) * suicideMeanZ[index];
      const momentum = a * anxietySlopeZ[index] + (1 - a) * suicideSlopeZ[index];
      const score = s * structural + (1 - s) * momentum;
      const baseline = 0.6 * (0.5 * anxietyMeanZ[index] + 0.5 * suicideMeanZ[index]) + 0.4 * (0.5 * anxietySlopeZ[index] + 0.5 * suicideSlopeZ[index]);
      return { ...item, structural, momentum, score, baseline };
    });
    const currentOrder = [...computed].sort((left, right) => right.score - left.score);
    const baselineOrder = [...computed].sort((left, right) => right.baseline - left.baseline);
    const baselineRank = new Map(baselineOrder.map((item, index) => [item.code, index + 1]));
    return currentOrder.map((item, index) => ({
      code: item.code,
      name: item.name,
      structural: item.structural,
      momentum: item.momentum,
      score: item.score,
      rank: index + 1,
      baselineRank: baselineRank.get(item.code) || index + 1,
      movement: (baselineRank.get(item.code) || index + 1) - (index + 1),
      meanSuicide: item.meanSuicide,
      meanAnxiety: item.meanAnxiety,
    }));
  }, [anxietyWeight, rows, structuralWeight]);

  const largestRise = useMemo(() => [...ranking].sort((a, b) => b.movement - a.movement)[0], [ranking]);
  const largestFall = useMemo(() => [...ranking].sort((a, b) => a.movement - b.movement)[0], [ranking]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? ranking.filter((item) => `${item.code} ${item.name} ${displayName(item, lang)}`.toLowerCase().includes(needle)) : ranking;
  }, [lang, query, ranking]);

  const applyPreset = (next: ScenarioPreset) => {
    setPreset(next);
    if (next === "balanced") { setAnxietyWeight(50); setStructuralWeight(60); }
    if (next === "anxiety") { setAnxietyWeight(75); setStructuralWeight(60); }
    if (next === "suicide") { setAnxietyWeight(25); setStructuralWeight(60); }
    if (next === "emerging") { setAnxietyWeight(50); setStructuralWeight(35); }
  };

  const barCountries = ranking.slice(0, 20).reverse();
  const barOption = useMemo<echarts.EChartsOption>(() => ({
    animationDuration: 500,
    grid: { left: 126, right: 38, top: 16, bottom: 30 },
    xAxis: { type: "value", axisLabel: { color: "#607683", fontSize: 9 }, splitLine: { lineStyle: { color: "rgba(136,174,194,.08)" } } },
    yAxis: { type: "category", data: barCountries.map((item) => displayName(item, lang)), axisLabel: { color: "#a8bac3", fontSize: 9, width: 108, overflow: "truncate" }, axisLine: { show: false }, axisTick: { show: false } },
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, backgroundColor: "#08141b", borderColor: "#334a58", textStyle: { color: "#ecf7fb", fontSize: 11 } },
    series: [{ type: "bar", data: barCountries.map((item, index) => ({ value: item.score, code: item.code, itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [{ offset: 0, color: "#6a4bb2" }, { offset: Math.min(1, 0.45 + index / 60), color: "#ed718f" }, { offset: 1, color: "#f3c66f" }]) } })), barWidth: 10, label: { show: true, position: "right", color: "#dcebf1", fontSize: 8, formatter: ({ value }: { value: unknown }) => Number(value).toFixed(2) } }],
  }), [barCountries, lang]);

  const scatterOption = useMemo<echarts.EChartsOption>(() => ({
    animationDuration: 600,
    grid: { left: 58, right: 30, top: 28, bottom: 52 },
    xAxis: { name: t.axisStructure, nameLocation: "middle", nameGap: 34, nameTextStyle: { color: "#6f8490", fontSize: 9 }, axisLabel: { color: "#607683", fontSize: 8 }, splitLine: { lineStyle: { color: "rgba(136,174,194,.08)" } } },
    yAxis: { name: t.axisMomentum, nameLocation: "middle", nameGap: 40, nameTextStyle: { color: "#6f8490", fontSize: 9 }, axisLabel: { color: "#607683", fontSize: 8 }, splitLine: { lineStyle: { color: "rgba(136,174,194,.08)" } } },
    tooltip: { backgroundColor: "#08141b", borderColor: "#334a58", textStyle: { color: "#ecf7fb", fontSize: 10 }, formatter: (params: unknown) => { const data = (params as { data: { code: string; name: string; value: number[]; rank: number } }).data; return `<b>${data.name}</b> · ${data.code}<br/>#${data.rank}<br/>${t.structure}: ${data.value[0].toFixed(2)}<br/>${t.trend}: ${data.value[1].toFixed(2)}`; } },
    series: [{ type: "scatter", symbolSize: (value: number[]) => Math.max(5, Math.min(18, 7 + Math.abs(value[2]) * 2.6)), data: ranking.map((item) => ({ code: item.code, name: displayName(item, lang), rank: item.rank, value: [item.structural, item.momentum, item.score], itemStyle: { color: item.code === selected ? "#f6d47d" : item.rank <= 20 ? "#ed718f" : "#5d78a9", opacity: item.code === selected ? 1 : item.rank <= 20 ? 0.82 : 0.42 }, label: { show: item.code === selected, formatter: item.code, position: "top", color: "#f6d47d", fontSize: 9 } })) }],
  }), [lang, ranking, selected, t.axisMomentum, t.axisStructure, t.structure, t.trend]);

  const handleChartClick = (params: unknown) => {
    const code = (params as { data?: { code?: string } })?.data?.code;
    if (code) setSelected(code);
  };

  const movementLabel = (value: number) => value > 0 ? `${t.up} ${value}` : value < 0 ? `${t.down} ${Math.abs(value)}` : t.unchanged;

  return (
    <main className="app-shell feature-page scenario-page">
      <div className="ambient ambient-one" /><div className="ambient ambient-two" />
      <AtlasNav lang={lang} active="scenario" onLanguage={() => setLang(lang === "zh" ? "en" : "zh")} />

      <section className="feature-hero">
        <span className="feature-kicker"><FlaskConical size={15} />{t.kicker}</span>
        <h1><span>{t.titleA}</span><span>{t.titleB}</span></h1>
        <p>{t.intro}</p>
      </section>

      <section className="scenario-controls feature-width">
        <article className="weight-card">
          <div className="weight-card-head"><span><Activity size={16} />{t.outcomeWeight}</span><strong>{anxietyWeight}<small>/</small>{100 - anxietyWeight}</strong></div>
          <div className="weight-labels"><span>{t.anxietyWeight}</span><span>{t.suicideWeight}</span></div>
          <input type="range" min="0" max="100" value={anxietyWeight} style={{ "--range-progress": `${anxietyWeight}%` } as React.CSSProperties} onChange={(event) => { setAnxietyWeight(Number(event.target.value)); setPreset("balanced"); }} aria-label={t.outcomeWeight} />
        </article>
        <article className="weight-card">
          <div className="weight-card-head"><span><SlidersHorizontal size={16} />{t.timeWeight}</span><strong>{structuralWeight}<small>/</small>{100 - structuralWeight}</strong></div>
          <div className="weight-labels"><span>{t.structuralWeight}</span><span>{t.momentumWeight}</span></div>
          <input type="range" min="0" max="100" value={structuralWeight} style={{ "--range-progress": `${structuralWeight}%` } as React.CSSProperties} onChange={(event) => { setStructuralWeight(Number(event.target.value)); setPreset("balanced"); }} aria-label={t.timeWeight} />
        </article>
        <article className="preset-card">
          <span>{t.presets}</span>
          <div>{(["balanced", "anxiety", "suicide", "emerging"] as ScenarioPreset[]).map((item) => <button key={item} className={preset === item ? "active" : ""} onClick={() => applyPreset(item)}>{t[item]}</button>)}</div>
          <button className="reset-link" onClick={() => applyPreset("balanced")}><RotateCcw size={13} />{t.reset}</button>
        </article>
      </section>

      {!ranking.length ? <div className="feature-loading">{t.loading}</div> : <>
        <section className="scenario-kpis feature-width">
          <article><Sparkles size={18} /><span>{t.scenarioLeader}</span><strong>{displayName(ranking[0], lang)}</strong><small>#1 · {ranking[0].score.toFixed(2)}</small></article>
          <article><ArrowUpRight size={18} /><span>{t.largestRise}</span><strong>{displayName(largestRise, lang)}</strong><small>+{largestRise.movement}</small></article>
          <article><ArrowDownRight size={18} /><span>{t.largestFall}</span><strong>{displayName(largestFall, lang)}</strong><small>{largestFall.movement}</small></article>
          <article><Target size={18} /><span>{t.countries}</span><strong>{ranking.length}</strong><small>{t.areas}</small></article>
        </section>

        <section className="scenario-grid feature-width">
          <article className="panel scenario-scatter-panel">
            <div className="feature-panel-head"><div><span>01</span><h2>{t.pressureMap}</h2><p>{t.pressureSub}</p></div><i>{anxietyWeight}% / {structuralWeight}%</i></div>
            <ScenarioChart option={scatterOption} className="scenario-scatter" onClick={handleChartClick} />
          </article>
          <article className="panel scenario-bar-panel">
            <div className="feature-panel-head"><div><span>02</span><h2>{t.topRanking}</h2><p>{t.topSub}</p></div></div>
            <ScenarioChart option={barOption} className="scenario-bars" onClick={handleChartClick} />
          </article>
        </section>

        <section className="panel scenario-table-panel feature-width">
          <div className="feature-panel-head"><div><span>03</span><h2>{t.fullRanking}</h2><p>{t.note}</p></div><label className="scenario-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} /></label></div>
          <div className="scenario-table-head"><span>{t.rank}</span><span>{t.country}</span><span>{t.score}</span><span>{t.movement}</span><span>{t.structure}</span><span>{t.trend}</span></div>
          <div className="scenario-table-body">{filtered.map((item) => <button key={item.code} className={selected === item.code ? "selected" : ""} onClick={() => setSelected(item.code)}>
            <span>#{item.rank}</span><span><i>{item.code}</i><strong>{displayName(item, lang)}</strong></span><b>{item.score.toFixed(2)}</b><em className={item.movement > 0 ? "rise" : item.movement < 0 ? "fall" : ""}>{movementLabel(item.movement)}</em><span>{item.structural.toFixed(2)}</span><span>{item.momentum.toFixed(2)}</span>
          </button>)}</div>
        </section>
      </>}

      <footer className="feature-footer"><span>SYSU3DAILAB // MIND ATLAS</span><p>{t.note}</p><span>SCENARIO LAB / v0.2</span></footer>
    </main>
  );
}
