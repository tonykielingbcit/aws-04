"use strict";

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import {getSignedUrl as gsURL} from "@aws-sdk/s3-request-presigner";


import dotenv from 'dotenv';
dotenv.config();

const bucketName = process.env.AWS_BUCKET_NAME;
const region = process.env.AWS_BUCKET_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
// console.log("S3 info: ", region, accessKeyId, secretAccessKey)
const s3Client = new S3Client({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey
  }
});


export async function uploadImage(imageBuffer, imageName, mimetype) {
    // Create params that the S3 client will use to upload the image
    const params = {
      Bucket: bucketName,
      Key: imageName,
      Body: imageBuffer,
      ContentType: mimetype
    };
  
    // Upload the image to S3
    const command = new PutObjectCommand(params);
    const data = await s3Client.send(command);
  
    return data;
};


export async function deleteImage(imageName) {
  // Create params that the S3 client will use to delete the image
  const deleteParams = {
    Bucket: bucketName,
    Key: imageName
  };
  
  // Delete the image to S3
  const data = await s3Client.send(new DeleteObjectCommand(deleteParams));
  
  return data;
};


export async function getSignedUrl(fileName) {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: fileName
  });

  // this signedURL expires in 1 day
  const signedUrl = await gsURL(s3Client, command, { expiresIn: 60 * 60 * 24 });

  return signedUrl;
};

