import re

def check_file(filepath):
    print(f"Checking {filepath}...")
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find patterns like /[#hex]/15/60 or /[#hex]/15/50 etc.
    matches = re.finditer(r'#B2EA4D\]/\d+/\d+', content)
    for m in matches:
        print(f"Found invalid class pattern at char {m.start()}: {m.group()}")

check_file('T:/Rag-chatbot/app/dashboard/[[...tab]]/KnowledgeUniverse.tsx')
check_file('T:/Rag-chatbot/app/dashboard/[[...tab]]/page.tsx')
