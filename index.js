var ffmpeg = require('ffmpeg');
var spawn = require("child_process").spawn;
var ffmpegPath = "ffmpeg.exe";
var beatmapPath = process.argv[2];
var fileName = /[^\\]*$/.exec(beatmapPath)[0];
var fs = require("fs");

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
    
}