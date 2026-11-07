"""Compatibility command; reconstruct the groupmate base, never the retired clams schema."""
from pathlib import Path
import runpy
runpy.run_path(str(Path(__file__).with_name('generate.py')), run_name='__main__')
