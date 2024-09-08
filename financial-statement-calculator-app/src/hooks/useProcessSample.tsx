import { useState } from "react";
import { Textract } from "aws-sdk";
import { TableData } from "../util";

const useProcessSample = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<TableData[]>([]);
  const [textractResponse, setTextractResponse] = useState<
    Textract.DetectDocumentTextResponse["Blocks"] | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  const resetProcessState = () => {
    setIsLoading(false);
    setData([]);
    setTextractResponse(null);
    setError(null);
  };

  const processSample = async (
    image: string,
    statementType: string,
    isMultiEntity: boolean
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      // Convert image URL to base64
      const response = await fetch(image);
      const blob = await response.blob();
      const reader = new FileReader();
      const base64Image = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });

      const apiResponse = await fetch("/api/forward", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          base64Image,
          selectedOption: statementType,
          isMultiEntity,
        }),
      });

      if (!apiResponse.ok) {
        throw new Error("Network response was not ok");
      }

      const responseData = await apiResponse.json();
      setTextractResponse(responseData.textractResponse["Blocks"]);

      console.log("responseData", JSON.parse(responseData.msg.content[0].text));

      if (responseData?.msg?.content) {
        setData(JSON.parse(responseData.msg.content[0].text));
      }

      return true;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    processSample,
    isLoading,
    data,
    textractResponse,
    error,
    resetProcessState,
  };
};

export default useProcessSample;
