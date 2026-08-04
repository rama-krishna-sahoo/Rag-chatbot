import os

def fix_file(filepath):
    print(f"Fixing {filepath}...")
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace all double-slash opacity markers
    content = content.replace('#B2EA4D]/15/60', '#B2EA4D]/15')
    content = content.replace('#B2EA4D]/15/50', '#B2EA4D]/15')
    content = content.replace('#B2EA4D]/15/80', '#B2EA4D]/15')
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

fix_file('T:/Rag-chatbot/app/dashboard/[[...tab]]/KnowledgeUniverse.tsx')
fix_file('T:/Rag-chatbot/app/dashboard/[[...tab]]/page.tsx')
print("All malformed Tailwind classes fixed!")
