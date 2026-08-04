with open('T:/Rag-chatbot/app/components/Chatbox.tsx', 'r', encoding='utf-8') as f:
    for idx, line in enumerate(f, start=1):
        if 'customerId' in line or 'vip-sarah' in line or 'new-parent-john' in line or 'context' in line or 'Simulate' in line:
            print(f"Line {idx}: {line.strip()}")
