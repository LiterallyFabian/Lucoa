var fs = require("fs");
var videoshow = require('videoshow')
require('./parser')();
var beatmapPath = process.argv[2];
var fileName = /[^\\]*$/.exec(beatmapPath)[0].replace(".osu", "");


console.log(`Trying to create video of beatmap "${fileName}"...`)


fs.readFile(beatmapPath, "utf8", (err, map) => {
    if (err) console.error(err);
    else {
        var audioPath = "";
        map.split(/\r?\n/).forEach(line => {
            if (line.includes("AudioFilename:")) audioPath = beatmapPath.replace(fileName, line.split(": ")[1]);
        })
        if (audioPath == "")
            console.log("Could not find audio file in beatmap.")
        else
            makeVideo(map, audioPath);
    }
})

function makeVideo(map, audio) {
    var fruits = parseBeatmap(map);
    var left = true;
    var basePath = "img/";
    var images = [];

    for (var i = 1; i < fruits.length; i++) {
        var diff = fruits[i].delay - fruits[i - 1].delay;
        if (!isNaN(diff)) {

            //break intro & outro together is 2110ms
            //if this diff is <= 2110 it's not a break
            if (diff <= 2110) {

                var imgFlip = left ? "L" : "R";
                var imgIndex = Math.floor(Math.random() * 6);

                var imagePath = basePath + imgFlip + imgIndex + ".png";
                var centerPath = `${basePath}C${imgIndex}.png`;

                images.push({
                    path: imagePath,
                    loop: (diff * 0.75) / 1000 //75% of the diff converted to seconds
                })
                images.push({
                    path: centerPath,
                    loop: (diff * 0.25) / 1000
                })
                left = !left;

            }
            //diff > 2110 - show break image
            else {
                images.push(
                    [
                        basePath + "breakintro.mkv",
                        {
                            path: basePath + "break.png",
                            loop: (diff / 1000) - 2.11
                        },
                        basePath + "breakintro.mkv"
                    ]);
            }

        }
    }

    //create output dir
    var output = `${__dirname}/output`;
    if (!fs.existsSync(output))
        fs.mkdirSync(output);

    var videoOptions = {
        fps: 25,
        transition: false,
        videoBitrate: 1024,
        videoCodec: 'libx264',
        audioBitrate: '128k',
        audioChannels: 2,
        format: 'mp4',
        pixelFormat: 'yuv420p'
    }

    videoshow(images, videoOptions)
        .save(`${__dirname}/output/${fileName}.mp4`)
        .on('start', function (command) {
            console.log('ffmpeg process started:', command)
        })
        .on('error', function (err, stdout, stderr) {
            console.error('Error:', err)
            console.error('ffmpeg stderr:', stderr)
        })
        .on('end', function (output) {
            console.error('Video created in:', output)
        })
}