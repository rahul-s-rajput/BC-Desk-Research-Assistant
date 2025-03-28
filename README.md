This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Key Features

- **Interactive Dashboards**: Visualize education data including enrollment trends, financial metrics, and program performance.
- **Multi-university Support**: Compare data across different institutions.
- **Chatbot with RAG Technology**: Ask questions about education reports using natural language.
- **Real-time News Integration**: Stay updated with the latest education sector news.

## AI Chatbot with RAG (Retrieval-Augmented Generation)

The dashboard includes an AI-powered chatbot that can answer questions about the education reports in the system. The chatbot uses Retrieval-Augmented Generation (RAG) technology to:

1. Automatically index all PDF and TXT reports in the Reports directory
2. Find the most relevant information when you ask a question
3. Generate a comprehensive response based on the actual report content
4. Provide source citations so you can verify the information

### Chatbot Features

- Natural language understanding
- Context-aware conversations
- Source attribution for transparency
- Support for complex queries about education data

## Getting Started

### Prerequisites

- Node.js (v18+)
- Python (v3.8+)
- OpenRouter API key (for the RAG chatbot)

### Installation

1. Clone the repository
2. Install frontend dependencies:

```bash
cd education-dashboard
npm install
```

3. Install backend dependencies:

```bash
cd education-dashboard-api
pip install -r requirements.txt
```

4. Configure the `.env` file with your OpenRouter API key:

```
OPENROUTER_API_KEY=your_api_key_here
```

5. Place education reports (PDF/TXT) in the `education-dashboard-api/Reports` directory

### Running the Application

1. Start the backend API:

```bash
# On Linux/Mac
cd education-dashboard-api
./run.sh

# On Windows
cd education-dashboard-api
./run.ps1
```

2. Start the frontend:

```bash
cd education-dashboard
npm run dev
```

3. Open your browser to `http://localhost:3000`

## Backend API

The project includes a Flask backend API that serves data for the dashboard. To run the API:

1. Navigate to the API directory:
```bash
cd education-dashboard-api
```

2. Install required dependencies:
```bash
pip install flask flask-cors pandas python-dotenv openai schedule
```

3. Start the API server:
```bash
python app.py
```

The API will be available at [http://localhost:5000](http://localhost:5000).

## News Data Service

The dashboard includes a news feed in the sidebar that displays current education news. To fetch and update the news:

1. Ensure you have an OpenAI API key in the `.env` file:
```
OPENAI_API_KEY=your_api_key_here
```

2. Run the news update service:
```bash
python update_news.py
```

This will fetch news data immediately and then update it every 12 hours.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
