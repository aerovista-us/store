# Store Signal audio

The storefront mini-player loads **`store-signal.mp3`** from this folder by default (`./audio/store-signal.mp3`).

1. Add your licensed loop or track as `store-signal.mp3` here, **or**
2. Before the main script runs, set a custom URL:

   ```html
   <script>window.AV_STORE_AUDIO_SRC = "https://your-cdn.com/path/track.mp3";</script>
   ```

The player does **not** autoplay audio; the user must press play (browser policy and UX).
