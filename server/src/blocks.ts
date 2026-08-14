import { Request, Response } from 'express';
import { Pool } from 'pg';
import { blockOrganizer, unblockOrganizer, getUserBlocks } from './queries/blocks';

export async function blockOrganizerHandler(req: Request, res: Response, pool: Pool) {
    const { userEmail, organizerEmail } = req.body;
    if (!userEmail || !organizerEmail) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    try {
        await blockOrganizer(pool, userEmail, organizerEmail);
        res.json({ success: true, message: 'Organizer blocked successfully' });
    } catch (error) {
        console.error('Block organizer error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
}

export async function unblockOrganizerHandler(req: Request, res: Response, pool: Pool) {
    const { userEmail, organizerEmail } = req.body;
    if (!userEmail || !organizerEmail) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    try {
        await unblockOrganizer(pool, userEmail, organizerEmail);
        res.json({ success: true, message: 'Organizer unblocked successfully' });
    } catch (error) {
        console.error('Unblock organizer error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
}

export async function getUserBlocksHandler(req: Request, res: Response, pool: Pool) {
    const { email } = req.params;
    if (!email) {
        return res.status(400).json({ success: false, error: 'Missing email' });
    }

    try {
        const blocks = await getUserBlocks(pool, email as string);
        res.json({ success: true, data: blocks });
    } catch (error) {
        console.error('Get user blocks error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
}
