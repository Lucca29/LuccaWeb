const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const config = require('../config');

// Configuration de stockage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = config.UPLOAD_DIR;
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Générer un nom unique avec timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, 'article-' + uniqueSuffix + extension);
  }
});

// Filtrage des fichiers
const fileFilter = (req, file, cb) => {
  const extension = path.extname(file.originalname).toLowerCase().slice(1);
  
  if (config.ALLOWED_EXTENSIONS.includes(extension)) {
    cb(null, true);
  } else {
    cb(new Error(`Extension non autorisée. Extensions acceptées: ${config.ALLOWED_EXTENSIONS.join(', ')}`), false);
  }
};

// Configuration multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: config.MAX_FILE_SIZE
  },
  fileFilter: fileFilter
});

// Middleware pour optimiser les images
const optimizeImage = async (req, res, next) => {
  if (!req.file) {
    return next();
  }

  try {
    const originalPath = req.file.path;
    const optimizedPath = originalPath.replace(/\.(jpg|jpeg|png)$/i, '-optimized.webp');
    
    // Optimiser et convertir en WebP
    await sharp(originalPath)
      .resize(1200, 800, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality: 85 })
      .toFile(optimizedPath);

    // Supprimer l'original et utiliser la version optimisée
    fs.unlinkSync(originalPath);
    req.file.path = optimizedPath;
    req.file.filename = path.basename(optimizedPath);
    
    next();
  } catch (error) {
    console.error('Erreur lors de l\'optimisation de l\'image:', error);
    next(); // Continuer même en cas d'erreur d'optimisation
  }
};

// Middleware pour supprimer une image
const deleteImage = (imagePath) => {
  if (imagePath && fs.existsSync(imagePath)) {
    try {
      fs.unlinkSync(imagePath);
      console.log(`Image supprimée: ${imagePath}`);
    } catch (error) {
      console.error(`Erreur lors de la suppression de l'image: ${imagePath}`, error);
    }
  }
};

module.exports = {
  upload: upload.single('featured_image'),
  uploadImage: upload.single('image'),  // Pour l'upload standalone d'images
  optimizeImage,
  deleteImage
}; 