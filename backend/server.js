"use strict";

import express from "express";
import multer from "multer";
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from "sharp";

import { getImages, getImage, addImage, rmImage } from "./database.js";
import * as s3 from "./s3.js";
import { generateFileName } from "./fileName.js";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// const upload = multer({ dest: "images/" });
const storage = multer.memoryStorage(); ////////
const upload = multer({ storage });


// app.get("/images/:imageName", (req, res) => {
//     const imageName = req.params.imageName;
//     const readStream = fs.createReadStream(`images/${imageName}`);
//     readStream.pipe(res);
// });

const doSignedUrl = async fileName => {
    const arrayOfSignedUrl = [];
    for (let i = 0; i < 3; i++) {
        const suffix = (i === 0) ? "lg" : (i === 1) ? "md" : "sm";
        const temp = await s3.getSignedUrl(`${fileName}-${suffix}`);
        arrayOfSignedUrl.push(temp);
    }

    return arrayOfSignedUrl;
}


app.get("/api/images", async (req, res) => {
    try {
        const images = await getImages();
    // console.log("images ", images)
        for (const image of images) {
            image.url = await doSignedUrl(image.file_name);
        }
    // console.log("images ", images)
    
        return res.json(images);
    } catch(err) {
        console.log("###ERROR getting images: ", err.message || err);
        return res.json({error: err.message || err});
    }
});


/*
https://docs.rackspace.com/support/how-to/limit-file-upload-size-in-nginx/#:~:text=By%20default%2C%20NGINX%C2%AE%20has,location%20block%20to%20edit%20client_max_body_size.
turns out the problem is in ngnix. Regardless of that, below I tried to handle that, but no success.
*/
// middleware check file's size to apply size limit
// backend checking
// NOT working
// const upload = multer({ dest: "images/" }).single("image");
// const checkFileSize = async (req, res, next) => {
//     console.log("req.files::: ", req.headers["content-length"]);

//     const fileSize = req.headers["content-length"];
//     const oneMB = 1048576;

//     if (fileSize > oneMB) {
//         console.log("opsssssssss");
//         // it gets here, but does not return the message below
//         return res.json({
//             error: `Maximum file size is 1MB. Your current file is about ${Math.round(fileSize / oneMB)}MB volume.`
//         });
//     }
    
//     await upload.single("image");
//     next();
// }


app.post("/api/images", upload.single("image"), async (req, res) => {
// app.post("/api/images", await checkFileSize, async (req, res) => {
    // https://blog.logrocket.com/processing-images-sharp-node-js/#resizing-an-image

    try {
        const fileSize = req.headers["content-length"];
        const oneMB = 1048576;

        if (fileSize > (oneMB * 5)) {
            // it gets here, but does not return the message below
            return res.json({
                error: `Maximum file size is 5MB. Your current file is about ${Math.round(fileSize / oneMB)}MB volume.`
            });
        }


        // Get the data from the post request
        const description = req.body.description;

        // this is to simulate an error handling on purpose
        if (description === "***")
            throw(errorDefaultMessage);

        const fileBuffer = req.file.buffer;
        const mimetype = req.file.mimetype;
        const fileName = generateFileName();
    
        // maximum size, both in px
        const maxWidth = 300;
        const maxHeight = 180;
        const image = sharp(fileBuffer);
        const metadata = await image.metadata();
        const originalWidth = metadata.width;
        const originalHeight = metadata.height;
        const arrayOfImages = [];

        if (originalWidth > maxWidth || originalHeight > maxHeight) {
            for(let i = 0; i < 3; i++) {
                // const width = (i === 0) ? 300 : (i === 1) ? 250 : 170;
                const width = (i === 0) ? 250 : (i === 1) ? 170 : 100;
                // const height = (i === 0) ? 192 : (i === 1) ? 160 : 112;

                const temp = await sharp(fileBuffer)
                    .resize({
                        fit: sharp.fit.contain,
                        width,
                        // height,
                        channel: 3
                    })
                    .png()
                    .toBuffer();

                arrayOfImages.push(temp);
            }
        }
        
        // Store the image in s3
        for (let c = 0; c < arrayOfImages.length; c++) {
            // await s3.uploadImage(fileBuffer, fileName, mimetype);
            const suffix = (c === 0) ? "lg" : (c === 1) ? "md" : "sm";
            await s3.uploadImage(arrayOfImages[c], `${fileName}-${suffix}`, mimetype);
        }

        // Store the image in the database
        const databaseResult = await addImage(fileName, description);

        // creates a signedURL for the recente created image
        // databaseResult.url = await s3.getSignedUrl(fileName);
        databaseResult.url = await doSignedUrl(fileName);
        
        res.status(201).send(databaseResult);
    } catch(err) {
        console.log("###Error - adding image: ", err.message || err);
        return res.send({ error: err.message || err });
    }
});



// it removes a record
// receive: id record
// return: an array of records after removing
app.delete("/api/images/rm/:id", async (req, res) => {
    const id = req.params.id;

    try {
        const imgToDelete = await getImage(id);

        await s3.deleteImage(`${imgToDelete.file_name}-lg`);
        await s3.deleteImage(`${imgToDelete.file_name}-md`);
        await s3.deleteImage(`${imgToDelete.file_name}-sm`);

    } catch(err) {
        console.log(`###Error on deleting - S3: ${err.message || err}`);
        return res.json({error: err.message || err});
    }


    try {
        const deleteRecord = await rmImage(id);

        // if delete was okay, grabs all records and return them
        if (deleteRecord > 0) {
            const getAllImages = await getImages();
            
            return res.json({
                message: "Item deleted successfully!! \\o/",
                images: getAllImages
            });
        }

        // otherwise, it errors
        throw("Issue on removing item. Please again try later.")

    } catch(err) {
        console.log("###Error on deleting image - DB: ", err.message || err);
        return res.json({error: err.message || err});
    }
});



// https://flaviocopes.com/fix-dirname-not-defined-es-module-scope/
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("*", (req, res) => res.sendFile(__dirname + "/public/index.html"));

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Server running at ${port} port`));

