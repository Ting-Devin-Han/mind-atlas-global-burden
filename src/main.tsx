import { lazy, StrictMode, Suspense, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import Home from "../app/page";
import "../app/globals.css";
import { recordAnonymousSiteVisit } from "./visitor-analytics";

const ScenarioPage = lazy(() => import("../app/scenario-page"));
const SurveyPage = lazy(() => import("../app/survey-page"));
const AdminPage = lazy(() => import("../app/admin-page"));
const ContactPage = lazy(() => import("../app/contact-page"));

const root = document.getElementById("root");

if (!root) {
  throw new Error("Application root not found");
}

function currentRoute() {
  if (window.location.hash.startsWith("#/scenario")) return "scenario";
  if (window.location.hash.startsWith("#/survey")) return "survey";
  if (window.location.hash.startsWith("#/admin")) return "admin";
  if (window.location.hash.startsWith("#/contact")) return "contact";
  return "atlas";
}

function AppRouter() {
  const [route, setRoute] = useState(currentRoute);
  useEffect(() => {
    void recordAnonymousSiteVisit(window.location.hash || "#/");
    const update = () => {
      setRoute(currentRoute());
      window.scrollTo({ top: 0, behavior: "instant" });
    };
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  if (route === "scenario") return <Suspense fallback={<div className="feature-loading">Loading…</div>}><ScenarioPage /></Suspense>;
  if (route === "survey") return <Suspense fallback={<div className="feature-loading">Loading…</div>}><SurveyPage /></Suspense>;
  if (route === "admin") return <Suspense fallback={<div className="feature-loading">Loading…</div>}><AdminPage /></Suspense>;
  if (route === "contact") return <Suspense fallback={<div className="feature-loading">Loading…</div>}><ContactPage /></Suspense>;
  return <Home />;
}

createRoot(root).render(
  <StrictMode>
    <AppRouter />
  </StrictMode>,
);
