import json, os

home = os.path.expanduser('~')

def read_jsonl(filepath, max_lines=40):
    msgs = []
    try:
        f = open(filepath)
        lines = f.readlines()
        f.close()
        for line in lines[:max_lines]:
            try:
                msgs.append(json.loads(line.strip()))
            except Exception:
                pass
    except Exception as e:\n        print("Error reading " + filepath + ": " + str(e))
    return msgs

def extract_text(content):
    if isinstance(content, list):
        parts = []
        for c in content:
            if isinstance(c, dict) and c.get('type') == 'text':
                parts.append(c.get('text', '')[:400])
        return ' '.join(parts)
    return str(content)[:400]

sessions_path = home + '/.openclaw/agents/main/sessions/sessions.json'
data = json.load(open(sessions_path))

sorted_sessions = sorted(data.items(), key=lambda x: x[1].get('updatedAt', 0), reverse=True)

print("=== RECENT SESSION CONTENT AUDIT ===\n")
for key, meta in sorted_sessions[:8]:
    session_file = meta.get('sessionFile', '')
    if not session_file or not os.path.exists(session_file):
        continue
    msgs = read_jsonl(session_file, 20)
    if not msgs:
        continue

    status = meta.get('status', '?')
    tokens = meta.get('totalTokens', 0)
    spawned_by = meta.get('spawnedBy', '')

    print("KEY: " + key)
    print("  status=" + str(status) + "  tokens=" + str(tokens) + "  spawnedBy=" + str(spawned_by or 'none'))
    print("  messages=" + str(len(msgs)))

    for m in msgs[:6]:
        role = m.get('role', m.get('type', '?'))
        text = extract_text(m.get('content', ''))
        if text.strip():
            print("  [" + str(role) + "]: " + repr(text[:250]))
    print()
