from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import os
import json

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Sample data function (replace with your actual data loading logic)
def load_financial_data():
    # Load from JSON file
    with open('results.json', 'r') as f:
        return json.load(f)

# API route to get all financial data
@app.route('/api/financial-data', methods=['GET'])
def get_financial_data():
    try:
        data = load_financial_data()
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# API route to get filtered financial data
@app.route('/api/financial-data/filter', methods=['GET'])
def get_filtered_data():
    try:
        university = request.args.get('university', 'all')
        year = request.args.get('year', 'all')
        
        data = load_financial_data()
        filtered_data = {}
        
        for key, item in data.items():
            if (university == 'all' or item['university'] == university) and \
               (year == 'all' or item['fiscal_year'] == int(year)):
                filtered_data[key] = item
        
        return jsonify(filtered_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# API route to get unique universities
@app.route('/api/universities', methods=['GET'])
def get_universities():
    try:
        data = load_financial_data()
        universities = list(set(item['university'] for item in data.values()))
        return jsonify(universities)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# API route to get unique years
@app.route('/api/years', methods=['GET'])
def get_years():
    try:
        data = load_financial_data()
        years = list(set(item['fiscal_year'] for item in data.values()))
        years.sort(reverse=True)  # Sort in descending order
        return jsonify(years)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)