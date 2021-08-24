const {transformImage, uploadNft} = require("./func");
const express = require('express');
const fs = require("fs");
require('dotenv').config()

let __PORT__ = 3500;

const app = new express();
app.use('', express.static(__dirname + '/render-nft'));

app.listen(__PORT__, async () => {
    console.log(`App listening on port ${__PORT__}`)

    let startFrom = 1;
    const countToCreate = 80;

    try {
        let data = fs.readFileSync('./arts.json')
        data = JSON.parse(data.toString())
        startFrom = data.length + 1
    } catch (e) {
    }

    for (let i = startFrom; i <= countToCreate; i++) {
        console.log("No: " + i)
        try {
            console.time("render")
            await transformImage({
                id: i,
                dimension: {
                    w: 1920,
                    h: 1080
                }
            })
        } catch (e) {
        } finally {
            console.timeEnd("render")
        }
    }

    await uploadNft()

    process.exit(1)
})



