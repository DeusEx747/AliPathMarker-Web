import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from "react";
import { Tree } from "react-arborist";
import { useLocation, useNavigate } from "react-router-dom";
import Prism from "prismjs";
import "prismjs/themes/prism.css";
import "prismjs/components/prism-java";

// 增强的图片查看器组件，支持缩放、还原和拖动
function ImageModal({ src, alt, onClose }) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imgRef = useRef(null);

  // 提取路径名，查找匹配的图片属性信息
  const getImageStyle = useCallback(() => {
    if (!window.analysisResultCache) return {};

    // 处理主控流图
    if (src.endsWith("output.png")) {
      // 使用主控流图的尺寸信息
      const cache = window.analysisResultCache;
      if (cache.all_image_aspect_ratio) {
        const ratio = parseFloat(cache.all_image_aspect_ratio);
        return {
          maxWidth: ratio > 2 ? "95%" : "90%",
          maxHeight: ratio > 2 ? "80vh" : "90vh",
          aspectRatio: `${cache.all_image_aspect_ratio}`,
        };
      } else {
        return { maxWidth: "90%", maxHeight: "90vh" };
      }
    }

    // 处理分路径图
    const paths = window.analysisResultCache?.paths || [];
    const matchingPath = paths.find((p) => src.endsWith(p.image_url));

    if (matchingPath) {
      const ratio = matchingPath.aspect_ratio
        ? parseFloat(matchingPath.aspect_ratio)
        : 1;
      // 使用实际比例，但限制最大尺寸
      return {
        maxWidth: ratio > 2 ? "95%" : "90%",
        maxHeight: ratio > 2 ? "80vh" : "90vh",
        aspectRatio: matchingPath.aspect_ratio || "auto",
      };
    }

    return { maxWidth: "90%", maxHeight: "90vh" };
  }, [src]);

  // 处理缩放
  const handleZoom = useCallback((zoomIn) => {
    setScale((prevScale) => {
      const newScale = zoomIn
        ? Math.min(prevScale * 1.2, 5) // 放大，最大5倍
        : Math.max(prevScale / 1.2, 0.2); // 缩小，最小0.2倍
      return newScale;
    });
  }, []);

  // 重置缩放和位置
  const handleReset = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  // 处理拖动结束
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // 处理拖动开始
  const handleMouseDown = useCallback(
    (e) => {
      if (e.button === 0) {
        // 左键点击
        setIsDragging(true);
        setDragStart({
          x: e.clientX - position.x,
          y: e.clientY - position.y,
        });
        e.preventDefault();
      }
    },
    [position]
  );

  // 处理拖动中
  const handleMouseMove = useCallback(
    (e) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        });
        e.preventDefault();
      }
    },
    [isDragging, dragStart]
  );

  // 处理滚轮缩放
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY * -0.01;
    setScale((prevScale) => {
      const newScale = Math.max(0.2, Math.min(5, prevScale + delta));
      return newScale;
    });
  }, []);

  // 添加和移除全局事件监听
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "+" || e.key === "=") handleZoom(true);
      if (e.key === "-") handleZoom(false);
      if (e.key === "0") handleReset();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mouseup", handleMouseUp);

    // 清理函数
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [onClose, handleZoom, handleReset, handleMouseUp]);

  // 计算图片样式
  const imageStyle = useMemo(() => {
    return {
      ...getImageStyle(),
      objectFit: "contain",
      transform: `scale(${scale}) translate(${position.x / scale}px, ${
        position.y / scale
      }px)`,
      transformOrigin: "center center",
      cursor: isDragging ? "grabbing" : "grab",
      transition: isDragging ? "none" : "transform 0.1s ease-out",
    };
  }, [getImageStyle, scale, position.x, position.y, isDragging]);

  if (!src) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 40,
        cursor: isDragging ? "grabbing" : "default",
      }}
      onClick={onClose}
      onMouseMove={handleMouseMove}
      onWheel={handleWheel}
    >
      <div
        style={{
          position: "relative",
          maxWidth: "95%",
          maxHeight: "95%",
          overflow: "hidden",
          backgroundColor: "#fff",
          padding: 10,
          borderRadius: 8,
          boxShadow: "0 5px 15px rgba(0,0,0,0.3)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            overflow: "hidden",
            position: "relative",
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img
            ref={imgRef}
            src={src}
            alt={alt}
            style={imageStyle}
            onMouseDown={handleMouseDown}
            draggable={false}
          />
        </div>

        {/* 控制栏 */}
        <div
          style={{
            position: "absolute",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: 15,
            background: "rgba(0,0,0,0.6)",
            padding: "8px 15px",
            borderRadius: 20,
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            title="缩小 (-)"
            style={controlButtonStyle}
            onClick={() => handleZoom(false)}
          >
            <span style={{ fontSize: 16 }}>－</span>
          </button>
          <div
            style={{
              color: "#fff",
              display: "flex",
              alignItems: "center",
              fontSize: 14,
              minWidth: 50,
              justifyContent: "center",
            }}
          >
            {Math.round(scale * 100)}%
          </div>
          <button
            title="放大 (+)"
            style={controlButtonStyle}
            onClick={() => handleZoom(true)}
          >
            <span style={{ fontSize: 16 }}>＋</span>
          </button>
          <button
            title="重置 (0)"
            style={controlButtonStyle}
            onClick={handleReset}
          >
            <span style={{ fontSize: 14 }}>重置</span>
          </button>
        </div>

        <button
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            background: "rgba(255,255,255,0.8)",
            border: "1px solid #ddd",
            borderRadius: "50%",
            width: 30,
            height: 30,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            fontSize: 18,
            boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
          }}
          onClick={onClose}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// 控制按钮样式
const controlButtonStyle = {
  background: "rgba(255,255,255,0.2)",
  border: "none",
  borderRadius: 5,
  width: 32,
  height: 32,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  color: "#fff",
  fontWeight: "bold",
};

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
  const [leftWidth, setLeftWidth] = useState(33.33); // 左侧栏宽度百分比
  const [middleWidth, setMiddleWidth] = useState(33.33); // 中间栏宽度百分比
  const [rightWidth, setRightWidth] = useState(33.34); // 右侧栏宽度百分比
  const containerRef = useRef(null); // 容器ref，用于计算百分比

  // 处理左侧拖拽条拖动
  const handleLeftDrag = useCallback(
    (clientX) => {
      if (!containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const leftPanelWidth = Math.max(
        10,
        Math.min(60, ((clientX - containerRect.left) / containerWidth) * 100)
      );

      // 调整左侧和中间宽度，保持总宽度不变
      const rightPanelWidth = rightWidth;
      const middlePanelWidth = 100 - leftPanelWidth - rightPanelWidth;

      setLeftWidth(leftPanelWidth);
      setMiddleWidth(middlePanelWidth);
    },
    [rightWidth]
  );

  // 处理中间拖拽条拖动
  const handleMiddleDrag = useCallback(
    (clientX) => {
      if (!containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const leftRightPosition =
        ((clientX - containerRect.left) / containerWidth) * 100;

      // 中间拖拽条位置 = 左侧宽度 + 中间宽度
      const newMiddleWidth = Math.max(
        10,
        Math.min(80, leftRightPosition - leftWidth)
      );
      const newRightWidth = 100 - leftWidth - newMiddleWidth;

      setMiddleWidth(newMiddleWidth);
      setRightWidth(newRightWidth);
    },
    [leftWidth]
  );

  // 双击拖拽条恢复默认宽度
  const handleDoubleClick = useCallback(() => {
    setLeftWidth(33.33);
    setMiddleWidth(33.33);
    setRightWidth(33.34);
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
    setAnalysisResult(null);
    setSelectedPaths([]);
    try {
      const form = new URLSearchParams();
      form.append("sessionId", sessionId);
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
      } else {
        setAnalysisResult(data);
      }
    } catch (err) {
      alert("分析出错：" + err.message);
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

  // 确认保存（打包下载）
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

        // 跳转时传递更完整的状态
        navigate("/", {
          state: {
            zipUrl,
            zipName,
            fileName: originalFileName, // 传递原始文件名
            fromAnalysis: true, // 标记来自分析页面
            sessionId, // 传递会话ID，以支持重新分析
            fileTree, // 传递文件树数据，以便重新分析时使用
          },
        });
      } else if (data.error) {
        alert("打包失败：" + data.error);
      }
    } catch (err) {
      alert("打包出错：" + err.message);
    } finally {
      setDownloading(false);
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

  // 查看原图
  const handleViewImage = (url) => {
    setModalImage(url);
  };

  const closeModal = () => {
    setModalImage(null);
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
        overflow: "hidden",
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
          overflowY: "auto",
          overflowX: "hidden", // 防止水平溢出
          height: "100vh",
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
        <DragHandle
          onDrag={handleLeftDrag}
          position="right"
          onDoubleClick={handleDoubleClick}
        />
      </div>

      {/* 中间：主控流图展示 */}
      <div
        style={{
          width: `${middleWidth}%`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          padding: "48px 24px",
          height: "100vh",
          borderRight: "1px solid #e0e6ef",
          overflowY: "auto",
          overflowX: "hidden",
          position: "relative", // 为拖拽条提供定位基准
        }}
      >
        {/* 拖拽提示 - 放置在中间栏顶部 */}
        <div
          onClick={handleDoubleClick}
          style={{
            width: "100%",
            textAlign: "center",
            marginBottom: 16,
            padding: "8px 12px",
            borderRadius: 6,
            background: "#f0f7ff",
            border: "1px dashed #4f8cff",
            color: "#4f8cff",
            fontSize: 14,
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "background-color 0.2s",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          }}
          onMouseOver={(e) =>
            (e.currentTarget.style.backgroundColor = "#e6f0ff")
          }
          onMouseOut={(e) =>
            (e.currentTarget.style.backgroundColor = "#f0f7ff")
          }
          title="点击恢复默认宽度"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            style={{ marginRight: 8 }}
          >
            <path
              fill="#4f8cff"
              d="M7 3H5a2 2 0 0 0-2 2v10h2V5h4V3H7zm6 0h-4v2h2v10h2V5a2 2 0 0 0 0-2z"
            />
          </svg>
          可拖动边缘调整栏宽度，点击恢复默认
        </div>

        {!analysisResult && (
          <div
            style={{
              color: "#888",
              fontSize: 18,
              marginBottom: 24,
              width: "100%",
              textAlign: "center",
            }}
          >
            请先点击左下"路径分析"按钮获取主控流图
          </div>
        )}
        {analysisResult && (
          <>
            <div
              style={{
                fontSize: 22,
                fontWeight: 600,
                marginBottom: 18,
                width: "100%",
                textAlign: "center",
              }}
            >
              主控流图
            </div>
            <div
              style={{
                background: "#fafdff",
                border: "1px solid #e0e6ef",
                borderRadius: 12,
                padding: 24,
                width: "100%",
                height: "calc(75vh - 48px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 18,
                overflowY: "auto",
                overflowX: "auto",
                position: "relative",
              }}
            >
              <img
                src={"/" + analysisResult.all_image}
                alt="主控流图"
                style={{
                  maxWidth: "100%",
                  height: "auto",
                  width:
                    analysisResult.all_image_aspect_ratio > 2 ? "100%" : "85%",
                  aspectRatio: analysisResult.all_image_aspect_ratio
                    ? `${analysisResult.all_image_aspect_ratio}`
                    : "auto",
                  minHeight: analysisResult.all_image_height
                    ? `${Math.min(
                        analysisResult.all_image_height * 0.8,
                        600
                      )}px`
                    : "auto",
                  cursor: "pointer",
                  borderRadius: 8,
                }}
                onClick={() => handleViewImage("/" + analysisResult.all_image)}
              />
            </div>
          </>
        )}

        {/* 中间拖拽条 */}
        <DragHandle
          onDrag={handleMiddleDrag}
          position="right"
          onDoubleClick={handleDoubleClick}
        />
      </div>

      {/* 右侧：分路径图片序列和勾选框 */}
      <div
        style={{
          width: `${rightWidth}%`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          padding: "48px 24px 24px 24px",
          height: "100vh",
          position: "relative",
          overflowY: "auto",
          overflowX: "hidden", // 防止水平溢出
        }}
      >
        <div
          style={{
            fontSize: 22,
            fontWeight: 600,
            marginBottom: 18,
            width: "100%",
            textAlign: "center",
          }}
        >
          分路径选择
        </div>

        {/* 水平滚动容器 */}
        <div
          style={{
            width: "100%",
            overflowY: "auto",
            overflowX: "hidden",
            maxHeight: "calc(100vh - 220px)",
            paddingBottom: 16,
            marginBottom: 32,
          }}
        >
          {/* 水平排列的分路径图 */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 24,
              paddingBottom: 16,
              width: "100%",
            }}
          >
            {analysisResult &&
            analysisResult.paths &&
            analysisResult.paths.length > 0 ? (
              analysisResult.paths.map((item, idx) => {
                const checked = selectedPaths.find(
                  (p) =>
                    p.png === item.image_url &&
                    p.json === item.path_json &&
                    p.dot === item.dot_file
                );

                // 计算合适的容器高度，基于路径长度和图片比例
                const ratio = item.aspect_ratio
                  ? parseFloat(item.aspect_ratio)
                  : 1;
                const pathLength = item.path_length || 5;
                const containerHeight = Math.min(
                  // 长路径给予更大高度，但有上限
                  100 + pathLength * 40,
                  // 很宽的图片需要更紧凑的容器
                  ratio > 2 ? 400 : 600
                );

                // 根据栏宽计算图片宽度，当右侧栏过窄时，让图片占更多宽度
                const imgWidthPercent =
                  rightWidth < 25 ? 100 : ratio > 3 ? 100 : 90;

                return (
                  <div
                    key={item.image_url}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      background: "#fafdff",
                      border: "1px solid #e0e6ef",
                      borderRadius: 12,
                      padding: rightWidth < 20 ? 10 : 18, // 根据宽度调整内边距
                      boxShadow: checked ? "0 0 0 2px #4f8cff" : undefined,
                      width: "100%",
                      // 使用计算的高度
                      minHeight: `${containerHeight}px`,
                      position: "relative", // 相对定位
                    }}
                  >
                    <img
                      src={"/" + item.image_url}
                      alt="分路径图"
                      style={{
                        width: `${imgWidthPercent}%`, // 根据栏宽动态调整
                        height: "auto",
                        maxHeight: "none",
                        // 利用后端返回的长宽比信息
                        aspectRatio: item.aspect_ratio
                          ? `${item.aspect_ratio}`
                          : "auto",
                        // 根据路径长度和图片比例计算最小高度
                        minHeight:
                          Math.min(
                            containerHeight - 80,
                            ratio > 2 ? 320 : 500
                          ) + "px",
                        objectFit: "contain",
                        cursor: "pointer",
                        borderRadius: 6,
                        marginBottom: 10,
                      }}
                      onClick={() => handleViewImage("/" + item.image_url)}
                    />

                    {/* 路径编号显示，移除尺寸信息 */}
                    <div
                      style={{
                        fontSize: 13,
                        color: "#666",
                        marginBottom: 8,
                        textAlign: "center",
                        width: "100%",
                      }}
                    >
                      路径 #{idx + 1}
                    </div>

                    {/* 菱形勾选框 */}
                    <div
                      style={{ cursor: "pointer", marginBottom: 4 }}
                      onClick={() => handleSelectPath(idx)}
                    >
                      <svg width="32" height="32" viewBox="0 0 32 32">
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
                            strokeWidth="2.5"
                            strokeLinecap="round"
                          />
                        )}
                      </svg>
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
                  width: "100%",
                }}
              >
                暂无分路径，请先分析
              </div>
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
            marginTop: 32,
            marginBottom: 32,
            width: "90%",
            boxShadow: "0 2px 8px rgba(60,80,180,0.08)",
            transition: "background 0.2s",
            position: "sticky",
            bottom: 20,
          }}
          disabled={selectedPaths.length === 0 || downloading}
          onClick={handleConfirmSave}
        >
          {downloading ? "打包中..." : "确认保存"}
        </button>
      </div>

      {/* 图片查看器模态框 */}
      {modalImage && (
        <ImageModal src={modalImage} alt="查看大图" onClose={closeModal} />
      )}
    </div>
  );
}
