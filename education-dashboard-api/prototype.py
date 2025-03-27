from langchain.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain.vectorstores import Chroma
from langchain_core.runnables import RunnablePassthrough
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.pydantic_v1 import BaseModel, Field
import dash
from dash import html, dcc
from dash.dependencies import Input, Output, State
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
import plotly.graph_objects as go
from plotly.subplots import make_subplots

import os
import tempfile
import pandas as pd
from dotenv import load_dotenv

import json
import requests
from pydantic import BaseModel, ValidationError
from typing import List, Dict, Optional

import time

load_dotenv()
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY")
OPENROUTER_API_URL = os.environ.get("OPENROUTER_BASE_URL")

# %% [Define Response Schema]
class FinancialData(BaseModel):
    university: str
    fiscal_year: int
    
    # Financial Data
    government_grants: float
    tuition_fees: float
    research_funding: float
    donations: float
    other_income: float
    operational_costs: float
    program_expenses: float
    infrastructure_investments: float
    faculty_salaries: float
    administrative_expenses: float
    net_assets: float
    
    class Config:
        extra = "forbid"

def process_chunk(chunk: str, max_retries: int = 3) -> Optional[FinancialData]:
    schema = FinancialData.schema()
    
    # Create the LLM
    llm = ChatOpenAI(
        model="deepseek/deepseek-chat-v3-0324:free",
        openai_api_key=OPENROUTER_API_KEY,
        openai_api_base="https://openrouter.ai/api/v1",
        temperature=0.1
    )
    
    # Escape both the schema and the chunk to prevent LangChain from interpreting curly braces
    schema_str = json.dumps(schema, indent=2)
    # Create the prompt template with fixed text (no variables)
    system_message = "You are a higher education data extraction specialist. Your task is to analyze university annual reports and extract structured information with perfect accuracy."
    human_message = f"""
    Analyze this financial report chunk and extract structured data:
    
    {chunk}
    
    **Return JSON** adhering strictly to this schema:
    {schema_str}
    
    **Data Normalization Rules:**
    1. Currency Conversion:
    - Convert all monetary values to CAD using FY-end exchange rates
    - Denote converted amounts as floats (e.g., 1500000.0)
    
    2. Missing Data Handling:
    - Use 0.0 for missing numeric fields
    - Use empty list [] for missing strategic_goals
    - Use null for optional ranking fields

    3. Structural Requirements:
    - Maintain original university name casing (e.g., "University of Toronto" not "university of toronto")
    - Preserve program/faculty names exactly as written
    - Format fiscal_year as integer (e.g., 2023)

    4. Validation:
    - Reject unrecognized fields not in schema
    - Ensure sum consistency (e.g., domestic + international = total_enrollment)
    - Verify numeric ranges (0.0 ≤ admission_rate ≤ 1.0)

    5. Data Scaling:
    - For fields labeled with $'000 or "thousands of dollars", multiply the actual value by 1000 (e.g., if a field labeled $'000 shows 1,000, the actual value is 1,000,000)
    - For fields labeled with $'000,000 or "millions of dollars", multiply the actual value by 1,000,000
    - Check table headings and footnotes for these indicators and apply appropriate scaling

    **Output Formatting:**
    - Include JSON schema validation comments for edge cases
    - Escape special characters in text fields
    - Omit unnecessary whitespace
    """
    
    # Instead of using template placeholders, directly create the messages
    messages = [
        {"role": "system", "content": system_message},
        {"role": "user", "content": human_message}
    ]
    
    for attempt in range(max_retries):
        try:
            # Call LLM directly without using the template
            response = llm.invoke(messages)
            
            # Clean and parse response
            raw_json = response.content
            cleaned = raw_json.replace('```json', '').replace('```', '').strip()
            data = json.loads(cleaned)
            print (raw_json)
            # Validate with Pydantic
            return FinancialData(**data)
            
        except (json.JSONDecodeError, ValidationError) as e:
            print(f"Validation error: {str(e)}")
            return None
        except Exception as e:
            print(f"Attempt {attempt+1} failed: {str(e)}")
            if attempt == max_retries - 1:
                return None
            time.sleep(2 ** attempt)  # Exponential backoff

def process_all_reports(reports_dir: str = "./Reports", output_file: str = "results.json") -> None:
    # Initialize or load existing results
    if os.path.exists(output_file):
        with open(output_file, 'r') as f:
            all_results = json.load(f)
    else:
        all_results = {}

    # Process each PDF in the directory
    for filename in os.listdir(reports_dir):
        if filename.endswith('.pdf'):
            file_path = os.path.join(reports_dir, filename)
            
            # Skip if already processed
            if filename in all_results:
                print(f"Skipping {filename} - already processed")
                continue
                
            print(f"Processing {filename}...")
            
            # Load and process the PDF
            loader = PyPDFLoader(file_path)
            pages = loader.load()
            
            # Combine all pages into a single text string
            full_text = ""
            for page in pages:
                full_text += page.page_content + "\n"
            
            # Process the text
            result = process_chunk(full_text)
            
            if result:
                # Store result with filename as key
                all_results[filename] = result.dict()
                
                # Save after each successful processing
                with open(output_file, 'w') as f:
                    json.dump(all_results, f, indent=4)
            else:
                print(f"Failed to process {filename}")

    print(f"All results saved to {output_file}")

def create_dashboard(json_file: str = "results.json"):
    # Load processed data
    with open(json_file, 'r') as file:
        data = json.load(file)
    
    records = list(data.values())
    df = pd.DataFrame.from_records(records)
    df['fiscal_year'] = pd.to_datetime(df['fiscal_year'], format='%Y')
    
    # Title case university names
    df['university'] = df['university'].apply(lambda x: x.title())
    
    df = df.sort_values(['university', 'fiscal_year'])

    # Initialize Dash app
    app = dash.Dash(__name__)

    # Create visualizations
    def create_revenue_chart(df):
        fig = go.Figure()
        for university in df['university'].unique():
            uni_data = df[df['university'] == university]
            fig.add_trace(go.Bar(
                x=uni_data['fiscal_year'],
                y=uni_data['government_grants'] + uni_data['tuition_fees'] + 
                  uni_data['research_funding'] + uni_data['donations'] + 
                  uni_data['other_income'],
                name=university
            ))
        fig.update_layout(title='Total Revenue by University', 
                         xaxis_title='Fiscal Year', 
                         yaxis_title='Revenue (CAD)')
        return fig

    def create_expense_chart(df):
        fig = go.Figure()
        for university in df['university'].unique():
            uni_data = df[df['university'] == university]
            fig.add_trace(go.Scatter(
                x=uni_data['fiscal_year'],
                y=uni_data['operational_costs'],
                mode='lines+markers',
                name=f"{university} - Operational Costs"
            ))
        fig.update_layout(title='Operational Costs by University',
                         xaxis_title='Fiscal Year',
                         yaxis_title='Costs (CAD)')
        return fig

    def create_net_assets_chart(df):
        fig = go.Figure()
        for university in df['university'].unique():
            uni_data = df[df['university'] == university]
            fig.add_trace(go.Bar(
                x=uni_data['fiscal_year'],
                y=uni_data['net_assets'],
                name=university
            ))
        fig.update_layout(title='Net Assets by University',
                         xaxis_title='Fiscal Year',
                         yaxis_title='Net Assets (CAD)')
        return fig

    # Dashboard Layout
    app.layout = html.Div([
        html.H1("University Financial Dashboard"),
        dcc.Graph(id='revenue-chart', figure=create_revenue_chart(df)),
        dcc.Graph(id='expense-chart', figure=create_expense_chart(df)),
        dcc.Graph(id='net-assets-chart', figure=create_net_assets_chart(df)),
        html.Div([
            html.Button("Get Insights", id="insight-button", n_clicks=0),
            html.Div(id="insights-output")
        ])
    ])

    # Callback for insights generation
    @app.callback(
        Output("insights-output", "children"),
        Input("insight-button", "n_clicks"),
        State("revenue-chart", "figure"),
        State("expense-chart", "figure"),
        State("net-assets-chart", "figure")
    )
    def generate_insights(n_clicks, revenue_fig, expense_fig, net_assets_fig):
        if n_clicks > 0:
            llm = ChatOpenAI(
                model="deepseek/deepseek-chat-v3-0324:free",
                openai_api_key=OPENROUTER_API_KEY,
                openai_api_base="https://openrouter.ai/api/v1",
                temperature=0.7
            )
            
            prompt_template = PromptTemplate(
                input_variables=["data_description", "chart_type"],
                template="Analyze this university financial data: {data_description}\n\nGenerate 3 key insights for the {chart_type} chart."
            )
            
            chain = LLMChain(llm=llm, prompt=prompt_template)
            
            data_description = df.to_json()
            insights = {
                "revenue": chain.run(data_description=data_description, chart_type="revenue"),
                "expense": chain.run(data_description=data_description, chart_type="expense"),
                "net_assets": chain.run(data_description=data_description, chart_type="net assets")
            }
            
            return html.Div([
                html.H3("Revenue Insights"),
                html.P(insights["revenue"]),
                html.H3("Expense Insights"),
                html.P(insights["expense"]),
                html.H3("Net Assets Insights"),
                html.P(insights["net_assets"])
            ])
        return ""

    return app
if __name__ == "__main__":
    # Usage
    process_all_reports()
    # Create and run dashboard
    app = create_dashboard()
    app.run(debug=True, port=8050)