with open('T:/Rag-chatbot/app/dashboard/[[...tab]]/page.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for idx in range(1250, 1295):
    print(f"{idx+1}: {lines[idx].strip()}")
