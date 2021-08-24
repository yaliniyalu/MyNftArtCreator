const express = require('express');
const fs = require("fs");

let __PORT__ = 3600;

const app = new express();
app.use('', express.static(__dirname + '/gallery'));
app.use('/nft', express.static(__dirname + '/nft'));

app.get('/arts.json', (req, res) => {
    if (req.query.id !== undefined)  {
        try {
            const data = JSON.stringify(JSON.parse(fs.readFileSync(__dirname + "/arts.json").toString()).find(v => v.id === parseInt(req.query.id)))
            res.send(data)
        } catch (e) {
            res.status(404).send()
        }
    } else {
        res.sendFile(__dirname + "/arts.json");
    }
});

app.listen(__PORT__, async () => {
    console.log(`App listening on port ${__PORT__}`)
})

