import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEraser, faSpinner } from "@fortawesome/free-solid-svg-icons";

interface Sample {
  id: string;
  title: string;
  image: string;
  description: string;
}

interface ResultsViewProps {
  selectedSample: Sample;
  htmlContent: JSX.Element | null;
  isLoading: boolean;
  onBack: () => void;
  error: string | null;
  tableContainerRef: React.RefObject<HTMLDivElement>;
  selectedYear: string;
  setSelectedYear: (year: string) => void;
}

const ResultsView: React.FC<ResultsViewProps> = ({
  selectedSample,
  htmlContent,
  isLoading,
  onBack,
  error,
  tableContainerRef,
  selectedYear,
  setSelectedYear,
}) => {
  const [years, setYears] = useState<string[]>([]);

  useEffect(() => {
    if (htmlContent) {
      // Extract years from htmlContent
      const yearElements =
        tableContainerRef.current?.querySelectorAll("button[data-year]");
      if (yearElements) {
        const extractedYears = Array.from(yearElements).map(
          (el) => el.getAttribute("data-year") || ""
        );
        setYears(extractedYears);
      }
    }
  }, [htmlContent, tableContainerRef]);

  const handleYearClick = (year: string) => {
    console.log("Changing year to:", year);
    setSelectedYear(year);
  };

  return (
    <div className="results-view">
      <button
        className="mb-4 flex items-center text-blue-500 hover:text-blue-700"
        onClick={onBack}
      >
        <FontAwesomeIcon icon={faEraser} className="mr-2" />
        Clear results
      </button>

      <h5 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
        Results for {selectedSample.title}
      </h5>

      {!isLoading && !error && years.length > 0 && (
        <div className="mb-4">
          <ul className="flex flex-wrap text-sm font-medium text-center text-gray-500 border-b border-gray-200 dark:border-gray-700 dark:text-gray-400">
            {years.map((year) => (
              <li key={year} className="mr-2">
                <button
                  onClick={() => handleYearClick(year)}
                  className={`inline-block p-4 rounded-t-lg ${
                    selectedYear === year
                      ? "text-blue-600 bg-gray-100 dark:bg-gray-800 dark:text-blue-500"
                      : "hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                  }`}
                  data-year={year}
                >
                  {year}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center items-center">
          <FontAwesomeIcon
            icon={faSpinner}
            spin
            size="3x"
            className="text-blue-500"
          />
          <span className="ml-2 text-gray-700 dark:text-gray-300">
            Processing...
          </span>
        </div>
      )}

      {error && (
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
          role="alert"
        >
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {!isLoading && !error && htmlContent && (
        <div
          ref={tableContainerRef}
          className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow overflow-auto max-h-[calc(100vh-200px)]"
        >
          {htmlContent}
        </div>
      )}

      {!isLoading && !error && !htmlContent && (
        <p className="text-gray-700 dark:text-gray-300">
          No results available. There might have been an error processing the
          statement.
        </p>
      )}
    </div>
  );
};

export default ResultsView;
