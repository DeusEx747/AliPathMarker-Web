import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from "react";

// 增强的图片查看器组件，支持缩放、还原和拖动
function ImageViewer({ src, alt, onClose }) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imgRef = useRef(null);

  // 提取路径名，查找匹配的图片属性信息
  const getImageStyle = useCallback(() => {
    if (!window.analysisResultCache)
      return { maxWidth: "90%", maxHeight: "90vh" };

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
    e.preventDefault(); // 在非被动事件监听器中可以使用
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

  // 添加非被动滚轮事件监听
  useEffect(() => {
    const element = document.getElementById("image-modal-container");
    if (element) {
      const wheelHandler = (e) => handleWheel(e);
      element.addEventListener("wheel", wheelHandler, { passive: false });
      return () => {
        element.removeEventListener("wheel", wheelHandler);
      };
    }
  }, [handleWheel]);

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
      id="image-modal-container"
      onClick={onClose}
      onMouseMove={handleMouseMove}
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

export default ImageViewer;
