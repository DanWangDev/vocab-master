import json
import requests
from bs4 import BeautifulSoup
import time
import os
import sys

# Add scripts directory to path to import vocab_tools
sys.path.append(os.path.join(os.path.dirname(__file__)))
from vocab_tools import extract_words_from_pdf

OUTPUT_PATH = r"g:\WordCardShffle\resources\words_full.json"
PDF_PATH = r"g:\WordCardShffle\resources\11-plus-vocabulary-list.pdf"

def fetch_word_data(word):
    url = f"https://www.merriam-webster.com/dictionary/{word}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    
    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 404:
            print(f"  -> Word not found: {word}")
            return None
        if response.status_code != 200:
            print(f"Failed to fetch {word}: {response.status_code}")
            return None
            
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # --- Definitions (Kids) ---
        definitions = []
        kids_section = soup.find('div', {'id': 'kidsdictionary'})
        
        if kids_section:
            dt_texts = kids_section.select('div.vg span.dtText')
            for dt in dt_texts:
                text = dt.get_text().strip()
                if text.startswith(':'):
                    text = text[1:].strip()
                if text:
                    definitions.append(text)
        
        if not definitions:
            # Fallback to main definition
            # print(f"  -> No Kids Definition for '{word}', checking main definition...")
            main_entry = soup.find('div', {'id': 'dictionary-entry-1'})
            if main_entry:
                dt_texts = main_entry.select('div.vg span.dtText')
                for dt in dt_texts:
                    text = dt.get_text().strip()
                    if text.startswith(':'):
                        text = text[1:].strip()
                    if text:
                        definitions.append(text)
        
        # --- Examples ---
        examples = []
        if kids_section:
             ex_sents = kids_section.select('span.ex-sent')
             for ex in ex_sents:
                 txt = ex.get_text(" ", strip=True) 
                 if txt:
                     examples.append(txt)
        
        if not examples:
             examples_section = soup.find('div', {'id': 'examples'})
             if not examples_section:
                 headers = soup.find_all('h2')
                 for h in headers:
                     if "Examples of" in h.get_text() and "in a Sentence" in h.get_text():
                         examples_section = h.find_parent('div')
                         break
             if examples_section:
                 ex_sents = examples_section.select('span.ex-sent')
                 for ex in ex_sents:
                     txt = ex.get_text(" ", strip=True)
                     if txt:
                         examples.append(txt)
        
        if not examples:
             main_entry = soup.find('div', {'id': 'dictionary-entry-1'})
             if main_entry:
                  ex_sents = main_entry.select('span.ex-sent')
                  for ex in ex_sents:
                     txt = ex.get_text(" ", strip=True) 
                     if txt and txt not in examples:
                         examples.append(txt)

        # --- Synonyms ---
        synonyms = []
        synonyms_section = soup.find('div', {'id': 'synonyms'})
        if synonyms_section:
            links = synonyms_section.select('ul.mw-grid-table-list li a.syn-link')
            for link in links:
                synonyms.append(link.get_text().strip())
        
        return {
            "targetWord": word,
            "definition": definitions[:5],
            "synonyms": synonyms[:10],
            "exampleSentence": examples[:3]
        }

    except Exception as e:
        print(f"Error fetching {word}: {e}")
        return None

def main():
    print("Extracting words from PDF...")
    all_words = extract_words_from_pdf(PDF_PATH)
    print(f"Found {len(all_words)} candidates.")
    
    # Load existing progress
    results = []
    processed_words = set()
    
    if os.path.exists(OUTPUT_PATH):
        try:
            with open(OUTPUT_PATH, 'r', encoding='utf-8') as f:
                content = f.read()
                if content:
                    results = json.loads(content)
                    processed_words = {entry['targetWord'] for entry in results}
            print(f"Resuming... {len(results)} words already processed.")
        except json.JSONDecodeError:
            print("Existing file seems corrupted, starting over.")
            
    try:
        for idx, word in enumerate(all_words):
            if word in processed_words:
                continue
            
            print(f"Processing '{word}' ({len(results)}/{len(all_words)})...")
            
            data = fetch_word_data(word)
            if data:
                # Only include if we found something useful (definition or synonyms)
                if data['definition'] or data['synonyms']:
                    results.append(data)
                    processed_words.add(word)
                else:
                    print(f"  -> Skipping '{word}': No definition/synonyms found.")
            
            # Save every 10 words
            if len(results) % 10 == 0:
                with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
                    json.dump(results, f, indent=2)
            
            # Be nice to the server
            time.sleep(1.0)
            
    except KeyboardInterrupt:
        print("\nStopping script...")
    
    # Final save
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2)
    print(f"Saved {len(results)} words to {OUTPUT_PATH}")

if __name__ == "__main__":
    main()
