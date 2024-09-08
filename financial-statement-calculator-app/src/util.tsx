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

function scrollToTableRow(
  tableContainerRef: React.RefObject<HTMLDivElement>,
  rowIndex: number
) {
  if (tableContainerRef.current) {
    const tableRows = tableContainerRef.current.querySelectorAll("tbody tr");
    if (tableRows[rowIndex]) {
      tableRows[rowIndex].scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }
}

export function processDataToJsx(
  data: TableData[],
  selectedYear: string,
  setSelectedYear: (year: string) => void,
  hoveredItem: TableData | null,
  setHoveredItem: (item: TableData | null) => void,
  tableContainerRef: React.RefObject<HTMLDivElement>
) {
  const dataGroupedByYearAndType = data.reduce((acc, item) => {
    const key = `${item.year} ${
      item.entityType ? `(${item.entityType})` : ""
    }`.trim();
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, TableData[]>);

  const years = Object.keys(dataGroupedByYearAndType).sort((a, b) =>
    b.localeCompare(a)
  );

  if (!selectedYear && years.length > 0) {
    setSelectedYear(years[0]);
  }

  const jsxContent = (
    <>
      <ul className="flex flex-wrap text-sm font-medium text-center text-gray-500 border-b border-gray-200 dark:border-gray-700 dark:text-gray-400">
        {years.map((year) => (
          <li key={year} className="mr-2">
            <button
              onClick={() => setSelectedYear(year)}
              className={`inline-block p-4 rounded-t-lg ${
                selectedYear === year
                  ? "text-blue-600 bg-gray-100 dark:bg-gray-800 dark:text-blue-500"
                  : "hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              }`}
            >
              {year}
            </button>
          </li>
        ))}
      </ul>
      {selectedYear && (
        <div ref={tableContainerRef} style={{ overflowY: "auto" }}>
          <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th scope="col" className="px-6 py-3">
                  Calculation Name
                </th>
                <th scope="col" className="px-6 py-3">
                  Calculation
                </th>
                <th scope="col" className="px-6 py-3">
                  Result in Financial Statement
                </th>
                <th scope="col" className="px-6 py-3">
                  Processed Calculation
                </th>
              </tr>
            </thead>
            <tbody>
              {dataGroupedByYearAndType[selectedYear]?.map((item, index) => {
                const processedCalculation = evaluateCalculation(item.formula);
                const isMismatch =
                  processedCalculation !== item.resultInStatement;
                const isHovered = hoveredItem === item;
                return (
                  <tr
                    key={index}
                    className={`${
                      isMismatch ? "bg-red-100 dark:bg-red-900" : ""
                    } ${
                      isHovered ? "bg-blue-100 dark:bg-blue-900" : ""
                    } hover:bg-gray-50 dark:hover:bg-gray-600`}
                    onMouseEnter={() => setHoveredItem(item)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <td className="px-6 py-4">
                      {item.formulaName.replace("Calculation", "")}
                    </td>
                    <td className="px-6 py-4">{item.formula}</td>
                    <td className="px-6 py-4">{item.resultInStatement}</td>
                    <td className="px-6 py-4">{processedCalculation}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
  return jsxContent;
}
export function renderTextractGrid(
  blocks: Textract.BlockList,
  containerWidth: number,
  containerHeight: number,
  tableData: TableData[],
  tableBounds: { top: number; left: number; width: number; height: number },
  hoveredItem: TableData | null,
  setHoveredItem: (item: TableData | null) => void,
  tableContainerRef: React.RefObject<HTMLDivElement>
) {
  const tableBlocks = blocks?.filter((block) => block.BlockType === "CELL");
  const wordBlocks = blocks.filter((block) => block.BlockType === "WORD");
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
          (id) => wordBlocks?.find((wordBlock) => wordBlock.Id === id)?.Text
        )
          .filter(Boolean)
          .join(" ");

        const lineDescription = findLineDescription(block, wordBlocks);

        const matchingTableData = tableData?.find((data) => {
          const isNumberMatch =
            extractNumber(wordDescription || "") ===
            extractNumber(data?.resultInStatement?.toString());

          return (
            (isNumberMatch &&
              lineDescription.includes(data?.rowName) &&
              data?.rowName !== "") ||
            (isNumberMatch &&
              !data?.rowName &&
              !/[A-Za-z]/.test(lineDescription))
          );
        });

        let isValidTotal = false;
        if (matchingTableData) {
          const calculatedTotal = evaluateCalculation(
            matchingTableData.formula
          );
          const calculatedNumber = extractNumber(calculatedTotal.toString());
          const statementNumber = extractNumber(
            matchingTableData.resultInStatement.toString()
          );
          isValidTotal = calculatedNumber === statementNumber;
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
            onMouseEnter={() => {
              if (matchingTableData) {
                console.log(
                  "isValidTotal",
                  isValidTotal,
                  "matchingTableData",
                  matchingTableData,
                  "block",
                  block,
                  "lineDescription",
                  lineDescription
                );
                console.log("waaaa", extractNumber("$ (9,072,936)"));
                setHoveredItem(matchingTableData);
                const rowIndex = tableData.findIndex(
                  (item) => item === matchingTableData
                );
                scrollToTableRow(tableContainerRef, rowIndex);
              }
            }}
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

function extractNumber(input: string): number {
  // Remove all characters except numbers, minus sign, and brackets
  const cleaned = input.replace(/[^\d()-]/g, "");

  // Check if the number is wrapped in brackets or starts with a minus sign
  const isNegative = cleaned.startsWith("(") || cleaned.startsWith("-");

  // Remove brackets and minus sign
  const numberString = cleaned.replace(/[()-]/g, "");

  // Convert to number and apply negative sign if necessary
  const number = parseFloat(numberString);
  return isNegative ? -number : number;
}
function findLineDescription(
  cellBlock: Textract.Block,
  wordBlocks: Textract.Block[]
): string {
  if (!cellBlock.Geometry?.BoundingBox) {
    return "";
  }

  const cellTop = cellBlock.Geometry.BoundingBox.Top || 0;
  const cellHeight = cellBlock.Geometry.BoundingBox.Height || 0;
  const cellCenter = cellTop + cellHeight / 2;
  const threshold = cellHeight / 2;

  // Find all words that intersect with the cell's vertical center (within the threshold)
  const wordsIntersectingCell = wordBlocks.filter((word) => {
    if (!word.Geometry?.BoundingBox) return false;
    const wordTop = word.Geometry.BoundingBox.Top || 0;
    const wordHeight = word.Geometry.BoundingBox.Height || 0;
    const wordBottom = wordTop + wordHeight;
    return (
      wordTop <= cellCenter + threshold && wordBottom >= cellCenter - threshold
    );
  });

  console.log(
    "wordsIntersectingCell",
    wordsIntersectingCell.map((word) => word.Text).join(" ")
  );

  // Sort words by their x-coordinate
  wordsIntersectingCell.sort((a, b) => {
    const aX = a.Geometry?.BoundingBox?.Left || 0;
    const bX = b.Geometry?.BoundingBox?.Left || 0;
    return aX - bX;
  });

  // Combine all words to form the line description
  return wordsIntersectingCell.map((word) => word.Text).join(" ");
}
