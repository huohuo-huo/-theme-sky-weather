import os
import subprocess
import zipfile
from pathlib import Path

EXCLUDED_PREFIXES = (".github/", "dist/", "scripts/")

tag = os.environ["TAG"]
output = Path(f"dist/theme-sky-weather-{tag}.zip")
output.parent.mkdir(parents=True, exist_ok=True)
files = subprocess.check_output(["git", "ls-files"], text=True).splitlines()
with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as archive:
    for file in files:
        if file.startswith(EXCLUDED_PREFIXES):
            continue
        if not Path(file).is_file():
            continue
        archive.write(file, file)