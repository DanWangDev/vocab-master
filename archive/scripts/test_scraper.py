import requests
from bs4 import BeautifulSoup
import json

def fetch_word_data(word):
    url = f"https://www.merriam-webster.com/dictionary/{word}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    
    try:
        response = requests.get(url, headers=headers)
        if response.status_code != 200:
            print(f"Failed to fetch {word}: {response.status_code}")
            return None
            
        soup = BeautifulSoup(response.content, 'html.parser')
        
        with open("g:\\WordCardShffle\\debug_mw.html", "w", encoding="utf-8") as f:
            f.write(soup.prettify())
            
        # Debug: check for "Kids Definition" text
        print(f"Page text length: {len(soup.get_text())}")
        if "Kids Definition" in soup.get_text():
            print("Found 'Kids Definition' in text")
        else:
            print("'Kids Definition' NOT found in text")


        
        return {
            "targetWord": word,
            "definition": definitions[:3], # Limit to top 3
            "synonyms": synonyms[:5] # Limit to top 5
        }

    except Exception as e:
        print(f"Error fetching {word}: {e}")
        return None

# Test with 'environment'
data = fetch_word_data("environment")
print(json.dumps(data, indent=2))
