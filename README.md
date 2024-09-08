# Financial Statement Calculator

This project is a full-stack application that calculates financial statements using AI. It consists of a React frontend and an Express.js backend, with integration to Anthropic's Claude AI and AWS Textract for validating and calculating financial documents.

## 🌐 Live Application

You can access the live application here: [Financial Statement Calculator](https://financial-statement-calculator-production.up.railway.app/)

## 📁 Project Structure

```
financial-statement-calculator/
├── financial-statement-calculator-app/   # React frontend
├── financial-statement-calculator-api/   # Express.js backend
├── .env                                  # Environment variables
└── railway.json                          # Railway deployment configuration
```

## 🚀 Prerequisites

- [Node.js](https://nodejs.org/) (v18.x recommended)
- npm (comes with Node.js)
- An [Anthropic API key](https://www.anthropic.com/)
- [AWS credentials](https://aws.amazon.com/) with access to Textract

## 🛠️ Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/oxform/financial-statement-calculator.git
   cd financial-statement-calculator
   ```

2. Install dependencies for both frontend and backend:
   ```bash
   cd financial-statement-calculator-app && npm install
   cd ../financial-statement-calculator-api && npm install
   ```

3. Create a `.env` file in the root directory with the following content:
   ```env
   ANTHROPIC_API_KEY=your_anthropic_api_key
   AWS_ACCESS_KEY_ID=your_aws_access_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret_key
   ```

## 💻 Running the Application Locally

1. Start the backend server:
   ```bash
   cd financial-statement-calculator-api
   npm start
   ```

2. In a new terminal, start the frontend development server:
   ```bash
   cd financial-statement-calculator-app
   npm start
   ```

3. Open your browser and navigate to `http://localhost:3000` to use the application.

## 🌐 API Endpoints

- `POST /api/forward`: Processes financial statements using Claude AI and AWS Textract.
- `GET /api/health`: Health check endpoint for the server.
