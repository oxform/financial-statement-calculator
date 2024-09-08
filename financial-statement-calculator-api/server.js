const { Anthropic } = require("@anthropic-ai/sdk");
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const AWS = require("aws-sdk");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;
app.use(express.json({ limit: "50mb" }));
app.use(cors());
app.use(express.json());

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: "ap-southeast-2",
});

const textract = new AWS.Textract();

app.post("/api/forward", async (req, res) => {
  const base64Image = req.body.base64Image.split(",")[1];
  const mediaType = req.body.base64Image
    .split(",")[0]
    .split(":")[1]
    .split(";")[0];
  const buffer = Buffer.from(base64Image, "base64");
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const selectedOption = req.body.selectedOption;
  const isMultiEntity = req.body.isMultiEntity;

  let prompt = `
    Provide all the calculations for a financial statement for every year. If you do a calculation for a year, you must do it for all the other years. Brackets around numbers should be negatives. Only return a valid JSON array format with the following properties:
* formulaName: string (a descriptive name for the calculation)
* rowName: string (must match exactly the row name in the financial statement, if the row name is blank then return an empty string)
* year: string 
* resultInStatement: number
* formula: string (refer to the number values and omit this object if the calculation involves only one value)
`;

  if (selectedOption === "financialStatement" && isMultiEntity) {
    prompt += `
* entityType?: "Group" | "Company"`;
  }

  prompt += `
  
  Omit the entire object from the array if the "calculation" involves only one value.
  `;

  try {
    const textractParams = {
      Document: {
        Bytes: buffer,
      },
      FeatureTypes: ["TABLES"],
    };

    // Call both APIs concurrently
    const [textractResponse, anthropicResponse] = await Promise.all([
      textract.analyzeDocument(textractParams).promise(),
      anthropic.messages.create({
        model: "claude-3-5-sonnet-20240620",
        max_tokens: 4096,
        temperature: 0,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt,
              },
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: base64Image,
                },
              },
            ],
          },
        ],
      }),
    ]);

    res.json({ msg: anthropicResponse, textractResponse: textractResponse });
  } catch (error) {
    console.error("Error forwarding request:", error);
    res.status(500).send("Failed to forward request");
  }
});

app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "OK", message: "Service is healthy" });
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
