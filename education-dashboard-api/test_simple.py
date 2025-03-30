import sys
import os
import time

def main():
    """
    Simple test script to verify subprocess execution
    """
    print("=== Simple Test Script Started ===")
    print(f"Python version: {sys.version}")
    print(f"Current directory: {os.getcwd()}")
    print(f"Script path: {__file__}")
    
    # Print environment variable if set
    if os.environ.get("RUNNING_FROM_API") == "true":
        print("Running from API: Yes")
    else:
        print("Running from API: No")
    
    # Small delay to simulate work
    print("Working for 2 seconds...")
    time.sleep(2)
    
    print("=== Simple Test Script Completed Successfully ===")
    return True

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"Error in test script: {str(e)}")
        sys.exit(1) 