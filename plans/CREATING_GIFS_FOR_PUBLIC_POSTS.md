# Creating GIFs for Public Posts (Patreon/Discord/Reddit/X)

Guide for capturing short GIFs that show off app features for public-facing posts.

## Option A: ScreenToGif (easiest, Windows-native)

Free, open source, built specifically for this. Download page: https://nicke.tech/n-studio/downloads

1. Record just the app window — keep it small, e.g. ~800–1000px wide. Big GIFs get huge file sizes fast.
2. Trim the recording down to the key interaction. 5–15 seconds is ideal for a feed post.
3. Use the built-in editor to crop, add cursor-click highlights, or a text callout if useful.
4. Export as GIF using the built-in encoder (has size/quality controls).

## Option B: Record video, convert with ffmpeg (higher quality / smaller file)

Record with Xbox Game Bar (Win+G) or OBS to get a clean MP4, then convert using the two-pass palette method — much better than naive GIF conversion (sharper colors, smaller file):

```
ffmpeg -i input.mp4 -vf "fps=15,scale=800:-1:flags=lanczos,palettegen" palette.png
ffmpeg -i input.mp4 -i palette.png -filter_complex "fps=15,scale=800:-1:flags=lanczos[x];[x][1:v]paletteuse" output.gif
```

Drop `fps` to 12–15 and reduce scale width further if the file is still too big.

## Practical tips

- Keep it looped and short — show one clear action (e.g. opening the Compendium editor, toggling Player View), not a whole workflow.
- Most platforms (Discord, Reddit, X) cap GIF size, often 8–15MB. The palette method above helps stay under that.
- If the platform supports it, an MP4/WebM loop instead of GIF gives far better quality at a fraction of the size — worth checking whether the target platform (Patreon, Discord) autoplays video.
