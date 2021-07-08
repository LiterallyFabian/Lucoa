var ffmpeg = require('ffmpeg');
var spawn = require("child_process").spawn;
var ffmpegPath = "ffmpeg.exe";
var beatmapPath = process.argv[2];
var fileName = /[^\\]*$/.exec(beatmapPath)[0];
var fs = require("fs");
var fsp = require('fs').promises;

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

async function makeVideo(map, audio) {
    var objectDelays = parseBeatmap(map);
    var path = `data\\${Math.random().toString(36).substring(7)}`;
    var left = true;
    var concat = "file 'clips\\intro.mkv'\n"
    var lists = 0;
    await fsp.mkdir(path, {
        recursive: true
    })

    for (var i = 1; i < objectDelays.length; i++) {
        var diff = objectDelays[i] - objectDelays[i - 1]
        if (!isNaN(diff)) {
            var cleanDiff = Math.round(diff / 50) * 50;
            if (diff <= 1000) {
                concat += `file 'clips\\${left ? "L" : "R"}${cleanDiff}.mkv'\n`
                left = !left;
            } else {
                var data = concat + "file 'clips\\pauseintro.mkv'";
                concat = "file 'clips\\pauseoutro.mkv'\n";


                await fsp.writeFile(`${path}\\${lists++}.txt`, data, function (err) {
                    if (err) return console.log(err);
                    console.log('Created list.');
                });
            }
        }
    }


    //create final list
    concat += "file 'clips\\pauseintro.mkv'";
    fsp.writeFile(`${path}\\${lists++}.txt`, concat, function (err) {
        if (err) return console.log(err);
        console.log('Created list.');
    });
   
}


function parseBeatmap(beatmapLines) {
    var foundTiming, foundObjects = false;
    var beatmap = {
        sliderMultiplier: 1,
        objectLines: [], //raw lines of all objects
        timingLines: [], //raw lines of all timing points
    };

    //go through each line and add data
    beatmapLines.split(/\r?\n/).forEach(line => {
        if (!foundTiming) {
            //add sliderMultiplier before timing
            if (line.includes("SliderMultiplier")) beatmap.sliderMultiplier = parseFloat(line.split(":")[1]);
            else if (line.includes("[TimingPoints]")) foundTiming = true;
        } else {
            if (!foundObjects) {
                //add all timing points
                if (line.split(",").length > 3) {
                    beatmap.timingLines.push(line);
                } else {
                    if (line.includes("[HitObjects]")) foundObjects = true;
                }
            } else {
                //add all objects
                beatmap.objectLines.push(line);
            }
        }
    });

    var timing = parseTiming(beatmap.timingLines);
    beatmap.timingPoints = timing.timingPoints;
    beatmap.beatLength = timing.beatLength;
    var allObjects = parseObjects(beatmap);
    return allObjects;
}

function parseTiming(timingLines) {
    var timingPoints = []; //parsed timing points
    var beatLength; //default beat Length

    timingLines.forEach(line => {
        var data = line.split(",");

        //set default beatlength
        if (typeof beatLength == "undefined") {
            beatLength = data[1];
            console.log(`Default beat length set to ${beatLength} (${Math.round((1 / beatLength * 1000 * 60))} BPM)`)

            //queue new beatLength
        } else if (data[6] == 1) {
            timingPoints.push({
                type: "beatLength",
                value: parseFloat(data[1]),
                delay: parseFloat(data[0] - 10)
            });

            //queue beatLengthMultiplier
        } else {
            timingPoints.push({
                type: "beatLengthMultiplier",
                value: -100 / parseFloat(data[1]),
                delay: parseFloat(data[0] - 10)
            });
        }
    });

    return {
        beatLength: beatLength,
        timingPoints: timingPoints
    };
}

function parseObjects(beatmap) {
    var objectTimestamps = [];
    var sliderMultiplier = beatmap.sliderMultiplier;
    var beatLength = beatmap.beatLength;
    var beatLengthMultiplier = 1;

    beatmap.objectLines.forEach(line => {
        line = line.split(",")
        var delay = parseInt(line[2]);

        //update beatlength
        var timing = beatmap.timingPoints.filter(obj => {
            return obj.delay >= delay
        });
        if (timing[0]) {
            if (timing[0].type == "beatLength") {
                beatLength = timing[0].value;
                // console.log(` ${delay} Beat length set to ${beatLength}`)

            } else {
                beatLengthMultiplier = timing[0].value;
                // console.log(` ${delay} Beat length multiplier set to ${beatLengthMultiplier}`)
            }
        }

        //add all objects to array

        if (line.length > 7) { //line is slider
            //Queue slider-start fruit
            objectTimestamps.push(delay);

            var dropletTiming = beatLength / 100 / sliderMultiplier / beatLengthMultiplier; //time between droplets
            var repeats = parseInt(line[6]); //How many times the slider will repeat
            var sliderLength = parseInt(Math.round(line[7])); //How long the slider is
            var dropletsPerRepeat = parseInt(Math.round(sliderLength));
            var droplets = dropletsPerRepeat * repeats; //amount of droplets slider contains

            var currentDrop = 0;

            for (var i = 0; i < droplets; i++) {
                var dropDelay = i * dropletTiming;
                if (currentDrop == dropletsPerRepeat) {

                    objectTimestamps.push(delay + dropDelay);
                    currentDrop = 0;
                }
                currentDrop++;
            }



            //Queues slider-end fruit
            //console.log(`bl: ${beatLength} slm: ${sliderMultiplier} tot: ${beatLength / 100 / sliderMultiplier * 17} math: ${beatLength}/100*${sliderMultiplier}*17`)
            objectTimestamps.push(delay + (droplets + 1) * dropletTiming);

        } else if (line[3] != "12") {
            //Queue a large fruit
            objectTimestamps.push(delay);
        }
    })

    return objectTimestamps;
}