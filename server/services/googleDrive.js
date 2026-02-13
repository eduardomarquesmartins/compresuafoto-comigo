const { google } = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];

let driveClient = null;

/**
 * Autentica com a Service Account usando variáveis de ambiente (lazy initialization)
 */
function getDriveClient() {
    if (driveClient) return driveClient;

    let email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    let privateKey = process.env.GOOGLE_PRIVATE_KEY;

    if (!email || !privateKey) {
        throw new Error('Credenciais do Google Drive não encontradas no .env. Verifique GOOGLE_SERVICE_ACCOUNT_EMAIL e GOOGLE_PRIVATE_KEY.');
    }

    // Limpeza robusta (remove aspas, espaços e resolve \n)
    email = email.trim().replace(/^["']|["']$/g, '');
    privateKey = privateKey.trim().replace(/^["']|["']$/g, '');
    privateKey = privateKey.replace(/\\n/g, '\n');

    try {
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: email,
                private_key: privateKey
            },
            scopes: SCOPES
        });

        driveClient = google.drive({ version: 'v3', auth });
        console.log(`[GoogleDrive] Cliente inicializado para: ${email}`);
        return driveClient;
    } catch (err) {
        console.error('[GoogleDrive] Erro ao inicializar cliente:', err.message);
        throw err;
    }
}

/**
 * Lista todos os arquivos de imagem de uma pasta específica
 * @param {string} folderId 
 * @returns {Promise<Array>}
 */
exports.listImagesFromFolder = async (folderId) => {
    try {
        const drive = getDriveClient();
        const response = await drive.files.list({
            q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
            fields: 'files(id, name, mimeType)',
            pageSize: 100 // Limite inicial
        });
        return response.data.files;
    } catch (error) {
        console.error('Google Drive List Error:', error);
        throw new Error('Failed to list files from Google Drive: ' + error.message);
    }
};

/**
 * Baixa um arquivo do Google Drive como Buffer
 * @param {string} fileId 
 * @returns {Promise<Buffer>}
 */
exports.downloadFile = async (fileId) => {
    try {
        const drive = getDriveClient();
        const response = await drive.files.get(
            { fileId, alt: 'media' },
            { responseType: 'arraybuffer' }
        );
        return Buffer.from(response.data);
    } catch (error) {
        console.error('Google Drive Download Error:', error);
        throw new Error('Failed to download file from Google Drive');
    }
};
