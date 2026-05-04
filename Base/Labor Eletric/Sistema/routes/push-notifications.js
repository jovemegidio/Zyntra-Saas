/**
 * Rotas para Push Notifications (iOS/Android via APNs/FCM)
 * Gerencia tokens de dispositivos e envio de notificações
 */

const express = require('express');
const router = express.Router();

module.exports = function(db, authMiddleware) {
  
  // Registrar token de push notification
  router.post('/push/register', authMiddleware, async (req, res) => {
    try {
      const { token, platform } = req.body;
      const userId = req.user.id;
      const empresaId = req.user.empresa_id;

      if (!token || !platform) {
        return res.status(400).json({ error: 'Token e platform são obrigatórios' });
      }

      if (!['ios', 'android', 'web'].includes(platform)) {
        return res.status(400).json({ error: 'Platform inválida' });
      }

      // Upsert: atualiza se já existe, insere se não
      await db.query(`
        INSERT INTO push_tokens (user_id, empresa_id, token, platform, updated_at)
        VALUES (?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE 
          token = VALUES(token),
          platform = VALUES(platform),
          updated_at = NOW(),
          active = 1
      `, [userId, empresaId, token, platform]);

      res.json({ success: true, message: 'Token registrado com sucesso' });
    } catch (error) {
      console.error('[Push] Erro ao registrar token:', error);
      res.status(500).json({ error: 'Erro ao registrar token' });
    }
  });

  // Remover token (logout / desinstalar)
  router.delete('/push/unregister', authMiddleware, async (req, res) => {
    try {
      const { token } = req.body;
      const userId = req.user.id;

      await db.query(
        'UPDATE push_tokens SET active = 0 WHERE user_id = ? AND token = ?',
        [userId, token]
      );

      res.json({ success: true });
    } catch (error) {
      console.error('[Push] Erro ao remover token:', error);
      res.status(500).json({ error: 'Erro ao remover token' });
    }
  });

  // Listar dispositivos registrados (para admin)
  router.get('/push/devices', authMiddleware, async (req, res) => {
    try {
      const userId = req.user.id;
      
      const [devices] = await db.query(
        'SELECT id, platform, active, created_at, updated_at FROM push_tokens WHERE user_id = ? AND active = 1',
        [userId]
      );

      res.json({ devices });
    } catch (error) {
      console.error('[Push] Erro ao listar devices:', error);
      res.status(500).json({ error: 'Erro ao listar dispositivos' });
    }
  });

  return router;
};
