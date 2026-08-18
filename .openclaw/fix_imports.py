with open('components/Agent3D.tsx', 'r') as f:\n    content = f.read()\n\n# Remove blendFunction prop from ChromaticAberration\nold = "      <ChromaticAberration\n        blendFunction={BlendFunction.NORMAL}\n        offset"
new = "      <ChromaticAberration\n        offset"
content = content.replace(old, new)

# Remove the BlendFunction import line
content = content.replace(
    "import { BlendFunction } from 'postprocessing'",
    "// postprocessing BlendFunction (unused)"
)

with open('components/Agent3D.tsx', 'w') as f:\n    f.write(content)\n\nprint('Done - replaced', 1 if old in open('components/Agent3D.tsx').read() else 0, 'remaining occurrences')\n