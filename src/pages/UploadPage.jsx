import React, { useRef, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

// 后端服务URL
// const BACKEND_URL = "http://localhost:8000";

const ACCEPTED_TYPES = ".zip,.rar,.7z,.tar,.gz";

export default function UploadPage() {
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // 新增：多个压缩包下载列表
  const [downloadList, setDownloadList] = useState([]);

  // 新增：保存所有分析结果的原始数据，用于传回分析页面
  const [resultsData, setResultsData] = useState([]);

  // 新增：强制显示初始上传界面
  const [forceInitialView, setForceInitialView] = useState(false);

  // 新增：选中的下载项
  const [selectedDownloads, setSelectedDownloads] = useState({});
  // 新增：是否全选
  const [selectAll, setSelectAll] = useState(false);
  // 新增：批量下载中
  const [batchDownloading, setBatchDownloading] = useState(false);

  // 从state中获取更多信息
  const fromAnalysis = location.state?.fromAnalysis || false;
  const receivedFileName = location.state?.fileName || "";
  const receivedSessionId = location.state?.sessionId || "";

  // 处理接收到的压缩包信息
  useEffect(() => {
    // 如果强制显示初始界面，则跳过处理
    if (forceInitialView) return;

    // 添加日志，检查收到的文件名
    console.log("UploadPage接收到的状态:", {
      receivedFileName,
      receivedSessionId,
      fromAnalysis,
      zipUrl: location.state?.zipUrl,
      zipName: location.state?.zipName,
      currentFileName: fileName,
      locationState: location.state,
      multipleResults: location.state?.multipleResults,
      resultsCount: location.state?.results?.length,
    });

    // 确保设置有意义的文件名，而不是sessionId
    if (receivedFileName) {
      // 检查receivedFileName是否看起来像UUID/sessionId
      const looksLikeSessionId =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          receivedFileName
        );

      if (looksLikeSessionId) {
        // 如果看起来像sessionId，尝试使用更有意义的名称
        if (location.state?.originalFileName) {
          setFileName(location.state.originalFileName);
        } else {
          setFileName("上传的压缩包");
        }
      } else {
        // 正常设置文件名
        setFileName(receivedFileName);
      }
    } else if (location.state?.currentSession?.fileName) {
      // 如果有当前会话信息，使用其文件名
      setFileName(location.state.currentSession.fileName);
    }

    // 处理多个分析结果
    if (
      location.state?.multipleResults &&
      Array.isArray(location.state.results)
    ) {
      // 保存原始结果数据，用于传回分析页面
      setResultsData(location.state.results);

      // 添加多个分析结果到下载列表
      const newResults = location.state.results.map((result) => ({
        url: result.zipUrl,
        name: result.zipName,
        fileName: result.fileName || "未命名项目",
        methodName: result.methodName || "",
        filePath: result.filePath || "",
        addedTime: new Date(result.timestamp || Date.now()).toLocaleString(),
        sessionId: result.sessionId,
        uniqueId:
          result.uniqueId ||
          `${result.methodName}_${result.timestamp || Date.now()}`,
        selectedPathsCount: result.selectedPathsCount || 0,
        pathsInfo: result.pathsInfo || [],
        analysisTime:
          result.analysisTime ||
          new Date(result.timestamp || Date.now()).toLocaleString(),
      }));

      setDownloadList((prevList) => {
        // 创建一个新列表，不检查URL重复，而是使用uniqueId
        const updatedList = [...prevList];

        // 添加新的结果
        newResults.forEach((newItem) => {
          // 检查是否已存在相同uniqueId的结果
          const existingIndex = updatedList.findIndex(
            (item) => item.uniqueId === newItem.uniqueId
          );
          if (existingIndex >= 0) {
            // 如果已存在，替换它
            updatedList[existingIndex] = newItem;
          } else {
            // 如果不存在，添加到列表开头
            updatedList.unshift(newItem);
          }
        });

        return updatedList;
      });
    }
    // 处理单个分析结果
    else if (location.state?.zipUrl && location.state?.zipName) {
      // 保存单个结果到结果数据
      setResultsData([location.state]);

      const newZipInfo = {
        url: location.state.zipUrl,
        name: location.state.zipName,
        fileName: receivedFileName || "未命名项目",
        methodName: location.state?.methodName || "",
        filePath: location.state?.filePath || "",
        addedTime: new Date(
          location.state?.timestamp || Date.now()
        ).toLocaleString(),
        sessionId: location.state?.sessionId,
      };

      // 检查是否已存在相同URL的压缩包
      setDownloadList((prevList) => {
        // 检查是否已存在相同URL的压缩包
        const existingIndex = prevList.findIndex(
          (item) => item.url === newZipInfo.url
        );

        if (existingIndex >= 0) {
          // 如果已存在，替换它
          const newList = [...prevList];
          newList[existingIndex] = newZipInfo;
          return newList;
        } else {
          // 如果不存在，添加到列表开头
          return [newZipInfo, ...prevList];
        }
      });
    }
  }, [
    receivedFileName,
    fileName,
    fromAnalysis,
    receivedSessionId,
    location.state,
    forceInitialView,
  ]);

  // 从localStorage恢复会话的分析结果
  useEffect(() => {
    // 如果强制显示初始界面，则跳过处理
    if (forceInitialView) return;

    // 尝试从localStorage加载之前保存的分析结果
    if (receivedSessionId || location.state?.currentSession?.sessionId) {
      const sessionToUse =
        location.state?.currentSession?.sessionId || receivedSessionId;
      const savedResults = localStorage.getItem(
        `analysis_results_${sessionToUse}`
      );

      if (savedResults) {
        try {
          const parsedResults = JSON.parse(savedResults);
          if (Array.isArray(parsedResults) && parsedResults.length > 0) {
            console.log(
              `[DEBUG] 从localStorage加载了${parsedResults.length}个分析结果`
            );

            // 合并到当前结果中
            setResultsData((prevData) => {
              // 避免重复，使用uniqueId而不是URL
              const combinedResults = [...prevData];
              parsedResults.forEach((result) => {
                // 为旧数据生成uniqueId（如果没有）
                const resultId =
                  result.uniqueId ||
                  `${result.methodName}_${result.timestamp || Date.now()}`;

                if (
                  !combinedResults.some(
                    (r) =>
                      r.uniqueId === resultId ||
                      (r.methodName === result.methodName &&
                        r.timestamp === result.timestamp &&
                        r.zipUrl === result.zipUrl)
                  )
                ) {
                  // 确保有uniqueId
                  combinedResults.push({
                    ...result,
                    uniqueId: resultId,
                    selectedPathsCount: result.selectedPathsCount || 0,
                    pathsInfo: result.pathsInfo || [],
                    analysisTime:
                      result.analysisTime ||
                      new Date(result.timestamp || Date.now()).toLocaleString(),
                  });
                }
              });
              return combinedResults;
            });

            // 更新下载列表
            const newResults = parsedResults.map((result) => {
              // 为旧数据生成uniqueId（如果没有）
              const uniqueId =
                result.uniqueId ||
                `${result.methodName}_${result.timestamp || Date.now()}`;

              return {
                url: result.zipUrl,
                name: result.zipName,
                fileName: result.fileName || "未命名项目",
                methodName: result.methodName || "",
                filePath: result.filePath || "",
                addedTime: new Date(
                  result.timestamp || Date.now()
                ).toLocaleString(),
                sessionId: result.sessionId,
                uniqueId,
                selectedPathsCount: result.selectedPathsCount || 0,
                pathsInfo: result.pathsInfo || [],
                analysisTime:
                  result.analysisTime ||
                  new Date(result.timestamp || Date.now()).toLocaleString(),
              };
            });

            setDownloadList((prevList) => {
              const updatedList = [...prevList];
              newResults.forEach((newItem) => {
                // 使用uniqueId检查重复
                if (
                  !updatedList.some(
                    (item) => item.uniqueId === newItem.uniqueId
                  )
                ) {
                  updatedList.push(newItem);
                }
              });
              return updatedList;
            });
          }
        } catch (err) {
          console.error("解析保存的分析结果出错:", err);
        }
      }
    }
  }, [receivedSessionId, location.state?.currentSession, forceInitialView]);

  // 重新分析按钮处理函数
  const handleReAnalyze = () => {
    // 优先使用当前会话信息
    if (location.state?.currentSession?.sessionId) {
      navigate("/analysis", {
        state: {
          sessionId: location.state.currentSession.sessionId,
          originalFileName: location.state.currentSession.fileName,
          fileTree: location.state.currentSession.fileTree,
          previousResults: resultsData, // 传递之前的分析结果
        },
      });
    } else if (receivedSessionId) {
      // 获取可能存在的文件树数据
      const savedFileTree = location.state?.fileTree;

      navigate("/analysis", {
        state: {
          sessionId: receivedSessionId,
          originalFileName: receivedFileName,
          fileTree: savedFileTree, // 传递保存的文件树数据
          previousResults: resultsData, // 传递之前的分析结果
        },
      });
    }
  };

  // 清空下载列表
  const handleClearDownloadList = () => {
    if (
      window.confirm("确定要清空所有下载项吗？这将同时清除保存的分析结果。")
    ) {
      setDownloadList([]);
      setResultsData([]);
      setSelectedDownloads({}); // 清空选中状态
      setSelectAll(false);

      // 清除localStorage中的数据
      if (receivedSessionId) {
        localStorage.removeItem(`analysis_results_${receivedSessionId}`);
      }
      if (location.state?.currentSession?.sessionId) {
        localStorage.removeItem(
          `analysis_results_${location.state.currentSession.sessionId}`
        );
      }
    }
  };

  // 新增：重置上传界面，清除所有下载列表
  const handleResetUpload = () => {
    if (window.confirm("上传新压缩包将清除当前所有分析结果，确定继续吗？")) {
      // 清除所有状态
      setDownloadList([]);
      setResultsData([]);
      setFileName("");
      setSelectedDownloads({}); // 清空选中状态
      setSelectAll(false);

      // 清除localStorage中的数据
      if (receivedSessionId) {
        localStorage.removeItem(`analysis_results_${receivedSessionId}`);
      }
      if (location.state?.currentSession?.sessionId) {
        localStorage.removeItem(
          `analysis_results_${location.state.currentSession.sessionId}`
        );
      }

      // 强制显示初始上传界面
      setForceInitialView(true);

      // 重置页面状态，清除location.state
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 保存原始文件名
    const originalFileName = file.name;
    setFileName(originalFileName);
    setUploading(true);

    // 真正上传到后端
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        // 新增：获取后端返回的 sessionId 和 fileTree
        const data = await res.json();
        console.log("[DEBUG] upload API 返回数据:", data);
        console.log("[DEBUG] fileTree结构:", {
          fileTree_type: typeof data.fileTree,
          has_children: data.fileTree?.children?.length > 0,
          children_count: data.fileTree?.children?.length || 0,
          first_child: data.fileTree?.children?.[0] || null,
        });
        if (data.sessionId && data.fileTree) {
          // 上传新文件时清空之前的分析结果
          setDownloadList([]);
          setResultsData([]);
          setSelectedDownloads({}); // 清空选中状态
          setSelectAll(false);

          navigate("/analysis", {
            state: {
              sessionId: data.sessionId,
              fileTree: data.fileTree,
              originalFileName: originalFileName, // 传递原始文件名
            },
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

  // 处理全选/取消全选
  const handleSelectAll = () => {
    if (selectAll) {
      // 取消全选
      setSelectedDownloads({});
      setSelectAll(false);
    } else {
      // 全选
      const newSelected = {};
      downloadList.forEach((item) => {
        newSelected[item.uniqueId || item.url] = true;
      });
      setSelectedDownloads(newSelected);
      setSelectAll(true);
    }
  };

  // 处理单个选择
  const handleSelectItem = (itemId) => {
    setSelectedDownloads((prev) => {
      const newSelected = { ...prev };
      if (newSelected[itemId]) {
        delete newSelected[itemId];
        setSelectAll(false);
      } else {
        newSelected[itemId] = true;
        // 检查是否全部选中
        if (Object.keys(newSelected).length === downloadList.length) {
          setSelectAll(true);
        }
      }
      return newSelected;
    });
  };

  // 批量下载选中的文件
  const handleBatchDownload = async () => {
    const selectedItems = downloadList.filter(
      (item) => selectedDownloads[item.uniqueId || item.url]
    );

    if (selectedItems.length === 0) {
      alert("请先选择要下载的文件");
      return;
    }

    setBatchDownloading(true);

    try {
      // 如果只选择了一个文件，直接触发下载
      if (selectedItems.length === 1) {
        const link = document.createElement("a");
        link.href = selectedItems[0].url;
        link.download = selectedItems[0].name || "分析结果.zip";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setBatchDownloading(false);
        return;
      }

      // 如果选择了多个文件，使用iframe依次下载
      for (let i = 0; i < selectedItems.length; i++) {
        const item = selectedItems[i];
        const iframe = document.createElement("iframe");
        iframe.style.display = "none";
        document.body.appendChild(iframe);

        // 等待一小段时间后开始下一个下载，避免浏览器阻止
        await new Promise((resolve) => {
          setTimeout(() => {
            iframe.src = item.url;
            resolve();
          }, 1000);
        });

        // 等待下载开始
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (err) {
      console.error("批量下载出错:", err);
      alert("批量下载过程中出现错误");
    } finally {
      setBatchDownloading(false);
    }
  };

  // 渲染下载列表项
  const renderDownloadItem = (item, index) => {
    const itemId = item.uniqueId || item.url;
    const isSelected = !!selectedDownloads[itemId];

    // 处理路径信息显示 - 显示路径编号而不是文件路径
    const renderPathsInfo = () => {
      if (!item.pathsInfo || item.pathsInfo.length === 0) {
        return null;
      }

      // 提取所有路径的索引号
      const pathIndices = item.pathsInfo
        .map((path) => path.index)
        .filter(Boolean);

      // 如果没有索引号，则使用数组索引+1作为路径编号
      if (pathIndices.length === 0 && item.selectedPathsCount > 0) {
        return (
          <div style={{ marginTop: 4, fontSize: 13, color: "#555" }}>
            <div style={{ fontWeight: 500 }}>
              选择了 {item.selectedPathsCount} 条路径
            </div>
          </div>
        );
      }

      // 格式化路径编号显示
      let pathsDisplay = "";

      // 如果路径数量较少，直接显示所有编号
      if (pathIndices.length <= 10) {
        pathsDisplay = pathIndices.join(", ");
      } else {
        // 如果路径数量较多，显示前5个和后2个，中间用省略号
        const firstPaths = pathIndices.slice(0, 5).join(", ");
        const lastPaths = pathIndices.slice(-2).join(", ");
        pathsDisplay = `${firstPaths}, ... , ${lastPaths}`;
      }

      return (
        <div style={{ marginTop: 4, fontSize: 13, color: "#555" }}>
          <div style={{ fontWeight: 500 }}>
            选择了 {item.selectedPathsCount} 条路径:
            <span style={{ fontWeight: "normal", marginLeft: 4 }}>
              路径 {pathsDisplay}
            </span>
          </div>
        </div>
      );
    };

    return (
      <div
        key={`download-${index}-${itemId}`}
        style={{
          display: "flex",
          alignItems: "flex-start", // 改为顶部对齐，方便显示多行内容
          gap: 18,
          padding: "12px 16px",
          background: isSelected
            ? "rgba(79, 140, 255, 0.05)"
            : index % 2 === 0
            ? "#f7f9fc"
            : "transparent",
          borderRadius: 8,
          border: isSelected ? "1px solid #4f8cff" : "1px solid #e0e6ef",
          transition: "all 0.2s",
        }}
      >
        {/* 复选框 - 调整为顶部对齐 */}
        <div
          onClick={() => handleSelectItem(itemId)}
          style={{
            width: 20,
            height: 20,
            borderRadius: 4,
            border: isSelected ? "2px solid #4f8cff" : "2px solid #bfc8da",
            backgroundColor: isSelected ? "#4f8cff" : "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.2s",
            flexShrink: 0,
            marginTop: 4, // 稍微向下调整，与文本对齐
          }}
        >
          {isSelected && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"
                fill="#fff"
              />
            </svg>
          )}
        </div>

        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 16,
              color: "#222",
              fontWeight: 500,
              marginBottom: 4,
            }}
          >
            {item.name || "分析结果.zip"}
          </div>
          <div style={{ fontSize: 14, color: "#666" }}>
            {item.fileName}
            {item.methodName ? ` - ${item.methodName}` : ""}
            {item.filePath ? ` (${item.filePath})` : ""}
          </div>

          {/* 显示路径信息 */}
          {renderPathsInfo()}

          <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
            分析时间: {item.analysisTime || item.addedTime}
          </div>
        </div>
        <a
          href={item.url}
          download={item.name || "分析结果.zip"}
          style={{
            padding: "6px 18px",
            fontSize: 15,
            background: "#4f8cff",
            color: "#fff",
            borderRadius: 6,
            textDecoration: "none",
            marginLeft: 8,
            flexShrink: 0,
            alignSelf: "center", // 垂直居中
          }}
        >
          下载
        </a>
      </div>
    );
  };

  // 如果强制显示初始界面，则直接返回初始上传界面
  if (forceInitialView) {
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

  // 判断是否有下载列表或从分析页面返回
  if (
    downloadList.length > 0 ||
    location.state?.zipUrl ||
    location.state?.multipleResults
  ) {
    // 计算选中的项目数量
    const selectedCount = Object.keys(selectedDownloads).length;

    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "row",
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
            minHeight: "100vh",
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
              padding: "0 20px",
              maxWidth: 320,
            }}
          >
            {fileName ? fileName : "未选择压缩包"}
          </div>
          {/* 操作按钮区域 */}
          <div
            style={{
              marginTop: 12,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {(receivedSessionId ||
              location.state?.currentSession?.sessionId) && (
              <button
                style={{
                  padding: "10px 22px",
                  fontSize: 15,
                  borderRadius: 7,
                  border: "none",
                  background: "#4f8cff",
                  color: "white",
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(60,80,180,0.08)",
                  transition: "background 0.2s",
                  width: 200,
                }}
                onClick={handleReAnalyze}
              >
                继续分析
              </button>
            )}
            <button
              style={{
                padding: "10px 22px",
                fontSize: 15,
                borderRadius: 7,
                border: "none",
                background: "#e0e6ef",
                color: "#4f8cff",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(60,80,180,0.08)",
                transition: "background 0.2s",
                width: 200,
              }}
              onClick={handleResetUpload}
            >
              上传新压缩包
            </button>
            {downloadList.length > 0 && (
              <>
                <button
                  style={{
                    padding: "10px 22px",
                    fontSize: 15,
                    borderRadius: 7,
                    border: "none",
                    background: selectedCount > 0 ? "#1bc47d" : "#e0e6ef",
                    color: selectedCount > 0 ? "white" : "#888",
                    cursor: selectedCount > 0 ? "pointer" : "not-allowed",
                    boxShadow: "0 2px 8px rgba(60,80,180,0.08)",
                    transition: "background 0.2s",
                    width: 200,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  onClick={handleBatchDownload}
                  disabled={selectedCount === 0 || batchDownloading}
                >
                  {batchDownloading ? (
                    <>
                      <span
                        style={{
                          display: "inline-block",
                          width: 16,
                          height: 16,
                          borderRadius: "50%",
                          border: "2px solid rgba(255,255,255,0.3)",
                          borderTopColor: "white",
                          animation: "spin 1s linear infinite",
                          marginRight: 8,
                        }}
                      />
                      下载中...
                    </>
                  ) : (
                    `批量下载 (${selectedCount})`
                  )}
                </button>
                <button
                  style={{
                    padding: "10px 22px",
                    fontSize: 15,
                    borderRadius: 7,
                    border: "1px solid #ff6b6b",
                    background: "#fff",
                    color: "#ff6b6b",
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(60,80,180,0.08)",
                    transition: "background 0.2s",
                    width: 200,
                  }}
                  onClick={handleClearDownloadList}
                >
                  清空下载列表
                </button>
              </>
            )}
          </div>
        </div>
        {/* 右侧：可下载分析结果 */}
        <div
          style={{
            flex: 1,
            padding: "48px 64px",
            display: "flex",
            flexDirection: "column",
            gap: 32,
          }}
        >
          <div
            style={{
              fontSize: 22,
              fontWeight: 600,
              marginBottom: 18,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>可下载分析结果 ({downloadList.length})</span>

            {downloadList.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  onClick={handleSelectAll}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    cursor: "pointer",
                    userSelect: "none",
                    fontSize: 16,
                  }}
                >
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      border: selectAll
                        ? "2px solid #4f8cff"
                        : "2px solid #bfc8da",
                      backgroundColor: selectAll ? "#4f8cff" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 8,
                      transition: "all 0.2s",
                    }}
                  >
                    {selectAll && (
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"
                          fill="#fff"
                        />
                      </svg>
                    )}
                  </div>
                  全选
                </div>
              </div>
            )}
          </div>

          {/* 添加CSS动画 */}
          <style>
            {`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}
          </style>

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
              maxHeight: "calc(100vh - 200px)",
              overflowY: "auto",
            }}
          >
            {downloadList.length === 0 ? (
              <div style={{ color: "#888", fontSize: 16, padding: "20px 0" }}>
                暂无可下载的分析结果
              </div>
            ) : (
              downloadList.map((item, index) => renderDownloadItem(item, index))
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
