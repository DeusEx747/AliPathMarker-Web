import React, { useState } from "react";

export default function AnalysisPage() {
  const [methodName, setMethodName] = useState("");
  const [sourceCode, setSourceCode] = useState("");
  const [paths, setPaths] = useState([]);
  const [loadingSource, setLoadingSource] = useState(false);
  const [loadingPaths, setLoadingPaths] = useState(false);

  // 占位：后续可接入API
  const handleConfirm = async () => {
    setLoadingSource(true);
    setTimeout(() => {
      // 假数据，后续用API替换
      setSourceCode(
        `public void exampleMethod() {\n  // ... method body ...\n}`
      );
      setLoadingSource(false);
    }, 800);
  };

  const handleAnalyzePaths = async () => {
    setLoadingPaths(true);
    setTimeout(() => {
      // 假数据，后续用API替换
      setPaths([
        "Path 1: A -> B -> C",
        "Path 2: A -> D -> C",
        "Path 3: A -> E -> F -> C",
      ]);
      setLoadingPaths(false);
    }, 1000);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        background: "#f8faff",
      }}
    >
      {/* 左侧：方法输入、源码、分析按钮 */}
      <div
        style={{
          flex: 1,
          padding: "48px 32px 48px 64px",
          borderRight: "1px solid #e0e6ef",
          display: "flex",
          flexDirection: "column",
          gap: 32,
        }}
      >
        <div>
          <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>
            输入方法完全限定名
          </div>
          <input
            type="text"
            value={methodName}
            onChange={(e) => setMethodName(e.target.value)}
            placeholder="如 com.example.MyClass.myMethod"
            style={{
              width: "100%",
              fontSize: 16,
              padding: "8px 12px",
              border: "1px solid #bfc8da",
              borderRadius: 4,
              outline: "none",
            }}
          />
          <button
            onClick={handleConfirm}
            disabled={!methodName || loadingSource}
            style={{
              marginTop: 16,
              padding: "8px 24px",
              fontSize: 16,
              background: "#4f8cff",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              cursor: !methodName || loadingSource ? "not-allowed" : "pointer",
              opacity: !methodName || loadingSource ? 0.6 : 1,
            }}
          >
            {loadingSource ? "加载中..." : "确认"}
          </button>
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>
            方法源码
          </div>
          <div
            style={{
              minHeight: 120,
              background: "#f3f6fa",
              border: "1px solid #e0e6ef",
              borderRadius: 4,
              padding: 16,
              fontFamily: "monospace",
              fontSize: 15,
              color: "#222",
              whiteSpace: "pre",
            }}
          >
            {loadingSource
              ? "正在加载源码..."
              : sourceCode
              ? sourceCode
              : "请先输入方法名并点击确认"}
          </div>
          <button
            onClick={handleAnalyzePaths}
            disabled={!sourceCode || loadingPaths}
            style={{
              marginTop: 16,
              padding: "8px 24px",
              fontSize: 16,
              background: "#1bc47d",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              cursor: !sourceCode || loadingPaths ? "not-allowed" : "pointer",
              opacity: !sourceCode || loadingPaths ? 0.6 : 1,
            }}
          >
            {loadingPaths ? "分析中..." : "路径分析"}
          </button>
        </div>
      </div>
      {/* 右侧：路径显示区 */}
      <div
        style={{
          flex: 1,
          padding: "48px 64px 48px 32px",
          display: "flex",
          flexDirection: "column",
          gap: 32,
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>
          路径列表
        </div>
        <PathImageList loading={loadingPaths} paths={paths} />
      </div>
    </div>
  );
}

// 路径图片列表组件
import { useNavigate } from "react-router-dom";
function PathImageList({ loading, paths }) {
  const [checked, setChecked] = React.useState([]);
  const navigate = useNavigate();

  const handleToggle = (idx) => {
    setChecked((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  const handleSave = () => {
    // 保存逻辑留空
    navigate("/", { state: { fromAnalysis: true } });
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: 200,
          background: "#f3f6fa",
          border: "1px solid #e0e6ef",
          borderRadius: 4,
          padding: 16,
          fontSize: 15,
          color: "#222",
        }}
      >
        正在分析路径...
      </div>
    );
  }

  if (!paths || paths.length === 0) {
    return (
      <div
        style={{
          minHeight: 200,
          background: "#f3f6fa",
          border: "1px solid #e0e6ef",
          borderRadius: 4,
          padding: 16,
          fontSize: 15,
          color: "#222",
        }}
      >
        请先输入方法名并确认，显示源码后可进行路径分析
      </div>
    );
  }

  return (
    <div
      style={{
        background: "#f3f6fa",
        border: "1px solid #e0e6ef",
        borderRadius: 4,
        padding: 16,
        maxHeight: 400,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      {paths.map((p, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            marginBottom: 4,
          }}
        >
          {/* 路径图片（用占位图） */}
          <img
            src="/ali-path-marker.svg"
            alt="path"
            style={{
              width: 80,
              height: 80,
              objectFit: "contain",
              background: "#fff",
              border: "1px solid #e0e6ef",
              borderRadius: 8,
              boxShadow: "0 1px 4px #e0e6ef",
            }}
          />
          {/* 路径描述 */}
          <div style={{ flex: 1, fontSize: 15, color: "#222" }}>{p}</div>
          {/* 菱形勾选框 */}
          <div
            onClick={() => handleToggle(i)}
            style={{
              width: 28,
              height: 28,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              userSelect: "none",
            }}
          >
            <svg width="28" height="28" viewBox="0 0 28 28">
              <polygon
                points="14,3 25,14 14,25 3,14"
                fill={checked.includes(i) ? "#4f8cff" : "none"}
                stroke="#4f8cff"
                strokeWidth="2"
              />
              {checked.includes(i) && (
                <polyline
                  points="10,14 13,18 19,10"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </svg>
          </div>
        </div>
      ))}
      <button
        onClick={handleSave}
        style={{
          marginTop: 12,
          alignSelf: "flex-end",
          padding: "8px 32px",
          fontSize: 16,
          background: "#4f8cff",
          color: "#fff",
          border: "none",
          borderRadius: 4,
          cursor: "pointer",
        }}
      >
        确认保存
      </button>
    </div>
  );
}
