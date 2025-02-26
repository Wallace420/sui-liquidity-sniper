export interface HoneypotCheckResult {
    isHoneypot: boolean;
    reason?: string;
    suspiciousFunctions?: string[];
}
export declare function checkIsHoneypot(coin: string): Promise<HoneypotCheckResult>;
