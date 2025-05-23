import multer from "multer";
import path from "path"

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, "./public/temp")
    },

    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    },
  })

const upload = multer({
  storage,
  fileFilter: (_, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Only jpeg/png are allowed!'));
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 }, //::add error handler
})  
 
const uploader =  upload.fields([{
  name: "avatar", 
  maxCount: 1},
{
  name: "coverImage",
  maxCount: 1
}])

export {uploader, upload}



// class CustomStorageEngine {
//     constructor() {
//         this.tempDir = "uploads/";
//     }

//     _handleFile(req, file, cb) {
//         const filePath = path.join(
//             this.tempDir,
//             `${Date.now()}-${file.originalname}`,
//         );
//         const writeStream = fs.createWriteStream(filePath);
//         let firstChunk = Buffer.alloc(0);
//         let validated = false;
//         let sharpStream;
//         let totalSize = 0;

//         // Create a readable stream for Sharp
//         const readableStream = new Readable({
//             read() {},
//         });

//         file.stream.on("data", async (chunk) => {
//             try {
//                 totalSize += chunk.length;

//                 // Collect the first 4100 bytes for validation
//                 if (!validated && firstChunk.length < 4100) {
//                     firstChunk = Buffer.concat([firstChunk, chunk]);
//                     if (firstChunk.length >= 4100) {
//                         // Validate magic bytes
//                         const fileType = await fileTypeFromBuffer(firstChunk);
//                         if (
//                             !fileType ||
//                             !["image/jpeg", "image/png"].includes(fileType.mime)
//                         ) {
//                             file.stream.destroy(
//                                 new ApiError(
//                                     400,
//                                     "Invalid file type: Only JPEG/PNG files are allowed",
//                                 ),
//                             );
//                             return;
//                         }
//                         validated = true;
//                         logger.info(
//                             {
//                                 field: file.fieldname,
//                                 mime: fileType.mime,
//                                 ip: req.ip,
//                             },
//                             "File validated successfully",
//                         );

//                         // Initialize Sharp for compression (always compress)
//                         sharpStream = sharp()
//                             .resize({ width: 800, height: 800, fit: "inside" }) // Resize to 800px max
//                             .jpeg({ quality: 80, mozjpeg: true }) // JPEG quality 80
//                             .png({ compressionLevel: 9 }) // PNG max compression
//                             .pipe(writeStream);

//                         readableStream.push(firstChunk); // Push the already-read chunk to Sharp
//                     }
//                 } else if (validated) {
//                     // Continue streaming to Sharp
//                     readableStream.push(chunk);
//                 }
//             } catch (error) {
//                 file.stream.destroy(error);
//             }
//         });

//         file.stream.on("end", () => {
//             if (!validated) {
//                 // Handle small files (<4100 bytes)
//                 fileTypeFromBuffer(firstChunk)
//                     .then((fileType) => {
//                         if (
//                             !fileType ||
//                             !["image/jpeg", "image/png"].includes(fileType.mime)
//                         ) {
//                             return cb(
//                                 new ApiError(
//                                     400,
//                                     "Invalid file type: Only JPEG/PNG files are allowed",
//                                 ),
//                             );
//                         }
//                         sharpStream = sharp()
//                             .resize({ width: 800, height: 800, fit: "inside" })
//                             .jpeg({ quality: 80, mozjpeg: true })
//                             .png({ compressionLevel: 9 })
//                             .pipe(writeStream);
//                         readableStream.push(firstChunk);
//                         readableStream.push(null);
//                         logger.info(
//                             {
//                                 field: file.fieldname,
//                                 size: totalSize,
//                                 ip: req.ip,
//                             },
//                             "File validated and compressed",
//                         );
//                     })
//                     .catch((error) => cb(error));
//             } else {
//                 readableStream.push(null);
//             }
//         });

//         file.stream.on("error", (error) => {
//             writeStream.destroy();
//             logger.error(
//                 { field: file.fieldname, error: error.message, ip: req.ip },
//                 "File streaming failed",
//             );
//             cb(error);
//         });

//         writeStream.on("finish", () => {
//             file.path = filePath;
//             file.size = totalSize; // Store the original size
//             cb(null, file);
//         });

//         writeStream.on("error", (error) => {
//             cb(error);
//         });
//     }

//     _removeFile(req, file, cb) {
//         fs.unlink(file.path, cb);
//     }
// }

// const storage = new CustomStorageEngine();

// const uploader = multer({
//     storage,
//     limits: {
//         fileSize: 5 * 1024 * 1024, // 5MB
//         files: 2, // Max 2 files (avatar and coverImage)
//     },
// });
// export {uploader}

