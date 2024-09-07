import { Textract } from "aws-sdk";

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
  setSelectedYear: (year: string) => void
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
                style={selectedYear === yearType ? { color: "#009879" } : {}}
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
                    return (
                      <tr
                        key={index}
                        style={{
                          backgroundColor: isMismatch
                            ? "rgba(255, 0, 0, 0.2)"
                            : "",
                        }}
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
  tableData: TableData[]
) {
  const tableBlocks = blocks?.filter((block) => block.BlockType === "CELL");

  // Calculate scale factors
  const scaleX = containerWidth / 1;
  const scaleY = containerHeight / 1;

  if (!tableBlocks) return;

  const lines = groupBlocksByCells(tableBlocks);
  const filteredWordBlocks = blocks?.filter(
    (block) => block.BlockType === "WORD"
  );

  return (
    <div
      className="textract-grid"
      style={{ width: containerWidth, height: containerHeight }}
    >
      {lines.map((line: Textract.Block[], lineIndex: number) => (
        <div className="line" key={lineIndex}>
          {line.map((block: Textract.Block, blockIndex: number) => {
            const wordDescription = block.Relationships?.[0]?.Ids?.map(
              (id: string) => {
                const wordBlock = filteredWordBlocks?.find(
                  (wordBlock) => wordBlock.Id === id
                );
                return wordBlock?.Text;
              }
            )?.join(" ");
            const getAllCellsInRow = lines.filter((line: Textract.Block[]) => {
              return line[0].RowIndex === block.RowIndex;
            });

            const getAllWordsInRow = getAllCellsInRow?.reduce(
              (acc: string[], line: Textract.Block[]) => {
                acc.push(
                  ...line.map((block: Textract.Block) => {
                    const wordDescription = block.Relationships?.[0]?.Ids?.map(
                      (id: string) => {
                        const wordBlock = filteredWordBlocks?.find(
                          (wordBlock) => wordBlock.Id === id
                        );
                        return wordBlock?.Text;
                      }
                    )?.join(" ");
                    return wordDescription ?? "";
                  })
                );
                return acc;
              },
              []
            );

            const getTotalTableData = tableData?.find((data) => {
              const isEmptyRowName = !getAllWordsInRow[0];
              const isRowNameMatch = data?.rowName?.includes(
                getAllWordsInRow[0]
              );

              const isNumberMatch = wordDescription
                ?.replace(
                  /\(\-?([\d,]+)\)/g,
                  (match: string, number: string) =>
                    `-${number.replace(/,/g, "")}`
                )
                ?.replace(/,/g, "")
                ?.includes(data?.resultInStatement?.toString());

              return (
                (isEmptyRowName && isNumberMatch) ||
                (isRowNameMatch && isNumberMatch)
              );
            });

            let calculatedTotal, isValidTotal;
            if (getTotalTableData) {
              calculatedTotal = evaluateCalculation(getTotalTableData?.formula);
              isValidTotal =
                calculatedTotal === getTotalTableData?.resultInStatement;
            }

            return (
              <div
                className="text-block"
                key={blockIndex}
                style={{
                  position: "absolute",
                  left: `${block?.Geometry?.BoundingBox?.Left ?? 0 * scaleX}px`,
                  top: `${block?.Geometry?.BoundingBox?.Top ?? 0 * scaleY}px`,
                  width: `${
                    block?.Geometry?.BoundingBox?.Width ?? 0 * scaleX
                  }px`,
                  height: `${
                    block?.Geometry?.BoundingBox?.Height ?? 0 * scaleY
                  }px`,
                  backgroundColor: "rgba(108,122,137,0.05)",
                  border: !getTotalTableData
                    ? "1px solid gray"
                    : isValidTotal
                    ? "2px solid green"
                    : "2px solid red",
                }}
              ></div>
            );
          })}
        </div>
      ))}
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
