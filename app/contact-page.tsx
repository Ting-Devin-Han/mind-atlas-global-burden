"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as echarts from "echarts";
import countries from "i18n-iso-countries";
import worldAtlas from "world-atlas/countries-110m.json";
import { Building2, ExternalLink, GitBranch, Mail, MapPinned, ShieldCheck } from "lucide-react";
import AtlasNav, { type AtlasLanguage } from "./atlas-nav";
import { fetchVisitorCountryCounts, researchConfig, type VisitorCountryCount } from "../src/research-backend";
import { visitRecordedEvent } from "../src/visitor-analytics";
import { uiFontFamily } from "../src/typography";

type AtlasGeometry = { id?: string | number; properties?: { name?: string } };
const atlasGeographies = (worldAtlas as unknown as { objects: { countries: { geometries: AtlasGeometry[] } } }).objects.countries.geometries;
const atlasNameByNumericCode = new Map(atlasGeographies.filter((item) => item.id != null && item.properties?.name).map((item) => [String(item.id).padStart(3, "0"), item.properties?.name as string]));

const contactText = {
  en: {
    kicker: "RESEARCH CONTACT",
    title: "Contact the research team",
    intro: "Questions about the atlas, its data, methods or reuse are welcome. Please use the routes below so that scientific and technical requests reach the right place.",
    correspondence: "Scientific correspondence",
    correspondenceText: "For questions about the study design, interpretation or collaboration, contact the research team.",
    repository: "Code and data issues",
    repositoryText: "Report reproducibility, data-display or website issues in the public project repository.",
    institution: "Research programme",
    institutionText: "SYSU3DAILAB // MIND ATLAS is an academic observatory of fatal and non-fatal mental-health burdens.",
    privacy: "Visitor geography and privacy",
    privacyText: "To understand the atlas's global reach, the site records one visit per browser session. GeoJS uses the visitor's public IP to identify the country. The atlas stores only the country code and name, page visited, time, browser language and viewport width. It does not store the raw IP address, region, city, GPS data or precise coordinates.",
    visitorMap: "Global visitor map",
    visitorMapSub: "Country-level distribution of recorded browser sessions",
    visits: "recorded visits",
    countries: "countries or territories",
    noVisitors: "Visitor locations will appear after the analytics table is enabled in Supabase.",
    email: "Email the team",
    issues: "Open GitHub issues",
    unavailable: "A direct study email will appear here when the approved contact address is configured.",
    footer: "Scientific enquiries, data corrections and reproducibility reports are reviewed by the research team.",
  },
  zh: {
    kicker: "研究联系",
    title: "联系我们",
    intro: "欢迎就观测台的数据、方法、结果解释或再利用与研究团队联系。请按下列渠道提交科学问题或技术反馈。",
    correspondence: "科学与合作咨询",
    correspondenceText: "如需咨询研究设计、结果解释或合作事宜，请联系研究团队。",
    repository: "代码与数据问题",
    repositoryText: "如发现可重复性、数据展示或网站技术问题，请在公开项目仓库中提交。",
    institution: "研究项目",
    institutionText: "SYSU3DAILAB // MIND ATLAS 是一个关注致死性与非致死性心理健康负担的学术观测平台。",
    privacy: "访客地理信息与隐私",
    privacyText: "为了解观测台的全球覆盖范围，网站每个浏览器会话记录一次访问。GeoJS 仅根据公共 IP 判断国家；后台只保存国家代码与名称、访问页面、时间、浏览器语言和视窗宽度，不保存原始 IP、地区、城市、GPS 信息或精确坐标。",
    visitorMap: "全球访客地图",
    visitorMapSub: "已记录浏览器会话的国家级分布",
    visits: "次访问",
    countries: "个国家或地区",
    noVisitors: "Supabase 中启用访客统计表后，访客位置将在此显示。",
    email: "邮件联系团队",
    issues: "提交 GitHub 问题",
    unavailable: "经批准的研究联系邮箱完成配置后，将在此显示。",
    footer: "研究团队将审阅科学咨询、数据纠正和可重复性问题。",
  },
};

const repositoryUrl = "https://github.com/Ting-Devin-Han/mind-atlas-global-burden";

function mapNameFromAlpha2(code: string) {
  const numeric = countries.alpha2ToNumeric(code);
  return numeric ? atlasNameByNumericCode.get(numeric) : undefined;
}

function VisitorMap({ option }: { option: echarts.EChartsOption }) {
  const node = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!node.current) return;
    const chart = echarts.getInstanceByDom(node.current) || echarts.init(node.current, undefined, { renderer: "canvas" });
    chart.setOption(option, { notMerge: true });
    const resize = () => {
      if (!chart.isDisposed()) chart.resize();
    };
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      chart.dispose();
    };
  }, [option]);
  return <div ref={node} className="contact-visitor-map" />;
}

export default function ContactPage() {
  const [lang, setLang] = useState<AtlasLanguage>("en");
  const t = contactText[lang];
  const contact = researchConfig.studyContact.trim();
  const [visitorCounts, setVisitorCounts] = useState<VisitorCountryCount[]>([]);

  useEffect(() => {
    document.title = `${t.title} — SYSU3DAILAB MIND ATLAS`;
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  }, [lang, t.title]);

  useEffect(() => {
    let active = true;
    const refreshCounts = () => {
      fetchVisitorCountryCounts().then((data) => { if (active) setVisitorCounts(data); }).catch(() => undefined);
    };
    refreshCounts();
    window.addEventListener(visitRecordedEvent, refreshCounts);
    return () => {
      active = false;
      window.removeEventListener(visitRecordedEvent, refreshCounts);
    };
  }, []);

  const totalVisits = visitorCounts.reduce((sum, item) => sum + Number(item.visit_count), 0);
  const visitorMapOption = useMemo<echarts.EChartsOption>(() => {
    const values = visitorCounts.map((item) => Number(item.visit_count));
    const maximum = Math.max(...values, 1);
    return {
      animationDuration: 500,
      textStyle: { fontFamily: uiFontFamily },
      tooltip: {
        trigger: "item",
        backgroundColor: "#08141b",
        borderColor: "#334a58",
        textStyle: { color: "#ecf7fb", fontSize: 12, fontFamily: uiFontFamily },
        formatter: (params: unknown) => {
          const item = params as { name?: string; value?: number | string };
          const value = Number(item.value);
          return `<b>${item.name || ""}</b><br/>${Number.isFinite(value) ? `${value} ${t.visits}` : t.noVisitors}`;
        },
      },
      ...(visitorCounts.length ? { visualMap: {
          min: 1,
          max: maximum,
          left: 20,
          bottom: 14,
          orient: "horizontal" as const,
          calculable: false,
          text: [String(maximum), "1"],
          textStyle: { color: "#607783", fontSize: 10, fontFamily: uiFontFamily },
          inRange: { color: ["#e9e4f2", "#aa87c5", "#76388f", "#3d155f"] },
        } } : {}),
      series: [{
        type: "map",
        map: "mind-world",
        roam: true,
        zoom: 1.06,
        data: visitorCounts.flatMap((item) => {
          const name = mapNameFromAlpha2(item.country_code);
          return name ? [{ name, value: Number(item.visit_count) }] : [];
        }),
        itemStyle: { areaColor: "#dfe6e9", borderColor: "#33444d", borderWidth: .55 },
        emphasis: { itemStyle: { areaColor: "#d97cb3", borderColor: "#f3fbff" }, label: { color: "#071015", fontSize: 11, fontFamily: uiFontFamily } },
        select: { disabled: true },
      }],
    };
  }, [t.noVisitors, t.visits, visitorCounts]);

  return (
    <main className="app-shell feature-page contact-page">
      <AtlasNav lang={lang} active="contact" onLanguage={() => setLang(lang === "zh" ? "en" : "zh")} />
      <section className="contact-hero feature-width">
        <span className="feature-kicker"><Mail size={15} />{t.kicker}</span>
        <h1>{t.title}</h1>
        <p>{t.intro}</p>
      </section>

      <section className="contact-layout feature-width">
        <article className="contact-primary">
          <header><Mail size={20} /><span>01</span></header>
          <h2>{t.correspondence}</h2>
          <p>{t.correspondenceText}</p>
          {contact ? <a className="contact-command" href={`mailto:${contact}`}><Mail size={16} />{t.email}</a> : <small>{t.unavailable}</small>}
        </article>

        <article>
          <header><GitBranch size={20} /><span>02</span></header>
          <h2>{t.repository}</h2>
          <p>{t.repositoryText}</p>
          <a className="contact-command" href={`${repositoryUrl}/issues`} target="_blank" rel="noreferrer"><GitBranch size={16} />{t.issues}<ExternalLink size={14} /></a>
        </article>

        <article>
          <header><Building2 size={20} /><span>03</span></header>
          <h2>{t.institution}</h2>
          <p>{t.institutionText}</p>
          <a className="contact-repository" href={repositoryUrl} target="_blank" rel="noreferrer">github.com/Ting-Devin-Han/mind-atlas-global-burden</a>
        </article>

        <article className="contact-privacy">
          <header><MapPinned size={20} /><span>04</span></header>
          <h2>{t.privacy}</h2>
          <p>{t.privacyText}</p>
          <div><ShieldCheck size={17} /><span>NO RAW IP · NO GPS · NO PRECISE COORDINATES</span></div>
        </article>
      </section>

      <section className="contact-map-panel feature-width">
        <header><div><span>05</span><h2>{t.visitorMap}</h2><p>{t.visitorMapSub}</p></div><div><strong>{totalVisits}</strong><span>{t.visits}</span><strong>{visitorCounts.length}</strong><span>{t.countries}</span></div></header>
        <VisitorMap option={visitorMapOption} />
        {!visitorCounts.length && <p className="contact-map-empty">{t.noVisitors}</p>}
      </section>

      <footer className="feature-footer"><span>SYSU3DAILAB // MIND ATLAS</span><p>{t.footer}</p><span>CONTACT / v1.0</span></footer>
    </main>
  );
}
