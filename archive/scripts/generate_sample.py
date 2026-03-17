import json
import requests
from bs4 import BeautifulSoup
import time
import os
import sys

# Add scripts directory to path to import vocab_tools
sys.path.append(os.path.join(os.path.dirname(__file__)))
from vocab_tools import extract_words_from_pdf

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
        
        # --- Definitions (Kids) ---
        definitions = []
        kids_section = soup.find('div', {'id': 'kidsdictionary'})
        
        if kids_section:
            # Look for all definition text blocks in the kids section
            dt_texts = kids_section.select('div.vg span.dtText')
            for dt in dt_texts:
                text = dt.get_text().strip()
                # Clean up leading colons
                if text.startswith(':'):
                    text = text[1:].strip()
                if text:
                    definitions.append(text)
        
        if not definitions:
            # Fallback to main definition
            print(f"  -> No Kids Definition for '{word}', checking main definition...")
            main_entry = soup.find('div', {'id': 'dictionary-entry-1'})
            if main_entry:
                dt_texts = main_entry.select('div.vg span.dtText')
                for dt in dt_texts:
                    text = dt.get_text().strip()
                    if text.startswith(':'):
                        text = text[1:].strip()
                    if text:
                        definitions.append(text)
            else:
                 print(f"Warning: No Main Definition found for '{word}' either")

        # --- Examples ---
        examples = []
        # Try finding the "Examples of {word} in a Sentence" section
        # Often under id="examples" or just looking for the header
        
        # Strategy 1: Look for examples inside the kids definition (often simpler)
        if kids_section:
             ex_sents = kids_section.select('span.ex-sent')
             for ex in ex_sents:
                 # usually text is inside, sometimes in span.t
                 txt = ex.get_text(" ", strip=True) 
                 if txt:
                     examples.append(txt)
        
        # Strategy 2: If no kids examples, or to supplement, look for "Examples of ... in a Sentence" section
        if not examples:
             examples_section = soup.find('div', {'id': 'examples'}) # common id
             if not examples_section:
                 # Try finding by header text
                 headers = soup.find_all('h2')
                 for h in headers:
                     if "Examples of" in h.get_text() and "in a Sentence" in h.get_text():
                         examples_section = h.find_parent('div')
                         break
             
             if examples_section:
                 # Editorial examples are usually in ul.in-sentences or span.ex-sent
                 ex_sents = examples_section.select('span.ex-sent')
                 for ex in ex_sents:
                     txt = ex.get_text(" ", strip=True)
                     if txt:
                         examples.append(txt)
        
        # Strategy 3: Grab examples from the main definition if still finding nothing
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
        # Main synonyms section (usually better than Kids synonyms which might not exist or be sparse)
        synonyms_section = soup.find('div', {'id': 'synonyms'})
        if synonyms_section:
            links = synonyms_section.select('ul.mw-grid-table-list li a.syn-link')
            for link in links:
                synonyms.append(link.get_text().strip())
        
        return {
            "targetWord": word,
            "definition": definitions[:5], # Limit to reasonable number
            "synonyms": synonyms[:10],
            "exampleSentence": examples[:3] # Limit to 3 examples
        }

    except Exception as e:
        print(f"Error fetching {word}: {e}")
        return None

def main():
    pdf_path = r"g:\WordCardShffle\resources\11-plus-vocabulary-list.pdf"
    output_path = r"g:\WordCardShffle\resources\words_sample.json"
    
    print("Extracting words from PDF...")
    words = extract_words_from_pdf(pdf_path)
    print(f"Found {len(words)} candidates.")
    
    # Pick first 20 valid words
    target_count = 20
    results = []
    
    # We loop until we get 10 valid entries (sometimes scraping might fail or word invalid)
    processed = 0
    candidate_idx = 0
    
    while len(results) < target_count and candidate_idx < len(words):
        word = words[candidate_idx]
        candidate_idx += 1
        
        print(f"Processing '{word}' ({len(results)}/{target_count})...")
        
        data = fetch_word_data(word)
        if data:
            # Check if we got definitions. If not, maybe skip?
            # User instructions didn't say skip if empty, but for a sample we want good data.
            # Let's include it but log warning.
            if not data['definition']:
                 print(f"  -> No definitions found for {word} (checked Kids and Main)")
                 # Skip if absolutely no definition found
                 pass
            else:
                 results.append(data)
        
        # Be nice to the server
        time.sleep(1.0)
        
    print(f"Generated {len(results)} items.")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2)
    print(f"Saved to {output_path}")

if __name__ == "__main__":
    main()
