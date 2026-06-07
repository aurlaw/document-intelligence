import { ref, computed } from "vue";
import { MAX_TURNS } from "document-intelligence-shared";

export interface ChatMessage {
  role: "user" | "assistant" | "error";
  text: string;
}

export interface DocRef {
  fileName: string;
  mimeType: string;
  dataBase64: string;
}

export function useDocumentChat() {
  const messages = ref<ChatMessage[]>([]);
  const currentStream = ref("");
  const busy = ref(false);

  // Count only completed user/assistant turns (errors don't count toward the cap)
  const atCap = computed(
    () => messages.value.filter((m) => m.role !== "error").length >= MAX_TURNS,
  );

  async function ask(doc: DocRef, question: string): Promise<void> {
    if (busy.value || atCap.value) return;

    messages.value.push({ role: "user", text: question });
    currentStream.value = "";
    busy.value = true;

    // Prior completed Q&A turns (exclude errors; exclude the just-pushed user message)
    const priorMessages = messages.value
      .slice(0, -1)
      .filter((m) => m.role !== "error")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.text }));

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc, messages: priorMessages, question }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({})) as { error?: { message?: string } };
        const msg = data?.error?.message ?? "Request failed. Please try again.";
        messages.value.push({ role: "error", text: msg });
        busy.value = false;
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Split on \n\n; keep trailing incomplete fragment for next chunk
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          if (!part.trim()) continue;

          let eventName = "";
          let dataLine = "";
          for (const line of part.split("\n")) {
            if (line.startsWith("event: ")) eventName = line.slice(7).trim();
            if (line.startsWith("data: ")) dataLine = line.slice(6);
          }

          if (!dataLine) continue;

          let parsed: unknown;
          try {
            parsed = JSON.parse(dataLine);
          } catch {
            continue;
          }

          if (eventName === "delta") {
            currentStream.value += (parsed as { text?: string }).text ?? "";
          } else if (eventName === "done") {
            messages.value.push({ role: "assistant", text: currentStream.value });
            currentStream.value = "";
            busy.value = false;
            return;
          } else if (eventName === "error") {
            const msg = (parsed as { message?: string }).message ?? "Stream error.";
            messages.value.push({ role: "error", text: msg });
            currentStream.value = "";
            busy.value = false;
            return;
          }
        }
      }

      // Stream closed without a done event — commit whatever arrived
      if (currentStream.value) {
        messages.value.push({ role: "assistant", text: currentStream.value });
        currentStream.value = "";
      }
    } catch {
      messages.value.push({ role: "error", text: "Network error. Please try again." });
      currentStream.value = "";
    } finally {
      busy.value = false;
    }
  }

  function reset(): void {
    messages.value = [];
    currentStream.value = "";
    busy.value = false;
  }

  return { messages, currentStream, busy, atCap, ask, reset };
}
