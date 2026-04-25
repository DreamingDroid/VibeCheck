import { Request, Response } from 'express';
import { Pool } from 'pg';
import { followOrganizer, unfollowOrganizer, getUserFollowing, getOrganizerFollowers } from './queries/followers';

export async function followOrganizerHandler(req: Request, res: Response, pool: Pool) {
    const { userEmail, organizerEmail } = req.body;
    if (!userEmail || !organizerEmail) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    try {
        await followOrganizer(pool, userEmail, organizerEmail);
        res.json({ success: true, message: 'Followed successfully' });
    } catch (error) {
        console.error('Follow error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
}

export async function unfollowOrganizerHandler(req: Request, res: Response, pool: Pool) {
    const { userEmail, organizerEmail } = req.body;
    if (!userEmail || !organizerEmail) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    try {
        await unfollowOrganizer(pool, userEmail, organizerEmail);
        res.json({ success: true, message: 'Unfollowed successfully' });
    } catch (error) {
        console.error('Unfollow error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
}

export async function getUserFollowingHandler(req: Request, res: Response, pool: Pool) {
    const { email } = req.params;
    if (!email) {
        return res.status(400).json({ success: false, error: 'Missing email' });
    }

    try {
        const following = await getUserFollowing(pool, email as string);
        res.json({ success: true, data: following });
    } catch (error) {
        console.error('Get following error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
}

export async function getOrganizerFollowersHandler(req: Request, res: Response, pool: Pool) {
    const email = req.query.email as string; // this is the organizer's email from the route
    if (!email) {
        return res.status(400).json({ success: false, error: 'Missing email' });
    }

    try {
        const followers = await getOrganizerFollowers(pool, email);
        res.json({ success: true, data: followers });
    } catch (error) {
        console.error('Get followers error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
}
