import crypto from "crypto";

// it generates a long random set of chars
/*
Generates cryptographically strong pseudorandom data. 
The size argument is a number indicating the number of bytes to generate.

If a callback function is provided, the bytes are generated asynchronously and the callback function is invoked with 
two arguments: err and buf. If an error occurs, err will be an Error object; otherwise it is null. Thebuf argument is a Buffer
containing the generated bytes.
*/
// this is the way multer uses to name files
export const generateFileName = (bytes = 32) => crypto.randomBytes(bytes).toString("hex");
