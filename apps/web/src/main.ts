import { createApp } from "./components/chat-view.js";
import "./styles/main.css";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) {
  throw new Error("No #app element found");
}

createApp(app);
