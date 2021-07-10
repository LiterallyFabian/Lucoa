# Lucoa
![Banner](clips/pause.jpg)
###### *i got too much free time*
Random Node.js app that tries to create a video of Lucoa in rhythm to an osu! beatmap. An example can be found [here](https://youtu.be/BEmKtL-62DE).

Note that this project is not finished and will likely never be.

## To-do
- Sync the dance better (parse sliders correctly)
- Automatically add music
- Add hitsounds


## Usage

#### Prerequisites

- Node.js v12
- FFmpeg v4.4+
```bash
git clone https://github.com/LiterallyFabian/Lucoa.git
cd Lucoa
npm install
```
To generate a video run `node index.js [.osu file path]`.

Your osu! beatmaps can probably be found at `C:\Users\<Username>\AppData\Local\osu!\Songs`

## Briefly how it works
- The app goes through your beatmap and makes a list of all objects
- Calculates the difference in milliseconds between each object
  - **diff <= 2110**
    - An image of Lucoa leaning towards the opposite direction will be added for 75% of diff
    - An image of Lucoa in the center will be added for the remaining 25%
  - **diff > 2110**
     - A pause intro clip will be added to the list, then a pause image for the duration of the pause minus 2110ms
     - This is because the pause intro & outro is together 2110ms
- Use FFmpeg to concatenate the clips added to the list to make the final video. No automatically added audio yet.
