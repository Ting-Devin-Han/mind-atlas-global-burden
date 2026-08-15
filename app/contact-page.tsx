"use client";

import { useEffect, useState } from "react";
import { Building2, ExternalLink, GitBranch, Mail, MapPinned, ShieldCheck } from "lucide-react";
import AtlasNav, { type AtlasLanguage } from "./atlas-nav";
import { researchConfig } from "../src/research-backend";

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
    privacyText: "To understand the atlas's global reach, the site records one visit per browser session. A network-location service estimates country, region and city. The atlas stores only those approximate fields, the page visited, time, browser language and viewport width. It does not store raw IP addresses, GPS data or precise coordinates.",
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
    privacyText: "为了解观测台的全球覆盖范围，网站每个浏览器会话记录一次访问。网络定位服务仅估算国家、地区和城市；后台保存这些粗粒度字段、访问页面、时间、浏览器语言和视窗宽度，不保存原始 IP、GPS 信息或精确经纬度。",
    email: "邮件联系团队",
    issues: "提交 GitHub 问题",
    unavailable: "经批准的研究联系邮箱完成配置后，将在此显示。",
    footer: "研究团队将审阅科学咨询、数据纠正和可重复性问题。",
  },
};

const repositoryUrl = "https://github.com/Ting-Devin-Han/mind-atlas-global-burden";

export default function ContactPage() {
  const [lang, setLang] = useState<AtlasLanguage>("en");
  const t = contactText[lang];
  const contact = researchConfig.studyContact.trim();

  useEffect(() => {
    document.title = `${t.title} — SYSU3DAILAB MIND ATLAS`;
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  }, [lang, t.title]);

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

      <footer className="feature-footer"><span>SYSU3DAILAB // MIND ATLAS</span><p>{t.footer}</p><span>CONTACT / v1.0</span></footer>
    </main>
  );
}
