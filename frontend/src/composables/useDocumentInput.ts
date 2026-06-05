import { ref, computed } from "vue";
import {
  MAX_CHARS,
  MAX_BYTES,
  NEAR_LIMIT,
  ACCEPT_EXT,
  ACCEPT_MIME,
} from "document-intelligence-shared";

export type ValidationError = {
  kind: "empty" | "over" | "size" | "type";
  level: "warn" | "error";
  message: string;
};

export type TextPayload = { text: string };
export type FilePayload = { fileName: string; mimeType: string; dataBase64: string };
export type AnalyzePayload = TextPayload | FilePayload;

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

function getExt(name: string): string {
  const idx = name.lastIndexOf(".");
  return idx >= 0 ? name.slice(idx).toLowerCase() : "";
}

export function useDocumentInput() {
  const text = ref("");
  const file = ref<File | null>(null);
  const submitAttempted = ref(false);

  const charCount = computed(() => text.value.length);

  const counterState = computed((): "normal" | "near" | "over" => {
    if (charCount.value > MAX_CHARS) return "over";
    if (charCount.value >= NEAR_LIMIT) return "near";
    return "normal";
  });

  const counterDisplay = computed(() => {
    const len = charCount.value;
    if (counterState.value === "over") {
      return `${len.toLocaleString()} / 8,000 · ${(len - MAX_CHARS).toLocaleString()} over`;
    }
    return `${len.toLocaleString()} / 8,000`;
  });

  const fileError = computed((): ValidationError | null => {
    const f = file.value;
    if (!f) return null;
    const ext = getExt(f.name);
    const extOk = ACCEPT_EXT.includes(ext);
    const mimeOk = !f.type || ACCEPT_MIME.includes(f.type);
    if (!extOk || !mimeOk) {
      return {
        kind: "type",
        level: "error",
        message: `“${ext || f.name}” isn’t something we can read. Use a PDF, an image (PNG / JPG / WebP), or plain text (.txt, .md, .csv).`,
      };
    }
    if (f.size > MAX_BYTES) {
      return {
        kind: "size",
        level: "error",
        message: `“${f.name}” is ${formatBytes(f.size)}. The limit is 2 MB — try a smaller file, or paste the text instead.`,
      };
    }
    return null;
  });

  const validationError = computed((): ValidationError | null => {
    if (file.value) return fileError.value;
    if (counterState.value === "over") {
      const over = charCount.value - MAX_CHARS;
      return {
        kind: "over",
        level: "error",
        message: `You’re ${over.toLocaleString()} characters over. Trim it down, or attach the document as a file instead.`,
      };
    }
    if (submitAttempted.value && charCount.value === 0) {
      return {
        kind: "empty",
        level: "warn",
        message: "Paste some text or attach a file to begin — we’ll take it from there.",
      };
    }
    return null;
  });

  const isSubmitDisabled = computed(() => {
    if (counterState.value === "over") return true;
    if (fileError.value !== null) return true;
    if (!file.value && charCount.value === 0) return true;
    return false;
  });

  function setText(value: string) {
    text.value = value;
    file.value = null;
  }

  function setFile(f: File) {
    file.value = f;
    text.value = "";
    submitAttempted.value = false;
  }

  function clearFile() {
    file.value = null;
  }

  function trySubmit(): boolean {
    submitAttempted.value = true;
    return !isSubmitDisabled.value;
  }

  async function buildPayload(): Promise<AnalyzePayload> {
    if (file.value) {
      const buffer = await file.value.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      const CHUNK = 8192;
      for (let i = 0; i < bytes.length; i += CHUNK) {
        binary += String.fromCharCode(...Array.from(bytes.subarray(i, i + CHUNK)));
      }
      return {
        fileName: file.value.name,
        mimeType: file.value.type,
        dataBase64: btoa(binary),
      };
    }
    return { text: text.value };
  }

  return {
    text: text as Readonly<typeof text>,
    file: file as Readonly<typeof file>,
    charCount,
    counterState,
    counterDisplay,
    validationError,
    isSubmitDisabled,
    setText,
    setFile,
    clearFile,
    trySubmit,
    buildPayload,
  };
}
