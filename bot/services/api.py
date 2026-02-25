import aiohttp
from config import API_URL, API_SECRET_KEY

HEADERS = {
    'Content-Type': 'application/json',
    'X-Api-Key': API_SECRET_KEY,
}


async def api_post(endpoint: str, data: dict) -> dict:
    """POST request to Node.js backend API."""
    url = f"{API_URL}/api/bot/{endpoint}"
    async with aiohttp.ClientSession() as session:
        async with session.post(url, json=data, headers=HEADERS) as resp:
            result = await resp.json()
            if resp.status >= 400:
                print(f"API error [{resp.status}] {endpoint}: {result}")
            return result


async def api_get(endpoint: str, params: dict = None) -> dict:
    """GET request to Node.js backend API."""
    url = f"{API_URL}/api/bot/{endpoint}"
    async with aiohttp.ClientSession() as session:
        async with session.get(url, params=params, headers=HEADERS) as resp:
            return await resp.json()
