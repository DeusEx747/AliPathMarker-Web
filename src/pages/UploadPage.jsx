import React, { useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const ACCEPTED_TYPES = ".zip,.rar,.7z,.tar,.gz";

// 假数据：已分析zip包列表
const mockDownloadList = [
  {
    name: "分析结果-20250709-1.zip",
    url: "#",
    time: "2025-07-09 21:30",
  },
  {
    name: "分析结果-20250708-2.zip",
    url: "#",
    time: "2025-07-08 19:12",
  },
];

export default function UploadPage() {
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [downloadList] = useState(mockDownloadList);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const fromAnalysis = location.state && location.state.fromAnalysis;

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setUploading(true);
    // 真正上传到后端
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("http://localhost:8000/api/upload", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        // 新增：获取后端返回的 sessionId 和 fileTree
        const data = await res.json();
        if (data.sessionId && data.fileTree) {
          navigate("/analysis", {
            state: { sessionId: data.sessionId, fileTree: data.fileTree },
          });
        } else {
          alert("上传成功，但未获取到文件树信息");
        }
      } else {
        alert("上传失败，请检查后端服务或文件格式");
      }
    } catch (err) {
      alert("上传出错：" + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleReUpload = () => {
    setFileName("");
    navigate("/", { replace: true });
  };

  const handleReAnalyze = () => {
    navigate("/analysis");
  };

  // 判断是否分析后返回
  if (fromAnalysis) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          background: "linear-gradient(135deg, #f0f4ff 0%, #e0e7ff 100%)",
        }}
      >
        {/* 左侧：缩小菱形和压缩包名 */}
        <div
          style={{
            flex: "0 0 340px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            borderRight: "1px solid #e0e6ef",
            background: "none",
          }}
        >
          <div
            style={{
              width: 120,
              height: 120,
              background: "linear-gradient(135deg, #fafdff 60%, #e0e7ff 100%)",
              boxShadow: "0 4px 16px 0 rgba(60,80,180,0.10), 0 0 0 3px #e0e7ff",
              borderRadius: 18,
              border: "3px solid #4f8cff",
              transform: "rotate(45deg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 24,
            }}
          >
            <img
              src="/ali-path-marker.svg"
              alt="AliPathMarker 图标"
              style={{
                width: 56,
                height: 56,
                transform: "rotate(-45deg)",
              }}
            />
          </div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: "#333",
              marginBottom: 12,
              textAlign: "center",
              wordBreak: "break-all",
              minHeight: 24,
            }}
          >
            {fileName ? fileName : "未选择压缩包"}
          </div>
          <div style={{ marginTop: 12 }}>
            <button style={styles.actionBtn} onClick={handleReAnalyze}>
              重新分析
            </button>
            <button
              style={{
                ...styles.actionBtn,
                marginLeft: 12,
                background: "#e0e6ef",
                color: "#4f8cff",
              }}
              onClick={handleReUpload}
            >
              重新上传
            </button>
          </div>
        </div>
        {/* 右侧：可下载分析结果列表 */}
        <div
          style={{
            flex: 1,
            padding: "48px 64px",
            display: "flex",
            flexDirection: "column",
            gap: 32,
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 600, marginBottom: 18 }}>
            可下载分析结果
          </div>
          <div
            style={{
              background: "#fafdff",
              border: "1px solid #e0e6ef",
              borderRadius: 12,
              padding: 24,
              minHeight: 220,
              display: "flex",
              flexDirection: "column",
              gap: 18,
            }}
          >
            {downloadList.length === 0 ? (
              <div style={{ color: "#888", fontSize: 16 }}>
                暂无可下载分析结果
              </div>
            ) : (
              downloadList.map((item, idx) => (
                <div
                  key={item.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 18,
                    padding: "8px 0",
                    borderBottom:
                      idx !== downloadList.length - 1
                        ? "1px solid #e0e6ef"
                        : "none",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, color: "#222" }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: 13, color: "#888" }}>
                      {item.time}
                    </div>
                  </div>
                  <a
                    href={item.url}
                    download={item.name}
                    style={{
                      padding: "6px 18px",
                      fontSize: 15,
                      background: "#4f8cff",
                      color: "#fff",
                      borderRadius: 6,
                      textDecoration: "none",
                      marginLeft: 8,
                    }}
                    onClick={(e) => {
                      if (item.url === "#") {
                        e.preventDefault();
                        alert("模拟下载：实际应由后端返回zip文件流");
                      }
                    }}
                  >
                    下载
                  </a>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // 默认：原居中上传界面
  return (
    <div style={styles.container}>
      <div style={styles.diamondWrapper}>
        <div style={styles.diamond}>
          <div style={styles.centerContent}>
            <img
              src="/ali-path-marker.svg"
              alt="AliPathMarker 图标"
              style={{ width: 72, height: 72, marginBottom: 18 }}
            />
            <div style={styles.title}>AliPathMarker</div>
            <input
              type="file"
              accept={ACCEPTED_TYPES}
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
            <button
              style={styles.uploadBtn}
              onClick={handleUploadClick}
              disabled={uploading}
            >
              {uploading ? "上传中..." : "上传项目压缩包"}
            </button>
            <div style={styles.tip}>支持 .zip, .rar, .7z, .tar, .gz</div>
            {fileName && !uploading && (
              <div style={styles.fileName}>已选择: {fileName}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    minWidth: "100vw",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #f0f4ff 0%, #e0e7ff 100%)",
  },
  diamondWrapper: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100vw",
    height: "100vh",
  },
  diamond: {
    width: 420,
    height: 420,
    background: "linear-gradient(135deg, #fafdff 60%, #e0e7ff 100%)",
    boxShadow: "0 12px 48px 0 rgba(60,80,180,0.18), 0 0 0 8px #e0e7ff",
    borderRadius: 40,
    border: "6px solid #4f8cff",
    transform: "rotate(45deg)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
    maxWidth: "90vw",
    maxHeight: "90vh",
  },
  centerContent: {
    transform: "rotate(-45deg)",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  uploadBtn: {
    padding: "16px 32px",
    fontSize: 18,
    borderRadius: 8,
    border: "none",
    background: "#4f8cff",
    color: "white",
    cursor: "pointer",
    marginBottom: 16,
    boxShadow: "0 2px 8px rgba(60,80,180,0.08)",
    transition: "background 0.2s",
  },
  tip: {
    fontSize: 14,
    color: "#888",
    marginBottom: 8,
  },
  fileName: {
    fontSize: 15,
    color: "#555",
    marginTop: 8,
  },
  successIcon: {
    fontSize: 48,
    color: "#4caf50",
    marginBottom: 12,
  },
  successText: {
    fontSize: 20,
    color: "#333",
    marginBottom: 18,
  },
  analysisBtn: {
    padding: "14px 28px",
    fontSize: 17,
    borderRadius: 8,
    border: "none",
    background: "#4f8cff",
    color: "white",
    cursor: "pointer",
    marginTop: 8,
    boxShadow: "0 2px 8px rgba(60,80,180,0.08)",
    transition: "background 0.2s",
  },
  title: {
    fontSize: 26,
    fontWeight: 600,
    color: "#333",
    marginBottom: 28,
    letterSpacing: 2,
    textAlign: "center",
  },
  actionBtn: {
    padding: "10px 22px",
    fontSize: 15,
    borderRadius: 7,
    border: "none",
    background: "#4f8cff",
    color: "white",
    cursor: "pointer",
    marginTop: 4,
    boxShadow: "0 2px 8px rgba(60,80,180,0.08)",
    transition: "background 0.2s",
  },
};
