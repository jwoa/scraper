// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

const fs = require('fs');
const request = require('request');
const path = require('path');
const puppeteer = require('puppeteer');
var Scraper = require('images-scraper');
var sizeOf = require('image-size');
const remote = require("electron").remote
const dialog = remote.dialog;

let folderPath;
let pathButton = document.getElementById("path");
let scrapeButton = document.getElementById("scrape");
let sizeButton = document.getElementById("size");
let results = document.getElementById("results");

//////////////////////////////////////////
//
//  SELECT PATH FOR FILES
//
//////////////////////////////////////////

function selectPath() {
  console.log("path button clicked");
    dialog.showOpenDialog(remote.getCurrentWindow(), {
        properties: ["openDirectory", "multiSelections"]
    }).then(result => {
        if (result.canceled === false) {
            console.log("Selected directory: ", result.filePaths);
            folderPath = result.filePaths;
            document.getElementById("path-location").innerText = folderPath;
        }
    }).catch(err => {
        console.log(err)
    })
}

//////////////////////////////////////////
//
//  SCRAPE
//
//////////////////////////////////////////

function scrape() {
  let userInput = document.getElementById("query").value;
  console.log("Searching for: ", userInput);
  (async () => {
        const browser = await puppeteer.launch({
            headless: false,
            slowMo: 250
        });
        const page = await browser.newPage();
        await page.goto(userInput);
        await page.setViewport({
            width: 1200,
            height: 800
        });

        let counter = 0;
        page.on('response', async (response) => {
            const matches = /.*\.(jpg|png|svg|gif)$/.exec(response.url());
            if (matches && (matches.length === 2)) {
                const extension = matches[1];
                const buffer = await response.buffer();
                fs.writeFileSync(folderPath + `/${counter}.${extension}`, buffer, 'base64');
                counter += 1;
            }
        });

        await autoScroll(page);
        await page.waitFor(2000);
        results.innerText = "Finished!";
        await browser.close();

    })();

    async function autoScroll(page) {
        await page.evaluate(async () => {
            await new Promise((resolve, reject) => {
                var totalHeight = 0;
                var distance = 100;
                var timer = setInterval(() => {
                    var scrollHeight = document.body.scrollHeight;
                    window.scrollBy(0, distance);
                    totalHeight += distance;

                    if (totalHeight >= scrollHeight) {
                        clearInterval(timer);
                        resolve();
                    } else {
                        console.log("Something went wrong with the autoscroll function: " + reject);
                    }
                }, 100);
            });
        });
    }

}

//////////////////////////////////////////
//
//  SCRAPE (GOOGLE)
//
//////////////////////////////////////////

function scrapeGoogle() {
    const google = new Scraper({
        puppeteer: {
        headless: false,
        }
    });

    let userInput = document.getElementById("query").value;
    
    (async () => {
        const results = await google.scrape(userInput, 500);
        console.log('Results: ', results);
        results.forEach((item)=> {
            let url = item.url;
            let name = url.lastIndexOf('/');
            let filename = url.substring(name + 1);
            console.log(filename)
            download(item.url, filename, function () {
                console.log('done')
            })
        })
    })();
}

let download = function(uri, filename, callback){
    console.log(filename)
    request.head(uri, function(err, res, body){

        // request(uri).pipe(fs.createWriteStream(folderPath + '/' + query + filename)).on('close', callback);
        request(uri).pipe(fs.createWriteStream(folderPath + '/' + filename)).on('close', callback);
    });
};

//////////////////////////////////////////
//
//  SCRAPE (TUMBLR)
//
//////////////////////////////////////////

function scrapeTumblr() {
  let userInput = document.getElementById("query").value;
  console.log(userInput);
  (async () => {
        const browser = await puppeteer.launch({
            headless: false,
            slowMo: 250
        });
        const page = await browser.newPage();
        await page.goto('https://www.tumblr.com/search/' + userInput);
        await page.setViewport({
            width: 1200,
            height: 800
        });

        let counter = 0;
        page.on('response', async (response) => {
            const matches = /.*\.(jpg|png|svg|gif)$/.exec(response.url());
            if (matches && (matches.length === 2)) {
                const extension = matches[1];
                const buffer = await response.buffer();
                fs.writeFileSync(folderPath + `/${counter}.${extension}`, buffer, 'base64');
                counter += 1;
            }
        });

        await autoScroll(page);
        await page.waitFor(2000);
        results.innerText = "Finished!";
        await browser.close();

    })();

    async function autoScroll(page) {
        await page.evaluate(async () => {
            await new Promise((resolve, reject) => {
                var totalHeight = 0;
                var distance = 100;
                var timer = setInterval(() => {
                    var scrollHeight = document.body.scrollHeight;
                    window.scrollBy(0, distance);
                    totalHeight += distance;

                    if (totalHeight >= scrollHeight) {
                        clearInterval(timer);
                        resolve();
                    } else {
                        console.log("Something went wrong with the autoscroll function: " + reject);
                    }
                }, 100);
            });
        });
    }

}

//////////////////////////////////////////
//
//  SIZE CHECK
//
//////////////////////////////////////////

  function sizeCheck() {
    //passsing directoryPath and callback function
    fs.readdir(String(folderPath), function (err, files) {
        //handling error
        if (err) {
            return console.log('Unable to check directory: ' + err);
        }
        //listing all files using forEach
        files.forEach(function (file) {
            let x = path.basename(file);
            let currentFile = folderPath + "/" + x
            // Do whatever you want to do with the file

            var stats = fs.statSync(currentFile);
            console.log("Name: " + x + " Size: " + stats["size"]);

            //check size
            sizeOf(currentFile, function (err, dimensions) {
                if (err) {
                    console.log('Unable to check (Will Delete): ' + currentFile);
                    fs.unlink(currentFile, (err) => {
                        if (err) {
                            console.error("Error Deleting File: " + err)
                            return
                        }
                        console.log("Deleted: " + currentFile)
                        //file removed
                    })
                } else if (dimensions.width === 64 && dimensions.height === 64) {
                    fs.unlink(currentFile, (err) => {
                        if (err) {
                            console.error("Error Deleting File: " + err)
                            return
                        }
                        console.log("Deleted: " + currentFile)
                        //file removed
                    })
                }
            });
        });
    });
  }

//////////////////////////////////////////
//
//  TRIGGERS
//
//////////////////////////////////////////

pathButton.onclick = selectPath;
sizeButton.onclick = sizeCheck;

scrapeButton.addEventListener('click', function() {
    if (document.getElementById("google").checked) {
        scrapeGoogle();
    } else if (document.getElementById("tumblr").checked) {
        scrapeTumblr();
    } else {
        scrape();
    }
});