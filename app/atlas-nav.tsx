"use client";

import { Languages } from "lucide-react";

export type AtlasLanguage = "zh" | "en";
export type AtlasRoute = "atlas" | "scenario" | "survey" | "contact" | "admin";

const labels = {
  zh: {
    atlas: "全球观测台",
    scenario: "2030情景预测",
    survey: "个体研究问卷",
    contact: "联系我们",
    language: "切换至英文",
  },
  en: {
    atlas: "Global atlas",
    scenario: "2030 scenarios",
    survey: "Individual study",
    contact: "Contact",
    language: "Switch to Chinese",
  },
};

export default function AtlasNav({
  lang,
  active,
  onLanguage,
}: {
  lang: AtlasLanguage;
  active: AtlasRoute;
  onLanguage: () => void;
}) {
  const t = labels[lang];
  return (
    <header className="topbar">
      <a href="#/" className="brand" aria-label="SYSU3DAILAB MIND ATLAS home">
        <span className="brand-mark"><span /><span /></span>
        <span>SYSU3DAILAB // MIND ATLAS</span>
      </a>
      <div className="top-actions">
        <nav className="site-nav" aria-label={lang === "zh" ? "页面导航" : "Page navigation"}>
          <a className={active === "atlas" ? "active" : ""} href="#/">{t.atlas}</a>
          <a className={active === "scenario" ? "active" : ""} href="#/scenario">{t.scenario}</a>
          <a className={active === "survey" ? "active" : ""} href="#/survey">{t.survey}</a>
          <a className={active === "contact" ? "active" : ""} href="#/contact">{t.contact}</a>
        </nav>
        <button className="icon-button" onClick={onLanguage} aria-label={t.language} title={t.language}><Languages size={17} /></button>
      </div>
    </header>
  );
}
