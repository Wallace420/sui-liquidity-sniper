import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from '../ui/button';
import { Trade, shortenAddress } from '../../lib/socket';
import { formatCurrency } from '../../lib/utils';
import { Badge } from '../ui/badge';

interface TradesTableProps {
  trades: Trade[];
  onSellToken: (tradeId: string) => void;
}

export function TradesTable({ trades, onSellToken }: TradesTableProps) {
  const [formattedTimes, setFormattedTimes] = useState<Record<string, string>>({});
  const [isMounted, setIsMounted] = useState(false);

  // Formatiere Zeitstempel für die Anzeige
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('de-DE');
  };

  // Effekt für Client-seitige Formatierung
  useEffect(() => {
    setIsMounted(true);
    const times: Record<string, string> = {};
    trades.forEach(trade => {
      times[trade.id] = formatTimestamp(trade.timestamp);
    });
    setFormattedTimes(times);
  }, [trades]);

  // Funktion zum Rendern des Status-Badges
  const getStatusBadge = (status: 'pending' | 'completed' | 'failed') => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning">Ausstehend</Badge>;
      case 'completed':
        return <Badge variant="success">Abgeschlossen</Badge>;
      case 'failed':
        return <Badge variant="destructive">Fehlgeschlagen</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-semibold leading-none tracking-tight">
          Aktuelle Trades
        </CardTitle>
      </CardHeader>
      <CardContent>
        {trades.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            Keine Trades vorhanden
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left font-medium text-muted-foreground py-2 px-2">Zeit</th>
                  <th className="text-left font-medium text-muted-foreground py-2 px-2">Pool-ID</th>
                  <th className="text-left font-medium text-muted-foreground py-2 px-2">Token</th>
                  <th className="text-right font-medium text-muted-foreground py-2 px-2">Menge</th>
                  <th className="text-right font-medium text-muted-foreground py-2 px-2">Preis</th>
                  <th className="text-center font-medium text-muted-foreground py-2 px-2">Status</th>
                  <th className="text-right font-medium text-muted-foreground py-2 px-2">Gewinn</th>
                  <th className="text-right font-medium text-muted-foreground py-2 px-2">Aktion</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((trade) => (
                  <tr 
                    key={trade.id} 
                    className="border-b border-border hover:bg-muted/50 transition-colors"
                  >
                    <td className="py-2 px-2 text-sm">
                      {isMounted ? formattedTimes[trade.id] || '--:--:--' : '--:--:--'}
                    </td>
                    <td className="py-2 px-2 text-sm">
                      <span className="font-mono">{shortenAddress(trade.poolId)}</span>
                    </td>
                    <td className="py-2 px-2 text-sm font-mono">{shortenAddress(trade.token)}</td>
                    <td className="py-2 px-2 text-sm text-right">{trade.amount.toFixed(4)}</td>
                    <td className="py-2 px-2 text-sm text-right">{formatCurrency(trade.price)}</td>
                    <td className="py-2 px-2 text-sm text-center">
                      {getStatusBadge(trade.status)}
                    </td>
                    <td className={`py-2 px-2 text-sm text-right ${
                      trade.profit > 0 ? 'text-green-500' : trade.profit < 0 ? 'text-red-500' : ''
                    }`}>
                      {trade.profit > 0 ? '+' : ''}{trade.profit.toFixed(2)}%
                    </td>
                    <td className="py-2 px-2 text-sm text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-8"
                        disabled={trade.status !== 'completed'}
                        onClick={() => onSellToken(trade.id)}
                      >
                        Verkaufen
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}