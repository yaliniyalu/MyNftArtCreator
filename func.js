const puppeteer = require('puppeteer');
const pngToJpeg = require('png-to-jpeg');
const resizeImg = require('resize-img');

const fs = require("fs");

const timeGiven = 5 * 60000;

async function transformImage(image) {
    return new Promise((async (resolve, reject) => {
        const browser = await puppeteer.launch({ headless: true });

        const page = await browser.newPage();
        await page.goto('http://localhost:3500/index.html');
        page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));

        await page.exposeFunction("finishedRendering", async ({ dataURL, seed }) => {
            try {
                const path = './nft/art-' + image.id + '.jpg';
                const thumbPath = './nft/thumb/art-' + image.id + '.jpg'

                const buffer = Buffer.from(dataURL.split(/,\s*/)[1],'base64');

                const output = (await pngToJpeg({ quality: 90 })(buffer))
                fs.writeFileSync(path, output)

                const resizedImage = await resizeImg(output, { width: 340,  height: 191 });
                fs.writeFileSync(thumbPath, resizedImage);

                image.date = (new Date()).toISOString().slice(0, 19).replace('T', ' ');
                image.sketch = {
                    path: path,
                    thumbPath: thumbPath,
                    format: "jpg",
                    seed: seed,
                }

                await finish("success")
            } catch (e) {
                await finish("failed")
            }
        })

        await page.exposeFunction('errorRendering', () => finish("failed"))

        await page.evaluate(image => startRendering(image), image)

        async function finish(status = "success") {
            clearTimeout(timer)
            await browser.close()
            image.status = status
            await logProcessed(image)

            console.log("Status: ", image.status)

            if (status === "success") {
                resolve()
            } else {
                reject()
            }
        }

        const timer = setTimeout(() => finish("timeout"), timeGiven)
    }))
}

async function logProcessed(image) {
    let data = [];
    try {
        data = fs.readFileSync('./arts.json')
        data = JSON.parse(data.toString())
    } catch (e) {
    }

    data.push(image)
    fs.writeFileSync("./arts.json", JSON.stringify(data))
}

const { NFTStorage, File } = require('nft.storage')


async function uploadNft() {
    let data = fs.readFileSync('./arts.json')
    data = JSON.parse(data.toString())

    const endpoint = 'https://api.nft.storage'
    const token = process.env.NFT_STORAGE_API_KEY
    const storage = new NFTStorage({ endpoint, token })

    for (let i = 0; i < data.length; i++) {
        const image = data[i];
        if (image.nft) {
            continue
        }

        console.log("uploading... Art-" + image.id)
        const metadata = await storage.store({
            name: 'Art-' + image.id,
            description: 'Nft Art',
            image: new File([await fs.promises.readFile(image.sketch.path)], `art-${image.id}.jpg`, {
                type: 'image/jpg',
            }),
            properties: {
                thumb: new File([await fs.promises.readFile(image.sketch.thumbPath)], `art-${image.id}-thumb.jpg`, {
                    type: 'text/plain',
                }),
            },
        })

        image.nft = {
            ipfs: {
                metadata: metadata.url,
                image: metadata.data.image.href,
                thumb: metadata.data.properties.thumb.href
            },
            gateway: {
                image: metadata.embed().image.href,
                thumb: metadata.embed().properties.thumb.href
            }
        }

        fs.writeFileSync("./arts.json", JSON.stringify(data))
    }
}

module.exports =  {
    transformImage,
    uploadNft
}

