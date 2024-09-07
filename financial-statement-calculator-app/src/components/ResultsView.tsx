import React from "react";
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
}

const ResultsView: React.FC<ResultsViewProps> = ({
  selectedSample,
  htmlContent,
  isLoading,
  onBack,
  error,
}) => {
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
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow overflow-auto max-h-[calc(100vh-200px)]">
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
