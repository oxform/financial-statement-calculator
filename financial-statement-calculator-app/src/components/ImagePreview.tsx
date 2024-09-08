import React, { useRef, useEffect, useState, useCallback } from "react";
import { Textract } from "aws-sdk";
import { TableData, renderTextractGrid } from "../util";

interface ImagePreviewProps {
  image: string;
  textractResponse: Textract.DetectDocumentTextResponse["Blocks"] | null;
  data: TableData[];
  showResults: boolean;
  hoveredItem: TableData | null;
  setHoveredItem: (item: TableData | null) => void;
  tableContainerRef: React.RefObject<HTMLDivElement>;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({
  image,
  textractResponse,
  data,
  showResults,
  hoveredItem,
  setHoveredItem,
  tableContainerRef,
}) => {
  const [displayDimensions, setDisplayDimensions] = useState({
    width: 0,
    height: 0,
  });
  const [naturalDimensions, setNaturalDimensions] = useState({
    width: 0,
    height: 0,
  });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [tableBounds, setTableBounds] = useState({
    top: 0,
    left: 0,
    width: 0,
    height: 0,
  });
  const imageRef = useRef<HTMLImageElement>(null);
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const updateDimensions = useCallback(() => {
    if (imageRef.current && containerRef.current && imageLoaded) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const imgNaturalWidth = imageRef.current.naturalWidth;
      const imgNaturalHeight = imageRef.current.naturalHeight;

      let newWidth, newHeight;
      const containerAspectRatio = containerRect.width / containerRect.height;
      const imageAspectRatio = imgNaturalWidth / imgNaturalHeight;

      if (containerAspectRatio > imageAspectRatio) {
        // Container is wider than the image aspect ratio
        newHeight = containerRect.height;
        newWidth = newHeight * imageAspectRatio;
      } else {
        // Container is taller than the image aspect ratio
        newWidth = containerRect.width;
        newHeight = newWidth / imageAspectRatio;
      }

      const newDisplayDimensions = {
        width: newWidth,
        height: newHeight,
      };
      const newNaturalDimensions = {
        width: imgNaturalWidth,
        height: imgNaturalHeight,
      };
      setDisplayDimensions(newDisplayDimensions);
      setNaturalDimensions(newNaturalDimensions);

      // Calculate the scale factor
      const scaleX = newWidth / imgNaturalWidth;
      const scaleY = newHeight / imgNaturalHeight;
      setScale(Math.min(scaleX, scaleY));
    }
  }, [imageLoaded]);

  useEffect(() => {
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, [updateDimensions]);

  useEffect(() => {
    if (
      textractResponse &&
      imageLoaded &&
      naturalDimensions.width > 0 &&
      naturalDimensions.height > 0
    ) {
      const cellBlocks = textractResponse.filter(
        (block) => block.BlockType === "CELL"
      );
      if (cellBlocks.length > 0) {
        let minTop = 1,
          minLeft = 1,
          maxRight = 0,
          maxBottom = 0;
        cellBlocks.forEach((block) => {
          const bbox = block.Geometry?.BoundingBox;
          if (bbox) {
            minTop = Math.min(minTop, bbox.Top ?? 1);
            minLeft = Math.min(minLeft, bbox.Left ?? 1);
            maxRight = Math.max(maxRight, (bbox.Left ?? 0) + (bbox.Width ?? 0));
            maxBottom = Math.max(
              maxBottom,
              (bbox.Top ?? 0) + (bbox.Height ?? 0)
            );
          }
        });
        setTableBounds({
          top: minTop,
          left: minLeft,
          width: maxRight - minLeft,
          height: maxBottom - minTop,
        });
      }
    }
  }, [textractResponse, imageLoaded, naturalDimensions]);

  const handleImageLoad = () => {
    setImageLoaded(true);
    updateDimensions();
  };

  return (
    <div
      ref={containerRef}
      className="md:w-1/2 border-r border-gray-200 dark:border-gray-700 relative h-[calc(100vh-100px)] flex items-center justify-center"
    >
      <div
        style={{
          position: "relative",
          width: `${displayDimensions.width}px`,
          height: `${displayDimensions.height}px`,
        }}
      >
        <img
          ref={imageRef}
          className="object-contain w-full h-full"
          src={image}
          alt="Financial Statement"
          onLoad={handleImageLoad}
        />
        {showResults && textractResponse && imageLoaded && (
          <>
            <div
              className="absolute border-2 border-gray-700"
              style={{
                top: `${tableBounds.top * displayDimensions.height}px`,
                left: `${tableBounds.left * displayDimensions.width}px`,
                width: `${tableBounds.width * displayDimensions.width}px`,
                height: `${tableBounds.height * displayDimensions.height}px`,
              }}
            />
            <div
              className="absolute"
              style={{
                top: `${tableBounds.top * displayDimensions.height}px`,
                left: `${tableBounds.left * displayDimensions.width}px`,
                width: `${tableBounds.width * displayDimensions.width}px`,
                height: `${tableBounds.height * displayDimensions.height}px`,
                overflow: "hidden",
              }}
            >
              {renderTextractGrid(
                textractResponse,
                tableBounds.width * displayDimensions.width,
                tableBounds.height * displayDimensions.height,
                data,
                tableBounds,
                hoveredItem,
                setHoveredItem,
                tableContainerRef
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ImagePreview;
