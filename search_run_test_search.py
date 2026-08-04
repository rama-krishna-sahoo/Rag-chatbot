with open('T:/Rag-chatbot/app/dashboard/[[...tab]]/page.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for idx, line in enumerate(lines, start=1):
    if 'runTestSearch' in line:
        print(f"Line {idx}: {line.strip()}")
