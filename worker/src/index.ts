import type { DocumentAnalysis } from "./types";

const STUB_ANALYSIS: DocumentAnalysis = {
  fileName: "Maple_Court_Residential_Lease.pdf",
  fileType: "application/pdf",
  documentType: "Lease Agreement",
  summary:
    "A 12-month residential lease for Unit 4B at 218 Maple Court, between landlord Eleanor R. Whitfield (via Maple Court Property Management LLC) and tenant Marcus T. Doyle. Rent is $2,450/month, due on the 1st, with a $2,450 security deposit and a $75 late fee after a 5-day grace period.",
  keyEntities: {
    people: ["Eleanor R. Whitfield", "Marcus T. Doyle", "Priya Anand"],
    organizations: ["Maple Court Property Management LLC", "Sentinel Renters Insurance Co."],
    dates: ["Aug 1, 2025", "Jul 31, 2026", "1st of month", "Jul 18, 2025"],
    topics: [
      "Rent $2,450/mo",
      "Security deposit",
      "Pet addendum",
      "Subletting clause",
      "Late fees",
      "60-day notice",
      "Maintenance",
    ],
  },
  suggestedQuestions: [
    "What is the monthly rent and when is it due?",
    "Can the tenant sublet the unit?",
    "What are the penalties for paying rent late?",
    "How much notice is required to end the lease?",
  ],
};

const STUB_ANSWER =
  "No — subletting or assignment is prohibited without the landlord's prior written consent. Under §9.1, an unauthorized sublet is a material breach and grounds for termination.";

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/api/analyze") {
      return Response.json(STUB_ANALYSIS);
    }

    if (request.method === "POST" && url.pathname === "/api/ask") {
      return Response.json({ answer: STUB_ANSWER });
    }

    return new Response("Not Found", { status: 404 });
  },
};
