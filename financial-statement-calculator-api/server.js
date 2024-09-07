const { Anthropic } = require("@anthropic-ai/sdk"); // Import the Anthropic SDK
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const AWS = require("aws-sdk");
require("dotenv").config(); // To use environment variables from .env file

const app = express();
const port = process.env.PORT || 5000; // Use the port from environment or default to 3000
app.use(express.json({ limit: "50mb" }));
app.use(cors()); // Use CORS to allow requests from your React app domain
app.use(express.json()); // Middleware to parse JSON bodies

// Configure AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: "ap-southeast-2", // Change to your region
});

const textract = new AWS.Textract();

// Endpoint to forward requests to the Anthropic API
app.post("/api/forward", async (req, res) => {
  const base64Image = req.body.base64Image.split(",")[1]; // Assuming you're sending a base64 encoded image\
  const mediaType = req.body.base64Image
    .split(",")[0]
    .split(":")[1]
    .split(";")[0]; // Assuming you're sending a base64 encoded image
  const buffer = Buffer.from(base64Image, "base64");
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const selectedOption = req.body.selectedOption;
  const isMultiEntity = req.body.isMultiEntity;

  // Construct the prompt dynamically
  let prompt = `
    Provide all the calculations for a financial statement for every year. Do not provide the answer, just the formula for every year. Brackets around numbers should be negatives. Only return a valid JSON array format with the following properties:
* formulaName: string (a descriptive name for the calculation)
* rowName: string (must match exactly the row name in the financial statement)
* year: string 
* resultInStatement: number
* formula: string (refer to the number values and omit this object if the calculation involves only one value)
`;
  // Conditionally add the entityType line
  if (selectedOption === "financialStatement" && isMultiEntity) {
    prompt += `
* entityType?: "Group" | "Company"`;
  }

  prompt += `
  
  Omit the entire object from the array if the "calculation" involves only one value.
  `;
  console.log("prompt", prompt);

  try {
    // Call AWS Textract
    const textractParams = {
      Document: {
        Bytes: buffer,
      },
      FeatureTypes: ["TABLES"],
    };

    const textractResponse = await textract
      .analyzeDocument(textractParams)
      .promise();

    const msg = await anthropic.messages.create({
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
    });
    console.log("Anthropic API response:", msg);
    res.json({ msg: msg, textractResponse: textractResponse });
  } catch (error) {
    console.error("Error forwarding request:", error);
    res.status(500).send("Failed to forward request");
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
