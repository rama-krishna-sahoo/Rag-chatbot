with open('T:/Rag-chatbot/app/components/Chatbox.tsx', 'r', encoding='utf-8') as f:
    for idx, line in enumerate(f, start=1):
        if 'open' in line or 'isOpen' in line:
            if idx > 250:
                print(f"Line {idx}: {line.strip()}")
