/**
 * DOCU: Proxies chatbot requests from the frontend to the AI service /chat endpoint.
 * Scopes all responses to Springer Capital Compliance platform topics via Gemini.
 * Last Updated Date: September 22, 2026
 * @author Keith
 */
import { Router, Request, Response } from 'express';
import { config } from '../config';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  const { message, role } = req.body as { message?: string; role?: string };

  if (!message || !message.trim()) {
    res.status(400).json({ success: false, message: 'Message is required.' });
    return;
  }

  try {
    const aiUrl = `${config.services.aiServiceUrl}/chat`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const aiResponse = await fetch(aiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: message.trim(), role: role || 'Advisor' }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!aiResponse.ok) {
      const errText = await aiResponse.text().catch(() => 'AI service error');
      console.error(`[Chat] AI service responded ${aiResponse.status}: ${errText}`);
      res.status(502).json({ success: false, message: 'AI service returned an error.' });
      return;
    }

    const data = await aiResponse.json() as { reply: string };
    res.status(200).json({ success: true, reply: data.reply });
  } catch (err: unknown) {
    const isAbort = err instanceof Error && err.name === 'AbortError';
    console.error('[Chat] Error calling AI service:', err);
    res.status(isAbort ? 504 : 503).json({
      success: false,
      message: isAbort ? 'AI service timed out.' : 'AI service temporarily unavailable.',
    });
  }
});

import { authenticateToken } from '../middleware/auth.middleware';
import { uploadDocumentFile } from '../middleware/upload.middleware';
import { DocumentController } from '../controllers/document.controller';

router.post(
  '/audit-and-fix',
  authenticateToken,
  uploadDocumentFile.single('file'),
  DocumentController.auditAndFix
);

export default router;
