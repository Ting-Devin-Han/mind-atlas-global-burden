import { lazy, StrictMode, Suspense, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import Home from "../app/page";
import "../app/globals.css";

const ScenarioPage = lazy(() => import("../app/scenario-page"));
const SurveyPage = lazy(() => import("../app/survey-page"));

const root = document.getElementById("root");

if (!root) {
  throw new Error("Application root not found");
}

function currentRoute() {
  if (window.location.hash.startsWith("#/scenario")) return "scenario";
  if (window.location.hash.startsWith("#/survey")) return "survey";
  return "atlas";
}

function AppRouter() {
  const [route, setRoute] = useState(currentRoute);
  useEffect(() => {
    const update = () => {
      setRoute(currentRoute());
      window.scrollTo({ top: 0, behavior: "instant" });
    };
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  if (route === "scenario") return <Suspense fallback={<div className="feature-loading">Loading…</div>}><ScenarioPage /></Suspense>;
  if (route === "survey") return <Suspense fallback={<div className="feature-loading">Loading…</div>}><SurveyPage /></Suspense>;
  return <Home />;
}

createRoot(root).render(
  <StrictMode>
    <AppRouter />
  </StrictMode>,
);
