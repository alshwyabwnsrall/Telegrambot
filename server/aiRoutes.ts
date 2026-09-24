import express, { Request, Response } from 'express';
import { aiService } from './aiService.js';
import { telegramManager } from './telegramManager.js';

const router = express.Router();

// 1. AI Reply Suggestions
router.post('/reply-single', async (req: Request, res: Response) => {
  try {
    const { text, tone = 'brief', lang = 'ar' } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, error: 'text is required' });
    }

    const replies = await aiService.generateReplies({ messageText: text });
    let selectedReply = replies.short || replies.arabic || replies.friendly;
    if (tone === 'official' || tone === 'formal') selectedReply = replies.formal || selectedReply;
    if (tone === 'friendly') selectedReply = replies.friendly || selectedReply;
    if (tone === 'professional') selectedReply = replies.professional || selectedReply;

    res.json({ success: true, reply: selectedReply });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to generate single reply' });
  }
});

router.post('/replies', async (req: Request, res: Response) => {
  try {
    const { messageText, chatTitle, senderName } = req.body;
    if (!messageText) {
      return res.status(400).json({ success: false, error: 'messageText is required' });
    }

    const replies = await aiService.generateReplies({
      messageText,
      chatTitle,
      senderName,
    });
    res.json({ success: true, replies });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to generate replies' });
  }
});

// 2. AI Summarize
router.post('/summarize', async (req: Request, res: Response) => {
  try {
    const { messages } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, error: 'messages array is required' });
    }

    const result = await aiService.summarizeMessages({ messages });
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to summarize' });
  }
});

// 3. AI Translate (Single & Batch)
router.post('/translate', async (req: Request, res: Response) => {
  try {
    const { text, targetLanguage = 'Arabic' } = req.body;
    if (typeof text !== 'string') {
      return res.status(400).json({ success: false, error: 'text is required' });
    }

    const result = await aiService.translateText({ text, targetLanguage });
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to translate' });
  }
});

router.post('/translate-batch', async (req: Request, res: Response) => {
  try {
    const { items, targetLanguage = 'Arabic' } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'items array is required' });
    }

    const results = await aiService.translateBatch({ items, targetLanguage });
    res.json({ success: true, results });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to batch translate' });
  }
});

// 4. AI Extract Information
router.post('/extract', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, error: 'text is required' });
    }

    const entities = await aiService.extractInformation({ text });
    res.json({ success: true, entities });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to extract info' });
  }
});

// 5. AI Channel Finder
router.post('/find-channels', async (req: Request, res: Response) => {
  try {
    const { query, channels } = req.body;
    if (!query) {
      return res.status(400).json({ success: false, error: 'query is required' });
    }

    const matches = await aiService.findChannels({
      query,
      channels: Array.isArray(channels) ? channels : [],
    });

    res.json({ success: true, matches });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Channel finder failed' });
  }
});

// 6. AI Command Center NLP
router.post('/command', async (req: Request, res: Response) => {
  try {
    const { command, activeChatTitle, selectedCount } = req.body;
    if (!command) {
      return res.status(400).json({ success: false, error: 'command is required' });
    }

    const parsed = await aiService.parseCommand({
      command,
      activeChatTitle,
      selectedCount,
    });

    res.json({ success: true, parsed });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Command parsing failed' });
  }
});

// 7. AI Smart Folders & Channel Categorization
router.post('/categorize-dialogs', async (req: Request, res: Response) => {
  try {
    const { dialogs } = req.body;
    if (!Array.isArray(dialogs) || dialogs.length === 0) {
      return res.status(400).json({ success: false, error: 'dialogs array is required' });
    }

    const categories = await aiService.categorizeDialogs({ dialogs });
    res.json({ success: true, categories });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to categorize dialogs' });
  }
});

export default router;
