"""
Multimodal Embeddings Fusion Generator

Combines text embeddings (60%) and visual image embeddings (40%) into L2-normalized 384-dimensional multimodal fused vectors.
Saves:
  - backend/embeddings/fused_embeddings.npy
"""

import sys
import logging
from pathlib import Path
import numpy as np

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

BACKEND_DIR = Path(__file__).resolve().parent.parent
EMBEDDINGS_DIR = BACKEND_DIR / "embeddings"


def fuse_multimodal_embeddings(text_weight=0.6, image_weight=0.4):
    text_path = EMBEDDINGS_DIR / "text_embeddings.npy"
    image_path = EMBEDDINGS_DIR / "image_embeddings.npy"

    if not text_path.exists():
        logging.error(f"text_embeddings.npy not found at {text_path}. Run build_text_embeddings.py first.")
        sys.exit(1)

    if not image_path.exists():
        logging.error(f"image_embeddings.npy not found at {image_path}. Run build_image_embeddings.py first.")
        sys.exit(1)

    logging.info(f"Loading text embeddings from {text_path}...")
    text_vecs = np.load(text_path)

    logging.info(f"Loading image embeddings from {image_path}...")
    image_vecs = np.load(image_path)

    if text_vecs.shape != image_vecs.shape:
        logging.error(f"Shape mismatch: text {text_vecs.shape} vs image {image_vecs.shape}")
        sys.exit(1)

    logging.info(f"Fusing embeddings with weights (Text: {text_weight:.2f}, Visual Image: {image_weight:.2f})...")
    fused = (text_weight * text_vecs) + (image_weight * image_vecs)

    # L2 normalize fused vectors
    norms = np.linalg.norm(fused, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    fused_norm = fused / norms

    output_path = EMBEDDINGS_DIR / "fused_embeddings.npy"
    np.save(output_path, fused_norm.astype(np.float32))

    logging.info(f"\n================================================================================")
    logging.info(f"                  MULTIMODAL EMBEDDINGS FUSION COMPLETED                         ")
    logging.info(f"================================================================================")
    logging.info(f"Fused Saved  : {output_path}")
    logging.info(f"Matrix Shape : {fused_norm.shape} (dtype: {fused_norm.dtype})")
    logging.info(f"================================================================================\n")


if __name__ == "__main__":
    fuse_multimodal_embeddings()
