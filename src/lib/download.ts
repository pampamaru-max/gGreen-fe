import * as XLSX from "xlsx";
import apiClient from "@/lib/axios";

const triggerBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const xlsxDownload = (wb: XLSX.WorkBook, filename: string) => {
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  triggerBlob(
    new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    filename
  );
};

export const downloadFileViaApi = async (apiPath: string, filename: string) => {
  const { data } = await apiClient.get(apiPath, { responseType: "blob" });
  triggerBlob(data, filename);
};
