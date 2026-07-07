import type { AgentSSEEvent, ChatMessage, ChatState } from "../types/fhs.js";
import { connectToChat, type ChatConnection } from "../services/api.js";

interface ModelOption {
  modelId: string;
  displayName: string;
  providerId: string;
  providerName: string;
}

interface KbOption {
  providerId: string;
  providerName: string;
  description: string;
}

export function createApp(container: HTMLElement, version: string = "unknown") {
  const state: ChatState = {
    messages: [],
    isStreaming: false,
    selectedModel: "auto",
    privacyScope: "community",
    ocrMode: "confirm",
    kbProviderId: "",
  };

  let conversationId: string | null = null;
  let chatConnection: ChatConnection | null = null;
  let pendingAttachment: string | null = null;
  let pendingAttachmentIsPdf = false;
  let pendingAttachmentName: string | null = null;

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
          <input type="file" class="file-input" accept="image/*,application/pdf" hidden />
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
        <label>
          Documentos adjuntos:
          <select class="ocr-mode-selector">
            <option value="confirm" selected>Confirmar antes de usar</option>
            <option value="auto">Automático (más rápido, sin confirmar)</option>
          </select>
        </label>
        <label>
          Base de conocimiento:
          <select class="kb-selector">
            <option value="" selected>Recomendada automáticamente (con confirmación)</option>
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
  const ocrModeSelector = container.querySelector(".ocr-mode-selector") as HTMLSelectElement;
  const kbSelector = container.querySelector(".kb-selector") as HTMLSelectElement;
  const provenancePlaceholder = container.querySelector(".provenance-placeholder") as HTMLElement;

  loadModels();
  loadKbs();

  modelSelector.addEventListener("change", () => {
    state.selectedModel = modelSelector.value as any;
  });

  scopeSelector.addEventListener("change", () => {
    state.privacyScope = scopeSelector.value as ChatState["privacyScope"];
  });

  ocrModeSelector.addEventListener("change", () => {
    state.ocrMode = ocrModeSelector.value as ChatState["ocrMode"];
  });

  kbSelector.addEventListener("change", () => {
    state.kbProviderId = kbSelector.value;
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
    const isPdf = file.type === "application/pdf";
    if (!file.type.startsWith("image/") && !isPdf) {
      addActivityItem("error", `Tipo de archivo no soportado: ${file.type || file.name}`);
      fileInput.value = "";
      return;
    }
    pendingAttachment = await fileToBase64(file);
    pendingAttachmentIsPdf = isPdf;
    pendingAttachmentName = file.name;
    attachBtn.textContent = `${isPdf ? "📄" : "📎"} ${file.name}`;
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

  async function loadKbs() {
    try {
      const response = await fetch("/api/fhs/providers?type=mcp");
      const providers = (await response.json()) as Array<{
        providerId: string;
        name: string;
        service: { capabilities: Array<{ id: string; description?: string }> };
      }>;
      const kbs: KbOption[] = providers
        .map((p) => {
          const cap = p.service.capabilities.find((c) => c.id === "kb.query");
          return cap ? { providerId: p.providerId, providerName: p.name, description: cap.description || p.name } : null;
        })
        .filter((kb): kb is KbOption => kb !== null);

      for (const kb of kbs) {
        const option = document.createElement("option");
        option.value = kb.providerId;
        option.textContent = `${kb.providerName} — ${kb.description}`;
        kbSelector.appendChild(option);
      }
    } catch (err) {
      console.error("Failed to load KBs", err);
    }
  }

  async function submitMessage() {
    const text = textareaEl.value.trim();
    if ((!text && !pendingAttachment) || state.isStreaming) return;

    const userContent = text || (pendingAttachment ? (pendingAttachmentIsPdf ? "[PDF adjunto]" : "[imagen adjunta]") : "");
    addMessage({
      role: "user",
      content: userContent,
      attachmentName: pendingAttachment ? pendingAttachmentName || undefined : undefined,
      attachmentIsPdf: pendingAttachmentIsPdf,
    });

    const artifacts = pendingAttachment ? [pendingAttachment] : undefined;
    const attachmentName = pendingAttachmentName;
    pendingAttachment = null;
    pendingAttachmentIsPdf = false;
    pendingAttachmentName = null;
    attachBtn.textContent = "Adjuntar";
    attachBtn.classList.remove("attached");
    textareaEl.value = "";
    textareaEl.style.height = "auto";
    state.isStreaming = true;
    sendBtn.disabled = true;
    activityLogEl.innerHTML = "";
    hideThinking();

    const sendOptions = {
      conversationId: conversationId || undefined,
      message: text,
      artifacts,
      attachmentName: attachmentName || undefined,
      preferences: {
        model: state.selectedModel,
        scope: state.privacyScope,
        allowExternalProviders: state.privacyScope === "external",
        ocrMode: state.ocrMode,
        kb: state.kbProviderId || undefined,
      },
    };

    if (!chatConnection) {
      chatConnection = connectToChat(handleEvent, () => chatConnection?.send(sendOptions));
    } else {
      chatConnection.send(sendOptions);
    }
  }

  function handleEvent(event: AgentSSEEvent) {
    switch (event.type) {
      case "session":
        conversationId = event.data.conversationId;
        break;
      case "agent.status":
        addActivityItem("info", event.data.message);
        showThinking(event.data.message);
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
        hideThinking();
        appendAssistantText(event.data.text);
        break;
      case "assistant.completed":
        hideThinking();
        renderProvenance(event.data.provenance);
        state.isStreaming = false;
        sendBtn.disabled = false;
        break;
      case "ocr.extracted":
        hideThinking();
        addOcrExtractedMessage(event.data.filename, event.data.text);
        state.isStreaming = false;
        sendBtn.disabled = false;
        break;
      case "node.lost":
        addActivityItem("error", `Nodo perdido: ${event.data.providerName}`);
        break;
      case "node.online":
        addActivityItem("success", `Nodo disponible: ${event.data.providerName}`);
        break;
      case "kb.recommended":
        hideThinking();
        addKbRecommendedMessage(event.data.conversationId, event.data.providerName, event.data.description);
        state.isStreaming = false;
        sendBtn.disabled = false;
        break;
      case "kb.warning":
        addActivityItem("warning", event.data.message);
        break;
      case "error":
        hideThinking();
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

    if (message.role === "user" && message.attachmentName) {
      const badge = document.createElement("div");
      badge.className = "message-attachment";
      badge.textContent = `${message.attachmentIsPdf ? "📄" : "📎"} ${message.attachmentName} — cargado`;
      div.appendChild(badge);
    }

    const textEl = document.createElement("div");
    textEl.textContent = message.content;
    div.appendChild(textEl);

    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  let thinkingEl: HTMLElement | null = null;

  function showThinking(statusText: string) {
    if (!thinkingEl) {
      thinkingEl = document.createElement("div");
      thinkingEl.className = "message assistant thinking";
      const dots = document.createElement("span");
      dots.className = "thinking-dots";
      dots.innerHTML = "<i></i><i></i><i></i>";
      const label = document.createElement("span");
      label.className = "thinking-label";
      thinkingEl.appendChild(dots);
      thinkingEl.appendChild(label);
      messagesEl.appendChild(thinkingEl);
    }
    const label = thinkingEl.querySelector(".thinking-label");
    if (label) label.textContent = statusText;
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function hideThinking() {
    thinkingEl?.remove();
    thinkingEl = null;
  }

  function addOcrExtractedMessage(filename: string, text: string) {
    const div = document.createElement("div");
    div.className = "message assistant ocr-preview";

    const details = document.createElement("details");
    const summary = document.createElement("summary");
    summary.textContent = `📄 ${filename} — texto extraído (clic para ver)`;
    details.appendChild(summary);

    const textEl = document.createElement("div");
    textEl.className = "ocr-preview-text";
    textEl.textContent = text;
    details.appendChild(textEl);
    div.appendChild(details);

    const question = document.createElement("p");
    question.className = "ocr-preview-question";
    question.textContent = "¿Uso este documento para responder tu pregunta?";
    div.appendChild(question);

    const actions = document.createElement("div");
    actions.className = "ocr-preview-actions";

    const useBtn = document.createElement("button");
    useBtn.type = "button";
    useBtn.textContent = "Usar documento";
    const discardBtn = document.createElement("button");
    discardBtn.type = "button";
    discardBtn.className = "secondary";
    discardBtn.textContent = "Descartar";

    const decide = (use: boolean) => {
      useBtn.disabled = true;
      discardBtn.disabled = true;
      actions.remove();
      question.textContent = use
        ? "✓ Usando este documento — si aún no habías escrito tu pregunta, escríbela ahora."
        : "Documento descartado.";
      if (conversationId) chatConnection?.sendDecision(conversationId, use);
    };

    useBtn.addEventListener("click", () => decide(true));
    discardBtn.addEventListener("click", () => decide(false));
    actions.appendChild(useBtn);
    actions.appendChild(discardBtn);
    div.appendChild(actions);

    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function addKbRecommendedMessage(convId: string, providerName: string, description: string) {
    const div = document.createElement("div");
    div.className = "message assistant kb-recommendation";

    const question = document.createElement("p");
    question.textContent = `📚 Encontré una base de conocimiento relevante: "${providerName}" (${description}). ¿La uso para responder?`;
    div.appendChild(question);

    const actions = document.createElement("div");
    actions.className = "ocr-preview-actions";

    const useBtn = document.createElement("button");
    useBtn.type = "button";
    useBtn.textContent = "Usar esta KB";
    const discardBtn = document.createElement("button");
    discardBtn.type = "button";
    discardBtn.className = "secondary";
    discardBtn.textContent = "No usar";

    const decide = (use: boolean) => {
      useBtn.disabled = true;
      discardBtn.disabled = true;
      actions.remove();
      question.textContent = use ? `✓ Usando "${providerName}" para responder.` : "No se usó ninguna KB para esta pregunta.";
      chatConnection?.sendKbDecision(convId, use);
    };

    useBtn.addEventListener("click", () => decide(true));
    discardBtn.addEventListener("click", () => decide(false));
    actions.appendChild(useBtn);
    actions.appendChild(discardBtn);
    div.appendChild(actions);

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

  function escapeHtml(value: string): string {
    const div = document.createElement("div");
    div.textContent = value;
    return div.innerHTML;
  }

  function renderCitation(citation: any): string {
    const pages =
      citation.pageStart != null
        ? ` (p. ${citation.pageStart}${citation.pageEnd != null ? `–${citation.pageEnd}` : ""})`
        : "";
    return `${escapeHtml(citation.documentTitle)}${pages}`;
  }

  function renderProvenance(provenance: any) {
    provenancePlaceholder.innerHTML = `
      <dl>
        <dt>Modelo</dt><dd>${escapeHtml(provenance.llm.model)}</dd>
        <dt>Razonamiento</dt><dd>${escapeHtml(provenance.llm.providerName)}</dd>
        ${provenance.tools
          .map(
            (tool: any) => `
          <dt>Tool</dt><dd>${escapeHtml(tool.capability)} @ ${escapeHtml(tool.providerName)}</dd>
          ${
            tool.citations && tool.citations.length > 0
              ? `<dt>Fuentes</dt><dd>${tool.citations.map(renderCitation).join(", ")}</dd>`
              : ""
          }
        `
          )
          .join("")}
        <dt>Datos</dt><dd>${escapeHtml(provenance.dataExported)}</dd>
        <dt>Ámbito</dt><dd>${escapeHtml(provenance.jurisdiction)}</dd>
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
