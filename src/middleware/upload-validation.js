const path = require('path');

const ALLOWED_MIME_EXTENSIONS = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/gif': ['.gif'],
    'application/pdf': ['.pdf'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'application/vnd.ms-excel': ['.xls'],
    'text/csv': ['.csv'],
    'text/plain': ['.txt'],
    'application/xml': ['.xml']
};
const ALLOWED_MIMES = Object.freeze(Object.keys(ALLOWED_MIME_EXTENSIONS));
const DANGEROUS_EXTENSIONS = new Set(['.php', '.js', '.html', '.htm', '.exe', '.bat', '.cmd', '.sh', '.ps1', '.vbs', '.jar']);
const MAX_FILE_SIZE = 50 * 1024 * 1024;

function validateSingleFile(file) {
    if (!file) return 'Arquivo nao enviado';
    const allowedExtensions = ALLOWED_MIME_EXTENSIONS[file.mimetype];
    if (!allowedExtensions) return 'Tipo de arquivo nao permitido: ' + file.mimetype;
    if (file.size > MAX_FILE_SIZE) return 'Arquivo muito grande (max 50MB)';

    const filename = path.basename(file.originalname || '');
    const ext = path.extname(filename).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
        return 'Extensao de arquivo incompativel com o tipo enviado';
    }

    const nameWithoutExt = filename.slice(0, -ext.length).toLowerCase();
    if ([...DANGEROUS_EXTENSIONS].some(dangerousExt => nameWithoutExt.endsWith(dangerousExt))) {
        return 'Nome de arquivo potencialmente perigoso';
    }

    return null;
}

function validateUpload(req, res, next) {
    if (!req.file && !req.files) {
        return res.status(400).json({ message: 'Arquivo nao enviado' });
    }
    const files = req.files ? (Array.isArray(req.files) ? req.files : Object.values(req.files).flat()) : [req.file];
    for (const file of files) {
        const error = validateSingleFile(file);
        if (error) return res.status(400).json({ message: error });
    }
    next();
}
module.exports = { validateUpload, ALLOWED_MIMES, ALLOWED_MIME_EXTENSIONS, MAX_FILE_SIZE };
