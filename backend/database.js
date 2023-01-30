"use strict";


import mysql from "mysql2";
import * as dotenv from "dotenv";

dotenv.config();

const pool = mysql
  .createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: process.env.PORT || 3306
  })
  .promise()



export async function getImages() {
  let query = `
  SELECT * 
  FROM images
  ORDER BY created DESC
  `

  const [rows] = await pool.query(query);
  return rows
}
// exports.getImages = getImages



export async function getImage(id) {
  let query = `
  SELECT * 
  FROM images
  WHERE id = ?
  `

  const [rows] = await pool.query(query, [id]);
  const result = rows[0];
  return result
}
// exports.getImage = getImage



export async function addImage(fileName, description) {
// export async function addImage(filePath, description) {
  let query = `
  INSERT INTO images (file_name, description)
  VALUES(?, ?)
  `

//   const [result] = await pool.query(query, [filePath, description]);
  const [result] = await pool.query(query, [fileName, description]);

  const id = result.insertId

  return await getImage(id)
}
// exports.addImage = addImage



export async function rmImage(id) {
    let query = `
    DELETE FROM images WHERE id = ?
    `;

    await pool.query("SET SQL_SAFE_UPDATES = 0");
    const [result] = await pool.query(query, [id]);

    return result.affectedRows;
}