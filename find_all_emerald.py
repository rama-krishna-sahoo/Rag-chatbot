import os
import re

patterns = [
    re.compile(r'emerald', re.I),
    re.compile(r'teal', re.I),
    re.compile(r'14b8a6', re.I)
]

for root, dirs, files in os.walk('T:/Rag-chatbot'):
    if any(ignore in root for ignore in ['node_modules', '.git', '.next']):
        continue
    for file in files:
        if file.endswith(('.tsx', '.ts', '.css', '.html', '.js')):
            filepath = os.path.join(root, file)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                for pat in patterns:
                    matches = pat.findall(content)
                    if matches:
                        print(f"Found {pat.pattern} in {filepath} (count: {len(matches)})")
            except:
                pass
print("Done")
