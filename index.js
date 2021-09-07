var exec = require('child_process').exec;
var beatmapPath = process.argv[2];
var fileName = /[^\\]*$/.exec(beatmapPath)[0].replace(".osu", "");
var fs = require("fs");
require('./parser')();

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
    var command = "ffmpeg -i intro.mkv ";
    var length = 0;

    for (var i = 1; i < fruits.length; i++) {
        var diff = fruits[i].delay - fruits[i - 1].delay;
        if (!isNaN(diff) && command.length < 7000) {
            //console.log(diff)

            //break intro & outro is 2110ms
            if (diff <= 2110) {
                //not a break - add Lucoa
                command += `-loop 1 -t ${((diff*0.75)/1000).toFixed(2)} -i ${left ? "L" : "R"}${Math.floor(Math.random() * 6)}.png `
                command += `-loop 1 -t ${((diff*0.25)/1000).toFixed(2)} -i C${Math.floor(Math.random() * 6)}.png `
                left = !left;
                length += 2;

            } else {
                //break - show image for x seconds
                command += `-i breakintro.mkv `
                command += `-loop 1 -t ${(diff/1000)-2.11} -i break.png `
                command += `-i breakoutro.mkv `
                length += 3;
            }

        }
    }

    //close command
    command += `-filter_complex "[0][1][2][3]concat=n=${length-1}:v=1:a=0" "${__dirname}/output/${fileName}.mkv"`

    //create output dir
    fs.mkdirSync(`${__dirname}/output`);

    exec(command, {
        cwd: __dirname + '/img/small'
    }, function (error, stdout, stderr) {
        if (error) {
            console.log(`error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.log(`stderr: ${stderr}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
    });
}