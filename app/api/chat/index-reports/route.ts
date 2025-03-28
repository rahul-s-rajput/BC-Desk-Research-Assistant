import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = 'http://127.0.0.1:5000';

// Handler for POST requests to index reports
export async function POST(request: NextRequest) {
  try {
    // Forward the request to the Flask backend
    const response = await fetch(`${API_BASE_URL}/api/chat/index-reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { 
          success: false, 
          message: 'Failed to index reports. Please try again later.',
        }, 
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in index-reports API route:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'An error occurred while connecting to the backend service. Please ensure the backend service is running.',
      }, 
      { status: 500 }
    );
  }
} 