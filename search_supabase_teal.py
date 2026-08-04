import os
import re

target = '0096'

for root, dirs, files in os.walk('T:/Rag-chatbot'):
    if any(ignore in root for ignore in ['node_modules', '.git', '.next']):
        continue
    for file in files:
        filepath = os.path.join(root, file)
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            if target in content:
                print(f"Found 0096 in {filepath}")
        except:
            pass
print("Done")
