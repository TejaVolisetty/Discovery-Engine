import os
import sys
import zipfile
from pathlib import Path

DATA_DIR = Path(__file__).parent.resolve()
RAW_DIR = DATA_DIR / "raw"
COMPETITION_NAME = "h-and-m-personalized-fashion-recommendations"

REQUIRED_FILES = [
    "articles.csv",
    "customers.csv",
    "transactions_train.csv",
]

REQUIRED_DIRS = [
    "images",
]


def print_kaggle_instructions():
    """Prints clear step-by-step Kaggle API setup instructions."""
    raw_path = RAW_DIR.resolve()
    instructions = f"""
================================================================================
                     KAGGLE API SETUP INSTRUCTIONS
================================================================================

Kaggle credentials were not found or Kaggle API is not configured.

To automatically download the H&M Personalized Fashion Recommendations dataset:

Option 1: Configure Kaggle API Credentials
-------------------------------------------
1. Create a Kaggle account at https://www.kaggle.com (if you haven't already).
2. Install the Kaggle Python package (if not already installed):
   pip install kaggle
3. Go to your Account Settings: https://www.kaggle.com/settings
4. Scroll to the "API" section and click "Create New Token".
   This will download a `kaggle.json` file.
5. Move `kaggle.json` to the default directory:
   - Windows: C:\\Users\\<Your-Username>\\.kaggle\\kaggle.json
   - macOS/Linux: ~/.kaggle/kaggle.json
   (Alternatively, set environment variables: KAGGLE_USERNAME and KAGGLE_KEY)
6. Accept competition rules:
   Go to https://www.kaggle.com/c/{COMPETITION_NAME}/rules and click "I Understand and Accept".
7. Re-run this script:
   python fetch_data.py

Option 2: Manual Download
-------------------------
1. Download the dataset from:
   https://www.kaggle.com/c/{COMPETITION_NAME}/data
2. Extract the files into:
   {raw_path}
   Required structure:
   - {raw_path / 'articles.csv'}
   - {raw_path / 'customers.csv'}
   - {raw_path / 'transactions_train.csv'}
   - {raw_path / 'images'} (folder containing article images)

================================================================================
"""
    print(instructions)


def check_kaggle_config() -> bool:
    """Checks if Kaggle API package and credentials are configured."""
    try:
        import kaggle
    except ImportError:
        return False

    kaggle_json_win = Path(os.path.expanduser("~/.kaggle/kaggle.json"))
    has_json = kaggle_json_win.exists()
    has_env = "KAGGLE_USERNAME" in os.environ and "KAGGLE_KEY" in os.environ
    return has_json or has_env


def download_and_extract():
    """Downloads dataset via Kaggle API and extracts it to /data/raw."""
    RAW_DIR.mkdir(parents=True, exist_ok=True)

    # Check if raw files and images directory already exist
    files_present = all((RAW_DIR / rf).exists() for rf in REQUIRED_FILES)
    dirs_present = all((RAW_DIR / rd).is_dir() for rd in REQUIRED_DIRS)

    if files_present and dirs_present:
        print(f"[INFO] Required dataset files and image folder already exist in {RAW_DIR.resolve()}:")
        for rf in REQUIRED_FILES:
            print(f"  - {RAW_DIR / rf}")
        for rd in REQUIRED_DIRS:
            print(f"  - {RAW_DIR / rd}\\")
        return

    if not check_kaggle_config():
        print_kaggle_instructions()
        return

    try:
        from kaggle.api.kaggle_api_extended import KaggleApi
        api = KaggleApi()
        api.authenticate()
        print(f"[INFO] Downloading '{COMPETITION_NAME}' dataset to {RAW_DIR.resolve()}...")
        api.competition_download_files(COMPETITION_NAME, path=str(RAW_DIR))

        # Iteratively extract any downloaded zip files (including nested zips like images.zip)
        while True:
            zip_files = list(RAW_DIR.glob("*.zip"))
            if not zip_files:
                break
            for zip_path in zip_files:
                print(f"[INFO] Extracting {zip_path.name}...")
                with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                    zip_ref.extractall(RAW_DIR)
                os.remove(zip_path)

        print(f"[SUCCESS] Dataset downloaded and extracted successfully to {RAW_DIR.resolve()}")

    except Exception as e:
        print(f"[ERROR] Failed to download dataset via Kaggle API: {e}")
        print_kaggle_instructions()


if __name__ == "__main__":
    download_and_extract()

