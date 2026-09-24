import express, { Request, Response } from 'express';
import { workspaceStore } from './workspaceStore.js';

const router = express.Router();

// 1. Bookmarks & Collections
router.get('/bookmarks', (req: Request, res: Response) => {
  try {
    const bookmarks = workspaceStore.getBookmarks();
    res.json({ success: true, bookmarks });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to fetch bookmarks' });
  }
});

router.post('/bookmarks', (req: Request, res: Response) => {
  try {
    const { chatId, chatTitle, messageId, text, senderName, date, collection = 'Favorites', tags } = req.body;
    if (!chatId || !messageId) {
      return res.status(400).json({ success: false, error: 'chatId and messageId are required' });
    }

    const bookmark = workspaceStore.addBookmark({
      chatId,
      chatTitle: chatTitle || 'Chat',
      messageId: Number(messageId),
      text: text || '',
      senderName: senderName || 'User',
      date: Number(date) || Math.floor(Date.now() / 1000),
      collection,
      tags,
    });
    res.json({ success: true, bookmark });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to add bookmark' });
  }
});

router.delete('/bookmarks/:id', (req: Request, res: Response) => {
  try {
    const deleted = workspaceStore.removeBookmark(req.params.id);
    res.json({ success: deleted });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to delete bookmark' });
  }
});

router.patch('/bookmarks/:id/collection', (req: Request, res: Response) => {
  try {
    const { collection } = req.body;
    const updated = workspaceStore.updateBookmarkCollection(req.params.id, collection);
    res.json({ success: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to update bookmark collection' });
  }
});

// 2. Monitored Keywords
router.get('/keywords', (req: Request, res: Response) => {
  try {
    const keywords = workspaceStore.getKeywords();
    res.json({ success: true, keywords });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to fetch keywords' });
  }
});

router.post('/keywords', (req: Request, res: Response) => {
  try {
    const { keyword } = req.body;
    if (!keyword || !keyword.trim()) {
      return res.status(400).json({ success: false, error: 'keyword is required' });
    }

    const kw = workspaceStore.addKeyword(keyword.trim());
    res.json({ success: true, keyword: kw });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to add keyword' });
  }
});

router.delete('/keywords/:id', (req: Request, res: Response) => {
  try {
    const deleted = workspaceStore.removeKeyword(req.params.id);
    res.json({ success: deleted });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to delete keyword' });
  }
});

// 3. Keyword Alerts
router.get('/alerts', (req: Request, res: Response) => {
  try {
    const alerts = workspaceStore.getAlerts();
    res.json({ success: true, alerts });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to fetch alerts' });
  }
});

router.post('/alerts/read', (req: Request, res: Response) => {
  try {
    workspaceStore.markAlertsRead();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to mark alerts as read' });
  }
});

// 4. Clipboard Manager
router.get('/clipboard', (req: Request, res: Response) => {
  try {
    const items = workspaceStore.getClipboard();
    res.json({ success: true, items });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to fetch clipboard' });
  }
});

router.post('/clipboard', (req: Request, res: Response) => {
  try {
    const { text, sourceChat } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, error: 'text is required' });
    }

    const item = workspaceStore.addClipboard(text, sourceChat);
    res.json({ success: true, item });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to add clipboard item' });
  }
});

router.delete('/clipboard', (req: Request, res: Response) => {
  try {
    workspaceStore.clearClipboard();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to clear clipboard' });
  }
});

// 5. Payments Architecture
router.get('/payments', (req: Request, res: Response) => {
  try {
    const payments = workspaceStore.getPayments();
    res.json({ success: true, payments });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to fetch payments' });
  }
});

router.post('/payments', (req: Request, res: Response) => {
  try {
    const { planName, amount, currency = 'USD', provider = 'telegram_stars', customerEmail } = req.body;
    if (!planName || !amount) {
      return res.status(400).json({ success: false, error: 'planName and amount are required' });
    }

    const transaction = workspaceStore.createPaymentOrder({
      planName,
      amount: Number(amount),
      currency,
      provider,
      customerEmail,
    });

    res.json({ success: true, transaction });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to create payment order' });
  }
});

export default router;
