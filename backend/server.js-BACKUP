import express from "express";
import multer from "multer";
import fs from "fs";
import path from 'path';
import { fileURLToPath } from 'url';

import { getImages, getImage, addImage, rmImage } from "./database.js";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

const upload = multer({ dest: "images/" });

app.get("/images/:imageName", (req, res) => {
    const imageName = req.params.imageName;
    const readStream = fs.createReadStream(`images/${imageName}`);
    readStream.pipe(res);
});


app.get("/api/images", async (req, res) => {
    const images = await getImages();
    return res.json(images);
});


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

