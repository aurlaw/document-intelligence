export interface EntityItem {
  label?: string;
  value: string;
}

export interface DocumentAnalysis {
  fileName: string;
  fileType: string;
  documentType: string;
  confidence?: number;
  pageCount?: number;
  summary: string;
  keyEntities: {
    people: EntityItem[];
    organizations: EntityItem[];
    dates: EntityItem[];
    topics: EntityItem[];
  };
  suggestedQuestions: string[];
}
