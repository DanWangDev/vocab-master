from pypdf import PdfReader
import os

pdf_path = r"g:\WordCardShffle\resources\11-plus-vocabulary-list.pdf"

if not os.path.exists(pdf_path):
    print(f"Error: content not found at {pdf_path}")
    exit(1)

reader = PdfReader(pdf_path)
print(f"Number of pages: {len(reader.pages)}")

# Print the first page text to understand the structure
print("--- Page 1 Preview ---")
print(reader.pages[0].extract_text())
print("----------------------")
