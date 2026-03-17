from pypdf import PdfReader
import re

def extract_words_from_pdf(pdf_path):
    reader = PdfReader(pdf_path)
    text = ""
    for page in reader.pages:
        text += page.extract_text() + " "
    
    # Basic cleaning
    # Replace newlines with spaces
    text = text.replace('\n', ' ')
    
    # Remove fix ligatures like "fi " -> "fi" is hard without context.
    # We will just split by space and filter.
    
    words = text.split(' ')
    
    cleaned_words = []
    for w in words:
        # Remove punctuation
        w = re.sub(r'[^\w\-]', '', w)
        w = w.strip()
        
        # Filter junk
        if not w:
            continue
        if any(c.isdigit() for c in w):
            continue
        if len(w) < 4: # Skip very short words/fragments for now
            continue
        if w[0].isupper(): # Skip capitalized words (likely headers/start of sentences in instructions)
            continue
            
        cleaned_words.append(w)
        
    return cleaned_words
