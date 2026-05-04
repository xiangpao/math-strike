import os
import urllib.request

ASSETS = {
    "public/assets/player.png": "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20.1/assets/minecraft/textures/entity/steve.png",
    "public/assets/creeper.png": "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20.1/assets/minecraft/textures/entity/creeper/creeper.png",
    "public/assets/zombie.png": "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20.1/assets/minecraft/textures/entity/zombie/zombie.png",
    "public/assets/skeleton.png": "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20.1/assets/minecraft/textures/entity/skeleton/skeleton.png",
    "public/assets/enderman.png": "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20.1/assets/minecraft/textures/entity/enderman/enderman.png",
    "public/assets/spider.png": "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20.1/assets/minecraft/textures/entity/spider/spider.png",
    "public/assets/wither.png": "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20.1/assets/minecraft/textures/entity/wither/wither.png",
    "public/assets/dragon.png": "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20.1/assets/minecraft/textures/entity/enderdragon/dragon.png",
    "public/assets/bgm.mp3": "https://raw.githubusercontent.com/adragon09/quins-mess/ccd02c83bc774870b6f8e2c123d94b1b963a40da/BespokeAssetSources/character_dialog_sfx/forsen/sven/sweden.mp3"
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
