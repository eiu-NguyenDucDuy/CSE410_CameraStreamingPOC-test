const API_BASE_URL = process.env.NEXT_PUBLIC_INCIT_API_URL || "http://localhost:8081";

export interface ActiveCandidateDto {
  id: string;
  studentId: string;
  name: string;
  status: string;
  cameraEnabled: boolean;
  screenSharing: boolean;
  socketId: string;
  joinedAt: number;
  warnings: string[];
}

export interface ProctoringHealthDto {
  status: string;
  service: string;
  activeExamineesCount: number;
  activeProctorsCount: number;
  timestamp: number;
}

export async function fetchActiveCandidates(): Promise<ActiveCandidateDto[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/incit/proctoring/active-candidates`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    return data.result || [];
  } catch (error) {
    console.error("[ProctoringAPI] Error fetching active candidates:", error);
    return [];
  }
}

export async function sendProctorWarning(studentId: string, message: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/incit/proctoring/warnings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ studentId, message }),
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return true;
  } catch (error) {
    console.error("[ProctoringAPI] Error sending warning:", error);
    return false;
  }
}

export async function fetchProctoringHealth(): Promise<ProctoringHealthDto | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/incit/proctoring/health`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    return data.result || null;
  } catch (error) {
    console.error("[ProctoringAPI] Error fetching health:", error);
    return null;
  }
}
