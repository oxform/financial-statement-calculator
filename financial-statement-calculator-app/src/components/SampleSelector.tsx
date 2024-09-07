import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";

type FinancialStatementType =
  | "Balance Sheet"
  | "Profit and Loss"
  | "Cash Flow"
  | "Changes in Equity";

interface Sample {
  id: string;
  title: string;
  image: string;
  description: string;
}

type SampleData = {
  [K in FinancialStatementType]: Sample[];
};

interface SampleSelectorProps {
  selectedType: FinancialStatementType;
  setSelectedType: (type: FinancialStatementType) => void;
  selectedSample: Sample;
  setSelectedSample: (sample: Sample) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  isMultiEntity: boolean;
  setIsMultiEntity: (isMulti: boolean) => void;
  onProcess: () => void;
  isLoading: boolean;
  sampleData: SampleData;
}

const modelOptions = [
  { value: "claude-3-5-sonnet-20240620", label: "Claude 3.5 Sonnet" },
  { value: "claude-3-opus-20240229", label: "Claude 3 Opus" },
  { value: "claude-3-sonnet-20240229", label: "Claude 3 Sonnet" },
  { value: "claude-3-haiku-20240307", label: "Claude 3 Haiku" },
  { value: "claude-2.1", label: "Claude 2.1" },
  { value: "claude-2.0", label: "Claude 2.0" },
  { value: "claude-instant-1.2", label: "Claude Instant 1.2" },
];

const SampleSelector: React.FC<SampleSelectorProps> = ({
  selectedType,
  setSelectedType,
  selectedSample,
  setSelectedSample,
  selectedModel,
  setSelectedModel,
  isMultiEntity,
  setIsMultiEntity,
  onProcess,
  isLoading,
  sampleData,
}) => {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow overflow-y-auto">
        <h5 className="text-xl font-semibold mb-5 text-gray-900 dark:text-white">
          Financial Statements
        </h5>

        {/* Statement Type Selection */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Statement Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(sampleData) as FinancialStatementType[]).map(
              (type) => (
                <button
                  key={type}
                  onClick={() => {
                    setSelectedType(type);
                    setSelectedSample(sampleData[type][0]);
                  }}
                  className={`px-3 py-2 rounded text-sm font-medium ${
                    selectedType === type
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {type}
                </button>
              )
            )}
          </div>
        </div>

        {/* Sample Selection */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Available Samples
          </label>
          <div className="flex flex-wrap gap-2">
            {sampleData[selectedType].map((sample) => (
              <button
                key={sample.id}
                onClick={() => setSelectedSample(sample)}
                className={`px-3 py-1 rounded ${
                  selectedSample.id === sample.id
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {sample.title}
              </button>
            ))}
          </div>
        </div>

        {/* Sample Details */}
        <div className="mb-5">
          <h5 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
            {selectedSample.title}
          </h5>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {selectedSample.description}
          </p>
        </div>

        {/* Model Selection */}
        <div className="mb-5">
          <label
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            htmlFor="model-select"
          >
            Large Language Model
          </label>
          <select
            id="model-select"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="block w-full mt-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          >
            {modelOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Multi-entity Checkbox */}
        <div className="flex items-center mb-5">
          <input
            type="checkbox"
            id="multi-entity"
            checked={isMultiEntity}
            onChange={(e) => setIsMultiEntity(e.target.checked)}
            className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-offset-0 focus:ring-indigo-200 focus:ring-opacity-50"
          />
          <label
            htmlFor="multi-entity"
            className="ml-2 block text-sm text-gray-900 dark:text-gray-300"
          >
            Multi-entity
          </label>
        </div>
      </div>

      {/* Process Button */}
      <div className="mt-auto pt-4">
        <button
          className={`
                w-full
                flex justify-center items-center
                px-4 py-3 rounded
                text-white font-semibold text-lg
                transition-all duration-300 ease-in-out
                ${
                  isLoading
                    ? "bg-blue-400 cursor-not-allowed"
                    : "bg-blue-500 hover:bg-blue-600 active:bg-blue-700"
                }
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
                shadow-md hover:shadow-lg
              `}
          type="button"
          onClick={onProcess}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
              Processing...
            </>
          ) : (
            "Process"
          )}
        </button>
      </div>
    </div>
  );
};
export default SampleSelector;
