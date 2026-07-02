import type { AgentSSEEvent, ChatMessage, ChatState } from "../types/fhs.js";
import { connectToChat, type ChatConnection } from "../services/api.js";

interface ModelOption {
  modelId: string;
  displayName: string;
  providerId: string;
  providerName: string;
}

export function createApp(container: HTMLElement, version: string = "unknown") {
  const state: ChatState = {
    messages: [],
    isStreaming: false,
    selectedModel: "auto",
    privacyScope: "community",
  };

  let conversationId: string | null = null;
  let chatConnection: ChatConnection | null = null;
  let pendingAttachment: string | null = null;

  container.innerHTML = `
    <div class="app">
      <header class="header">
        <h1>FHS Community</h1>
        <div class="network-status">
          <span class="status-dot"></span>
          <span>Red: FARO</span>
          <span class="version">${version}</span>
        </div>
      </header>
      <aside class="sidebar">
        <h2>Conversaciones</h2>
        <ul class="conversation-list">
          <li class="active">OCR demo</li>
        </ul>
      </aside>
      <main class="chat-area">
        <div class="messages"></div>
        <div class="composer">
          <input type="file" class="file-input" accept="image/*" hidden />
          <button class="attach-btn" type="button">Adjuntar</button>
          <textarea placeholder="Escribe un mensaje..." rows="1"></textarea>
          <button class="send-btn" type="button">Enviar</button>
        </div>
      </main>
      <aside class="activity-panel">
        <h2>Actividad del agente</h2>
        <ul class="activity-log"></ul>
        <div class="provenance-card">
          <h3>Procedencia</h3>
          <p class="provenance-placeholder">Esperando primera respuesta...</p>
        </div>
      </aside>
      <footer class="settings-bar">
        <label>
          Modelo:
          <select class="model-selector">
            <option value="auto">Automático</option>
          </select>
        </label>
        <label>
          Privacidad:
          <select class="scope-selector">
            <option value="local">Sólo este equipo</option>
            <option value="network">Mi red local</option>
            <option value="community" selected>Comunidad de confianza</option>
            <option value="external">Proveedores externos autorizados</option>
          </select>
        </label>
      </footer>
    </div>
  `;

  const messagesEl = container.querySelector(".messages") as HTMLElement;
  const textareaEl = container.querySelector(".composer textarea") as HTMLTextAreaElement;
  const sendBtn = container.querySelector(".send-btn") as HTMLButtonElement;
  const attachBtn = container.querySelector(".attach-btn") as HTMLButtonElement;
  const fileInput = container.querySelector(".file-input") as HTMLInputElement;
  const activityLogEl = container.querySelector(".activity-log") as HTMLElement;
  const modelSelector = container.querySelector(".model-selector") as HTMLSelectElement;
  const scopeSelector = container.querySelector(".scope-selector") as HTMLSelectElement;
  const provenancePlaceholder = container.querySelector(".provenance-placeholder") as HTMLElement;

  loadModels();

  modelSelector.addEventListener("change", () => {
    state.selectedModel = modelSelector.value as any;
  });

  scopeSelector.addEventListener("change", () => {
    state.privacyScope = scopeSelector.value as ChatState["privacyScope"];
  });

  textareaEl.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submitMessage();
    }
  });

  sendBtn.addEventListener("click", submitMessage);

  attachBtn.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    pendingAttachment = await fileToBase64(file);
    attachBtn.textContent = `📎 ${file.name}`;
    attachBtn.classList.add("attached");
  });

  async function loadModels() {
    try {
      const response = await fetch("/api/fhs/models");
      const data = (await response.json()) as { models: ModelOption[] };
      for (const m of data.models) {
        const option = document.createElement("option");
        option.value = m.modelId;
        option.textContent = `${m.displayName} — ${m.providerName}`;
        modelSelector.appendChild(option);
      }
    } catch (err) {
      console.error("Failed to load models", err);
    }
  }

  async function submitMessage() {
    const text = textareaEl.value.trim();
    if ((!text && !pendingAttachment) || state.isStreaming) return;

    const userContent = text || (pendingAttachment ? "[imagen adjunta]" : "");
    addMessage({ role: "user", content: userContent });

    const artifacts = pendingAttachment ? [pendingAttachment] : undefined;
    pendingAttachment = null;
    attachBtn.textContent = "Adjuntar";
    attachBtn.classList.remove("attached");
    textareaEl.value = "";
    textareaEl.style.height = "auto";
    state.isStreaming = true;
    sendBtn.disabled = true;
    activityLogEl.innerHTML = "";

    if (!chatConnection) {
      chatConnection = connectToChat(handleEvent, () => {
        chatConnection?.send({
          conversationId: conversationId || undefined,
          message: text,
          artifacts,
          preferences: {
            model: state.selectedModel,
            scope: state.privacyScope,
            allowExternalProviders: state.privacyScope === "external",
          },
        });
      });
    } else {
      chatConnection.send({
        conversationId: conversationId || undefined,
        message: text,
        artifacts,
        preferences: {
          model: state.selectedModel,
          scope: state.privacyScope,
          allowExternalProviders: state.privacyScope === "external",
        },
      });
    }
  }

  function handleEvent(event: AgentSSEEvent) {
    switch (event.type) {
      case "session":
        conversationId = event.data.conversationId;
        break;
      case "agent.status":
        addActivityItem("info", event.data.message);
        break;
      case "llm.selected":
        addActivityItem("success", `Modelo: ${event.data.modelId} @ ${event.data.providerName}`);
        break;
      case "tool.selected":
        addActivityItem("success", `Tool: ${event.data.capability} @ ${event.data.providerName}`);
        break;
      case "tool.running":
        addActivityItem("warning", `Ejecutando ${event.data.name}...`);
        break;
      case "tool.completed":
        addActivityItem(event.data.success ? "success" : "error", `${event.data.name} (${event.data.duration}ms)`);
        break;
      case "tool.error":
        addActivityItem("error", `${event.data.name}: ${event.data.error}`);
        break;
      case "assistant.delta":
        appendAssistantText(event.data.text);
        break;
      case "assistant.completed":
        renderProvenance(event.data.provenance);
        state.isStreaming = false;
        sendBtn.disabled = false;
        break;
      case "node.lost":
        addActivityItem("error", `Nodo perdido: ${event.data.providerName}`);
        break;
      case "node.online":
        addActivityItem("success", `Nodo disponible: ${event.data.providerName}`);
        break;
      case "error":
        addActivityItem("error", `[${event.data.code}] ${event.data.message}`);
        state.isStreaming = false;
        sendBtn.disabled = false;
        break;
    }
  }

  function addMessage(message: ChatMessage) {
    state.messages.push(message);
    const div = document.createElement("div");
    div.className = `message ${message.role}`;
    div.textContent = message.content;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function appendAssistantText(text: string) {
    const last = state.messages[state.messages.length - 1];
    if (last && last.role === "assistant") {
      last.content += text;
      const existing = messagesEl.querySelector(".message.assistant:last-child");
      if (existing) existing.textContent = last.content;
    } else {
      addMessage({ role: "assistant", content: text });
    }
  }

  function addActivityItem(level: "info" | "success" | "warning" | "error", text: string) {
    const li = document.createElement("li");
    li.className = `activity-item ${level}`;
    li.textContent = text;
    activityLogEl.appendChild(li);
    activityLogEl.scrollTop = activityLogEl.scrollHeight;
  }

  function renderProvenance(provenance: any) {
    provenancePlaceholder.innerHTML = `
      <dl>
        <dt>Modelo</dt><dd>${provenance.llm.model}</dd>
        <dt>Razonamiento</dt><dd>${provenance.llm.providerName}</dd>
        ${provenance.tools
          .map(
            (tool: any) => `
          <dt>Tool</dt><dd>${tool.capability} @ ${tool.providerName}</dd>
        `
          )
          .join("")}
        <dt>Datos</dt><dd>${provenance.dataExported}</dd>
        <dt>Ámbito</dt><dd>${provenance.jurisdiction}</dd>
      </dl>
    `;
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}
