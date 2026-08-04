with open('T:/Rag-chatbot/app/components/Chatbox.tsx', 'r', encoding='utf-8') as f:
    for idx, line in enumerate(f, start=1):
        if 'messages' in line or 'useState' in line or 'welcome' in line or 'greeting' in line or 'Help' in line:
            if idx > 100 and idx < 200:
                print(f"Line {idx}: {line.strip()}")
print("Done")
