// Constants for scam detection
const SUSPICIOUS_THRESHOLDS = {
    MIN_LIQUIDITY: 0.1, // Minimum liquidity in SUI
    MAX_CREATOR_TRADES: 10, // Maximum number of trades by creator in last 24h
    MIN_TOKEN_AGE: 3600, // Minimum token age in seconds (1 hour)
    SUSPICIOUS_RATIO: 5, // Ratio between token amounts that's suspicious
    MAX_SIMILAR_POOLS: 3, // Maximum number of similar pools by same creator
    CACHE_TTL: 300000, // Cache TTL in ms (5 minutes)
};
// Cache for scam checks to reduce RPC calls
const scamCheckCache = new Map();
// Blacklist für bekannte Scam-Token
const BLACKLISTED_TOKENS = [
// Hier können bekannte Scam-Token-Adressen hinzugefügt werden
];
async function getTokenMetadata(client, coinType) {
    try {
        const response = await client.getCoinMetadata({ coinType });
        if (!response)
            return null;
        return {
            decimals: response.decimals,
            name: response.name || 'Unknown',
            symbol: response.symbol || 'UNKNOWN',
            description: response.description || undefined,
            iconUrl: response.iconUrl || undefined,
            verified: false, // Default to false, update based on verification status
            createdAt: Date.now(), // Default to current time if creation time not available
        };
    }
    catch (error) {
        console.error(`Error fetching metadata for ${coinType}:`, error);
        return null;
    }
}
async function checkCreatorHistory(client, creator, poolId) {
    try {
        // Get creator's transaction history
        const txResponse = await client.queryTransactionBlocks({
            filter: {
                FromAddress: creator
            },
            options: {
                showEffects: true,
                showInput: true
            },
            limit: 50
        });
        if (!txResponse.data) {
            return { isSuspicious: true, reason: 'No transaction history found' };
        }
        // Count pool creations in last 24h
        const lastDay = Date.now() - 24 * 60 * 60 * 1000;
        const recentPools = txResponse.data.filter(tx => {
            const effects = tx.effects;
            return Number(tx.timestampMs) > lastDay &&
                effects?.events?.some((e) => e.type.includes('::CreatePoolEvent'));
        });
        if (recentPools.length > SUSPICIOUS_THRESHOLDS.MAX_CREATOR_TRADES) {
            return {
                isSuspicious: true,
                reason: `Creator created ${recentPools.length} pools in last 24h`
            };
        }
        // Check for similar pools
        const similarPools = txResponse.data.filter(tx => {
            const effects = tx.effects;
            return effects?.events?.some((e) => e.type.includes('::CreatePoolEvent') &&
                e.parsedJson?.pool_id !== poolId &&
                (e.parsedJson?.coin_type_a === poolId || e.parsedJson?.coin_type_b === poolId));
        });
        if (similarPools.length > SUSPICIOUS_THRESHOLDS.MAX_SIMILAR_POOLS) {
            return {
                isSuspicious: true,
                reason: `Creator has ${similarPools.length} similar pools`
            };
        }
        return { isSuspicious: false };
    }
    catch (error) {
        console.error('Error checking creator history:', error);
        return { isSuspicious: true, reason: 'Failed to verify creator history' };
    }
}
async function analyzeTokens(client, coinA, coinB) {
    try {
        const [metadataA, metadataB] = await Promise.all([
            getTokenMetadata(client, coinA),
            getTokenMetadata(client, coinB)
        ]);
        if (!metadataA || !metadataB) {
            return { isSuspicious: true, reason: 'Missing token metadata' };
        }
        // Check for suspicious token names/symbols
        const suspiciousTerms = ['test', 'scam', 'fake', 'copy', 'replica'];
        const nameCheck = [metadataA.name.toLowerCase(), metadataB.name.toLowerCase()]
            .some(name => suspiciousTerms.some(term => name.includes(term)));
        if (nameCheck) {
            return { isSuspicious: true, reason: 'Suspicious token name detected' };
        }
        // Check for missing or suspicious descriptions
        if (!metadataA.description || !metadataB.description) {
            return { isSuspicious: true, reason: 'Missing token description' };
        }
        // Check token age if available
        const now = Date.now();
        if (metadataA.createdAt && (now - metadataA.createdAt) < SUSPICIOUS_THRESHOLDS.MIN_TOKEN_AGE) {
            return { isSuspicious: true, reason: 'Token A too new' };
        }
        if (metadataB.createdAt && (now - metadataB.createdAt) < SUSPICIOUS_THRESHOLDS.MIN_TOKEN_AGE) {
            return { isSuspicious: true, reason: 'Token B too new' };
        }
        return { isSuspicious: false };
    }
    catch (error) {
        console.error('Error analyzing tokens:', error);
        return { isSuspicious: true, reason: 'Failed to analyze tokens' };
    }
}
async function analyzeLiquidity(info) {
    try {
        const amountA = Number(info.amountA);
        const amountB = Number(info.amountB);
        // Check minimum liquidity
        if (amountA < SUSPICIOUS_THRESHOLDS.MIN_LIQUIDITY || amountB < SUSPICIOUS_THRESHOLDS.MIN_LIQUIDITY) {
            return { isSuspicious: true, reason: 'Insufficient liquidity' };
        }
        // Check for suspicious ratios
        const ratio = Math.max(amountA / amountB, amountB / amountA);
        if (ratio > SUSPICIOUS_THRESHOLDS.SUSPICIOUS_RATIO) {
            return { isSuspicious: true, reason: 'Suspicious token ratio' };
        }
        return { isSuspicious: false };
    }
    catch (error) {
        console.error('Error analyzing liquidity:', error);
        return { isSuspicious: true, reason: 'Failed to analyze liquidity' };
    }
}
export function checkIsBlackListed(coinType) {
    // Überprüfen, ob der Token in der Blacklist ist
    return BLACKLISTED_TOKENS.includes(coinType);
}
export async function scamProbability(transactionInfo) {
    // Erweiterte Scam-Erkennung für den Backtest
    const randomScore = Math.random() * 100;
    // Erweiterte Faktoren
    const factors = {
        // Profitabilität
        profitMargin: (transactionInfo.outputAmount - transactionInfo.inputAmount) / transactionInfo.inputAmount,
        // Zeitbasierte Risiken
        timeBasedRisk: Math.random(), // Simuliert das Alter des Pools
        timeSinceCreation: Date.now() - (transactionInfo.timestamp || Date.now()),
        // Volumen und Liquidität
        volumeRisk: Math.random(), // Simuliert das Handelsvolumen
        liquidityDepth: Math.min(1.0, transactionInfo.inputAmount / 10000), // Normalisiert auf 10k
        // Token-Metriken
        tokenAge: Math.random(), // Simuliert das Alter des Tokens
        holderCount: Math.floor(Math.random() * 1000), // Simuliert die Anzahl der Token-Holder
        // Entwickler/Team-Metriken
        developerActivity: Math.random(), // Simuliert die Entwickleraktivität
        socialMediaPresence: Math.random(), // Simuliert die Social-Media-Präsenz
        // Marktmetriken
        marketCap: Math.random() * 1000000, // Simuliert die Marktkapitalisierung
        priceVolatility: Math.random() * 0.5 + 0.5, // 50-100% Volatilität
    };
    // Gewichtete Berechnung mit erweiterten Faktoren
    const score = 
    // Basisrisiko (30%)
    randomScore * 0.3 +
        // Profitabilitätsrisiken (20%)
        (factors.profitMargin > 0.5 ? 30 : 0) * 0.2 +
        // Zeitbasierte Risiken (15%)
        (factors.timeBasedRisk < 0.2 ? 20 : 0) * 0.15 +
        (factors.timeSinceCreation < 24 * 60 * 60 * 1000 ? 15 : 0) * 0.15 +
        // Volumen und Liquiditätsrisiken (15%)
        (factors.volumeRisk < 0.3 ? 20 : 0) * 0.15 +
        (factors.liquidityDepth < 0.2 ? 25 : 0) * 0.15 +
        // Token-Metriken (10%)
        (factors.tokenAge < 0.3 ? 15 : 0) * 0.1 +
        (factors.holderCount < 100 ? 20 : 0) * 0.1 +
        // Entwickler/Team-Metriken (5%)
        (factors.developerActivity < 0.2 ? 10 : 0) * 0.05 +
        (factors.socialMediaPresence < 0.3 ? 10 : 0) * 0.05 +
        // Marktmetriken (5%)
        (factors.marketCap < 100000 ? 15 : 0) * 0.05 +
        (factors.priceVolatility > 0.8 ? 15 : 0) * 0.05;
    // Zusätzliche Risikomultiplikatoren
    const riskMultipliers = {
        highProfitRisk: factors.profitMargin > 1.0 ? 1.2 : 1.0, // 20% höheres Risiko bei sehr hohen Gewinnen
        lowLiquidityRisk: factors.liquidityDepth < 0.1 ? 1.3 : 1.0, // 30% höheres Risiko bei sehr niedriger Liquidität
        newTokenRisk: factors.tokenAge < 0.1 ? 1.25 : 1.0, // 25% höheres Risiko bei sehr neuen Tokens
    };
    // Anwendung der Multiplikatoren
    const finalScore = score *
        riskMultipliers.highProfitRisk *
        riskMultipliers.lowLiquidityRisk *
        riskMultipliers.newTokenRisk;
    return Math.min(100, Math.max(0, finalScore));
}
//# sourceMappingURL=checkscam.js.map