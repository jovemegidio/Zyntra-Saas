import unicodedata
from pathlib import Path
from collections import Counter

f = Path(r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\Financeiro\relatorios.html')
content = f.read_text(encoding='utf-8', errors='replace')

# Count all non-ASCII characters
non_ascii = Counter()
samples = {}
for i, c in enumerate(content):
    if ord(c) > 127:
        non_ascii[c] += 1
        if c not in samples:
            samples[c] = content[max(0, i-5):i+15].replace('\n', ' ')

print("=== Non-ASCII characters in relatorios.html (UTF-8 read) ===")
for char, count in non_ascii.most_common(30):
    name = unicodedata.name(char, '?')
    sample = samples.get(char, '')
    print(f"  U+{ord(char):04X} ({char}) x{count:3d}  {name}  | {repr(sample)}")

print()
print("=== Checking for specific mojibake patterns ===")
patterns_to_check = [
    ("Á³", "should be ó"),
    ("Á§", "should be ç"),
    ("Á£", "should be ã"),
    ("Á¡", "should be á"),
    ("Áº", "should be ú"),
    ("Áª", "should be ê"),
    ("Á´", "should be ô"),
    ("Áµ", "should be õ"),
    ("Á­", "should be í"),
    ("Á¢", "should be â"),
    ("Á©", "should be é"),
    ("Ã³", "double-encoded ó"),
    ("Ã§", "double-encoded ç"),
    ("Ã£", "double-encoded ã"),
    ("ó", "correct ó"),
    ("ç", "correct ç"),
    ("ã", "correct ã"),
]
for pattern, desc in patterns_to_check:
    count = content.count(pattern)
    if count > 0:
        idx = content.find(pattern)
        ctx = content[max(0, idx-10):idx+20].replace('\n', ' ')
        print(f"  {repr(pattern)} ({desc}): {count} occurrences | sample: {repr(ctx)}")
