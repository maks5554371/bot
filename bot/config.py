import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

BOT_TOKEN = os.getenv('BOT_TOKEN', '')
API_URL = os.getenv('BACKEND_URL', 'http://localhost:3001')
API_SECRET_KEY = os.getenv('API_SECRET_KEY', 'dev-api-key')
