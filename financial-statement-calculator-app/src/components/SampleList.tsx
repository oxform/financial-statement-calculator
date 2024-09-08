import React, { useState, useEffect, useRef } from "react";
import "./SampleList.scss";
import { processDataToJsx, TableData } from "../util";
import ImagePreview from "./ImagePreview";
import ResultsView from "./ResultsView";
import SampleSelector from "./SampleSelector";
import useProcessSample from "../hooks/useProcessSample";

interface Sample {
  id: string;
  title: string;
  image: string;
  description: string;
}

type FinancialStatementType =
  | "Balance Sheet"
  | "Profit and Loss"
  | "Cash Flow"
  | "Changes in Equity";

type SampleData = {
  [K in FinancialStatementType]: Sample[];
};

const sampleData: SampleData = {
  "Balance Sheet": [
    {
      id: "bs1",
      title: "Apple Balance Sheet 2022",
      image: "samples/balance/apple-balance-sheet-2022.jpg",
      description: "Annual balance sheet for Apple Inc. in 2022.",
    },
    {
      id: "bs2",
      title: "Beach Balance Sheet UK 2019",
      image: "samples/balance/beach-uk-2019.png",
      description: "Annual balance sheet for Beach UK in 2019.",
    },
  ],
  "Profit and Loss": [
    {
      id: "pl1",
      title: "Bowman Profit and Loss UK 2020",
      image: "samples/profit/bowman-profit-2020.jpg",
      description: "Annual profit and loss statement for 2023.",
    },
    {
      id: "pl2",
      title: "P&L Statement Q1 2024",
      image: "/api/placeholder/400/300",
      description: "Quarterly profit and loss statement for Q1 2024.",
    },
  ],
  "Cash Flow": [
    {
      id: "cf1",
      title: "Cash Flow Statement 2023",
      image: "/api/placeholder/400/300",
      description: "Annual cash flow statement for 2023.",
    },
  ],
  "Changes in Equity": [
    {
      id: "ce1",
      title: "Statement of Changes in Equity 2023",
      image: "/api/placeholder/400/300",
      description: "Annual statement of changes in equity for 2023.",
    },
  ],
};

const SampleList: React.FC = () => {
  const [selectedType, setSelectedType] =
    useState<FinancialStatementType>("Balance Sheet");
  const [selectedSample, setSelectedSample] = useState<Sample>(
    sampleData["Balance Sheet"][0]
  );
  const [selectedModel, setSelectedModel] = useState(
    "claude-3-5-sonnet-20240620"
  );
  const [isMultiEntity, setIsMultiEntity] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>("");

  const [hoveredItem, setHoveredItem] = useState<TableData | null>(null);

  const {
    processSample,
    isLoading,
    data,
    textractResponse,
    error,
    resetProcessState,
  } = useProcessSample();

  const [htmlContent, setHtmlContent] = useState<JSX.Element | null>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (data) {
      const jsxContent = processDataToJsx(
        data,
        selectedYear,
        setSelectedYear,
        hoveredItem,
        setHoveredItem,
        tableContainerRef
      );
      setHtmlContent(jsxContent);
    }
  }, [selectedYear, data, hoveredItem]);

  const handleViewFullStatement = async () => {
    const result = await processSample(
      selectedSample.image,
      selectedType,
      isMultiEntity
    );
    if (result) {
      setShowResults(true);
    }
  };

  const handleHoveredItemChange = (item: TableData | null) => {
    setHoveredItem(item);
    if (item) {
      setSelectedYear(item.year);
    }
  };

  const handleBackToSamples = () => {
    setShowResults(false);
    setHtmlContent(null);
    setSelectedYear("");
    setHoveredItem(null);
    resetProcessState();
  };

  return (
    <div className="card-container">
      <div className="block rounded-lg bg-white shadow-secondary-1 dark:bg-gray-800 overflow-hidden">
        <div className="md:flex">
          <ImagePreview
            image={selectedSample.image}
            textractResponse={textractResponse}
            data={data}
            showResults={showResults}
            hoveredItem={hoveredItem}
            setHoveredItem={handleHoveredItemChange}
            tableContainerRef={tableContainerRef}
          />
          <div className="md:w-1/2 p-6">
            {!showResults ? (
              <SampleSelector
                selectedType={selectedType}
                setSelectedType={setSelectedType}
                selectedSample={selectedSample}
                setSelectedSample={setSelectedSample}
                selectedModel={selectedModel}
                setSelectedModel={setSelectedModel}
                isMultiEntity={isMultiEntity}
                setIsMultiEntity={setIsMultiEntity}
                onProcess={handleViewFullStatement}
                isLoading={isLoading}
                sampleData={sampleData}
              />
            ) : (
              <ResultsView
                selectedSample={selectedSample}
                htmlContent={htmlContent}
                isLoading={isLoading}
                onBack={handleBackToSamples}
                error={error}
                tableContainerRef={tableContainerRef}
                selectedYear={selectedYear}
                setSelectedYear={setSelectedYear}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default SampleList;
