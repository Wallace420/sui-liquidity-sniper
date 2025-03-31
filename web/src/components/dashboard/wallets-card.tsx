import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Wallet } from '../../lib/socket';
import { formatCurrency, shortenAddress, formatRelativeTime } from '../../lib/utils';
import { cn } from '../../lib/utils';

interface WalletsCardProps {
  wallets: Wallet[];
}

export function WalletsCard({ wallets }: WalletsCardProps) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-semibold leading-none tracking-tight">
          Wallets
        </CardTitle>
      </CardHeader>
      <CardContent>
        {wallets.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            Keine Wallets konfiguriert.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground text-sm">Adresse</th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground text-sm">Guthaben</th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground text-sm">Transaktionen</th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground text-sm">Letzte Transaktion</th>
                </tr>
              </thead>
              <tbody>
                {wallets.map((wallet) => (
                  <tr key={wallet.address} className="border-b border-border hover:bg-muted/10 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                        <span className="font-mono">{shortenAddress(wallet.address)}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-medium">
                      {formatCurrency(wallet.balance)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {wallet.transactions}
                    </td>
                    <td className="py-3 px-3 text-right text-muted-foreground text-sm">
                      {wallet.lastTransaction 
                        ? formatRelativeTime(wallet.lastTransaction)
                        : '-'}
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