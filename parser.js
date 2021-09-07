/*
    Core parts of this script is taken from LiterallyFabian/SVB, therefore some references might be misleading.
    https://github.com/LiterallyFabian/SVB/blob/main/app/public/catch/js/processor.js
*/
module.exports = function () {
    this.parseBeatmap = function (beatmapLines) {
        var foundTiming, foundFruits = false;
        var beatmap = {
            sliderMultiplier: 1,
            fruitLines: [], //raw lines of all fruits
            timingLines: [], //raw lines of all timing points
        };

        //go through each line and add data
        beatmapLines.split(/\r?\n/).forEach(line => {
            if (!foundTiming) {
                //add sliderMultiplier before timing
                if (line.includes("SliderMultiplier")) beatmap.sliderMultiplier = parseFloat(line.split(":")[1]);
                else if (line.includes("[TimingPoints]")) foundTiming = true;
            } else {
                if (!foundFruits) {
                    //add all timing points
                    if (line.split(",").length > 3) {
                        beatmap.timingLines.push(line);
                    } else {
                        if (line.includes("[HitObjects]")) foundFruits = true;
                    }
                } else {
                    //add all fruits
                    beatmap.fruitLines.push(line);
                }
            }
        });

        var timing = parseTiming(beatmap.timingLines);
        beatmap.timingPoints = timing.timingPoints;
        beatmap.beatLength = timing.beatLength;
        var allFruits = parseFruits(beatmap);
        return allFruits;
    }

    function parseTiming(timingLines) {
        var timingPoints = [];
        var lastBeatLength;
        var defaultBeatLength = -1;
        timingLines.forEach(line => {
            var data = line.split(",");
            var time = parseInt(data[0]) - 1;
            var beatLength = parseInt(data[1]);
            //var meter = data[2];
            //var sampleSet = data[3];
            //var sampleIndex = data[4];
            //var volume = data[5];
            var uninherited = data[6] == 1;
            //var kiai = data[7] == 1;


            //set beatlengths
            if (uninherited) {
                timingPoints.push({
                    value: beatLength,
                    delay: time - 1
                });
                lastBeatLength = beatLength
                if (defaultBeatLength == -1) {
                    defaultBeatLength = beatLength;
                    console.log(`Default beat length set to ${beatLength} (${Math.round(1 / beatLength * 1000 * 60)} BPM)`)
                }

            } else {
                timingPoints.push({
                    value: lastBeatLength / (-100 / beatLength),
                    delay: time - 1
                });
            }
        });
        if (defaultBeatLength == -1) {
            defaultBeatLength = 500;
            console.error(`Default beat length could not be found!`, timingLines);
        }
        return {
            beatLength: defaultBeatLength,
            timingPoints: timingPoints
        };
    }

    function parseFruits(beatmap) {
        var allFruits = [];
        var sliderMultiplier = beatmap.sliderMultiplier;
        var beatLength = beatmap.defaultBeatLength;

        beatmap.fruitLines.forEach(line => {
            line = line.split(",");
            var delay = parseInt(line[2]);
            var defaultHitsound = parseInt(line[4]);

            //this line is a SLIDER
            if (line.length > 7) {
                var overrideHitsounds = line.length > 8;
                var sliderHitsounds = overrideHitsounds ? line[8].split("|") : [];
                var currentHitsound = 0;

                //Queue slider-start fruit
                allFruits.push({
                    delay: delay,
                    hitsound: overrideHitsounds ? sliderHitsounds[currentHitsound++] : defaultHitsound
                })

                //Update beatLength
                var timing = beatmap.timingPoints.filter(obj => {
                    return obj.delay < delay
                });
                if (timing[0]) beatLength = timing[timing.length - 1].value;

                var repeats = parseInt(line[6]); //How many times the slider will repeat
                var sliderLength = line[7] / (sliderMultiplier * 100) * beatLength * repeats; //How long the slider is in milliseconds
                var dropletsPerRepeat = line[7] / 20;
                var droplets = dropletsPerRepeat * repeats; //amount of droplets slider contains
                var dropletDelay = sliderLength / droplets;

                var currentDrop = 0;
                for (var i = 0; i < droplets; i++) {
                    if (currentDrop == dropletsPerRepeat) {
                        allFruits.push({
                            delay: delay + dropletDelay * i,
                            hitsound: overrideHitsounds ? sliderHitsounds[currentHitsound++] : defaultHitsound
                        })

                        currentDrop = 0;
                    }
                    currentDrop++;
                }
                //Queues slider-end fruit
                allFruits.push({
                    delay: delay + droplets * dropletDelay,
                    hitsound: overrideHitsounds ? sliderHitsounds[currentHitsound++] : defaultHitsound
                });

            } else if (line[3] != "12") {
                //Queue a large fruit
                allFruits.push({
                    delay: delay,
                    hitsound: defaultHitsound
                });
            }
        })

        return allFruits;
    }
}