from flask import Flask, request, jsonify, render_template, send_file
from google import generativeai as genai
import time
from PIL import Image
import pyautogui
import os
from dotenv import load_dotenv
from pymongo import MongoClient
from io import BytesIO
from groq import Groq
import base64
from PyPDF2 import PdfReader

# Load environment variables
load_dotenv()

class ScreenAnalyzer:
    def __init__(self):
        """Initialize the ScreenAnalyzer with the GenAI client and MongoDB connection."""
        genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
        self.model = genai.GenerativeModel('models/gemini-1.5-flash')
        
        # Connect to MongoDB Atlas
        self.mongo_client = MongoClient(os.getenv("MONGODB_URI"))
        self.db = self.mongo_client["whiteboardai"]
        self.collection = self.db["drawimg"]

    @staticmethod
    def capture_screen():
        """Captures a screenshot and returns it as a PIL Image object."""
        screenshot = pyautogui.screenshot()
        return screenshot.convert("RGB")

    def save_to_mongodb(self, image, metadata=None):
        """Saves the screenshot to MongoDB as binary data."""
        metadata = metadata or {}
        # Convert PIL Image to bytes
        img_byte_arr = BytesIO()
        image.save(img_byte_arr, format='PNG')
        
        # Save the image and metadata
        self.collection.insert_one({
            "screenshot": img_byte_arr.getvalue(),
            "metadata": metadata,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        })

    def analyze_screen(self, prompt):
        """Analyzes the screen based on a screenshot and prompt."""
        try:
            screen = self.capture_screen()
            self.save_to_mongodb(screen, metadata={"prompt": prompt})  # Save screenshot to MongoDB
            
            # Convert PIL Image to bytes
            img_byte_arr = BytesIO()
            screen.save(img_byte_arr, format='PNG')
            img_byte_arr = img_byte_arr.getvalue()
            
            # Create a list with the prompt and image data
            content = [
                "((ignore whiteboard buttons ,visual assistant in provided image in reponse dont provide about it anything)in reponse dont say image contains ,if user ask about pdf data if user query answer not available in that data then provide your reponse and if available then provide reponse from available data)Analyze the following only (drawing content and pdf data) also, focusing only on the content drawn on the whiteboard or PDF data. Ignore any UI elements, buttons, or non-content areas. Provide a stepwise solution/reponse with each step on a new line.( provide stepwise solution with final answer if question is provided && in reponse dont use keyword like image contains )",
                prompt,
                {"mime_type": "image/png", "data": base64.b64encode(img_byte_arr).decode('utf-8')}
            ]
            
            response = self.model.generate_content(content)
            return response.text
        except Exception as e:
            return f"Error analyzing screen: {str(e)}"

app = Flask(__name__)

# Initialize ScreenAnalyzer
analyzer = ScreenAnalyzer()

# Initialize Groq client
groq_client = Groq(api_key=os.getenv('GROQ_API_KEY'))

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/analyze_screen', methods=['POST'])
def analyze_screen():
    try:
        data = request.json
        query = data.get('query', '')
        if not query:
            return jsonify({"error": "No query provided"}), 400
            
        response = analyzer.analyze_screen(query)
        return jsonify({"response": response})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        query = data.get('query')
        if not query:
            return jsonify({"error": "No query provided"}), 400
        
        # Use Groq with Llama model for chat
        chat_completion = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are a helpful educational assistant."},
                {"role": "user", "content": query}
            ],
            temperature=0.7,
            max_tokens=1000
        )
        
        return jsonify({"response": chat_completion.choices[0].message.content})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/upload_pdf', methods=['POST'])
def upload_pdf():
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
            
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
            
        if file and file.filename.endswith('.pdf'):
            pdf_reader = PdfReader(file)
            text_content = []
            
            for page in pdf_reader.pages:
                text_content.append(page.extract_text())
                
            return jsonify({
                "success": True,
                "content": text_content
            })
            
        return jsonify({"error": "Invalid file format"}), 400
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
