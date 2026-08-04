with open('T:/Rag-chatbot/app/dashboard/[[...tab]]/KnowledgeUniverse.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for idx, line in enumerate(lines, start=1):
    if 'strokeStyle' in line or 'fillStyle' in line or 'particle' in line:
        if 'console' not in line and 'import' not in line and idx > 350:
            print(f"Line {idx}: {line.strip()}")
