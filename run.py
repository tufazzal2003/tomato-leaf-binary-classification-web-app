from app import app

if __name__ == '__main__':
    print("🚀 Starting Tomato Leaf Disease Detection Web App...")
    print("📍 Visit: http://localhost:5000")
    print("📱 Press CTRL+C to stop the server")
    app.run(debug=True, host='0.0.0.0', port=5000)