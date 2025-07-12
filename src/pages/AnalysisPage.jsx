import React, { useState, useCallback } from "react";
import { Tree } from "react-arborist";
import { useLocation } from "react-router-dom";
import Prism from "prismjs";
import "prismjs/themes/prism.css";
import "prismjs/components/prism-java";

// AnalysisPage: 文件树+方法选择+源码+路径分析
export default function AnalysisPage() {
  // 从上传页跳转时带入 sessionId 和 fileTree
  const location = useLocation();
  const { sessionId, fileTree } = location.state || {};

  // 状态管理
  const [selectedFile, setSelectedFile] = useState(null); // 选中的文件路径
  const [methodList, setMethodList] = useState([]); // 方法列表
  const [selectedMethod, setSelectedMethod] = useState(""); // 选中方法
  const [sourceCode, setSourceCode] = useState(""); // 方法源码
  const [paths, setPaths] = useState([]); // 路径分析结果
  const [loadingMethods, setLoadingMethods] = useState(false);
  const [loadingSource, setLoadingSource] = useState(false);
  const [loadingPaths, setLoadingPaths] = useState(false);

  // 拉取方法列表（传 filePath，避免闭包问题）
  const handleShowMethods = useCallback(
    async (filePath) => {
      console.log(
        "handleShowMethods 参数 filePath:",
        filePath,
        "sessionId:",
        sessionId
      );
      if (
        !filePath ||
        !filePath.toLowerCase().endsWith(".java") ||
        loadingMethods
      ) {
        return;
      }
      setLoadingMethods(true);
      setMethodList([]);
      setSelectedMethod("");
      setSourceCode("");
      setPaths([]);
      try {
        const formData = new FormData();
        formData.append("sessionId", sessionId);
        formData.append("filePath", filePath);
        const res = await fetch("http://localhost:8000/api/list-methods", {
          method: "POST",
          body: formData,
        });
        if (res.ok) {
          const data = await res.json();
          if (data.error) {
            console.log("方法列表接口返回错误：", data.error);
            setMethodList([]);
            setSourceCode("获取方法列表失败：" + data.error);
          } else {
            console.log("方法列表：", data.methods);
            setMethodList(data.methods || []);
          }
        } else {
          console.log("方法列表接口 HTTP 错误");
          setMethodList([]);
          setSourceCode("获取方法列表失败");
        }
      } catch (err) {
        console.log("方法列表接口异常：", err);
        setMethodList([]);
        setSourceCode("获取方法列表失败");
      } finally {
        setLoadingMethods(false);
      }
    },
    [sessionId, loadingMethods]
  );
  // 文件树点击，只选中文件，不请求后端
  const handleFileClick = useCallback(
    (fileNode) => {
      if (!fileNode.isDir) {
        setSelectedFile(fileNode.path);
        setSelectedMethod("");
        setSourceCode("");
        setPaths([]);
        setMethodList([]);
        // 自动拉取方法列表
        if (fileNode.path && fileNode.path.toLowerCase().endsWith(".java")) {
          console.log("handleFileClick 选中文件", fileNode);
          // 兼容绝对路径和相对路径，提取 uploads/{sessionId}/ 后的相对路径
          let relPath = fileNode.path;
          const uploadsPrefix = `uploads${
            window?.process?.platform === "win32" ? "\\" : "/"
          }${sessionId}${window?.process?.platform === "win32" ? "\\" : "/"}`;
          if (relPath.startsWith(uploadsPrefix)) {
            relPath = relPath.slice(uploadsPrefix.length);
          } else {
            // 兼容 /uploads/sessionId/xxx 或 \\uploads\\sessionId\\xxx
            relPath = relPath.replace(
              new RegExp(`^.*uploads[\\\\/]${sessionId}[\\\\/]`),
              ""
            );
          }
          console.log("handleFileClick 传递给后端的 filePath:", relPath);
          handleShowMethods(relPath);
        }
      }
    },
    [
      setSelectedFile,
      setSelectedMethod,
      setSourceCode,
      setPaths,
      setMethodList,
      handleShowMethods,
    ]
  );

  // 用 useCallback 保证 <Tree> 相关函数引用稳定
  const handleTreeSelect = useCallback(
    (nodes) => {
      // 只处理单选
      if (nodes && nodes.length === 1 && !nodes[0].data.isDir) {
        handleFileClick(nodes[0].data);
      }
    },
    [handleFileClick]
  );

  const renderTreeNode = useCallback(
    ({ node, style, dragHandle, isSelected }) => (
      <div
        style={{
          ...style,
          display: "flex",
          alignItems: "center",
          fontSize: 15,
          background: isSelected ? "#e6f0ff" : "transparent",
          borderRadius: 4,
          fontWeight: isSelected ? 600 : 400,
          color: isSelected ? "#2563eb" : "#222",
          cursor: "pointer",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          maxWidth: 420,
          paddingLeft: node.level * 16,
          overflowX: "auto",
          borderLeft: isSelected
            ? "4px solid #2563eb"
            : "4px solid transparent",
          boxShadow: isSelected ? "0 0 0 2px #b3d4fc" : "none",
          transition: "all 0.15s",
        }}
        ref={dragHandle}
        title={node.data.name}
        onClick={() => {
          if (node.data.isDir) {
            node.toggle();
          } else {
            handleFileClick(node.data);
          }
        }}
      >
        {/* vscode风格icon */}
        {node.data.isDir ? (
          <span style={{ marginRight: 6, color: "#b58900" }}>📂</span>
        ) : node.data.name && node.data.name.toLowerCase().endsWith(".java") ? (
          <>
            <span style={{ marginRight: 6, color: "#e76f00" }}>☕</span>
            {isSelected && (
              <span style={{ marginRight: 4, color: "#1bc47d", fontSize: 16 }}>
                ✔
              </span>
            )}
          </>
        ) : (
          <span style={{ marginRight: 6, color: "#268bd2" }}>📄</span>
        )}
        <span
          style={{
            display: "inline-block",
            maxWidth: 800,
            overflowX: "auto",
            whiteSpace: "nowrap",
            verticalAlign: "middle",
          }}
        >
          {node.data.name}
        </span>
      </div>
    ),
    [handleFileClick]
  );

  // 显示源码按钮点击，拉取源码
  const handleShowSource = useCallback(async () => {
    if (
      !selectedFile ||
      !selectedFile.toLowerCase().endsWith(".java") ||
      !selectedMethod
    )
      return;
    setLoadingSource(true);
    setSourceCode("");
    setPaths([]);
    try {
      const formData = new FormData();
      formData.append("sessionId", sessionId);
      formData.append("filePath", selectedFile);
      formData.append("methodName", selectedMethod);
      const res = await fetch("http://localhost:8000/api/get-method-source", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        if (data.error) {
          setSourceCode("获取源码失败：" + data.error);
        } else {
          setSourceCode(data.source || "");
        }
      } else {
        setSourceCode("获取源码失败");
      }
    } catch {
      setSourceCode("获取源码失败");
    } finally {
      setLoadingSource(false);
    }
  }, [selectedFile, selectedMethod, sessionId]);

  // 方法选择
  const handleMethodSelect = useCallback((e) => {
    const method = e.target.value;
    setSelectedMethod(method);
    setSourceCode("");
    setPaths([]);
  }, []);

  // 路径分析
  const handleAnalyzePaths = async () => {
    setLoadingPaths(true);
    try {
      const res = await fetch(
        `http://localhost:8000/api/analyze-paths?sessionId=${encodeURIComponent(
          sessionId
        )}&filePath=${encodeURIComponent(
          selectedFile
        )}&methodName=${encodeURIComponent(selectedMethod)}`
      );
      if (res.ok) {
        const data = await res.json();
        setPaths(data.paths || []);
      } else {
        setPaths([]);
      }
    } catch {
      setPaths([]);
    } finally {
      setLoadingPaths(false);
    }
  };

  // 优化：根节点始终显示，且目录节点自动加 isDir: true
  function addIdToTreeFixed(node) {
    if (!node) return node;
    const id = node.path || node.name;
    let children = [];
    let isDir = node.isDir;
    if (Array.isArray(node.children) && node.children.length > 0) {
      children = node.children.map((child) => addIdToTreeFixed(child));
      isDir = true; // 有 children 的节点强制为目录
    }
    return { ...node, id, children, isDir };
  }
  let treeData = [];
  if (fileTree && Array.isArray(fileTree.children)) {
    // 如果根目录下只有一个文件夹，则只显示该文件夹为根
    const onlyOneDir =
      fileTree.children.length === 1 && fileTree.children[0].isDir;
    if (onlyOneDir) {
      treeData = [addIdToTreeFixed(fileTree.children[0])];
    } else {
      treeData = fileTree.children.map(addIdToTreeFixed);
    }
  } else if (Array.isArray(fileTree)) {
    treeData = fileTree.map(addIdToTreeFixed);
  } else if (fileTree) {
    treeData = [addIdToTreeFixed(fileTree)];
  }

  // 文件树数据为空时提示
  if (!fileTree || !sessionId) {
    return (
      <div style={{ padding: 48, fontSize: 18, color: "#888" }}>
        请先上传压缩包并进入分析页面
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        background: "#f8faff",
      }}
    >
      {/* 左侧：文件树+方法选择+源码 */}
      <div
        style={{
          flex: 1.2,
          padding: "48px 32px 48px 64px",
          borderRight: "1px solid #e0e6ef",
          display: "flex",
          flexDirection: "column",
          gap: 32,
        }}
      >
        <div>
          <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>
            选择源文件
          </div>
          <div
            style={{
              background: "#fafdff",
              border: "1px solid #e0e6ef",
              borderRadius: 6,
              padding: 12,
              minHeight: 320,
              maxHeight: 420,
              overflow: "auto",
            }}
          >
            <Tree
              initialData={treeData || []}
              height={320}
              width={520}
              rowHeight={32}
              disableMultiSelection
              openByDefault={false}
              indent={16}
              onSelect={handleTreeSelect}
              selected={selectedFile ? [selectedFile] : undefined}
              selectionMode="single"
            >
              {renderTreeNode}
            </Tree>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>
            选择方法
          </div>
          {selectedFile && selectedFile.toLowerCase().endsWith(".java") && (
            <div
              style={{
                marginBottom: 8,
                fontSize: 15,
                color: "#2563eb",
                wordBreak: "break-all",
                background: "#fafdff",
                border: "1px solid #e0e6ef",
                borderRadius: 4,
                padding: "6px 10px",
                fontWeight: 500,
              }}
            >
              已选文件：{selectedFile}
            </div>
          )}
          <select
            value={selectedMethod}
            onChange={handleMethodSelect}
            style={{
              width: "100%",
              fontSize: 16,
              padding: "8px 12px",
              border: "1px solid #bfc8da",
              borderRadius: 4,
              outline: "none",
              background:
                !selectedFile || !selectedFile.toLowerCase().endsWith(".java")
                  ? "#f3f6fa"
                  : "#fff",
              marginBottom: 12,
            }}
            disabled={
              !selectedFile ||
              !selectedFile.toLowerCase().endsWith(".java") ||
              loadingMethods
            }
          >
            <option value="">
              {loadingMethods
                ? "加载方法列表中..."
                : !selectedFile || !selectedFile.toLowerCase().endsWith(".java")
                ? "请先选择Java文件"
                : "请选择方法"}
            </option>
            {methodList.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <button
            onClick={handleShowSource}
            disabled={
              !selectedFile ||
              !selectedFile.toLowerCase().endsWith(".java") ||
              loadingMethods
            }
            style={{
              padding: "8px 20px",
              fontSize: 15,
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              cursor:
                !selectedFile ||
                !selectedFile.toLowerCase().endsWith(".java") ||
                loadingMethods
                  ? "not-allowed"
                  : "pointer",
              opacity:
                !selectedFile ||
                !selectedFile.toLowerCase().endsWith(".java") ||
                loadingMethods
                  ? 0.6
                  : 1,
            }}
          >
            {loadingMethods ? "加载中..." : "显示源码"}
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
              overflowX: "auto",
            }}
          >
            {loadingSource ? (
              "正在加载源码..."
            ) : sourceCode ? (
              <pre style={{ margin: 0 }}>
                <code
                  className="language-java"
                  ref={(el) => {
                    if (el) Prism.highlightElement(el);
                  }}
                >
                  {sourceCode}
                </code>
              </pre>
            ) : (
              "请先选择方法"
            )}
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

// 路径图片列表组件（保持原样）
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
        请先选择方法并显示源码后可进行路径分析
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
