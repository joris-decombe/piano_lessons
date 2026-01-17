import requests

urls = [
    # Ode to Joy (Beethoven) - Usually reliable
    "https://bitmidi.com/uploads/16283.mid"
]

output_path = "public/ode.mid"

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Referer": "https://www.google.com/",
}


def is_midi(content):
    return content.startswith(b"MThd")


for url in urls:
    print(f"Trying {url}...")
    try:
        response = requests.get(url, headers=headers, allow_redirects=True, timeout=10)
        if response.status_code == 200:
            if is_midi(response.content):
                with open(output_path, "wb") as f:
                    f.write(response.content)
                print(f"Successfully downloaded VALID MIDI to {output_path} from {url}")
                break
            else:
                print(
                    f"Downloaded content from {url} was not a MIDI file (Header mismatch)."
                )
        else:
            print(f"Failed with status {response.status_code}")
    except Exception as e:
        print(f"Error: {e}")
