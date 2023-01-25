import express from "express";
import multer from "multer";
import path from 'path';
import { fileURLToPath } from 'url';

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


app.get("/api/images", async (req, res) => {
    const images = await getImages();

    for (const image of images)
        image.url = await s3.getSignedUrl(image.file_name);
// console.log("images: ", images)
    return res.json(images);
});


/*
https://docs.rackspace.com/support/how-to/limit-file-upload-size-in-nginx/#:~:text=By%20default%2C%20NGINX%C2%AE%20has,location%20block%20to%20edit%20client_max_body_size.
turns out the problem is in ngnix. Regardless of that, below I tried to handle that, but no success.
*/
// middleware check file's size to apply size limit
// backend checking
// NOT working
// const upload = multer({ dest: "images/" }).single("image");

// const checkFileSize = (req, res, next) => {
//     console.log("req.files::: ", req.headers["content-length"]);

//     const fileSize = req.headers["content-length"];
//     const oneMB = 1048576;

//     if (fileSize > oneMB) {
//         console.log("opsssssssss");
//         // it gets here, but does not return the message below
//         return res.json({error: `Maximum file size is 1MB. Your current file is about ${Math.round(fileSize / oneMB)}MB volume.`});
//     }
    
//     upload();
//     next();

// }


app.post("/api/images", upload.single('image'), async (req, res) => {
    // Get the data from the post request
    const description = req.body.description;
    const fileBuffer = req.file.buffer;
    const mimetype = req.file.mimetype;
    const fileName = generateFileName();
  
    // Store the image in s3
    await s3.uploadImage(fileBuffer, fileName, mimetype);

    // Store the image in the database
    const databaseResult = await addImage(fileName, description);

    // creates a signedURL for the recente created image
    databaseResult.url = await s3.getSignedUrl(fileName);
    
    res.status(201).send(databaseResult);
});
  

/*
app.post("/api/images", upload.single("image"), async (req, res) => {
    try {
        const errorDefaultMessage = "Issue recording image file :/. Try again later, please.";
        const description = req.body.description;

        // this is to simulate an error handling on purpose
        if (description === "***")
            throw(errorDefaultMessage);

        const recordingImage = await addImage(req.file.filename, description);

        if (!recordingImage || !recordingImage.id)
            throw (errorDefaultMessage);

        return res.send({ 
            id: recordingImage.id,
            file_name: recordingImage.file_name,
            description: recordingImage.description,
            created: recordingImage.created,
            message: "Image added successfully!!!   \\o/" 
        });

    } catch(err) {
        console.log("###Error - adding image: ", err.message || err);
        return res.send({ error: err.message || err });
    }
});
*/


// it removes a record
// receive: id record
// return: an array of records after removing
app.delete("/api/images/rm/:id", async (req, res) => {
    try {
        const deleteRecord = await rmImage(req.params.id);

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
        console.log("###Error on deleting image: ", err.message || err);
        return res.json({error: err.message || err});
    }
});



// https://flaviocopes.com/fix-dirname-not-defined-es-module-scope/
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("*", (req, res) => res.sendFile(__dirname + "/public/index.html"));

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Server running at ${port} port`));

