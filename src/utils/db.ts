import { createClient } from '@libsql/client';

const url = import.meta.env.VITE_TURSO_DATABASE_URL;
const authToken = import.meta.env.VITE_TURSO_AUTH_TOKEN;

if (!url || !authToken) {
    console.error('Turso credentials missing in .env');
}

export const db = createClient({
    url: url || '',
    authToken: authToken || '',
});

export interface UserProfile {
    wallet_address: string;
    username: string;
    level: number;
    total_mass: number;
    wins: number;
    losses: number;
}

export async function initSchema() {
    try {
        await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        wallet_address TEXT PRIMARY KEY,
        username TEXT DEFAULT 'Guest',
        level INTEGER DEFAULT 1,
        total_mass INTEGER DEFAULT 0,
        wins INTEGER DEFAULT 0,
        losses INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
        console.log('Turso schema initialized');
    } catch (error) {
        console.error('Failed to initialize Turso schema:', error);
    }
}

export async function getUserProfile(walletAddress: string): Promise<UserProfile | null> {
    try {
        const result = await db.execute({
            sql: 'SELECT * FROM users WHERE wallet_address = ?',
            args: [walletAddress],
        });

        if (result.rows.length > 0) {
            return result.rows[0] as unknown as UserProfile;
        }
        return null;
    } catch (error) {
        console.error('Error fetching user profile:', error);
        return null;
    }
}

export async function createUserProfile(walletAddress: string, username: string = 'Guest'): Promise<UserProfile | null> {
    try {
        await db.execute({
            sql: 'INSERT INTO users (wallet_address, username) VALUES (?, ?) ON CONFLICT(wallet_address) DO NOTHING',
            args: [walletAddress, username],
        });
        return await getUserProfile(walletAddress);
    } catch (error) {
        console.error('Error creating user profile:', error);
        return null;
    }
}

export async function updateUserProfile(profile: Partial<UserProfile> & { wallet_address: string }) {
    try {
        const fields = Object.keys(profile).filter(k => k !== 'wallet_address');
        if (fields.length === 0) return;

        const setClause = fields.map(f => `${f} = ?`).join(', ');
        const args = fields.map(f => (profile as any)[f]).concat(profile.wallet_address);

        await db.execute({
            sql: `UPDATE users SET ${setClause} WHERE wallet_address = ?`,
            args,
        });
    } catch (error) {
        console.error('Error updating user profile:', error);
    }
}
