import { useEffect, useMemo, useState } from "react";
import { HomePage } from "./pages/HomePage";
import { HowItWorksPage } from "./pages/HowItWorksPage";
import { DesktopGamePage } from "./pages/DesktopGamePage";
import { ControllerPage } from "./pages/ControllerPage";

type Route =
  | { name: "home" }
  | { name: "how" }
  | { name: "desktop"; mode: "create" | "join"; code?: string }
  | { name: "controller"; matchId: string; token?: string };

function parseLocation(): Route {
  const path = location.pathname.replace(/\/+$/, "") || "/";
  const parts = path.split("/").filter(Boolean);
  if (parts[0] === "controller" && parts[1]) {
    return { name: "controller", matchId: parts[1], token: parts[2] };
  }
  if (parts[0] === "play") return { name: "desktop", mode: "create" };
  if (parts[0] === "join" && parts[1]) {
    return { name: "desktop", mode: "join", code: parts[1] };
  }
  if (parts[0] === "how") return { name: "how" };
  return { name: "home" };
}

export function App() {
  const initial = useMemo(parseLocation, []);
  const [route, setRoute] = useState<Route>(initial);

  function go(next: Route, url: string) {
    history.pushState(null, "", url);
    setRoute(next);
  }

  useEffect(() => {
    const onPop = () => setRoute(parseLocation());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  if (route.name === "controller") {
    return <ControllerPage matchId={route.matchId} token={route.token} />;
  }
  if (route.name === "desktop") {
    return (
      <DesktopGamePage
        mode={route.mode}
        joinCode={route.code}
        onLeave={() => go({ name: "home" }, "/")}
      />
    );
  }
  if (route.name === "how") {
    return <HowItWorksPage onBack={() => go({ name: "home" }, "/")} />;
  }
  return (
    <HomePage
      onPlay={() => go({ name: "desktop", mode: "create" }, "/play")}
      onJoin={(code) => go({ name: "desktop", mode: "join", code }, `/join/${code}`)}
      onHow={() => go({ name: "how" }, "/how")}
    />
  );
}
