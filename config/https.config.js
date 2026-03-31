/**
 * Configuração HTTPS para Produção
 * 
 * Este módulo configura HTTPS usando certificados SSL/TLS
 * 
 * OPÇÕES:
 * 1. Certificado próprio (Let's Encrypt, DigiCert, etc)
 * 2. Proxy reverso (Nginx, Cloudflare, Railway)
 * 3. Certificado auto-assinado (apenas desenvolvimento)
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

/**
 * Configuração padrão
 */
const defaultConfig = {
    // Porta HTTP (redireciona para HTTPS em produção)
    httpPort: parseInt(process.env.HTTP_PORT) || 80,
    
    // Porta HTTPS
    httpsPort: parseInt(process.env.HTTPS_PORT) || 443,
    
    // Caminho dos certificados
    certPath: process.env.SSL_CERT_PATH || '/etc/ssl/certs/aluforce.crt',
    keyPath: process.env.SSL_KEY_PATH || '/etc/ssl/private/aluforce.key',
    caPath: process.env.SSL_CA_PATH || null,
    
    // Força HTTPS em produção
    forceHttps: process.env.NODE_ENV === 'production',
    
    // Configurações de segurança TLS
    tlsOptions: {
        minVersion: 'TLSv1.2',
        ciphers: [
            'ECDHE-ECDSA-AES128-GCM-SHA256',
            'ECDHE-RSA-AES128-GCM-SHA256',
            'ECDHE-ECDSA-AES256-GCM-SHA384',
            'ECDHE-RSA-AES256-GCM-SHA384',
        ].join(':'),
        honorCipherOrder: true
    }
};

/**
 * Middleware para forçar HTTPS
 */
function forceHttpsMiddleware(req, res, next) {
    // Se já é HTTPS, continua
    if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
        return next();
    }
    
    // Em desenvolvimento, não redireciona
    if (process.env.NODE_ENV !== 'production') {
        return next();
    }
    
    // Headers de segurança mesmo no redirect
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');

    // Redireciona para HTTPS
    const httpsUrl = `https://${req.hostname}${req.url}`;
    res.redirect(301, httpsUrl);
}

/**
 * Middleware para adicionar headers de segurança HTTPS
 */
function securityHeadersMiddleware(req, res, next) {
    // HSTS - força HTTPS por 1 ano
    if (process.env.NODE_ENV === 'production') {
        res.setHeader(
            'Strict-Transport-Security', 
            'max-age=31536000; includeSubDomains; preload'
        );
    }
    
    next();
}

/**
 * Cria servidor HTTPS
 * @param {Express} app - Aplicação Express
 * @param {Object} config - Configurações
 */
function createHttpsServer(app, config = {}) {
    const options = { ...defaultConfig, ...config };
    
    // Verificar se os certificados existem
    if (!fs.existsSync(options.certPath)) {
        console.warn(`⚠️ [HTTPS] Certificado não encontrado: ${options.certPath}`);
        console.warn('   Usando apenas HTTP. Configure SSL para produção.');
        return null;
    }
    
    if (!fs.existsSync(options.keyPath)) {
        console.warn(`⚠️ [HTTPS] Chave privada não encontrada: ${options.keyPath}`);
        return null;
    }
    
    try {
        const sslOptions = {
            cert: fs.readFileSync(options.certPath),
            key: fs.readFileSync(options.keyPath),
            ...options.tlsOptions
        };
        
        // Adicionar CA se existir
        if (options.caPath && fs.existsSync(options.caPath)) {
            sslOptions.ca = fs.readFileSync(options.caPath);
        }
        
        const httpsServer = https.createServer(sslOptions, app);
        
        console.log('✅ [HTTPS] Servidor HTTPS configurado');
        console.log(`   Certificado: ${options.certPath}`);
        console.log(`   TLS mínimo: ${options.tlsOptions.minVersion}`);
        
        return httpsServer;
    } catch (error) {
        console.error('❌ [HTTPS] Erro ao criar servidor:', error.message);
        return null;
    }
}

/**
 * Cria servidor HTTP que redireciona para HTTPS
 * @param {number} httpsPort - Porta HTTPS para redirecionamento
 */
function createHttpRedirectServer(httpsPort = 443) {
    const httpServer = http.createServer((req, res) => {
        const host = req.headers.host?.split(':')[0] || 'localhost';
        const redirectUrl = `https://${host}:${httpsPort}${req.url}`;
        
        res.writeHead(301, { Location: redirectUrl });
        res.end();
    });
    
    return httpServer;
}

/**
 * Inicia servidores HTTP e HTTPS
 * @param {Express} app - Aplicação Express
 * @param {Object} options - Configurações
 */
async function startServers(app, options = {}) {
    const config = { ...defaultConfig, ...options };
    const results = { http: null, https: null };
    
    // Em produção com certificados, usar HTTPS
    if (config.forceHttps) {
        const httpsServer = createHttpsServer(app, config);
        
        if (httpsServer) {
            results.https = await new Promise((resolve) => {
                httpsServer.listen(config.httpsPort, () => {
                    console.log(`🔒 HTTPS rodando em https://localhost:${config.httpsPort}`);
                    resolve(httpsServer);
                });
            });
            
            // Criar servidor HTTP que redireciona para HTTPS
            const httpRedirect = createHttpRedirectServer(config.httpsPort);
            results.http = await new Promise((resolve) => {
                httpRedirect.listen(config.httpPort, () => {
                    console.log(`🔄 HTTP:${config.httpPort} redirecionando para HTTPS:${config.httpsPort}`);
                    resolve(httpRedirect);
                });
            });
        }
    }
    
    // Se não conseguiu HTTPS, usar apenas HTTP
    if (!results.https) {
        const port = process.env.PORT || 3000;
        results.http = await new Promise((resolve) => {
            const server = app.listen(port, () => {
                console.log(`🚀 HTTP rodando em http://localhost:${port}`);
                if (process.env.NODE_ENV === 'production') {
                    console.log('⚠️  ATENÇáO: Rodando sem HTTPS em produção!');
                    console.log('   Configure SSL_CERT_PATH e SSL_KEY_PATH no .env');
                }
                resolve(server);
            });
        });
    }
    
    return results;
}

/**
 * Gera certificado auto-assinado para desenvolvimento
 * Requer: npm install selfsigned
 */
async function generateDevCertificate(outputDir = './ssl') {
    try {
        const selfsigned = require('selfsigned');
        
        const attrs = [{ name: 'commonName', value: 'localhost' }];
        const pems = selfsigned.generate(attrs, {
            days: 365,
            keySize: 2048,
            extensions: [
                { name: 'subjectAltName', altNames: [
                    { type: 2, value: 'localhost' },
                    { type: 7, ip: '127.0.0.1' }
                ]}
            ]
        });
        
        // Criar diretório se não existir
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        const certPath = path.join(outputDir, 'dev-cert.pem');
        const keyPath = path.join(outputDir, 'dev-key.pem');
        
        fs.writeFileSync(certPath, pems.cert);
        fs.writeFileSync(keyPath, pems.private);
        
        console.log('✅ Certificado de desenvolvimento gerado:');
        console.log(`   Certificado: ${certPath}`);
        console.log(`   Chave: ${keyPath}`);
        console.log('\n   Configure no .env:');
        console.log(`   SSL_CERT_PATH=${certPath}`);
        console.log(`   SSL_KEY_PATH=${keyPath}`);
        
        return { certPath, keyPath };
    } catch (error) {
        if (error.code === 'MODULE_NOT_FOUND') {
            console.error('❌ Instale selfsigned: npm install selfsigned');
        } else {
            console.error('❌ Erro ao gerar certificado:', error.message);
        }
        return null;
    }
}

module.exports = {
    createHttpsServer,
    createHttpRedirectServer,
    startServers,
    forceHttpsMiddleware,
    securityHeadersMiddleware,
    generateDevCertificate,
    defaultConfig
};
