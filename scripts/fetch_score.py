# /// script
# requires-python = ">=3.10"
# dependencies = ["requests"]
# ///
"""Fetch a MusicXML/MXL score from a URL.

Usage:
    uv run scripts/fetch_score.py <url> <name>

Examples:
    uv run scripts/fetch_score.py https://example.com/score.mxl clair_de_lune
    uv run scripts/fetch_score.py https://example.com/score.xml arabesque_1

Saves to public/scores/<name>.xml, auto-extracting .mxl (zip) archives.
"""
import argparse
import zipfile
import io
import os
import sys

import requests


def fetch_score(url: str, output_name: str) -> None:
    output_dir = "public/scores"
    os.makedirs(output_dir, exist_ok=True)

    output_path = os.path.join(output_dir, f"{output_name}.xml")

    print(f"Downloading {url}...")
    try:
        response = requests.get(url, timeout=20)
        response.raise_for_status()

        # Check if it's already an XML file or an MXL (zip)
        content_type = response.headers.get("Content-Type", "")
        if "xml" in content_type or response.content.startswith(b"<?xml"):
            with open(output_path, "wb") as f:
                f.write(response.content)
            print(f"Saved XML to {output_path}")
            return

        # Handle .mxl (zip containing MusicXML)
        with zipfile.ZipFile(io.BytesIO(response.content)) as z:
            xml_files = [
                f
                for f in z.namelist()
                if (f.endswith(".xml") or f.endswith(".musicxml"))
                and not f.startswith("META-INF/")
            ]

            if xml_files:
                main_xml = xml_files[0]
                print(f"Extracting {main_xml} from .mxl archive...")
                with z.open(main_xml) as f_in, open(output_path, "wb") as f_out:
                    f_out.write(f_in.read())
                print(f"Saved to {output_path}")
            else:
                print("No XML file found in the archive.")
                print("Contents:", z.namelist())
                sys.exit(1)

    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("url", help="URL of the .mxl or .xml file")
    parser.add_argument("name", help="Output filename (without extension)")

    args = parser.parse_args()
    fetch_score(args.url, args.name)
