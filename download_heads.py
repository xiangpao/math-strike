import os
import urllib.request

ASSETS = {
    "public/assets/player.png": "https://mc-heads.net/avatar/MHF_Steve/64",
    "public/assets/maqi.png": "https://mc-heads.net/avatar/MHF_Alex/64",
    "public/assets/creeper.png": "https://mc-heads.net/avatar/MHF_Creeper/64",
    "public/assets/zombie.png": "https://mc-heads.net/avatar/MHF_Zombie/64",
    "public/assets/skeleton.png": "https://mc-heads.net/avatar/MHF_Skeleton/64",
    "public/assets/enderman.png": "https://mc-heads.net/avatar/MHF_Enderman/64",
    "public/assets/spider.png": "https://mc-heads.net/avatar/MHF_Spider/64",
    "public/assets/wither.png": "https://mc-heads.net/avatar/MHF_Wither/64"
}

os.makedirs("public/assets", exist_ok=True)

for path, url in ASSETS.items():
    print(f"Downloading {url} to {path}...")
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response, open(path, 'wb') as out_file:
            out_file.write(response.read())
        print(f"Successfully downloaded {path}")
    except Exception as e:
        print(f"Failed to download {path}: {e}")
