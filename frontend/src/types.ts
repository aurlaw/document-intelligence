export interface DocumentAnalysis {
  fileName: string;
  fileType: string;
  summary: string;
  keyEntities: {
    people: string[];
    organizations: string[];
    dates: string[];
    topics: string[];
  };
  documentType: string;
  suggestedQuestions: string[];
}
