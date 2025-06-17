const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const archiver = require('archiver');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Serve static files
app.use(express.static('public'));

// Storage for uploads
const storage = multer.diskStorage({
  destination: 'public/uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// ✅ NEW: Batch convert → ZIP download
app.post('/convert', upload.array('batch'), async (req, res) => {
  const to = req.body.to || 'png';

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="converted_images.zip"');

  const archive = archiver('zip', {
    zlib: { level: 9 }
  });

  archive.pipe(res);

  for (const file of req.files) {
    const buffer = await sharp(file.path).toFormat(to).toBuffer();
    const newName = file.originalname.replace(/\.[^/.]+$/, '.' + to);
    archive.append(buffer, { name: newName });

    // Optional: clean up the uploaded file
    fs.unlink(file.path, () => {});
  }

  archive.finalize();
});

// ✅ Single file convert (instant download)
app.post('/convert-single', upload.single('file'), async (req, res) => {
  const to = req.body.to || 'png';
  const file = req.file;

  try {
    const data = await sharp(file.path)
      .toFormat(to)
      .toBuffer();

    res.set('Content-Disposition', `attachment; filename="${file.originalname.replace(/\.[^/.]+$/, '.' + to)}"`);
    res.set('Content-Type', `image/${to}`);
    res.send(data);

    fs.unlink(file.path, () => {});
  } catch (err) {
    console.error(err);
    res.status(500).send('Conversion failed.');
  }
});

// ✅ Single image host
app.post('/upload', upload.single('single'), (req, res) => {
  res.json({ url: '/uploads/' + req.file.filename });
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`💜 Tempo Converter running at: http://localhost:${PORT}`);
});