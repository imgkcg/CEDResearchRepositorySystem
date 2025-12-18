import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Linking, Platform } from "react-native";
import { getToken, removeToken } from "../../lib/auth";
import api from "../../lib/api";
import axios from "axios";
import { router } from "expo-router";

export type Status = "pending" | "approved" | "rejected";
export type SubmissionType = "draft" | "final";
export type Visibility = "public" | "campus" | "private" | "embargo";

export type ResearchPaper = {
  _id: string;
  title: string;
  abstract: string;
  author: string;
  adviser?: string;
  student?: string;
  status: Status;
  createdAt: string;
  updatedAt?: string;
  fileName?: string;
  fileType?: string;
  submissionType?: SubmissionType;
  visibility?: Visibility;
  keywords?: string[]; 
};

export const normalizeType = (p: ResearchPaper): SubmissionType =>
  p.submissionType ? p.submissionType : p.status === "approved" ? "final" : "draft";

export function useFacultyData() {
  const [myResearch, setMyResearch] = useState<ResearchPaper[]>([]);
  const [studentSubs, setStudentSubs] = useState<ResearchPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token?.token) throw new Error("No token found");

      const [myRes, studentRes] = await Promise.all([
        api.get("/faculty/my-research", { headers: { Authorization: `Bearer ${token.token}` } }),
        api.get("/faculty/student-submissions", { headers: { Authorization: `Bearer ${token.token}` } }),
      ]);

      const myArr: ResearchPaper[] = Array.isArray(myRes.data) ? myRes.data : [];
      const stuArr: ResearchPaper[] = Array.isArray(studentRes.data) ? studentRes.data : [];

      setMyResearch(myArr.map((p) => ({ 
        ...p, 
        submissionType: normalizeType(p),
        keywords: p.keywords || [] 
      })));

      setStudentSubs(stuArr.map((p) => ({ 
        ...p, 
        submissionType: normalizeType(p),
        keywords: p.keywords || [] 
      })));
    } catch (err) {
      console.error("❌ Failed to fetch:", err);
      Alert.alert("Error", "Failed to load faculty data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (!token?.token) {
          await removeToken();
          router.replace("/login");
          return;
        }
        await fetchAll();
      } catch {
        await removeToken();
        router.replace("/login");
      }
    })();
  }, [fetchAll]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAll();
  }, [fetchAll]);

  const reviewSubmission = useCallback(
    async (paper: ResearchPaper, decision: "approved" | "rejected", comment: string) => {
      const token = await getToken();
      await api.put(
        `/faculty/review/${paper._id}`,
        { decision, comment, submissionType: paper.submissionType || normalizeType(paper) },
        { headers: { Authorization: `Bearer ${token?.token}` } }
      );
      await fetchAll();
    },
    [fetchAll]
  );

  const uploadResearch = useCallback(
    async (payload: { 
      title: string; 
      abstract: string; 
      submissionType: SubmissionType; 
      keywords?: string;
      file?: File | null 
    }) => {
      const tokenObj = await getToken();
      const authHeader = { Authorization: `Bearer ${tokenObj?.token}` } as const;

      if (Platform.OS === "web" && payload.file) {
        const form = new FormData();
        form.append("title", payload.title);
        form.append("abstract", payload.abstract);
        form.append("submissionType", payload.submissionType);
        
        if (payload.keywords) {
          form.append("keywords", payload.keywords);
        }
        
        form.append("file", payload.file, payload.file.name);
        
        const response = await api.post("/faculty/my-research", form, { 
          headers: { ...authHeader, "Content-Type": undefined as any } 
        });
        await fetchAll();
        return response.data;
      } else {
        const response = await api.post("/faculty/my-research",
          { 
            title: payload.title, 
            abstract: payload.abstract, 
            submissionType: payload.submissionType,
            keywords: payload.keywords 
          },
          { headers: authHeader }
        );
        await fetchAll();
        return response.data;
      }
    },
    [fetchAll]
  );
const openFile = useCallback(async (paper: ResearchPaper) => {
  try {
    if (!paper?._id) throw new Error("Invalid file");

    const tokenObj = await getToken();
    const token = tokenObj?.token;
    if (!token) throw new Error("Session expired");

    let base = api.defaults.baseURL || "";
    base = base.replace(/\/+$/, "");

    const previewUrl =
      `${base}/faculty/preview/${paper._id}?token=${encodeURIComponent(token)}`;

    if (Platform.OS === "web") {
      window.open(previewUrl, "_blank");
      return;
    }

    await Linking.openURL(previewUrl);
  } catch (e: any) {
    console.error("❌ Open file error:", e);
    Alert.alert("Error", e.message || "Failed to open file");
  }
}, []);



  const analytics = useMemo(() => {
    const uniqueAdvisees = Array.from(
      new Set(studentSubs.map((s) => (s.author || "").toLowerCase().trim()))
    ).filter(Boolean);
    return {
      total: uniqueAdvisees.length,
      approved: studentSubs.filter((s) => s.status === "approved").length,
      pending: studentSubs.filter((s) => s.status === "pending").length,
      rejected: studentSubs.filter((s) => s.status === "rejected").length,
      myResearchCount: myResearch.length,
    };
  }, [studentSubs, myResearch]);

  return { myResearch, studentSubs, loading, refreshing, onRefresh, reviewSubmission, uploadResearch, openFile, analytics };
}