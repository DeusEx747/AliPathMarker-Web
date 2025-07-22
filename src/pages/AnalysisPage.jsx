import React, { useState, useCallback, useRef, useEffect } from "react";
import { Tree } from "react-arborist";
import { useLocation, useNavigate } from "react-router-dom";
import Prism from "prismjs";
import "prismjs/themes/prism.css";
import "prismjs/components/prism-java";
import ImageViewer from "../components/ImageViewer";

// 拖拽分隔条组件
function DragHandle({ onDrag, position = "right", onDoubleClick }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const handleRef = useRef(null);

  // 处理鼠标按下事件，开始拖动
  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  // 处理双击事件
  const handleDblClick = useCallback(
    (e) => {
      if (onDoubleClick) {
        e.preventDefault();
        onDoubleClick();
      }
    },
    [onDoubleClick]
  );

  // 处理鼠标悬停
  const handleMouseEnter = useCallback(() => {
    setIsHovering(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
  }, []);

  // 添加全局鼠标移动和鼠标释放事件监听
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      onDrag(e.clientX);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, onDrag]);

  // 定义分隔条的样式
  const handleStyle = {
    position: "absolute",
    top: 0,
    [position]: -4,
    width: 8,
    height: "100%",
    cursor: "col-resize",
    backgroundColor: "transparent",
    zIndex: 10,
  };

  const lineStyle = {
    position: "absolute",
    top: 0,
    bottom: 0,
    [position === "right" ? "left" : "right"]: 2,
    width: 4,
    backgroundColor: isDragging
      ? "#4f8cff"
      : isHovering
      ? "#a0b8f8"
      : "#e0e6ef",
    transition: isDragging ? "none" : "background-color 0.2s",
  };

  const hoverOverlayStyle = {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: isDragging
      ? "rgba(79, 140, 255, 0.1)"
      : isHovering
      ? "rgba(0, 0, 0, 0.05)"
      : "transparent",
    transition: "background-color 0.2s",
  };

  return (
    <div
      ref={handleRef}
      style={handleStyle}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDblClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div style={lineStyle} />
      <div style={hoverOverlayStyle} />
    </div>
  );
}

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
  const [loadingMethods, setLoadingMethods] = useState(false);
  const [loadingSource, setLoadingSource] = useState(false);

  // 新增：主控流图和分路径分析结果
  const [analysisResult, setAnalysisResult] = useState(null); // {all_image, paths: [{image_url, ...}]}
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedPaths, setSelectedPaths] = useState([]); // [{png, json, dot}]
  const [downloading, setDownloading] = useState(false);
  const navigate = useNavigate();

  // 新增: 查看原图相关状态
  const [modalImage, setModalImage] = useState(null);

  // 新增: 三栏宽度状态
  const [leftWidth, setLeftWidth] = useState(50); // 左侧栏宽度百分比
  const [rightWidth, setRightWidth] = useState(50); // 右侧栏宽度百分比
  const containerRef = useRef(null); // 容器ref，用于计算百分比

  // 新增: 保存成功后的弹窗状态
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [packageInfo, setPackageInfo] = useState(null); // 保存打包信息

  // 新增: 保存所有分析结果
  const [analysisResults, setAnalysisResults] = useState([]);

  // 新增: 从localStorage初始化分析结果
  useEffect(() => {
    // 从localStorage加载之前保存的分析结果
    const savedResults = localStorage.getItem(`analysis_results_${sessionId}`);
    if (savedResults) {
      try {
        const parsedResults = JSON.parse(savedResults);
        if (Array.isArray(parsedResults) && parsedResults.length > 0) {
          console.log(
            `[DEBUG] 从localStorage加载了${parsedResults.length}个分析结果`
          );
          setAnalysisResults(parsedResults);
        }
      } catch (err) {
        console.error("解析保存的分析结果出错:", err);
      }
    }

    // 从上传页面传递的已有结果中恢复
    if (
      location.state?.previousResults &&
      Array.isArray(location.state.previousResults)
    ) {
      console.log(
        `[DEBUG] 从上传页面恢复了${location.state.previousResults.length}个分析结果`
      );
      setAnalysisResults((prevResults) => {
        // 合并结果，避免重复
        const mergedResults = [...prevResults];
        location.state.previousResults.forEach((result) => {
          if (!mergedResults.some((r) => r.zipUrl === result.zipUrl)) {
            mergedResults.push(result);
          }
        });
        return mergedResults;
      });
    }
  }, [sessionId, location.state?.previousResults]);

  // 新增: 保存分析结果到localStorage
  useEffect(() => {
    if (sessionId && analysisResults.length > 0) {
      localStorage.setItem(
        `analysis_results_${sessionId}`,
        JSON.stringify(analysisResults)
      );
      console.log(
        `[DEBUG] 保存了${analysisResults.length}个分析结果到localStorage`
      );
    }
  }, [analysisResults, sessionId]);

  // 处理左侧拖拽条拖动
  const handleDrag = useCallback((clientX) => {
    if (!containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const leftPanelWidth = Math.max(
      20,
      Math.min(80, ((clientX - containerRect.left) / containerWidth) * 100)
    );

    // 调整左侧和右侧宽度，保持总宽度为100%
    const rightPanelWidth = 100 - leftPanelWidth;

    setLeftWidth(leftPanelWidth);
    setRightWidth(rightPanelWidth);
  }, []);

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
          console.log("[DEBUG] list-methods API 返回数据:", data);
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
    [setSelectedFile, setSelectedMethod, setSourceCode, handleShowMethods]
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
          overflow: "visible",
          paddingLeft: node.level * 16,
          borderLeft: isSelected
            ? "4px solid #2563eb"
            : "4px solid transparent",
          boxShadow: isSelected ? "0 0 0 2px #b3d4fc" : "none",
          transition: "all 0.15s",
          width: "auto",
          minWidth: "100%",
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
          <span style={{ marginRight: 6, color: "#b58900", flexShrink: 0 }}>
            📂
          </span>
        ) : node.data.name && node.data.name.toLowerCase().endsWith(".java") ? (
          <>
            <span
              style={{
                marginRight: 6,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
              }}
            >
              <img
                src="/icons8-java咖啡杯徽标.svg"
                alt="Java"
                style={{
                  width: 16,
                  height: 16,
                  objectFit: "contain",
                }}
              />
            </span>
            {isSelected && (
              <span
                style={{
                  marginRight: 4,
                  color: "#1bc47d",
                  fontSize: 16,
                  flexShrink: 0,
                }}
              >
                ✔
              </span>
            )}
          </>
        ) : (
          <span style={{ marginRight: 6, color: "#268bd2", flexShrink: 0 }}>
            📄
          </span>
        )}
        <span
          style={{
            display: "inline-block",
            whiteSpace: "nowrap",
            verticalAlign: "middle",
            flexShrink: 0,
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
        console.log("[DEBUG] get-method-source API 返回数据:", data);
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
  }, []);

  // 路径分析（重写，调用API，获取主控流图和分路径）
  const handleAnalyzePaths = async () => {
    setAnalyzing(true);
    // 清空之前的分析结果和选择
    setAnalysisResult(null);
    setSelectedPaths([]);
    // 记录时间戳用于图片防缓存
    const analysisTimestamp = Date.now();
    try {
      const form = new URLSearchParams();
      form.append("sessionId", sessionId);
      // 添加当前选中的文件和方法信息
      if (selectedFile) form.append("filePath", selectedFile);
      if (selectedMethod) form.append("methodName", selectedMethod);

      const res = await fetch("/api/analyze-paths", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form,
      });
      const data = await res.json();
      console.log("路径分析API返回数据:", data);
      // 简化日志输出，不关注尺寸数据
      console.log("[DEBUG] 路径分析API 返回结构:", {
        all_image_path: data.all_image,
        all_image_aspect_ratio: data.all_image_aspect_ratio,
        paths_count: data.paths?.length || 0,
        paths_files: data.paths_files?.length || 0,
        pictures_files: data.pictures_files?.length || 0,
        dots_files: data.dots_files?.length || 0,
      });

      // 缓存分析结果，以便在弹出框中使用
      window.analysisResultCache = data;

      if (data.error) {
        alert("分析失败：" + data.error);
        // 确保错误时也清空结果
        setAnalysisResult(null);
      } else {
        // 检查是否有路径数据
        if (!data.paths || data.paths.length === 0) {
          // 如果没有路径数据，设置一个带有提示的空结果
          setAnalysisResult({
            ...data,
            paths: [],
            noPathsFound: true,
          });
        } else {
          setAnalysisResult({ ...data, timestamp: analysisTimestamp });
        }
      }
    } catch (err) {
      alert("分析出错：" + err.message);
      // 确保错误时也清空结果
      setAnalysisResult(null);
    } finally {
      setAnalyzing(false);
    }
  };

  // 分路径勾选
  const handleSelectPath = (idx) => {
    if (!analysisResult || !analysisResult.paths) return;
    const pathObj = analysisResult.paths[idx];
    const exists = selectedPaths.find(
      (p) =>
        p.png === pathObj.image_url &&
        p.json === pathObj.path_json &&
        p.dot === pathObj.dot_file
    );
    if (exists) {
      setSelectedPaths(
        selectedPaths.filter(
          (p) =>
            !(
              p.png === pathObj.image_url &&
              p.json === pathObj.path_json &&
              p.dot === pathObj.dot_file
            )
        )
      );
    } else {
      setSelectedPaths([
        ...selectedPaths,
        {
          png: pathObj.image_url,
          json: pathObj.path_json,
          dot: pathObj.dot_file,
        },
      ]);
    }
  };

  // 确认保存（打包下载）- 修改此函数
  const handleConfirmSave = async () => {
    if (!sessionId) return;
    setDownloading(true);
    try {
      // 辅助函数：提取相对路径，避免重复路径
      const getRelativePath = (fullPath) => {
        if (!fullPath) return "";

        // 如果路径包含 sessionId，提取 sessionId 后面的部分
        const sessionIdIndex = fullPath.indexOf(sessionId);
        if (sessionIdIndex > -1) {
          // 找到 sessionId 后第一个 / 的位置
          const slashAfterSessionId = fullPath.indexOf(
            "/",
            sessionIdIndex + sessionId.length
          );
          if (slashAfterSessionId > -1) {
            return fullPath.substring(slashAfterSessionId + 1);
          }
        }

        // 如果路径包含 paths_img、paths_json 或 paths_dot，提取这些目录及之后的部分
        const pathTypes = ["paths_img", "paths_json", "paths_dot"];
        for (const pathType of pathTypes) {
          const pathTypeIndex = fullPath.indexOf(pathType);
          if (pathTypeIndex > -1) {
            return fullPath.substring(pathTypeIndex);
          }
        }

        // 无法提取，返回原始路径
        return fullPath;
      };

      const body = {
        sessionId,
        selected_paths: selectedPaths.map((p) => {
          const obj = {};
          // 提取正确的相对路径
          if (p.png) obj.png = getRelativePath(p.png);
          if (p.json) obj.json = getRelativePath(p.json);
          if (p.dot) obj.dot = getRelativePath(p.dot);
          return obj;
        }),
      };

      console.log("[DEBUG] 发送到打包API的路径数据:", body.selected_paths);

      const res = await fetch("/api/package-and-download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      console.log("[DEBUG] package-and-download API 返回数据:", data);
      console.log("[DEBUG] zip_url详情:", {
        url_value: data.zip_url,
        url_type: typeof data.zip_url,
        url_starts_with_slash: data.zip_url?.startsWith("/"),
        url_starts_with_http: data.zip_url?.startsWith("http"),
      });
      if (data.zip_url) {
        // 提取文件名
        const zipUrl = data.zip_url;
        const zipName = zipUrl.split("/").pop() || "分析结果.zip";

        // 从fileTree中提取文件名（如果可用）
        let originalFileName = "";

        // 添加日志，便于调试
        console.log("[DEBUG] 提取文件名前的数据:", {
          location_state: location.state,
          fileTree_name: fileTree?.name,
          sessionId,
        });

        // 尝试从location.state获取最初上传的文件名
        if (location.state && location.state.originalFileName) {
          originalFileName = location.state.originalFileName;
        }
        // 如果没有，尝试从fileTree获取
        else if (fileTree && fileTree.name) {
          originalFileName = fileTree.name;
        }
        // 如果上面两种方法都无法获取到文件名，尝试使用根文件夹的名称
        else if (
          fileTree &&
          Array.isArray(fileTree.children) &&
          fileTree.children.length > 0
        ) {
          const rootDir = fileTree.children.find((child) => child.isDir);
          if (rootDir && rootDir.name) {
            originalFileName = rootDir.name;
          }
        }

        // 如果原始文件名为空，使用一个默认名称
        if (!originalFileName) {
          originalFileName = "上传的压缩包";
        }

        // 检查提取出的文件名是否与sessionId相似
        const looksLikeSessionId =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            originalFileName
          );
        if (looksLikeSessionId) {
          // 如果文件名看起来像sessionId，使用默认名称
          originalFileName = "上传的压缩包";
        }

        // 添加日志，查看最终使用的文件名
        console.log("[DEBUG] 最终使用的原始文件名:", originalFileName);

        // 创建新的分析结果对象，添加唯一标识和选择的路径信息
        const timestamp = Date.now();
        const uniqueId = `${selectedMethod}_${timestamp}`;
        const pathsInfo = selectedPaths.map((p, idx) => ({
          index: idx + 1,
          png: p.png ? getRelativePath(p.png) : "",
          json: p.json ? getRelativePath(p.json) : "",
          dot: p.dot ? getRelativePath(p.dot) : "",
        }));

        const newResult = {
          zipUrl,
          zipName,
          fileName: originalFileName,
          fromAnalysis: true,
          sessionId,
          methodName: selectedMethod,
          filePath: selectedFile,
          timestamp,
          uniqueId,
          selectedPathsCount: selectedPaths.length,
          pathsInfo,
          analysisTime: new Date().toLocaleString(),
        };

        // 保存到分析结果列表，不再检查URL是否重复
        setAnalysisResults((prev) => [...prev, newResult]);

        // 保存打包信息，显示成功弹窗，而不是立即跳转
        setPackageInfo(newResult);
        setSaveSuccess(true);

        // 清空选择的路径，以便用户可以继续选择其他路径
        setSelectedPaths([]);
      } else if (data.error) {
        alert("打包失败：" + data.error);
      }
    } catch (err) {
      alert("打包出错：" + err.message);
    } finally {
      setDownloading(false);
    }
  };

  // 新增：前往下载页面，传递所有分析结果
  const handleGoToDownload = () => {
    if (analysisResults.length > 0) {
      navigate("/", {
        state: {
          multipleResults: true,
          results: analysisResults,
          currentSession: {
            sessionId,
            fileTree,
            fileName: location.state?.originalFileName || "上传的压缩包",
          },
        },
      });
    } else if (packageInfo) {
      navigate("/", {
        state: packageInfo,
      });
    }
  };

  // 新增：关闭成功提示
  const handleCloseSaveSuccess = () => {
    setSaveSuccess(false);
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

  const closeModal = () => {
    setModalImage(null);
  };

  // 查看原图
  const handleViewImage = (url) => {
    setModalImage(url);
  };

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
      ref={containerRef}
      style={{
        minHeight: "100vh",
        display: "flex",
        background: "#f8faff",
        overflow: "auto",
        position: "relative", // 为拖拽条提供定位基准
      }}
    >
      {/* 左侧：文件树+方法选择+源码+路径分析按钮 */}
      <div
        style={{
          width: `${leftWidth}%`,
          padding: "48px 32px 48px 48px", // 调整左右内边距为更合理的值
          borderRight: "1px solid #e0e6ef",
          display: "flex",
          flexDirection: "column",
          gap: 32,
          overflowX: "hidden", // 防止水平溢出
          position: "relative", // 为拖拽条提供定位基准
        }}
      >
        <div style={{ width: "100%" }}>
          <div
            style={{
              fontSize: 20,
              fontWeight: 600,
              marginBottom: 12,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>选择源文件</span>
            <button
              onClick={() => navigate("/")}
              style={{
                padding: "6px 12px",
                fontSize: 14,
                background: "#e0e6ef",
                color: "#4f8cff",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
              }}
            >
              <span style={{ marginRight: 4 }}>↩</span> 重新上传
            </button>
          </div>
          <div
            style={{
              background: "#fafdff",
              border: "1px solid #e0e6ef",
              borderRadius: 6,
              padding: 12,
              minHeight: 320,
              maxHeight: 420,
              width: "100%",
              overflow: "auto",
              position: "relative",
            }}
          >
            <Tree
              initialData={treeData || []}
              height={380}
              width="100%"
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
        <div style={{ width: "100%" }}>
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
                width: "100%", // 确保宽度占满
                overflow: "hidden", // 防止溢出
                textOverflow: "ellipsis", // 文本溢出时显示省略号
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
              width: "100%", // 按钮宽度占满
            }}
          >
            {loadingMethods ? "加载中..." : "显示源码"}
          </button>
        </div>
        <div style={{ width: "100%" }}>
          <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>
            方法源码
          </div>
          <div
            style={{
              minHeight: 200,
              maxHeight: "30vh",
              background: "#f3f6fa",
              border: "1px solid #e0e6ef",
              borderRadius: 4,
              padding: 16,
              fontFamily: "monospace",
              fontSize: 15,
              color: "#222",
              whiteSpace: "pre",
              overflowX: "auto",
              overflowY: "auto",
              width: "100%", // 确保宽度占满
            }}
          >
            {loadingSource ? (
              "正在加载源码..."
            ) : sourceCode ? (
              <pre style={{ margin: 0, maxWidth: "100%" }}>
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
            disabled={!sourceCode || analyzing}
            style={{
              marginTop: 16,
              padding: "8px 24px",
              fontSize: 16,
              background: "#1bc47d",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              cursor: !sourceCode || analyzing ? "not-allowed" : "pointer",
              opacity: !sourceCode || analyzing ? 0.6 : 1,
              width: "100%", // 按钮宽度占满
            }}
          >
            {analyzing ? "分析中..." : "路径分析"}
          </button>
        </div>

        {/* 左侧拖拽条 */}
        <DragHandle onDrag={handleDrag} position="right" />
      </div>

      {/* 右侧：路径分析 */}
      <div
        style={{
          width: `${rightWidth}%`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          padding: "32px 24px 24px 24px", // 减少顶部内边距
          position: "relative",
          overflowX: "hidden",
        }}
      >
        <div
          style={{
            fontSize: 22,
            fontWeight: 600,
            marginBottom: 16, // 减少下边距
            width: "100%",
            textAlign: "center",
          }}
        >
          路径分析
        </div>

        {/* 主控流图链接 */}
        {analysisResult && analysisResult.all_image && (
          <a
            href={"/" + analysisResult.all_image}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "block",
              width: "100%",
              textAlign: "center",
              padding: "8px 16px", // 减少内边距
              marginBottom: 20, // 减少下边距
              background: "#4f8cff",
              color: "#fff",
              borderRadius: 8,
              textDecoration: "none",
              fontWeight: 500,
              fontSize: 16,
              boxShadow: "0 2px 8px rgba(79, 140, 255, 0.3)",
              transition: "background 0.2s",
            }}
          >
            查看主控流图
          </a>
        )}

        {!analysisResult && (
          <div
            style={{
              color: "#888",
              fontSize: 18,
              marginBottom: 20, // 减少下边距
              width: "100%",
              textAlign: "center",
            }}
          >
            请先点击左侧"路径分析"按钮获取分析结果
          </div>
        )}

        {/* 分路径容器 - 水平排列但允许垂直滚动 */}
        <div
          style={{
            width: "100%",
            overflowX: "auto",
            overflowY: "auto", // 保留垂直滚动
            padding: 16,
            margin: "16px 0", // 减少上边距
            height: "auto",
            maxHeight: "calc(100vh - 180px)", // 增大最大高度，减少上下边距的限制
            border: "1px solid #e0e6ef",
            borderRadius: 8,
            backgroundColor: "#f9fafc",
            boxShadow: "inset 0 0 5px rgba(0,0,0,0.05)",
            flex: 1, // 添加flex属性，使容器占据剩余空间
          }}
        >
          <div
            style={{
              display: "flex", // 恢复水平flex布局
              flexDirection: "row", // 水平排列
              gap: 24,
              padding: "12px 8px", // 增加内边距
              minHeight: 400, // 增加最小高度
              width: "max-content", // 确保容器宽度能容纳所有项目
            }}
          >
            {analysisResult ? (
              analysisResult.paths && analysisResult.paths.length > 0 ? (
                analysisResult.paths.map((item, idx) => {
                  const checked = selectedPaths.find(
                    (p) =>
                      p.png === item.image_url &&
                      p.json === item.path_json &&
                      p.dot === item.dot_file
                  );

                  return (
                    <div
                      key={`path-${idx}-${item.image_url || Date.now()}`} // 确保key值唯一
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        background: "#fafdff",
                        border: "1px solid #e0e6ef",
                        borderRadius: 12,
                        boxShadow: checked ? "0 0 0 2px #4f8cff" : undefined,
                        width: 400, // 恢复固定宽度
                        minWidth: 400,
                        maxWidth: 420,
                        margin: "0",
                        position: "relative",
                        whiteSpace: "normal",
                        padding: 24,
                      }}
                    >
                      {/* 路径编号 */}
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 500,
                          color: "#333",
                          marginBottom: 8, // 减小底部间距
                          width: "100%",
                          textAlign: "center",
                        }}
                      >
                        路径 #{idx + 1}
                      </div>
                      {/* 图片容器 */}
                      <div
                        style={{
                          width: "100%",
                          overflow: "visible",
                          display: "flex",
                          justifyContent: "center",
                          margin: 12,
                          maxHeight: "none", // 确保不限制高度
                        }}
                      >
                        <img
                          src={
                            (item.image_url.startsWith("http")
                              ? item.image_url
                              : "/" + item.image_url) +
                            "?t=" +
                            (analysisResult?.timestamp || Date.now())
                          }
                          alt={`分路径图 #${idx + 1}`}
                          style={{
                            width: "100%",
                            height: "auto",
                            objectFit: "contain",
                            cursor: "pointer",
                            borderRadius: 6,
                            display: "block",
                            margin: "0 auto",
                            background: "#fff",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.1)", // 添加轻微阴影
                          }}
                          onClick={() =>
                            handleViewImage(
                              item.image_url.startsWith("http")
                                ? item.image_url
                                : "/" + item.image_url
                            )
                          }
                        />
                      </div>
                      {/* 勾选框放在图片下方，居中 */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          width: "100%",
                          marginTop: 4, // 微调顶部间距
                          marginBottom: "8px", // 调整底部间隔
                        }}
                      >
                        <div
                          style={{
                            cursor: "pointer",
                            padding: "5px", // 增加内边距，扩大点击区域
                            borderRadius: "50%", // 添加圆形边框
                            background: checked
                              ? "rgba(79, 140, 255, 0.1)"
                              : "transparent", // 选中时添加背景色
                            transition: "all 0.2s", // 添加过渡效果
                            transform: checked ? "scale(1.05)" : "scale(1)", // 选中时轻微放大
                          }}
                          onClick={() => handleSelectPath(idx)}
                        >
                          <svg width="36" height="36" viewBox="0 0 32 32">
                            {" "}
                            {/* 增大SVG尺寸 */}
                            <polygon
                              points="16,4 28,16 16,28 4,16"
                              fill={checked ? "#4f8cff" : "#fff"}
                              stroke="#4f8cff"
                              strokeWidth="2"
                            />
                            {checked && (
                              <polyline
                                points="11,16 15,22 22,10"
                                fill="none"
                                stroke="#fff"
                                strokeWidth="3" // 增加勾选标记的粗细
                                strokeLinecap="round"
                              />
                            )}
                          </svg>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div
                  style={{
                    color: "#888",
                    fontSize: 16,
                    textAlign: "center",
                    minWidth: 320,
                    padding: "30px 20px",
                    background: "#f7f9fc",
                    borderRadius: 8,
                    border: "1px dashed #ccd6e6",
                    width: 400, // 固定宽度与路径项保持一致
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: 200,
                  }}
                >
                  {analysisResult.noPathsFound
                    ? "当前方法没有分析出可行路径，请尝试选择其他方法"
                    : "暂无分路径，请先点击分析按钮"}
                </div>
              )
            ) : (
              <div
                style={{
                  color: "#888",
                  fontSize: 16,
                  textAlign: "center",
                  minWidth: 320,
                  padding: "30px 20px",
                  width: 400, // 固定宽度与路径项保持一致
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: 200,
                }}
              ></div>
            )}
          </div>
        </div>

        {/* 确认保存按钮 */}
        <button
          style={{
            padding: "10px 22px",
            fontSize: 17,
            borderRadius: 7,
            border: "none",
            background: selectedPaths.length > 0 ? "#4f8cff" : "#e0e6ef",
            color: selectedPaths.length > 0 ? "#fff" : "#aaa",
            cursor:
              selectedPaths.length > 0 && !downloading
                ? "pointer"
                : "not-allowed",
            marginTop: 20, // 减少上边距
            marginBottom: 20, // 减少下边距
            width: "90%",
            boxShadow: "0 2px 8px rgba(60,80,180,0.08)",
            transition: "background 0.2s",
            position: "sticky",
            bottom: 20,
            zIndex: 10, // 确保按钮在滚动内容上方
          }}
          disabled={selectedPaths.length === 0 || downloading}
          onClick={handleConfirmSave}
        >
          {downloading ? "打包中..." : "确认保存"}
        </button>
      </div>

      {/* 图片查看器模态框 */}
      {modalImage && (
        <ImageViewer src={modalImage} alt="查看大图" onClose={closeModal} />
      )}

      {/* 新增：保存成功提示弹窗 */}
      {saveSuccess && packageInfo && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: 12,
              padding: 24,
              width: "90%",
              maxWidth: 500,
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div
              style={{
                fontSize: 22,
                fontWeight: 600,
                color: "#1bc47d",
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
              }}
            >
              <span style={{ marginRight: 8 }}>✓</span>
              保存成功
            </div>
            <div
              style={{
                fontSize: 16,
                color: "#333",
                marginBottom: 24,
                textAlign: "center",
                lineHeight: 1.5,
              }}
            >
              已成功保存
              {packageInfo.filePath ? ` ${packageInfo.filePath} ` : ""}
              {packageInfo.methodName
                ? `中的 ${packageInfo.methodName} 方法`
                : ""}
              的分析结果
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 16,
                width: "100%",
              }}
            >
              <button
                onClick={handleCloseSaveSuccess}
                style={{
                  padding: "10px 20px",
                  fontSize: 16,
                  borderRadius: 6,
                  border: "1px solid #4f8cff",
                  background: "#fff",
                  color: "#4f8cff",
                  cursor: "pointer",
                  flex: 1,
                }}
              >
                继续分析
              </button>
              <button
                onClick={handleGoToDownload}
                style={{
                  padding: "10px 20px",
                  fontSize: 16,
                  borderRadius: 6,
                  border: "none",
                  background: "#4f8cff",
                  color: "#fff",
                  cursor: "pointer",
                  flex: 1,
                  boxShadow: "0 2px 8px rgba(79, 140, 255, 0.3)",
                }}
              >
                前往下载
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
