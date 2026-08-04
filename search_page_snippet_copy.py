with open('T:/Rag-chatbot/app/dashboard/[[...tab]]/page.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for idx in range(1255, 1290):
    line = lines[idx]
    line_clean = ''.join(c for c in line if ord(c) < 128)
    print(f"{idx+1}: {line_clean.strip()}")
