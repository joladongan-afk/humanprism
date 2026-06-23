"""
Upgrade font sizes in Plans, AppointmentNew, MyRoom pages.
Mapping: text-xs→text-sm, text-sm→text-base, text-base→text-lg
Hero/display sizes (text-xl, text-2xl, text-3xl+) are left unchanged.
"""
import re

FILES = [
    "client/src/pages/Plans.tsx",
    "client/src/pages/AppointmentNew.tsx",
    "client/src/pages/MyRoom.tsx",
]

# Only upgrade these specific small sizes in className strings
UPGRADES = [
    # Order matters: do xs→sm first, then sm→base, then base→lg
    (r'\btext-xs\b', 'text-sm'),
    (r'\btext-sm\b', 'text-base'),
    (r'\btext-base\b', 'text-lg'),
]

import os
os.chdir("/home/ubuntu/human-prism")

for filepath in FILES:
    with open(filepath, "r") as f:
        content = f.read()
    
    original = content
    
    # Apply upgrades sequentially but carefully:
    # We need to avoid double-upgrading. Use a placeholder approach.
    # Step 1: xs → __SM__
    content = re.sub(r'\btext-xs\b', 'text-__SM__', content)
    # Step 2: sm → __BASE__
    content = re.sub(r'\btext-sm\b', 'text-__BASE__', content)
    # Step 3: base → __LG__
    content = re.sub(r'\btext-base\b', 'text-__LG__', content)
    # Step 4: resolve placeholders
    content = content.replace('text-__SM__', 'text-sm')
    content = content.replace('text-__BASE__', 'text-base')
    content = content.replace('text-__LG__', 'text-lg')
    
    if content != original:
        with open(filepath, "w") as f:
            f.write(content)
        print(f"Updated: {filepath}")
    else:
        print(f"No changes: {filepath}")

print("Done.")
