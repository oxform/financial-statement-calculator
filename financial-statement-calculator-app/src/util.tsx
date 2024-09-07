import { Textract } from "aws-sdk";
import React from "react";

export type TableData = {
  formulaName: string;
  resultInStatement: number;
  year: string;
  rowName: string;
  formula: string;
  entityType?: "Group" | "Company";
};

export function processDataToJsx(
  data: TableData[],
  selectedYear: string,
  setSelectedYear: (year: string) => void,
  hoveredItem: TableData | null,
  setHoveredItem: (item: TableData | null) => void
) {
  // Group data by year and entity type (if there are different entity types)
  const dataGroupedByYearAndType = data?.reduce((acc, item) => {
    // Check if there are different entity types in the data
    const differentEntities = data?.some(
      (otherItem) => otherItem?.entityType !== item?.entityType
    );

    // Create a key based on the year and entity type (if different entities exist)
    const key = differentEntities
      ? `${item.year} (${item.entityType})`
      : `${item.year}`;

    // Initialize the array for this key if it doesn't exist
    if (!acc[key]) acc[key] = [];

    acc[key].push(item);
    return acc;
  }, {} as Record<string, typeof data>);

  // Set the first tab as selected if no year is selected yet
  if (selectedYear === "" && Object.keys(dataGroupedByYearAndType).length > 0) {
    setSelectedYear(Object.keys(dataGroupedByYearAndType)[0]);
  }

  const jsxContent = (
    <>
      <ul className="flex flex-wrap text-sm font-medium text-center text-gray-500 border-b border-gray-200 dark:border-gray-700 dark:text-gray-400">
        {Object.keys(dataGroupedByYearAndType)
          .sort((a, b) => {
            // Extract year as number and compare
            const yearA = parseInt(a.split(" ")[0], 10);
            const yearB = parseInt(b.split(" ")[0], 10);
            return yearB - yearA; // For descending order
          })
          .map((yearType) => (
            <li key={yearType} className="mr-2">
              <button
                onClick={() => setSelectedYear(yearType)}
                style={selectedYear === yearType ? { color: "#3b82f6" } : {}}
                className={`inline-block p-4 rounded-t-lg ${
                  selectedYear === yearType
                    ? "dark:bg-gray-800 dark:text-blue-500 bg-gray-100"
                    : "hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                }`}
              >
                {yearType}
              </button>
            </li>
          ))}
      </ul>
      {selectedYear && (
        <div>
          <table>
            <thead>
              <tr>
                <th>Calculation Name</th>
                <th>Calculation</th>
                <th>Result in Financial Statement</th>
                <th>Processed Calculation</th>
              </tr>
            </thead>
            <tbody>
              {dataGroupedByYearAndType[selectedYear]
                ? dataGroupedByYearAndType[selectedYear].map((item, index) => {
                    let calculation = item.formula;
                    const processedCalculation =
                      evaluateCalculation(calculation);
                    const isMismatch =
                      processedCalculation !== item.resultInStatement;
                    const isHovered = hoveredItem === item;
                    return (
                      <tr
                        key={index}
                        style={{
                          backgroundColor: isMismatch
                            ? "rgba(255, 0, 0, 0.2)"
                            : isHovered
                            ? "rgba(0, 255, 0, 0.2)"
                            : "",
                        }}
                        onMouseEnter={() => setHoveredItem(item)}
                        onMouseLeave={() => setHoveredItem(null)}
                      >
                        <td>{item.formulaName}</td>
                        <td>{item.formula}</td>
                        <td>{item.resultInStatement}</td>
                        <td>{processedCalculation}</td>
                      </tr>
                    );
                  })
                : null}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
  return jsxContent;
}
export function renderTextractGrid(
  blocks: Textract.DetectDocumentTextResponse["Blocks"],
  containerWidth: number,
  containerHeight: number,
  tableData: TableData[],
  tableBounds: { top: number; left: number; width: number; height: number },
  hoveredItem: TableData | null,
  setHoveredItem: (item: TableData | null) => void
) {
  const tableBlocks = blocks?.filter((block) => block.BlockType === "CELL");
  const filteredWordBlocks = blocks?.filter(
    (block) => block.BlockType === "WORD"
  );

  if (!tableBlocks || tableBlocks.length === 0) {
    console.warn("No table blocks found in Textract data");
    return null;
  }

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: containerWidth,
        height: containerHeight,
        pointerEvents: "none",
      }}
    >
      {tableBlocks.map((block, blockIndex) => {
        const geometry = block.Geometry?.BoundingBox;
        if (!geometry) {
          console.warn(`Block at index ${blockIndex} has no geometry`);
          return null;
        }

        const adjustedGeometry = {
          Left: (geometry.Left! - tableBounds.left) / tableBounds.width,
          Top: (geometry.Top! - tableBounds.top) / tableBounds.height,
          Width: geometry.Width! / tableBounds.width,
          Height: geometry.Height! / tableBounds.height,
        };

        const wordDescription = block.Relationships?.[0]?.Ids?.map(
          (id) =>
            filteredWordBlocks?.find((wordBlock) => wordBlock.Id === id)?.Text
        )
          .filter(Boolean)
          .join(" ");

        const matchingTableData = tableData?.find((data) => {
          const isNumberMatch = wordDescription
            ?.replace(
              /\(\-?([\d,]+)\)/g,
              (match: string, number: string) => `-${number.replace(/,/g, "")}`
            )
            ?.replace(/,/g, "")
            ?.includes(data?.resultInStatement?.toString());

          return isNumberMatch;
        });

        let isValidTotal = false;
        if (matchingTableData) {
          const calculatedTotal = evaluateCalculation(
            matchingTableData?.formula
          );
          isValidTotal =
            calculatedTotal === matchingTableData?.resultInStatement;
        }

        const isHovered = hoveredItem === matchingTableData;

        let backgroundColor = "rgba(108,122,137,0.05)";
        let borderColor = "gray";

        if (matchingTableData) {
          if (isValidTotal) {
            backgroundColor = isHovered
              ? "rgba(0, 255, 0, 0.3)"
              : "rgba(0, 255, 0, 0.1)";
            borderColor = "green";
          } else {
            backgroundColor = isHovered
              ? "rgba(255, 0, 0, 0.3)"
              : "rgba(255, 0, 0, 0.1)";
            borderColor = "red";
          }
        } else if (isHovered) {
          backgroundColor = "rgba(0, 0, 255, 0.1)";
        }

        const style: React.CSSProperties = {
          position: "absolute",
          left: `${adjustedGeometry.Left * containerWidth}px`,
          top: `${adjustedGeometry.Top * containerHeight}px`,
          width: `${adjustedGeometry.Width * containerWidth}px`,
          height: `${adjustedGeometry.Height * containerHeight}px`,
          backgroundColor,
          border: `1px solid ${borderColor}`,
          overflow: "hidden",
          pointerEvents: "auto",
          cursor: "pointer",
        };

        return (
          <div
            key={blockIndex}
            style={style}
            title={wordDescription}
            onMouseEnter={() =>
              matchingTableData && setHoveredItem(matchingTableData)
            }
            onMouseLeave={() => setHoveredItem(null)}
          />
        );
      })}
    </div>
  );
}
function evaluateCalculation(calculation: string) {
  try {
    calculation = calculation.replace(
      /\(\-?([\d,]+)\)/g,
      (match, number) => `-${number.replace(/,/g, "")}`
    );
    // eslint-disable-next-line no-eval
    const sanitizedCalculation = calculation.replace(/,/g, "");
    return eval(sanitizedCalculation);
  } catch (error) {
    console.error("Error evaluating calculation:", error);
    return "Error";
  }
}

function groupBlocksByCells(blocks: Textract.Block[]) {
  return blocks.reduce((acc: Textract.Block[][], block) => {
    if (block.BlockType === "CELL") {
      acc.push([block]);
    } else {
      if (acc.length === 0 || !Array.isArray(acc[acc.length - 1])) {
        acc.push([block]);
      } else {
        acc[acc.length - 1].push(block);
      }
    }
    return acc;
  }, []);
}
