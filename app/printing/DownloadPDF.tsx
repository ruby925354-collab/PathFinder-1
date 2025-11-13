'use client';
import React, { useState, useEffect } from "react";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";

interface UserData {
  name: string;
  email: string;
  strand: string;
  subject: string;
  gradeLevel: string;
  semester: string;
  grades: string;
  programs?: string[];
  descriptions?: string[];
}

const DownloadPDF: React.FC<{ userData: UserData }> = ({ userData }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const storedId = localStorage.getItem("user_id");
    if (storedId) setUserId(storedId);
    else setError("No user logged in. Please sign in first.");
  }, []);

  const fetchReportData = async (userId: string) => {
    const response = await fetch(`/api/user/${userId}/report-data`);
    if (!response.ok) throw new Error("Failed to fetch report data");
    return response.json();
  };

  const generateDocument = async () => {
    if (!userId) {
        setError("No user ID found. Please log in first.");
        return;
    }

    setLoading(true);
    setError("");

    try {
        const templateRes = await fetch("/templates/PathFinder.docx");
        if (!templateRes.ok) throw new Error(`Template fetch failed: ${templateRes.statusText}`);

        const arrayBuffer = await templateRes.arrayBuffer();
        const zip = new PizZip(arrayBuffer);
        const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

        const reportData = await fetchReportData(userId);
        if (!reportData) throw new Error("Empty report data");

        doc.render({
        ...reportData,
        DATE: new Date().toLocaleDateString(),
        });

        const output = doc.getZip().generate({ type: "blob" });
        const docxFile = new File([output], `${userData.name}_PathFinder_Report.docx`, {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        });

        const formData = new FormData();
        formData.append("file", docxFile);

        const res = await fetch("/api/convert-pdf", { method: "POST", body: formData });
        if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`PDF conversion failed: ${errorText}`);
        }

        const pdfBlob = await res.blob();
        const pdfUrl = URL.createObjectURL(pdfBlob);

        const link = document.createElement("a");
        link.href = pdfUrl;
        link.download = `${userData.name}_PathFinder_Report.pdf`;
        link.click();

        setTimeout(() => URL.revokeObjectURL(pdfUrl), 1000);
    } catch (err: any) {
        console.error(err);
        setError(err.message || "Error generating report.");
    } finally {
        setLoading(false);
    }
    };


  return (
    <div>
      <button
        onClick={generateDocument}
        disabled={loading || !!error}
        className={`px-4 py-2 rounded-lg text-white ${
          loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {loading ? "Generating..." : "Download PathFinder Report"}
      </button>
      {error && <p className="text-red-600 mt-2">{error}</p>}
    </div>
  );
};

export default DownloadPDF;
