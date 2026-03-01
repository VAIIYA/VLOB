export class AuthManager {
    private provider: any;
    public walletAddress: string | null = null;

    constructor() {
        this.provider = (window as any).solana;
    }

    async connect(): Promise<string | null> {
        if (!this.provider) {
            window.open('https://phantom.app/', '_blank');
            return null;
        }

        try {
            const resp = await this.provider.connect();
            this.walletAddress = resp.publicKey.toString();
            console.log('Connected to Solana:', this.walletAddress);
            return this.walletAddress;
        } catch (err) {
            console.error('Connection failed:', err);
            return null;
        }
    }

    disconnect() {
        if (this.provider) {
            this.provider.disconnect();
            this.walletAddress = null;
        }
    }

    isConnected(): boolean {
        return !!this.walletAddress;
    }
}

export const auth = new AuthManager();
