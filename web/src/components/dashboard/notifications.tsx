import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { formatRelativeTime } from '../../lib/utils';

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  timestamp: string;
  read: boolean;
}

interface NotificationsProps {
  notifications: Notification[];
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onMarkAsRead: (id: string) => void;
}

export function Notifications({
  notifications,
  onMarkAllAsRead,
  onClearAll,
  onMarkAsRead
}: NotificationsProps) {
  const [expanded, setExpanded] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;
  
  // Zeige nur die neuesten 5 Benachrichtigungen, wenn nicht erweitert
  const displayedNotifications = expanded 
    ? notifications 
    : notifications.slice(0, 5);
  
  return (
    <Card className="h-full">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-xl font-semibold leading-none tracking-tight">
          Benachrichtigungen
          {unreadCount > 0 && (
            <span className="ml-2 inline-flex items-center justify-center bg-primary text-primary-foreground text-xs font-medium h-5 px-2 rounded-full">
              {unreadCount}
            </span>
          )}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onMarkAllAsRead}>
            Alle gelesen
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClearAll}>
            Löschen
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            Keine Benachrichtigungen vorhanden.
          </div>
        ) : (
          <div className="space-y-3">
            {displayedNotifications.map((notification) => (
              <div 
                key={notification.id} 
                className={`p-3 rounded-lg border ${
                  notification.read ? 'bg-card' : 'bg-muted/5'
                } ${
                  notification.type === 'success' ? 'border-green-500/30' :
                  notification.type === 'warning' ? 'border-yellow-500/30' :
                  notification.type === 'error' ? 'border-red-500/30' :
                  'border-blue-500/30'
                } transition-colors`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      notification.type === 'success' ? 'bg-green-500' :
                      notification.type === 'warning' ? 'bg-yellow-500' :
                      notification.type === 'error' ? 'bg-red-500' :
                      'bg-blue-500'
                    }`}></div>
                    <span className="text-sm font-medium">
                      {notification.type === 'success' ? 'Erfolg' :
                       notification.type === 'warning' ? 'Warnung' :
                       notification.type === 'error' ? 'Fehler' :
                       'Info'}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(notification.timestamp)}
                  </span>
                </div>
                <p className="mt-2 text-sm">{notification.message}</p>
                {!notification.read && (
                  <div className="mt-2 flex justify-end">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => onMarkAsRead(notification.id)}
                    >
                      Als gelesen markieren
                    </Button>
                  </div>
                )}
              </div>
            ))}
            
            {notifications.length > 5 && (
              <Button 
                variant="ghost" 
                size="sm"
                className="w-full h-8 text-xs"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? 'Weniger anzeigen' : `${notifications.length - 5} weitere anzeigen`}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 