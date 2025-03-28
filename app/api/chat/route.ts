import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = 'http://127.0.0.1:5000';

// Handler for POST /api/chat requests
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Forward the request to the Flask backend
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { 
          success: false, 
          response: 'An error occurred while processing your request. Please try again later.',
          sources: [],
          conversation_id: 'error'
        }, 
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in chat API route:', error);
    return NextResponse.json(
      { 
        success: false, 
        response: 'An error occurred while connecting to the backend service. Please ensure the backend service is running.',
        sources: [],
        conversation_id: 'error'
      }, 
      { status: 500 }
    );
  }
}

// Handler for POST /api/chat/index-reports requests to manually trigger indexing
export async function PATCH(request: NextRequest) {
  try {
    // Forward the request to the Flask backend
    const response = await fetch(`${API_BASE_URL}/api/chat/index-reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    // Handle error responses from backend
    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error || 'Failed to index reports' },
        { status: response.status }
      );
    }
    
    // Return the successful response
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error processing index request:', error);
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
} 