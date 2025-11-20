const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Ensure upload directories exist
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadType = req.params.uploadType || 'general';
    const uploadDir = path.join(process.env.UPLOAD_DIR || './uploads', uploadType);
    
    ensureDirectoryExists(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
    const extension = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, extension);
    const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9]/g, '_');
    
    cb(null, `${sanitizedBaseName}_${uniqueSuffix}${extension}`);
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Define allowed file types
  const allowedTypes = {
    documents: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv'
    ],
    images: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml'
    ],
    videos: [
      'video/mp4',
      'video/mpeg',
      'video/quicktime',
      'video/x-msvideo'
    ],
    archives: [
      'application/zip',
      'application/x-rar-compressed',
      'application/x-7z-compressed'
    ]
  };

  // Get upload type from request
  const uploadType = req.params.uploadType || 'documents';
  const allowedMimeTypes = allowedTypes[uploadType] || allowedTypes.documents;

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed for ${uploadType} uploads`), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
    files: 5 // Maximum 5 files per request
  }
});

// Single file upload middleware
const uploadSingle = (fieldName = 'file') => {
  return (req, res, next) => {
    const singleUpload = upload.single(fieldName);
    
    singleUpload(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            error: 'File too large',
            message: `File size exceeds the maximum limit of ${(parseInt(process.env.MAX_FILE_SIZE) || 10485760) / 1024 / 1024}MB`
          });
        } else if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({
            success: false,
            error: 'Too many files',
            message: 'Maximum 5 files allowed per request'
          });
        } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({
            success: false,
            error: 'Unexpected field',
            message: `Expected field name: ${fieldName}`
          });
        }
        
        return res.status(400).json({
          success: false,
          error: 'Upload error',
          message: err.message
        });
      } else if (err) {
        return res.status(400).json({
          success: false,
          error: 'File validation failed',
          message: err.message
        });
      }
      
      // Add file metadata to request
      if (req.file) {
        req.file.uploadType = req.params.uploadType || 'general';
        req.file.uploadedBy = req.user?.id;
        req.file.uploadedAt = new Date();
      }
      
      next();
    });
  };
};

// Multiple files upload middleware
const uploadMultiple = (fieldName = 'files', maxCount = 5) => {
  return (req, res, next) => {
    const multipleUpload = upload.array(fieldName, maxCount);
    
    multipleUpload(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            error: 'File too large',
            message: `One or more files exceed the maximum limit of ${(parseInt(process.env.MAX_FILE_SIZE) || 10485760) / 1024 / 1024}MB`
          });
        } else if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({
            success: false,
            error: 'Too many files',
            message: `Maximum ${maxCount} files allowed per request`
          });
        }
        
        return res.status(400).json({
          success: false,
          error: 'Upload error',
          message: err.message
        });
      } else if (err) {
        return res.status(400).json({
          success: false,
          error: 'File validation failed',
          message: err.message
        });
      }
      
      // Add metadata to files
      if (req.files && req.files.length > 0) {
        req.files.forEach(file => {
          file.uploadType = req.params.uploadType || 'general';
          file.uploadedBy = req.user?.id;
          file.uploadedAt = new Date();
        });
      }
      
      next();
    });
  };
};

// Fields upload middleware (for forms with multiple file fields)
const uploadFields = (fields) => {
  return (req, res, next) => {
    const fieldsUpload = upload.fields(fields);
    
    fieldsUpload(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            error: 'File too large',
            message: `One or more files exceed the maximum limit of ${(parseInt(process.env.MAX_FILE_SIZE) || 10485760) / 1024 / 1024}MB`
          });
        }
        
        return res.status(400).json({
          success: false,
          error: 'Upload error',
          message: err.message
        });
      } else if (err) {
        return res.status(400).json({
          success: false,
          error: 'File validation failed',
          message: err.message
        });
      }
      
      // Add metadata to files
      if (req.files) {
        Object.keys(req.files).forEach(fieldName => {
          req.files[fieldName].forEach(file => {
            file.uploadType = req.params.uploadType || 'general';
            file.uploadedBy = req.user?.id;
            file.uploadedAt = new Date();
          });
        });
      }
      
      next();
    });
  };
};

// File validation middleware
const validateFile = (req, res, next) => {
  if (!req.file && !req.files) {
    return res.status(400).json({
      success: false,
      error: 'No file uploaded',
      message: 'Please select a file to upload'
    });
  }
  
  next();
};

// Virus scanning middleware (placeholder - integrate with actual antivirus)
const scanForVirus = (req, res, next) => {
  // In production, integrate with ClamAV or similar
  // For now, just check file extensions and basic patterns
  
  const scanFile = (file) => {
    // Check for suspicious file extensions
    const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (suspiciousExtensions.includes(fileExtension)) {
      throw new Error(`File type ${fileExtension} is not allowed for security reasons`);
    }
    
    // Check file size (additional validation)
    if (file.size === 0) {
      throw new Error('Empty files are not allowed');
    }
  };
  
  try {
    if (req.file) {
      scanFile(req.file);
    }
    
    if (req.files) {
      if (Array.isArray(req.files)) {
        req.files.forEach(scanFile);
      } else {
        Object.keys(req.files).forEach(fieldName => {
          req.files[fieldName].forEach(scanFile);
        });
      }
    }
    
    next();
  } catch (error) {
    // Delete uploaded files if virus scan fails
    const deleteFile = (filePath) => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    };
    
    if (req.file) {
      deleteFile(req.file.path);
    }
    
    if (req.files) {
      if (Array.isArray(req.files)) {
        req.files.forEach(file => deleteFile(file.path));
      } else {
        Object.keys(req.files).forEach(fieldName => {
          req.files[fieldName].forEach(file => deleteFile(file.path));
        });
      }
    }
    
    return res.status(400).json({
      success: false,
      error: 'File security check failed',
      message: error.message
    });
  }
};

// File cleanup utility
const cleanupFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
  } catch (error) {
    console.error('Error deleting file:', error);
  }
  return false;
};

// Get file info utility
const getFileInfo = (file) => {
  return {
    originalName: file.originalname,
    filename: file.filename,
    path: file.path,
    size: file.size,
    mimetype: file.mimetype,
    uploadType: file.uploadType,
    uploadedBy: file.uploadedBy,
    uploadedAt: file.uploadedAt
  };
};

module.exports = {
  upload,
  uploadSingle,
  uploadMultiple,
  uploadFields,
  validateFile,
  scanForVirus,
  cleanupFile,
  getFileInfo,
  ensureDirectoryExists
};