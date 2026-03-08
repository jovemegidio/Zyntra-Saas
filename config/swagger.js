/**
 * Swagger/OpenAPI Configuration
 * Provides interactive API documentation at /api-docs
 */
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
    definition: {
        openapi: '3.0.3',
        info: {
            title: 'Zyntra ERP API',
            version: '2.1.7',
            description: 'API completa do sistema ERP Zyntra — módulos Vendas, Financeiro, RH, Compras, PCP, Logística, Faturamento/NFe e LGPD.',
            contact: {
                name: 'Zyntra Support',
                email: 'suporte@zyntra.com.br'
            }
        },
        servers: [
            { url: '/api', description: 'API Principal' }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            },
            schemas: {
                Error: {
                    type: 'object',
                    properties: {
                        message: { type: 'string' },
                        code: { type: 'string' }
                    }
                },
                LoginRequest: {
                    type: 'object',
                    required: ['email', 'senha'],
                    properties: {
                        email: { type: 'string', format: 'email', example: 'usuario@empresa.com.br' },
                        senha: { type: 'string', minLength: 6, example: '********' }
                    }
                },
                LoginResponse: {
                    type: 'object',
                    properties: {
                        token: { type: 'string' },
                        user: {
                            type: 'object',
                            properties: {
                                id: { type: 'integer' },
                                nome_completo: { type: 'string' },
                                email: { type: 'string' },
                                role: { type: 'string' }
                            }
                        }
                    }
                },
                HealthResponse: {
                    type: 'object',
                    properties: {
                        status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
                        uptime: { type: 'number' },
                        timestamp: { type: 'string', format: 'date-time' },
                        checks: { type: 'object' }
                    }
                },
                Funcionario: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        nome_completo: { type: 'string' },
                        email: { type: 'string' },
                        role: { type: 'string' },
                        status: { type: 'string' },
                        telefone: { type: 'string' },
                        data_nascimento: { type: 'string', format: 'date' }
                    }
                },
                Pedido: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        numero_pedido: { type: 'string' },
                        cliente_id: { type: 'integer' },
                        status: { type: 'string' },
                        valor_total: { type: 'number' },
                        data_pedido: { type: 'string', format: 'date' }
                    }
                },
                LancamentoFinanceiro: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        tipo: { type: 'string', enum: ['receita', 'despesa'] },
                        descricao: { type: 'string' },
                        valor: { type: 'number' },
                        data_vencimento: { type: 'string', format: 'date' },
                        status: { type: 'string' }
                    }
                }
            }
        },
        security: [{ bearerAuth: [] }],
        tags: [
            { name: 'Auth', description: 'Autenticação e sessões' },
            { name: 'Health', description: 'Status e monitoramento' },
            { name: 'Vendas', description: 'Módulo de Vendas/CRM' },
            { name: 'Financeiro', description: 'Módulo Financeiro' },
            { name: 'RH', description: 'Recursos Humanos' },
            { name: 'Compras', description: 'Módulo de Compras' },
            { name: 'PCP', description: 'Planejamento e Controle de Produção' },
            { name: 'LGPD', description: 'Compliance LGPD' }
        ],
        paths: {
            '/login': {
                post: {
                    tags: ['Auth'],
                    summary: 'Autenticação de usuário',
                    security: [],
                    requestBody: {
                        required: true,
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } }
                    },
                    responses: {
                        '200': { description: 'Login bem-sucedido', content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } } } },
                        '401': { description: 'Credenciais inválidas' },
                        '429': { description: 'Rate limit excedido' }
                    }
                }
            },
            '/me': {
                get: {
                    tags: ['Auth'],
                    summary: 'Dados do usuário autenticado',
                    responses: {
                        '200': { description: 'Dados do usuário', content: { 'application/json': { schema: { $ref: '#/components/schemas/Funcionario' } } } },
                        '401': { description: 'Não autenticado' }
                    }
                }
            },
            '/health': {
                get: {
                    tags: ['Health'],
                    summary: 'Health check do sistema',
                    security: [],
                    responses: {
                        '200': { description: 'Sistema saudável', content: { 'application/json': { schema: { $ref: '#/components/schemas/HealthResponse' } } } },
                        '503': { description: 'Sistema degradado' }
                    }
                }
            },
            '/vendas/pedidos': {
                get: {
                    tags: ['Vendas'],
                    summary: 'Listar pedidos de venda',
                    parameters: [
                        { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
                        { in: 'query', name: 'limit', schema: { type: 'integer', default: 50 } },
                        { in: 'query', name: 'status', schema: { type: 'string' } }
                    ],
                    responses: {
                        '200': { description: 'Lista de pedidos' },
                        '401': { description: 'Não autenticado' }
                    }
                }
            },
            '/financeiro/lancamentos': {
                get: {
                    tags: ['Financeiro'],
                    summary: 'Listar lançamentos financeiros',
                    parameters: [
                        { in: 'query', name: 'tipo', schema: { type: 'string', enum: ['receita', 'despesa'] } },
                        { in: 'query', name: 'data_inicio', schema: { type: 'string', format: 'date' } },
                        { in: 'query', name: 'data_fim', schema: { type: 'string', format: 'date' } }
                    ],
                    responses: {
                        '200': { description: 'Lista de lançamentos' },
                        '401': { description: 'Não autenticado' }
                    }
                }
            },
            '/funcionarios': {
                get: {
                    tags: ['RH'],
                    summary: 'Listar funcionários',
                    responses: {
                        '200': { description: 'Lista de funcionários' },
                        '401': { description: 'Não autenticado' }
                    }
                }
            },
            '/compras/pedidos': {
                get: {
                    tags: ['Compras'],
                    summary: 'Listar pedidos de compra',
                    responses: {
                        '200': { description: 'Lista de pedidos de compra' },
                        '401': { description: 'Não autenticado' }
                    }
                }
            },
            '/pcp/ordens': {
                get: {
                    tags: ['PCP'],
                    summary: 'Listar ordens de produção',
                    responses: {
                        '200': { description: 'Lista de ordens' },
                        '401': { description: 'Não autenticado' }
                    }
                }
            },
            '/lgpd/consentimentos': {
                get: {
                    tags: ['LGPD'],
                    summary: 'Listar consentimentos LGPD',
                    responses: {
                        '200': { description: 'Lista de consentimentos' },
                        '401': { description: 'Não autenticado' }
                    }
                }
            }
        }
    },
    apis: [] // Paths are defined inline above
};

function setupSwagger(app) {
    const specs = swaggerJsdoc(options);
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
        customSiteTitle: 'Zyntra ERP API Docs',
        customCss: '.swagger-ui .topbar { display: none }',
        swaggerOptions: {
            persistAuthorization: true
        }
    }));
    return specs;
}

module.exports = { setupSwagger };
