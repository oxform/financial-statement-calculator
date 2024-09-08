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

  // Calculate validations for all years
  const totalValidations = data.length;
  const passedValidations = data.filter(
    (item) => evaluateCalculation(item.formula) === item.resultInStatement
  ).length;
  const allPassed = passedValidations === totalValidations;

  const jsxContent = (
    <div className="w-full max-w-7xl mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <div
          className="flex space-x-2 overflow-x-auto pb-2"
          style={{ maxWidth: "60%" }}
        >
          {years.map((year) => (
            <button
              key={year}
              onClick={() => setSelectedYear(year)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                selectedYear === year
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {year}
            </button>
          ))}
        </div>
        <div className={`text-sm font-medium`}>
          {passedValidations}/{totalValidations} validations passed{" "}
          {allPassed ? "✅" : "❌"}
        </div>
      </div>
      {selectedYear && (
        <div
          ref={tableContainerRef}
          className="overflow-auto max-h-[calc(100vh-350px)] rounded-md border"
        >
          <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th scope="col" className="px-6 py-3 w-[250px]">
                  Calculation Name
                </th>
                <th scope="col" className="px-6 py-3 w-[300px]">
                  Calculation
                </th>
                <th scope="col" className="px-6 py-3">
                  Result in Statement
                </th>
              </tr>
            </thead>
            <tbody>
              {dataGroupedByYearAndType[selectedYear]?.map((item, index) => {
                const processedCalculation = evaluateCalculation(item.formula);
                const isValid = processedCalculation === item.resultInStatement;
                const isHovered = hoveredItem === item;
                return (
                  <tr
                    key={index}
                    className={`${
                      isValid ? "" : "bg-red-50 dark:bg-red-900/20"
                    } ${
                      isHovered ? "important-row" : ""
                    } transition-colors hover:bg-gray-50 dark:hover:bg-gray-600`}
                    onMouseEnter={() => setHoveredItem(item)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <td className="px-6 py-4 font-medium">
                      {item.formulaName.replace(/Calculation|calculation/g, "")}
                    </td>
                    <td className="px-6 py-4 font-mono text-sm">
                      {item.formula} ={" "}
                      <span
                        className="inline-block px-2 rounded-full text-black text-xs"
                        style={{
                          backgroundColor: isValid
                            ? "rgba(0, 255, 0, 0.3)"
                            : "rgba(255, 0, 0, 0.3)",
                        }}
                      >
                        {processedCalculation}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono">
                      {item.resultInStatement}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
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
