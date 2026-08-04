with open('T:/Rag-chatbot/app/dashboard/[[...tab]]/page.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for idx, line in enumerate(lines, start=1):
    if 'runTestSearch' in line or 'fetch(' in line or 'res.json()' in line:
        if idx > 1150 and idx < 1250:
            print(f"Line {idx}: {line.strip()}")
