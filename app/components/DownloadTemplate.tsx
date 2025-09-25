"use client";

const DownloadTemplate = () => {
  const handleDownload = () => {
    const headers = ["טלפון", "שם", "סטטוס", "שולחן"];
    const rows = [headers];
    const csvContent = rows.map((e) => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "guest_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="text-center mt-6">
      <button
        onClick={handleDownload}
        className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition"
      >
        הורד טמפלט CSV ריק
      </button>
    </div>
  );
};

export default DownloadTemplate;
